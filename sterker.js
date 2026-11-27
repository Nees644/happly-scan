// sterker.js
// Sterker op je werk: een organisatie meldt zich aan en krijgt direct een
// btw-factuur met een betaallink (26 november 2026).
//
//   aanmelden  ->  rij in sterker_aanmeldingen, bedrag bevroren
//              ->  factuur met nummer, status open, vervaldatum over 14 dagen
//              ->  mail met factuur (pdf) en betaalknop, bericht aan Happly
//   betaalknop ->  /api/sterker-betaal?t=<token> maakt op dat moment een
//                  Mollie-betaling en stuurt door naar de betaalpagina
//   Mollie     ->  /api/sterker-webhook: betaald? aanmelding en factuur op
//                  betaald, bevestiging naar de klant
//
// De betaling wordt pas gemaakt als iemand op de knop drukt. Een betaling bij
// Mollie verloopt na een tijd; een factuur van veertien dagen moet het hele
// termijn een werkende knop hebben.
//
// Prijzen komen uit de tabel producten. De klant kiest een product, nooit een
// bedrag.

import crypto from "node:crypto";
import { Resend } from "resend";
import { maakBetaling } from "./mollie.js";
import { BEDRIJF, compleet as bedrijfCompleet } from "./bedrijf.js";
import { totalen, btwVerlegd, euro, nederlandseDatum } from "./factuur.js";
import { bouwFactuurHtml } from "./factuur-mail.js";
import { maakFactuurPdf } from "./factuur-pdf.js";

export const PRODUCTEN = { start: "SOW-START", leider: "SOW-LEID", jaar: "SOW-JAAR" };
export const BETAALTERMIJN_DAGEN = 14;
export const MELDING_AAN = "hallo@happly.nl";

const AFZENDER = `${BEDRIJF.naam} <${BEDRIJF.email}>`;

export function fout(melding, status = 400){
  return Object.assign(new Error(melding), { status });
}

/* Het bedrag van een aanmelding: prijs per plaats maal aantal, btw over het
   totaal (en verlegd voor een zakelijke klant in een ander EU-land). */
export function aanmeldBedrag(product, plaatsen, btwNummer = null){
  const n = Math.max(1, Math.floor(Number(plaatsen) || 0));
  const ex = product.prijs_ex_btw * n;
  const verlegd = btwVerlegd({ btw_nummer: btwNummer });
  const t = totalen([{ bedrag_ex_btw: ex, btw_promille: Number(product.btw_promille ?? 210) }], { verlegd });
  return { plaatsen: n, prijs_plaats_cent: product.prijs_ex_btw, ex: t.ex, btw: t.btw, totaal: t.totaal, verlegd };
}

export function vervaldatum(vanaf = new Date(), dagen = BETAALTERMIJN_DAGEN){
  const d = new Date(vanaf); d.setUTCDate(d.getUTCDate() + dagen);
  return d.toISOString().slice(0, 10);
}

const tekst = (v, max = 200) => String(v ?? "").trim().slice(0, max);

/* De invoer schoonmaken en controleren. Puur, zodat het te testen is. */
export function controleerInvoer(invoer = {}){
  const soort = tekst(invoer.product, 20);
  const code = PRODUCTEN[soort];
  if (!code) throw fout("Kies een programma.");
  const plaatsen = Math.floor(Number(invoer.plaatsen) || 0);
  if (plaatsen < 1 || plaatsen > 500) throw fout("Vul een aantal deelnemers in tussen 1 en 500.");
  const uit = {
    code, plaatsen,
    organisatie: tekst(invoer.organisatie, 160),
    contact_naam: tekst(invoer.contact_naam, 120),
    email: tekst(invoer.email, 200).toLowerCase(),
    telefoon: tekst(invoer.telefoon, 40) || null,
    klant_adres: tekst(invoer.klant_adres, 200),
    klant_postcode: tekst(invoer.klant_postcode, 20).toUpperCase(),
    klant_plaats: tekst(invoer.klant_plaats, 120),
    klant_btw_nummer: tekst(invoer.klant_btw_nummer, 30).toUpperCase().replace(/\s/g, "") || null,
    referentie: tekst(invoer.referentie, 80) || null,
    deelnemers: tekst(invoer.deelnemers, 4000) || null,
    opmerking: tekst(invoer.opmerking, 2000) || null,
    herkomst: /^[a-z0-9_-]{1,40}$/i.test(String(invoer.src || "")) ? String(invoer.src).toLowerCase() : null
  };
  if (uit.organisatie.length < 2) throw fout("Vul de naam van de organisatie in.");
  if (uit.contact_naam.length < 2) throw fout("Vul je naam in.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(uit.email)) throw fout("Vul een geldig e-mailadres in.");
  if (!uit.klant_adres || !uit.klant_postcode || !uit.klant_plaats) throw fout("Vul het factuuradres in: adres, postcode en plaats.");
  if (invoer.akkoord !== true && invoer.akkoord !== "true" && invoer.akkoord !== "on") throw fout("Vink aan dat je je namens de organisatie aanmeldt.");
  return uit;
}

export async function stuur(naar, mail, bijlagen){
  if (!process.env.RESEND_API_KEY || !naar) return false;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const uit = await resend.emails.send({
    from: AFZENDER, to: naar, replyTo: BEDRIJF.email, subject: mail.subject, html: mail.html,
    ...(bijlagen ? { attachments: bijlagen } : {})
  });
  return !(uit && uit.error);
}

export function basisUrl(req){
  return process.env.SITE_URL || `https://${req?.headers?.host || "scan.happly.nl"}`;
}

export function betaalUrl(basis, token){
  return `${basis}/api/sterker-betaal?t=${encodeURIComponent(token)}`;
}

/* ---------------------------------------------------------------- mails */

const FONT = "'DM Sans',Helvetica,Arial,sans-serif";
const DP = "#1A0B2E", PK = "#D6026F", TX = "#3A2E46", MUT = "#6A5A78";

export function ontsnap(t){
  return String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function p(t){ return `<p style="font-family:${FONT};font-size:14px;color:${TX};line-height:1.7;margin:0 0 13px">${t}</p>`; }
function knop(t, url){
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 8px"><tr><td style="background:${PK};border-radius:999px">
    <a href="${url}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:14px;font-weight:600;color:#fff;text-decoration:none">${t}</a></td></tr></table>`;
}
export function voorwoord(inhoud){
  return `<div style="background:#F7F3F0;padding:32px 16px 0"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 32px 22px">${inhoud}</div></div>`;
}

export function factuurOpenMail(factuur, a, url){
  const voornaam = ontsnap(String(a.contact_naam).split(/\s+/)[0]);
  const intro =
    p(`${voornaam},`) +
    p(`Dank je voor de aanmelding van ${ontsnap(a.organisatie)} voor Sterker op je werk. Hieronder staat de factuur, en als pdf in de bijlage.`) +
    p(`Je kunt meteen betalen met creditcard, iDEAL of een andere manier die Mollie aanbiedt. De betaaltermijn is ${BETAALTERMIJN_DAGEN} dagen, tot en met ${ontsnap(nederlandseDatum(factuur.vervaldatum))}.`) +
    knop(`Betaal ${euro(factuur.bedrag_totaal)}`, url) +
    p(`We nemen binnen twee werkdagen contact met je op om de coach en het vaste moment in de week te plannen.`);
  return { subject: `Factuur ${factuur.nummer}: Sterker op je werk`, html: voorwoord(intro) + bouwFactuurHtml(factuur, BEDRIJF) };
}

export function betaaldMail(factuur, a){
  const voornaam = ontsnap(String(a.contact_naam).split(/\s+/)[0]);
  const inhoud =
    p(`${voornaam},`) +
    p(`We hebben de betaling van factuur ${ontsnap(factuur.nummer)} ontvangen, ${euro(factuur.bedrag_totaal)}. Dank je.`) +
    p(`We plannen nu de coach en het vaste moment in de week. Je hoort binnen twee werkdagen van ons.`);
  return { subject: `Betaling ontvangen: factuur ${factuur.nummer}`, html: voorwoord(inhoud) };
}

export function meldingMail(a, factuur){
  const r = (k, v) => v ? `<tr><td style="padding:3px 12px 3px 0;color:${MUT};font-family:${FONT};font-size:13px">${k}</td><td style="font-family:${FONT};font-size:13px;color:${TX}">${ontsnap(v)}</td></tr>` : "";
  const inhoud = p(`<b style="color:${DP}">Nieuwe aanmelding Sterker op je werk</b>`) +
    `<table role="presentation">${r("Organisatie", a.organisatie)}${r("Programma", a.product_code)}${r("Deelnemers", String(a.plaatsen))}
     ${r("Contact", a.contact_naam)}${r("E-mail", a.email)}${r("Telefoon", a.telefoon)}${r("Factuur", factuur ? `${factuur.nummer}, ${euro(factuur.bedrag_totaal)}` : "niet gemaakt")}
     ${r("Referentie", a.referentie)}${r("Namen", a.deelnemers)}${r("Opmerking", a.opmerking)}${r("Herkomst", a.herkomst)}</table>`;
  return { subject: `Aanmelding: ${a.organisatie}, ${a.plaatsen} x ${a.product_code}`, html: voorwoord(inhoud) };
}

/* ------------------------------------------------------------ aanmelden */

export async function meldAan(db, req, invoer){
  const v = controleerInvoer(invoer);
  const pr = await db.from("producten").select("*").eq("code", v.code).eq("actief", true).maybeSingle();
  if (!pr.data) throw fout(`Het product ${v.code} staat niet in de tabel producten. Draai eerst de migratie van 26 november.`, 500);
  const bedrag = aanmeldBedrag(pr.data, v.plaatsen, v.klant_btw_nummer);
  const token = crypto.randomBytes(18).toString("base64url");

  const { code, ...velden } = v;
  const ins = await db.from("sterker_aanmeldingen").insert({
    ...velden, token, product_code: code,
    prijs_plaats_cent: bedrag.prijs_plaats_cent, bedrag_ex_cent: bedrag.ex, btw_cent: bedrag.btw, bedrag_cent: bedrag.totaal
  }).select("*").single();
  if (ins.error) throw new Error(`aanmelding opslaan mislukt: ${ins.error.message}`);
  const a = ins.data;

  const url = betaalUrl(basisUrl(req), token);
  let factuur = null, uitkomst = "";
  try{
    const f = await maakAanmeldFactuur(db, a, pr.data, url);
    factuur = f.factuur; uitkomst = f.uitkomst;
  }catch(e){ uitkomst = `factuur mislukt: ${String(e.message).slice(0, 100)}`; }

  try{ await stuur(MELDING_AAN, meldingMail(a, factuur)); }catch(e){ /* de aanmelding staat er */ }
  return { token, betaalUrl: url, bedrag, factuur: factuur ? { nummer: factuur.nummer, vervaldatum: factuur.vervaldatum } : null, uitkomst };
}

/* De factuur direct na aanmelding. Hoogstens één per aanmelding (unieke index
   op facturen.sterker_id). Zonder complete bedrijfsgegevens geen factuur, wel
   een bericht aan Happly. */
export async function maakAanmeldFactuur(db, a, product, url){
  const bestaat = await db.from("facturen").select("*").eq("sterker_id", a.id).maybeSingle();
  if (bestaat.data) return { factuur: bestaat.data, uitkomst: `factuur ${bestaat.data.nummer} stond er al` };
  if (!bedrijfCompleet()) return { factuur: null, uitkomst: "geen factuur: bedrijfsgegevens onvolledig" };

  const klant = { naam: a.organisatie, adres: a.klant_adres, postcode: a.klant_postcode, plaats: a.klant_plaats, land: a.klant_land || "NL", btw_nummer: a.klant_btw_nummer };
  const verlegd = btwVerlegd(klant);
  const regels = [{
    code: a.product_code,
    omschrijving: product?.naam || "Sterker op je werk",
    aantal: a.plaatsen,
    stuk_ex_btw: a.prijs_plaats_cent,
    bedrag_ex_btw: a.prijs_plaats_cent * a.plaatsen,
    btw_promille: Number(product?.btw_promille ?? 210)
  }];
  const bedrag = totalen(regels, { verlegd });
  const nummer = await db.rpc("volgend_factuurnummer");
  if (nummer.error || !nummer.data) throw new Error("geen factuurnummer gekregen");
  const vandaag = new Date().toISOString().slice(0, 10);
  const ins = await db.from("facturen").insert({
    nummer: nummer.data, soort: "factuur", sterker_id: a.id,
    periode_van: vandaag, periode_tot: vandaag, vervaldatum: vervaldatum(),
    bedrag_ex_btw: bedrag.ex, btw_cent: bedrag.btw, bedrag_totaal: bedrag.totaal,
    btw_verlegd: verlegd, btw_nummer: klant.btw_nummer, status: "open",
    klant_naam: klant.naam, klant_adres: klant.adres, klant_postcode: klant.postcode,
    klant_plaats: klant.plaats, klant_land: klant.land, klant_referentie: a.referentie,
    regels
  }).select("*").single();
  if (ins.error){
    if (/duplicate|unique/i.test(ins.error.message || "")){
      const nu = await db.from("facturen").select("*").eq("sterker_id", a.id).maybeSingle();
      return { factuur: nu.data, uitkomst: "factuur werd net al gemaakt" };
    }
    throw new Error(`factuur opslaan mislukt: ${ins.error.message}`);
  }
  const factuur = ins.data;
  await db.from("sterker_aanmeldingen").update({ factuur_id: factuur.id }).eq("id", a.id);

  let bijlage = null;
  try{
    const pdf = await maakFactuurPdf(factuur, BEDRIJF);
    const pad = `${new Date().getFullYear()}/${factuur.nummer}.pdf`;
    const opslag = await db.storage.from("facturen").upload(pad, pdf, { contentType: "application/pdf", upsert: true });
    if (!opslag.error) await db.from("facturen").update({ pdf_pad: pad }).eq("id", factuur.id);
    bijlage = { filename: `factuur-${factuur.nummer}.pdf`, content: pdf.toString("base64") };
  }catch(e){ /* de factuur staat er; de mail bevat hem ook volledig */ }

  if (await stuur(a.email, factuurOpenMail(factuur, a, url), bijlage ? [bijlage] : null)){
    await db.from("facturen").update({ verstuurd_op: new Date().toISOString() }).eq("id", factuur.id);
    return { factuur, uitkomst: `factuur ${factuur.nummer} verstuurd` };
  }
  return { factuur, uitkomst: `factuur ${factuur.nummer} gemaakt` };
}

/* ---------------------------------------------------------------- betalen */

export async function zoekOpToken(db, token){
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token || ""))) return null;
  const r = await db.from("sterker_aanmeldingen").select("*").eq("token", token).maybeSingle();
  return r.data || null;
}

/* Maakt op het moment van klikken een betaling bij Mollie. */
export async function startBetaling(db, req, a){
  if (a.status === "betaald") return { betaald: true };
  const basis = basisUrl(req);
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";
  const doorlaat = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? `&x-vercel-protection-bypass=${encodeURIComponent(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)}` : "";
  const f = a.factuur_id ? (await db.from("facturen").select("nummer").eq("id", a.factuur_id).maybeSingle()).data : null;
  const betaling = await maakBetaling({
    centen: a.bedrag_cent,
    omschrijving: f ? `Happly factuur ${f.nummer}` : `Happly, Sterker op je werk, ${a.organisatie}`.slice(0, 120),
    redirectUrl: `${basis}/sterker-betaald?t=${encodeURIComponent(a.token)}`,
    webhookUrl: `${basis}/api/sterker-webhook?s=${encodeURIComponent(geheim)}${doorlaat}`,
    metadata: { sterker_id: a.id }
  });
  await db.from("sterker_aanmeldingen").update({ mollie_payment_id: betaling.id }).eq("id", a.id);
  return { betaalpagina: betaling?._links?.checkout?.href || null };
}

/* De melding van Mollie. Idempotent: betaald zetten gebeurt één keer. */
export async function verwerkSterkerBetaling(db, a, mollieStatus, mollieId){
  if (mollieStatus !== "paid") return `aanmelding ${a.id}: ${mollieStatus || "nog niets"}`;
  if (a.status === "betaald") return `aanmelding ${a.id} stond al op betaald`;
  const nu = new Date().toISOString();
  const upd = await db.from("sterker_aanmeldingen")
    .update({ status: "betaald", betaald_op: nu, mollie_payment_id: mollieId })
    .eq("id", a.id).neq("status", "betaald").select("*").maybeSingle();
  if (!upd.data) return `aanmelding ${a.id} stond al op betaald`;

  let factuur = null;
  if (a.factuur_id){
    const f = await db.from("facturen").update({ status: "betaald", betaald_op: nu, mollie_payment_id: mollieId })
      .eq("id", a.factuur_id).select("*").maybeSingle();
    factuur = f.data;
  }
  try{
    if (factuur) await stuur(a.email, betaaldMail(factuur, a));
    await stuur(MELDING_AAN, { subject: `Betaald: ${a.organisatie}${factuur ? `, factuur ${factuur.nummer}` : ""}`,
      html: voorwoord(p(`${ontsnap(a.organisatie)} heeft betaald${factuur ? `: factuur ${ontsnap(factuur.nummer)}, ${euro(factuur.bedrag_totaal)}` : ""}.`)) });
  }catch(e){ /* betaald staat vast */ }
  return `aanmelding ${a.id} betaald${factuur ? `, factuur ${factuur.nummer} betaald` : ""}`;
}

/* Haalt de stand bij Mollie op en verwerkt hem. Voor de melding en voor de
   terugkeerpagina, die niet op de melding hoeft te wachten. */
export async function verwerkMollieId(db, mollieId, haal){
  const betaling = await haal(mollieId);
  const id = betaling?.metadata?.sterker_id || null;
  let q = db.from("sterker_aanmeldingen").select("*");
  q = id ? q.eq("id", id) : q.eq("mollie_payment_id", mollieId);
  const r = await q.maybeSingle();
  if (!r.data) return "geen aanmelding gevonden";
  return verwerkSterkerBetaling(db, r.data, betaling.status, mollieId);
}
