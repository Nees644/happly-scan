// api/zelfstarters-check.js, Vercel serverless function
// De openbare controle van een registratie. Twee vormen:
//
// GET /zs/:nummer                     pagina, voor de link achter een badge
// GET /api/zelfstarters-check?q=...   JSON, voor het zoekveld op zelfstarters.nl
//
// Openbaar is alleen: geregistreerd of geverifieerd, Standaard of Plus, sinds
// wanneer, de jaartallen. Geen score, geen ringen, geen groei: die deelt de
// professional zelf (reglement, artikel 5). Zoeken op naam geeft alleen een
// treffer bij een exacte naam en met toestemming, zodat de lijst niet is af
// te struinen.

import { serviceClient } from "../teamkracht-auth.js";
import { controleRij, nummerIsGeldig, bouwZelfstarterBadgeSvg, BASIS_URL } from "../zelfstarters-badge.js";

const VELDEN = "status, nummer, naam, openbaar, betaald_op, eerste_meting_op, laatste_meting_op, meetjaren, plus_class_gevolgd_op, verificatiecode";
const TOEGESTAAN = ["https://zelfstarters.nl", "https://www.zelfstarters.nl", "https://scan.happly.nl"];

function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c])); }

async function zoek(db, q){
  const tekst = String(q || "").trim();
  if (!tekst) return null;
  if (nummerIsGeldig(tekst.toUpperCase())){
    const r = await db.from("zelfstarters").select(VELDEN).eq("nummer", tekst.toUpperCase()).maybeSingle();
    return r.data || null;
  }
  if (tekst.length < 4) return null;
  const r = await db.from("zelfstarters").select(VELDEN).in("status", ["geregistreerd", "betaald"]).eq("openbaar", true)
    .ilike("naam", tekst).limit(1);
  return (r.data || [])[0] || null;
}

function pagina(rij){
  const plus = rij?.plus;
  const kleur = !rij ? "#5b6478" : rij.geldig ? "#0f1f3d" : (rij.toestand === "geregistreerd" ? "#5b6478" : "#b23b0a");
  const kop = !rij ? "Geen registratie gevonden"
    : rij.toestand === "geldig" ? (plus ? "Geverifieerde registratie, Plus" : "Geverifieerde registratie")
    : rij.toestand === "niet actief" ? "Registratie niet actief"
    : rij.toestand === "geregistreerd" ? "Geregistreerd, nog niet geverifieerd"
    : "Registratie wacht op de eerste meting";
  const badge = rij ? bouwZelfstarterBadgeSvg({ plus, meetjaren: rij.meetjaren, verlopen: rij.toestand !== "geldig", maat: 140 }) : "";
  const regels = rij ? `
    <table>
      <tr><td>Nummer</td><td><b>${esc(rij.nummer)}</b></td></tr>
      ${rij.naam ? `<tr><td>Naam</td><td>${esc(rij.naam)}</td></tr>` : ""}
      <tr><td>Status</td><td>${rij.geverifieerd ? (plus ? "Geverifieerd, Plus" : "Geverifieerd") : "Geregistreerd"}</td></tr>
      <tr><td>Sinds</td><td>${esc(rij.sinds || "")}</td></tr>
      ${rij.geverifieerd ? `<tr><td>Laatste meting</td><td>${rij.laatste_meting ? esc(rij.laatste_meting) : "nog niet gemeten"}</td></tr>
      <tr><td>Jaartallen</td><td>${(rij.meetjaren || []).join(" · ") || "nog geen"}</td></tr>` : `<tr><td>Jaartallen</td><td>na verificatie</td></tr>`}
    </table>` : `<p class="m">Controleer het nummer (vorm ZS-2026-00123) of de exacte naam. Niet elke professional heeft zijn naam openbaar gezet; het nummer werkt altijd.</p>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(kop)} · Zelfstartregister</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;font-family:Nunito,system-ui,sans-serif;background:#f6f4ef;color:#121826;line-height:1.55}
.w{max-width:620px;margin:0 auto;padding:40px 20px}
.brand{display:flex;align-items:center;gap:10px;font-family:Outfit,sans-serif;font-weight:800;text-decoration:none;color:#121826}
.brand small{display:block;font-family:Nunito;font-weight:600;font-size:.72rem;color:#5b6478;letter-spacing:.08em;text-transform:uppercase}
.card{background:#fff;border:1px solid #e3dfd6;border-radius:22px;padding:30px;margin-top:26px;display:grid;grid-template-columns:150px 1fr;gap:26px;align-items:start}
h1{font-family:Outfit,sans-serif;font-size:1.6rem;margin:0 0 12px;color:${kleur}}
table{border-collapse:collapse;width:100%}td{padding:7px 0;border-bottom:1px solid #eee8dc;font-size:.95rem}td:first-child{color:#5b6478;width:40%}
.m{color:#5b6478}
.foot{color:#5b6478;font-size:.85rem;margin-top:24px}
@media(max-width:560px){.card{grid-template-columns:1fr}}
</style></head><body><div class="w">
<a class="brand" href="${BASIS_URL}"><svg width="36" height="36" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0f1f3d"/><circle cx="20" cy="20" r="13" fill="#fff"/><circle cx="20" cy="20" r="8" fill="#ff6a2b"/><circle cx="20" cy="20" r="3" fill="#fff"/></svg><span>Zelfstarters<small>De ontwikkelstructuur voor zelfstandige professionals</small></span></a>
<div class="card"><div>${badge}</div><div><h1>${esc(kop)}</h1>${regels}</div></div>
<p class="foot">Openbaar is alleen of een registratie geregistreerd of geverifieerd is, Standaard of Plus, sinds wanneer en de jaartallen. Score, ringen en groei deelt de professional zelf. <a href="${BASIS_URL}/reglement" style="color:#0f1f3d">Het reglement</a> · <a href="${BASIS_URL}" style="color:#0f1f3d">zelfstarters.nl</a></p>
</div></body></html>`;
}

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const db = serviceClient();
  const nummer = String(req.query?.nummer || "");
  const q = String(req.query?.q || "");
  res.setHeader("Cache-Control", "no-store");

  if (nummer){
    const rij = controleRij(await zoek(db, nummer));
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(rij ? 200 : 404).send(pagina(rij));
    return;
  }

  const herkomst = String(req.headers?.origin || "");
  if (TOEGESTAAN.includes(herkomst)){
    res.setHeader("Access-Control-Allow-Origin", herkomst);
    res.setHeader("Vary", "Origin");
  }
  const rij = controleRij(await zoek(db, q));
  if (!rij){ res.status(404).json({ gevonden: false }); return; }
  const { verificatiecode, ...openbaar } = rij;
  res.status(200).json({ gevonden: true, ...openbaar, pagina: `https://scan.happly.nl/zs/${rij.nummer}` });
}
