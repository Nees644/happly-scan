// zelfstarters-verwerken.js
// Eén plek waar een Zelfstarters-registratie verder wordt gebracht, gebruikt
// door de melding van Mollie, de pagina's waar de klant op terugkomt, de scan
// en de dagcron. Alles hierin is idempotent: twee keer verwerken verandert
// niets.
//
// De gratis weg (sinds 3 november 2026):
//   open (aangemeld)  ->  geregistreerd (gemeten, nummer, uitslagmail)
//                     ->  betaald (geverifieerd: badge, badgemail)
// De oude weg, voor partners die vooraf betalen:
//   open  ->  betaald (nummer, welkomstmail)  ->  meting erbij (badgemail)
//
// Het nummer komt bij de eerste meting of bij de betaling, wat het eerst
// komt. Een mislukte verificatiebetaling raakt de registratie niet: wie
// gemeten heeft, blijft geregistreerd.

import { haalBetaling } from "./mollie.js";
import { welkomMail, herinneringMail, badgeMail, uitslagMail, vervolgMail, planMail, planHerinneringMail, planCheckMail, AFZENDER, ANTWOORD } from "./zelfstarters-mail.js";
import { sterksteKant, ruimtePunten, planAlsTekst, regelsVoorHerinnering, MOMENTEN } from "./zelfstarters-uitslag.js";
import { Resend } from "resend";

/* De sleutel van het websiteprofiel Zelfstarters, als die er is. Zonder die
   variabele loopt alles via het profiel van de scan, zoals voorheen. */
export function zelfstartersSleutel(){
  return process.env.MOLLIE_API_KEY_ZELFSTARTERS || undefined;
}

/* Een betaling ophalen. Eerst met de Zelfstarters-sleutel; geeft die een 404,
   dan met de gewone. Zo blijven betalingen van voor de omzetting vindbaar. */
async function haalZelfstarterBetaling(mollieId){
  const eigen = zelfstartersSleutel();
  if (!eigen) return haalBetaling(mollieId);
  try{ return await haalBetaling(mollieId, { sleutel: eigen }); }
  catch(e){ if (e.status === 404) return haalBetaling(mollieId); throw e; }
}

const MOLLIE_NAAR_ONS = { paid: "betaald", expired: "verlopen", canceled: "mislukt", failed: "mislukt" };

async function stuurMail(db, rij, kolom, mail){
  if (kolom && rij[kolom]) return false;
  if (!process.env.RESEND_API_KEY){ console.error("zelfstarters: RESEND_API_KEY ontbreekt"); return false; }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const uit = await resend.emails.send({
    from: AFZENDER, to: rij.email, replyTo: ANTWOORD, subject: mail.subject, html: mail.html
  });
  if (uit?.error) throw new Error(`mail ${kolom} mislukt: ${uit.error.message || "onbekend"}`);
  if (kolom) await db.from("zelfstarters").update({ [kolom]: new Date().toISOString() }).eq("id", rij.id);
  return true;
}

/* Een nummer uitgeven via de functie in de database, zodat twee verzoeken
   tegelijk nooit hetzelfde nummer opleveren. */
async function nieuwNummer(db, jaar){
  const n = await db.rpc("zelfstarters_nieuw_nummer", { p_jaar: jaar });
  if (n.error || !n.data) throw new Error(`nummer uitgeven mislukt: ${n.error?.message || "leeg"}`);
  return n.data;
}

/* De prijzen van Verificatie & Voorkeur en Plus Class voor in de mail, uit
   de productentabel. Per maand is de jaarprijs gedeeld door twaalf. */
async function prijsVoorMail(db){
  try{
    const q = await db.from("producten").select("code, prijs_ex_btw").in("code", ["ZS-STD", "ZS-PLUS"]).eq("actief", true);
    const uit = {};
    for (const [type, code] of [["standaard", "ZS-STD"], ["plus", "ZS-PLUS"]]){
      const r = (q.data || []).find(x => x.code === code);
      if (!r) continue;
      const ex = r.prijs_ex_btw / 100;
      uit[type] = { ex: String(Math.round(ex)), maand: (Math.round(ex / 12 * 10) / 10).toFixed(2).replace(".", ",") };
    }
    return uit;
  }catch(e){ return null; }
}

async function scanVan(db, scanId){
  if (!scanId) return null;
  const q = await db.from("index_scan_results").select("id, index_score, zien, sturen, doen, duiding").eq("id", scanId).maybeSingle();
  return q.data || null;
}

/* De stand bij Mollie ophalen en de registratie bijwerken. Geeft een korte
   uitkomst terug voor de melding in mollie_meldingen. */
export async function verwerkZelfstarterBetaling(db, mollieId){
  const betaling = await haalZelfstarterBetaling(mollieId);
  const status = MOLLIE_NAAR_ONS[betaling.status] || null;

  const q = await db.from("zelfstarters").select("*").eq("mollie_payment_id", mollieId).maybeSingle();
  if (!q.data) return { uitkomst: "geen registratie bij deze betaling" };
  const rij = q.data;

  if (!status) return { uitkomst: `mollie zegt ${betaling.status}, niets gedaan` };
  if (rij.status === "betaald") return { uitkomst: "stond al op betaald" };

  if (status !== "betaald"){
    // Niet betaald. Wie al gemeten heeft, blijft geregistreerd; alleen de
    // stand van de betaling verandert. Een aanmelding zonder meting (oude
    // weg) gaat wel op mislukt of verlopen.
    const velden = { betaling_status: status };
    if (rij.status === "open" && !rij.eerste_meting_op) velden.status = status;
    await db.from("zelfstarters").update(velden).eq("id", rij.id);
    return { uitkomst: status };
  }

  const nu = new Date();
  const velden = { status: "betaald", betaling_status: "betaald", betaald_op: nu.toISOString() };
  if (!rij.nummer) velden.nummer = await nieuwNummer(db, nu.getFullYear());

  const upd = await db.from("zelfstarters").update(velden).eq("id", rij.id).neq("status", "betaald").select("*").maybeSingle();
  if (!upd.data) return { uitkomst: "stond al op betaald" };
  const na = upd.data;

  if (na.eerste_meting_op){
    // Gratis weg: er is al gemeten, dus de verificatie is meteen compleet.
    await stuurMail(db, na, "mail_badge_op", badgeMail({
      naam: na.naam, nummer: na.nummer, verificatiecode: na.verificatiecode,
      meetjaren: na.meetjaren, plus: !!na.plus_class_gevolgd_op, registratieId: na.id
    }));
    return { uitkomst: `geverifieerd, nummer ${na.nummer}` };
  }
  // Oude weg: betaald, nog niet gemeten.
  await stuurMail(db, na, "mail_welkom_op", welkomMail({ naam: na.naam, registratieId: na.id, type: na.type }));
  return { uitkomst: `betaald, nummer ${na.nummer}` };
}

/* Een verificatie zonder betaling, voor een kortingscode van honderd procent.
   Zelfde uitkomst als een betaalde verificatie: status betaald, nummer als
   dat er nog niet is, badgemail als er al gemeten is, anders de welkomstmail.
   betaling_status zegt gratis, zodat het in elk overzicht apart telt. */
export async function verwerkGratisVerificatie(db, registratieId){
  const q = await db.from("zelfstarters").select("*").eq("id", registratieId).maybeSingle();
  if (!q.data) return "onbekende registratie";
  const rij = q.data;
  if (rij.status === "betaald") return "stond al op betaald";
  const nu = new Date();
  const velden = { status: "betaald", betaling_status: "gratis", betaald_op: nu.toISOString() };
  if (!rij.nummer) velden.nummer = await nieuwNummer(db, nu.getFullYear());
  const upd = await db.from("zelfstarters").update(velden).eq("id", rij.id).neq("status", "betaald").select("*").maybeSingle();
  if (!upd.data) return "stond al op betaald";
  const na = upd.data;
  if (na.eerste_meting_op){
    await stuurMail(db, na, "mail_badge_op", badgeMail({
      naam: na.naam, nummer: na.nummer, verificatiecode: na.verificatiecode,
      meetjaren: na.meetjaren, plus: !!na.plus_class_gevolgd_op, registratieId: na.id
    }));
    return `geverifieerd zonder betaling, nummer ${na.nummer}`;
  }
  await stuurMail(db, na, "mail_welkom_op", welkomMail({ naam: na.naam, registratieId: na.id, type: na.type }));
  return `geverifieerd zonder betaling, nog meten, nummer ${na.nummer}`;
}

/* Een meting koppelen aan een registratie. Aangeroepen vanuit api/scan.js
   zodra een meting met zs=<id> binnenkomt.
   Gratis weg, eerste meting: nummer, status geregistreerd, uitslagmail.
   Oude weg (al betaald), eerste meting: badge en badgemail.
   Latere meting: jaartal erbij, laatste_meting_op vooruit. */
export async function koppelMeting(db, registratieId, scanId){
  const q = await db.from("zelfstarters").select("*").eq("id", registratieId).maybeSingle();
  if (!q.data) return "onbekende registratie";
  const rij = q.data;
  if (!["open", "geregistreerd", "betaald"].includes(rij.status)) return "registratie niet actief";

  const nu = new Date();
  const jaar = nu.getFullYear();
  const jaren = Array.from(new Set([...(rij.meetjaren || []), jaar])).sort();
  const velden = {
    laatste_meting_op: nu.toISOString(),
    meetjaren: jaren,
    scan_id: rij.scan_id || scanId || null
  };
  if (!rij.eerste_meting_op) velden.eerste_meting_op = nu.toISOString();
  if (rij.status === "open"){
    velden.status = "geregistreerd";
    if (!rij.nummer) velden.nummer = await nieuwNummer(db, jaar);
  }

  const upd = await db.from("zelfstarters").update(velden).eq("id", rij.id).select("*").maybeSingle();
  const na = upd.data || { ...rij, ...velden };

  if (na.status === "betaald"){
    await stuurMail(db, na, "mail_badge_op", badgeMail({
      naam: na.naam, nummer: na.nummer, verificatiecode: na.verificatiecode,
      meetjaren: na.meetjaren, plus: !!na.plus_class_gevolgd_op, registratieId: na.id
    }));
    return rij.eerste_meting_op ? "hermeting vastgelegd" : "eerste meting vastgelegd, badge gestuurd";
  }

  const scan = await scanVan(db, na.scan_id);
  if (scan){
    const scores = { zien: scan.zien, sturen: scan.sturen, doen: scan.doen };
    await stuurMail(db, na, "mail_uitslag_op", uitslagMail({
      naam: na.naam, registratieId: na.id, nummer: na.nummer, score: scan.index_score,
      sterkste: sterksteKant(scores), ruimte: ruimtePunten(scores), jaar,
      prijs: await prijsVoorMail(db)
    }));
  }
  return rij.eerste_meting_op ? "hermeting vastgelegd" : "geregistreerd, uitslagmail gestuurd";
}

/* Het als-dan plan vastleggen en mailen. Alleen voor geverifieerden. */
export async function legPlanVast(db, rij, plan){
  // Een nieuw plan begint opnieuw: de checks na een week, drie en vijf
  // maanden tellen vanaf nu.
  const upd = await db.from("zelfstarters").update({
    plan, plan_op: new Date().toISOString(), mail_plan_op: null,
    mail_plan_week_op: null, mail_plan_m3_op: null, mail_plan_m5_op: null
  }).eq("id", rij.id).select("*").maybeSingle();
  const na = upd.data || { ...rij, plan };
  await stuurMail(db, na, "mail_plan_op", planMail({ naam: na.naam, registratieId: na.id, regels: planAlsTekst(plan), datums: plan.map(r => r.datum) }));
  return na;
}

/* Een mail opnieuw sturen, voor beheer. Zet eerst de datumkolom leeg, zodat
   stuurMail hem niet overslaat. welkom en badge voor betaald, uitslag en
   vervolg voor wie gemeten heeft, plan als er een plan is. */
export async function stuurMailOpnieuw(db, nummer, soort){
  const q = await db.from("zelfstarters").select("*").eq("nummer", nummer).maybeSingle();
  if (!q.data) return "onbekend nummer";
  const rij = q.data;
  const scan = await scanVan(db, rij.scan_id);
  const scores = scan ? { zien: scan.zien, sturen: scan.sturen, doen: scan.doen } : null;
  const jaar = new Date().getFullYear();
  let kolom, mail;
  if (soort === "badge" && rij.status === "betaald"){
    kolom = "mail_badge_op";
    mail = badgeMail({ naam: rij.naam, nummer: rij.nummer, verificatiecode: rij.verificatiecode, meetjaren: rij.meetjaren, plus: !!rij.plus_class_gevolgd_op, registratieId: rij.id });
  }else if (soort === "welkom" && rij.status === "betaald"){
    kolom = "mail_welkom_op";
    mail = welkomMail({ naam: rij.naam, registratieId: rij.id, type: rij.type });
  }else if (soort === "uitslag" && scores){
    kolom = "mail_uitslag_op";
    mail = uitslagMail({ naam: rij.naam, registratieId: rij.id, nummer: rij.nummer, score: scan.index_score, sterkste: sterksteKant(scores), ruimte: ruimtePunten(scores), jaar, prijs: await prijsVoorMail(db) });
  }else if (soort === "vervolg" && scores){
    kolom = "mail_vervolg_op";
    mail = vervolgMail({ naam: rij.naam, registratieId: rij.id, nummer: rij.nummer, ruimte: ruimtePunten(scores), jaar });
  }else if (soort === "plan" && rij.plan){
    kolom = "mail_plan_op";
    mail = planMail({ naam: rij.naam, registratieId: rij.id, regels: planAlsTekst(rij.plan), datums: rij.plan.map(r => r.datum) });
  }else return `mail ${soort} past niet bij deze registratie`;
  await stuurMail(db, { ...rij, [kolom]: null }, kolom, mail);
  return `${soort} gestuurd naar ${rij.email}`;
}

/* Dagelijks, de herinneringen bij het als-dan plan. Twee soorten:
   de dag voor een ingevulde datum de eigen zin (herinnerd_op in de regel),
   en de check na een week, drie maanden en vijf maanden (kolommen op de
   rij). Alleen voor geverifieerden met een plan. */
export async function stuurPlanHerinneringen(db, nu = new Date()){
  let n = 0;
  const q = await db.from("zelfstarters").select("*").eq("status", "betaald").not("plan", "is", null).limit(500);
  const dagen = d => Math.floor((nu - Date.parse(d)) / 86400000);
  for (const rij of (q.data || [])){
    try{
      const plan = Array.isArray(rij.plan) ? rij.plan : [];
      for (const r of regelsVoorHerinnering(plan, nu)){
        const m = MOMENTEN.find(x => x.code === r.moment);
        const mail = planHerinneringMail({ naam: rij.naam, registratieId: rij.id, regel: { momentLabel: m ? m.label : r.moment, tekst: planAlsTekst([r])[0] } });
        if (await stuurMail(db, rij, null, mail)){
          plan[r.i] = { ...plan[r.i], herinnerd_op: nu.toISOString().slice(0, 10) };
          await db.from("zelfstarters").update({ plan }).eq("id", rij.id);
          n++;
        }
      }
      if (!rij.plan_op) continue;
      const oud = dagen(rij.plan_op);
      const stap = !rij.mail_plan_week_op && oud >= 7 ? ["week", "mail_plan_week_op"]
        : !rij.mail_plan_m3_op && oud >= 90 ? ["m3", "mail_plan_m3_op"]
        : !rij.mail_plan_m5_op && oud >= 150 ? ["m5", "mail_plan_m5_op"] : null;
      if (stap){
        if (await stuurMail(db, rij, stap[1], planCheckMail({ naam: rij.naam, registratieId: rij.id, regels: planAlsTekst(plan), stap: stap[0] }))) n++;
      }
    }catch(e){ console.error("zelfstarters plan", e.message); }
  }
  return n;
}

/* Dagelijks. Oude weg: wie gisteren betaalde en nog niet heeft gemeten,
   krijgt één herinnering. Gratis weg: wie drie dagen geleden is
   geregistreerd en niet heeft geverifieerd, krijgt één vervolgmail. */
export async function stuurHerinneringen(db){
  let n = 0;
  const dag = new Date(Date.now() - 24 * 3600e3).toISOString();
  const q = await db.from("zelfstarters").select("*")
    .eq("status", "betaald").is("eerste_meting_op", null).is("mail_herinnering_op", null)
    .lt("betaald_op", dag).limit(100);
  for (const rij of (q.data || [])){
    try{
      if (await stuurMail(db, rij, "mail_herinnering_op", herinneringMail({ naam: rij.naam, registratieId: rij.id }))) n++;
    }catch(e){ console.error("zelfstarters herinnering", e.message); }
  }

  n += await stuurPlanHerinneringen(db);

  const drieDagen = new Date(Date.now() - 3 * 24 * 3600e3).toISOString();
  const v = await db.from("zelfstarters").select("*")
    .eq("status", "geregistreerd").is("mail_vervolg_op", null)
    .lt("eerste_meting_op", drieDagen).limit(100);
  for (const rij of (v.data || [])){
    try{
      const scan = await scanVan(db, rij.scan_id);
      if (!scan) continue;
      const scores = { zien: scan.zien, sturen: scan.sturen, doen: scan.doen };
      if (await stuurMail(db, rij, "mail_vervolg_op", vervolgMail({
        naam: rij.naam, registratieId: rij.id, nummer: rij.nummer, ruimte: ruimtePunten(scores), jaar: new Date().getFullYear()
      }))) n++;
    }catch(e){ console.error("zelfstarters vervolg", e.message); }
  }
  return n;
}
