// proefkwartier.js
// Het gratis proefkwartier voor leidinggevenden (27 november 2026).
// Twintig plekken in december. Wie zich aanmeldt, vult naam, mailadres,
// organisatie en een doel in; dat komt in proefkwartier_aanvragen, Maarten
// krijgt een bericht en de aanvrager gaat door naar cal.com met naam, mailadres
// en zijn antwoord alvast ingevuld.

import { stuur, voorwoord, p, ontsnap, MELDING_AAN } from "./sterker.js";

export const PLEKKEN = 20;
export const PERIODE_VAN = "2026-11-27";
export const PERIODE_TOT = "2026-12-31";
export const CAL_URL = "https://cal.com/maarten-neeskens-aoijqe/proefkwartier";

export const DOELEN = {
  rust: "Rust in je hoofd",
  grip: "Grip op je week",
  gesprek: "Het lastige gesprek",
  energie: "Energie over",
  team: "Een team dat oppakt",
  steviger: "Steviger staan"
};

export function fout(melding, status = 400){
  return Object.assign(new Error(melding), { status });
}

const tekst = (v, max = 200) => String(v ?? "").trim().slice(0, max);

export function controleer(invoer = {}){
  const uit = {
    naam: tekst(invoer.naam, 120),
    email: tekst(invoer.email, 200).toLowerCase(),
    organisatie: tekst(invoer.organisatie, 160) || null,
    doel: DOELEN[invoer.doel] ? invoer.doel : null,
    toelichting: tekst(invoer.toelichting, 1500) || null,
    leider_token: /^[A-Za-z0-9_-]{8,80}$/.test(String(invoer.t || "")) ? String(invoer.t) : null,
    herkomst: /^[a-z0-9_-]{1,40}$/i.test(String(invoer.src || "")) ? String(invoer.src).toLowerCase() : null
  };
  if (uit.naam.length < 2) throw fout("Vul je naam in.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(uit.email)) throw fout("Vul een geldig e-mailadres in.");
  if (!uit.doel) throw fout("Kies waar je sterker in wilt worden.");
  return uit;
}

/* Hoeveel plekken er nog zijn. Na de periode is het aanbod dicht. */
export async function plekkenOver(db, nu = new Date()){
  const dag = nu.toISOString().slice(0, 10);
  if (dag > PERIODE_TOT) return { over: 0, totaal: PLEKKEN, open: false };
  const r = await db.from("proefkwartier_aanvragen").select("id", { count: "exact", head: true })
    .gte("created_at", PERIODE_VAN);
  const bezet = r.count || 0;
  const over = Math.max(0, PLEKKEN - bezet);
  return { over, totaal: PLEKKEN, open: over > 0 };
}

/* De link naar cal.com, met naam, mailadres en antwoord alvast ingevuld. */
export function calLink(a){
  const u = new URL(CAL_URL);
  u.searchParams.set("name", a.naam);
  u.searchParams.set("email", a.email);
  const notitie = [`Sterker worden in: ${DOELEN[a.doel]}`, a.organisatie ? `Organisatie: ${a.organisatie}` : null, a.toelichting]
    .filter(Boolean).join("\n");
  u.searchParams.set("notes", notitie);
  return u.toString();
}

export function meldingMail(a, over){
  const r = (k, v) => v ? `<tr><td style="padding:3px 12px 3px 0;color:#6A5A78;font-size:13px">${k}</td><td style="font-size:13px">${ontsnap(v)}</td></tr>` : "";
  return {
    subject: `Proefkwartier: ${a.naam}${a.organisatie ? `, ${a.organisatie}` : ""}`,
    html: voorwoord(p(`<b>Nieuwe aanvraag proefkwartier</b>, nog ${over} van de ${PLEKKEN} plekken.`) +
      `<table role="presentation">${r("Naam", a.naam)}${r("E-mail", a.email)}${r("Organisatie", a.organisatie)}
       ${r("Sterker in", DOELEN[a.doel])}${r("Toelichting", a.toelichting)}${r("Leidersbeeld", a.leider_token ? "ja, uitslag via /leider/" + a.leider_token : null)}${r("Herkomst", a.herkomst)}</table>`)
  };
}

export async function vraagAan(db, invoer){
  const a = controleer(invoer);
  const stand = await plekkenOver(db);
  if (!stand.open) throw fout("De proefkwartieren voor december zijn vergeven.", 409);
  const ins = await db.from("proefkwartier_aanvragen").insert(a).select("*").single();
  if (ins.error) throw new Error(`aanvraag opslaan mislukt: ${ins.error.message}`);
  try{ await stuur(MELDING_AAN, meldingMail(a, stand.over - 1)); }catch(e){ /* de aanvraag staat er */ }
  return { cal: calLink(a), over: stand.over - 1 };
}
