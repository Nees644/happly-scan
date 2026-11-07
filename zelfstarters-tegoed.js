// zelfstarters-tegoed.js
// Tegoed voor organisaties. Een werkgever of intermediair koopt Verificatie &
// Voorkeur voor een aantal mensen in één keer:
//
//   beheer maakt het tegoed  ->  organisatie betaalt via Mollie
//   ->  tegoed gaat aan, factuur en code naar de organisatie
//   ->  elke medewerker of kandidaat meldt zich met de code aan, meet, en is
//       bij die eerste meting direct geverifieerd (koppelMeting)
//
// De badge blijft van de persoon. De organisatie ziet wie de code gebruikte,
// nooit een score.
//
// Prijs per plaats uit de tabel producten: ZS-TEG-100 vanaf 100 plaatsen,
// ZS-TEG-25 vanaf 25, daaronder ZS-STD. Alleen Verificatie & Voorkeur; de
// Zelfstarters Dag krijgt nooit korting.

import { Resend } from "resend";
import { bedragMetBtw } from "./betalen.js";
import { maakBetaling } from "./mollie.js";
import { tegoedTarief, codeVoorNaam, codeOpschonen } from "./zelfstarters-korting.js";
import { tegoedBetaalMail, tegoedCodeMail, AFZENDER, ANTWOORD } from "./zelfstarters-mail.js";
import { BEDRIJF, compleet as bedrijfCompleet } from "./bedrijf.js";
import { totalen, btwVerlegd } from "./factuur.js";
import { factuurMail } from "./factuur-mail.js";
import { maakFactuurPdf } from "./factuur-pdf.js";

export const DOELGROEPEN = ["werkgever", "intermediair"];

/* Het bedrag van een tegoed, uit het product en het aantal plaatsen. Puur
   rekenwerk, zodat het te testen is: btw over het totaal, niet per plaats. */
export function tegoedBedrag(product, plaatsen){
  const n = Math.max(1, Math.floor(Number(plaatsen) || 0));
  const ex = product.prijs_ex_btw * n;
  const b = bedragMetBtw({ ...product, prijs_ex_btw: ex });
  return { plaatsen: n, prijs_plaats_cent: product.prijs_ex_btw, ex: b.ex, btw: b.btw, totaal: b.totaal };
}

function basisUrl(req){
  return process.env.SITE_URL || `https://${req?.headers?.host || "scan.happly.nl"}`;
}

async function stuur(naar, mail, bijlagen){
  if (!process.env.RESEND_API_KEY || !naar) return false;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const uit = await resend.emails.send({
    from: AFZENDER, to: naar, replyTo: ANTWOORD, subject: mail.subject, html: mail.html,
    ...(bijlagen ? { attachments: bijlagen } : {})
  });
  return !(uit && uit.error);
}

/* Een tegoed aanmaken en de betaling starten. De code staat nog uit tot er
   is betaald. Geeft de partnerrij en de betaallink terug. */
export async function maakTegoed(db, req, invoer){
  const naam = String(invoer.naam || "").trim().slice(0, 120);
  const email = String(invoer.email || "").trim().toLowerCase();
  const doelgroep = DOELGROEPEN.includes(invoer.doelgroep) ? invoer.doelgroep : "intermediair";
  const plaatsen = Math.floor(Number(invoer.plaatsen) || 0);
  if (naam.length < 2) throw Object.assign(new Error("Vul de naam van de organisatie in."), { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw Object.assign(new Error("Vul het e-mailadres van de contactpersoon in."), { status: 400 });
  if (plaatsen < 1 || plaatsen > 5000) throw Object.assign(new Error("Vul een aantal plaatsen in tussen 1 en 5000."), { status: 400 });
  const klant = {
    klant_naam: String(invoer.klant_naam || naam).trim(),
    klant_adres: String(invoer.klant_adres || "").trim() || null,
    klant_postcode: String(invoer.klant_postcode || "").trim() || null,
    klant_plaats: String(invoer.klant_plaats || "").trim() || null,
    klant_btw_nummer: String(invoer.klant_btw_nummer || "").trim().toUpperCase() || null
  };
  if (!klant.klant_adres || !klant.klant_postcode || !klant.klant_plaats)
    throw Object.assign(new Error("Vul het factuuradres in: adres, postcode en plaats."), { status: 400 });

  const code = tegoedTarief(plaatsen);
  const p = await db.from("producten").select("*").eq("code", code).eq("actief", true).maybeSingle();
  if (!p.data) throw Object.assign(new Error(`Het tarief ${code} staat niet in de tabel producten. Draai eerst de migratie van 7 november.`), { status: 500 });
  const bedrag = tegoedBedrag(p.data, plaatsen);

  const eigenCode = invoer.code ? codeOpschonen(invoer.code) : null;
  if (invoer.code && !eigenCode) throw Object.assign(new Error("Een code bestaat uit letters, cijfers en streepjes, 3 tot 24 tekens."), { status: 400 });

  let rij = null;
  for (let poging = 0; poging < 5 && !rij; poging++){
    const ins = await db.from("zelfstarters_partners").insert({
      naam, email, doelgroep, soort: "tegoed", korting_pct: 100, actief: false,
      code: eigenCode || codeVoorNaam(naam),
      plaatsen: bedrag.plaatsen, product_code: code, prijs_plaats_cent: bedrag.prijs_plaats_cent,
      bedrag_cent: bedrag.totaal, btw_cent: bedrag.btw, ...klant
    }).select("*").maybeSingle();
    if (ins.data) rij = ins.data;
    else if (eigenCode) throw Object.assign(new Error("Deze code bestaat al."), { status: 409 });
  }
  if (!rij) throw new Error("geen vrije code gevonden");

  const basis = basisUrl(req);
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";
  const doorlaat = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? `&x-vercel-protection-bypass=${encodeURIComponent(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)}` : "";
  const betaling = await maakBetaling({
    centen: bedrag.totaal,
    omschrijving: `Zelfstarters tegoed, ${bedrag.plaatsen} plaatsen, ${naam}`,
    redirectUrl: `https://zelfstarters.nl/partners?tegoed=${encodeURIComponent(rij.code)}`,
    webhookUrl: `${basis}/api/zelfstarters-webhook?s=${encodeURIComponent(geheim)}${doorlaat}`,
    metadata: { zs_tegoed_id: rij.id, product: code, plaatsen: bedrag.plaatsen },
    sleutel: process.env.MOLLIE_API_KEY_ZELFSTARTERS || undefined
  });
  await db.from("zelfstarters_partners").update({ mollie_payment_id: betaling.id }).eq("id", rij.id);
  const betaalpagina = betaling?._links?.checkout?.href || null;
  if (betaalpagina){
    await stuur(email, tegoedBetaalMail({ naam, plaatsen: bedrag.plaatsen, ex: bedrag.ex, totaal: bedrag.totaal, prijsPlaats: bedrag.prijs_plaats_cent, betaalpagina }));
  }
  return { tegoed: { ...rij, mollie_payment_id: betaling.id }, betaalpagina, bedrag };
}

/* De melding van Mollie voor een tegoed. Idempotent: aanzetten gebeurt één
   keer, de factuur hoogstens één keer (unieke index op facturen). */
export async function verwerkTegoedBetaling(db, tegoed, status){
  if (status !== "betaald") return `tegoed ${tegoed.code}: ${status || "nog niets"}`;
  if (tegoed.betaald_op) return `tegoed ${tegoed.code} stond al aan`;
  const upd = await db.from("zelfstarters_partners")
    .update({ actief: true, betaald_op: new Date().toISOString() })
    .eq("id", tegoed.id).is("betaald_op", null).select("*").maybeSingle();
  if (!upd.data) return `tegoed ${tegoed.code} stond al aan`;
  const t = upd.data;

  let factuurUitkomst = "";
  let bijlage = null;
  try{
    const f = await maakTegoedFactuur(db, t);
    factuurUitkomst = f.uitkomst; bijlage = f.bijlage;
  }catch(e){ factuurUitkomst = `factuur mislukt: ${String(e.message).slice(0, 80)}`; }

  await stuur(t.email, tegoedCodeMail({ naam: t.naam, code: t.code, plaatsen: t.plaatsen, doelgroep: t.doelgroep }), bijlage ? [bijlage] : null);
  return `tegoed ${t.code} aan, ${t.plaatsen} plaatsen${factuurUitkomst ? `, ${factuurUitkomst}` : ""}`;
}

/* De factuur bij een betaald tegoed, in dezelfde reeks als alle andere. */
export async function maakTegoedFactuur(db, t){
  const bestaat = await db.from("facturen").select("id, nummer").eq("zs_tegoed_id", t.id).maybeSingle();
  if (bestaat.data) return { uitkomst: `factuur ${bestaat.data.nummer} stond er al`, bijlage: null };
  if (!bedrijfCompleet()) return { uitkomst: "geen factuur: bedrijfsgegevens onvolledig", bijlage: null };

  const product = (await db.from("producten").select("code, naam, btw_promille").eq("code", t.product_code).maybeSingle()).data;
  const klant = { naam: t.klant_naam || t.naam, adres: t.klant_adres, postcode: t.klant_postcode, plaats: t.klant_plaats, land: "NL", btw_nummer: t.klant_btw_nummer };
  const verlegd = btwVerlegd(klant);
  const ex = t.prijs_plaats_cent * t.plaatsen;
  const regels = [{
    code: t.product_code,
    omschrijving: `${product?.naam || "Zelfstarters Verificatie & Voorkeur"}, code ${t.code}`,
    aantal: t.plaatsen,
    stuk_ex_btw: t.prijs_plaats_cent,
    bedrag_ex_btw: ex,
    btw_promille: Number(product?.btw_promille ?? 210)
  }];
  const bedrag = totalen(regels, { verlegd });
  const nummer = await db.rpc("volgend_factuurnummer");
  if (nummer.error || !nummer.data) throw new Error("geen factuurnummer gekregen");
  const vandaag = new Date().toISOString().slice(0, 10);
  const ins = await db.from("facturen").insert({
    nummer: nummer.data, soort: "factuur", zs_tegoed_id: t.id,
    periode_van: vandaag, periode_tot: vandaag,
    bedrag_ex_btw: bedrag.ex, btw_cent: bedrag.btw, bedrag_totaal: bedrag.totaal,
    btw_verlegd: verlegd, btw_nummer: klant.btw_nummer,
    status: "betaald", mollie_payment_id: t.mollie_payment_id, betaald_op: t.betaald_op,
    klant_naam: klant.naam, klant_adres: klant.adres, klant_postcode: klant.postcode, klant_plaats: klant.plaats, klant_land: klant.land,
    regels
  }).select("*").single();
  if (ins.error){
    if (/duplicate|unique/i.test(ins.error.message || "")) return { uitkomst: "factuur werd net al gemaakt", bijlage: null };
    throw new Error(`factuur opslaan mislukt: ${ins.error.message}`);
  }
  let bijlage = null;
  try{
    const pdf = await maakFactuurPdf(ins.data, BEDRIJF);
    const pad = `${new Date().getFullYear()}/${ins.data.nummer}.pdf`;
    const opslag = await db.storage.from("facturen").upload(pad, pdf, { contentType: "application/pdf", upsert: true });
    if (!opslag.error) await db.from("facturen").update({ pdf_pad: pad }).eq("id", ins.data.id);
    bijlage = { filename: `factuur-${ins.data.nummer}.pdf`, content: pdf.toString("base64") };
  }catch(e){ /* de factuur staat er, de pdf volgt met de hand */ }
  // De factuur ook als eigen mail, zoals bij elke andere aankoop.
  if (await stuur(t.email, factuurMail(ins.data, BEDRIJF), bijlage ? [bijlage] : null)){
    await db.from("facturen").update({ verstuurd_op: new Date().toISOString() }).eq("id", ins.data.id);
  }
  return { uitkomst: `factuur ${ins.data.nummer}`, bijlage: null };
}
