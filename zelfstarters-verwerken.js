// zelfstarters-verwerken.js
// Eén plek waar een Zelfstarters-registratie verder wordt gebracht, gebruikt
// door drie wegen: de melding van Mollie, de pagina waar de klant op
// terugkomt, en de dagcron. Alles hierin is idempotent: twee keer verwerken
// verandert niets.
//
// De stappen van een registratie:
//   open  ->  betaald (nummer, welkomstmail)  ->  gemeten (badge, badgemail)
// Het nummer komt bij betaling, de badge pas bij de eerste meting. Dat verschil
// is de waarde van het register: wie betaalt en niet meet, staat er niet in.

import { haalBetaling } from "./mollie.js";
import { welkomMail, herinneringMail, badgeMail, AFZENDER, ANTWOORD } from "./zelfstarters-mail.js";
import { Resend } from "resend";

const MOLLIE_NAAR_ONS = { paid: "betaald", expired: "verlopen", canceled: "mislukt", failed: "mislukt" };

async function stuurMail(db, rij, kolom, mail){
  if (rij[kolom]) return false;
  if (!process.env.RESEND_API_KEY){ console.error("zelfstarters: RESEND_API_KEY ontbreekt"); return false; }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const uit = await resend.emails.send({
    from: AFZENDER, to: rij.email, replyTo: ANTWOORD, subject: mail.subject, html: mail.html
  });
  if (uit?.error) throw new Error(`mail ${kolom} mislukt: ${uit.error.message || "onbekend"}`);
  await db.from("zelfstarters").update({ [kolom]: new Date().toISOString() }).eq("id", rij.id);
  return true;
}

/* De stand bij Mollie ophalen en de registratie bijwerken. Geeft een korte
   uitkomst terug voor de melding in mollie_meldingen. */
export async function verwerkZelfstarterBetaling(db, mollieId){
  const betaling = await haalBetaling(mollieId);
  const status = MOLLIE_NAAR_ONS[betaling.status] || null;

  const q = await db.from("zelfstarters").select("*").eq("mollie_payment_id", mollieId).maybeSingle();
  if (!q.data) return { uitkomst: "geen registratie bij deze betaling" };
  const rij = q.data;

  if (!status) return { uitkomst: `mollie zegt ${betaling.status}, niets gedaan` };
  if (rij.status === "betaald") return { uitkomst: "stond al op betaald" };

  if (status !== "betaald"){
    await db.from("zelfstarters").update({ status }).eq("id", rij.id);
    return { uitkomst: status };
  }

  // Betaald: nummer uitgeven en de welkomstmail sturen. Het nummer via de
  // functie in de database, zodat twee meldingen tegelijk nooit hetzelfde
  // nummer opleveren.
  const jaar = new Date().getFullYear();
  const n = await db.rpc("zelfstarters_nieuw_nummer", { p_jaar: jaar });
  if (n.error || !n.data) throw new Error(`nummer uitgeven mislukt: ${n.error?.message || "leeg"}`);

  const upd = await db.from("zelfstarters").update({
    status: "betaald",
    betaald_op: new Date().toISOString(),
    nummer: n.data
  }).eq("id", rij.id).eq("status", "open").select("*").maybeSingle();
  if (!upd.data) return { uitkomst: "stond al op betaald" };

  await stuurMail(db, upd.data, "mail_welkom_op", welkomMail({
    naam: upd.data.naam, registratieId: upd.data.id, type: upd.data.type
  }));
  return { uitkomst: `betaald, nummer ${n.data}` };
}

/* Een meting koppelen aan een registratie. Aangeroepen vanuit api/scan.js
   zodra een meting met zs=<id> binnenkomt. Eerste meting: badge en badgemail.
   Latere meting: jaartal erbij, laatste_meting_op vooruit. */
export async function koppelMeting(db, registratieId, scanId){
  const q = await db.from("zelfstarters").select("*").eq("id", registratieId).maybeSingle();
  if (!q.data) return "onbekende registratie";
  const rij = q.data;
  if (rij.status !== "betaald") return "nog niet betaald";

  const nu = new Date();
  const jaar = nu.getFullYear();
  const jaren = Array.from(new Set([...(rij.meetjaren || []), jaar])).sort();
  const velden = {
    laatste_meting_op: nu.toISOString(),
    meetjaren: jaren,
    scan_id: rij.scan_id || scanId || null
  };
  if (!rij.eerste_meting_op) velden.eerste_meting_op = nu.toISOString();

  const upd = await db.from("zelfstarters").update(velden).eq("id", rij.id).select("*").maybeSingle();
  const na = upd.data || { ...rij, ...velden };

  await stuurMail(db, na, "mail_badge_op", badgeMail({
    naam: na.naam, nummer: na.nummer, verificatiecode: na.verificatiecode,
    meetjaren: na.meetjaren, plus: !!na.plus_class_gevolgd_op
  }));
  return rij.eerste_meting_op ? "hermeting vastgelegd" : "eerste meting vastgelegd, badge gestuurd";
}

/* Dagelijks: wie gisteren betaalde en nog niet heeft gemeten, krijgt één
   herinnering. Eén, niet elke dag. */
export async function stuurHerinneringen(db){
  const grens = new Date(Date.now() - 24 * 3600e3).toISOString();
  const q = await db.from("zelfstarters").select("*")
    .eq("status", "betaald").is("eerste_meting_op", null).is("mail_herinnering_op", null)
    .lt("betaald_op", grens).limit(100);
  let n = 0;
  for (const rij of (q.data || [])){
    try{
      if (await stuurMail(db, rij, "mail_herinnering_op", herinneringMail({ naam: rij.naam, registratieId: rij.id }))) n++;
    }catch(e){ console.error("zelfstarters herinnering", e.message); }
  }
  return n;
}
