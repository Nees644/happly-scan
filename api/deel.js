// api/deel.js — Vercel serverless function
// De publieke deelpagina achter scan.happly.nl/deel/[id] (rewrite in
// vercel.json). Toont uitsluitend het gegenereerde deelbeeld met de deel_zin;
// nooit scores, namen of andere persoonsgegevens. De Open Graph-tags zorgen
// dat LinkedIn (via de share-offsite-knop op de uitslagpagina) het juiste
// beeld en de juiste tekst in het deelvenster zet.
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Migratie 05-08-2026c vereist (kolom deel_id plus bucket deelbeelden).

import { createClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE = "https://scan.happly.nl";
/* Terugvalzin, gelijk aan DEEL_CANON in scan.html; wijzig ze samen. */
const CANON = "Wat je vaak genoeg doet, wordt automatisch, en wat automatisch is, zie je niet meer.";

function esc(t){
  return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function pagina({ titel, og, inhoud }){
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(titel)}</title>
${og || ""}<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"DM Sans",sans-serif;background:#1A0B2E;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;gap:26px}
img.kaart{width:100%;max-width:440px;border-radius:14px;display:block}
.cta{display:inline-flex;align-items:center;gap:10px;background:#D6026F;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;transition:background .15s ease}
.cta:hover{background:#E870B8}
p.mis{color:#C9BBD2;font-size:15px;font-weight:300;max-width:44ch;text-align:center;line-height:1.7}
</style></head><body>${inhoud}</body></html>`;
}

export default async function handler(req, res){
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  try{
    const d = ((req.query && req.query.d) || "").trim();
    let zin = null;
    if (UUID.test(d)){
      const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const q = await db.from("index_scan_results").select("deel_zin").eq("deel_id", d).single();
      if (!q.error) zin = q.data.deel_zin || CANON;
    }

    if (!zin){
      res.status(404).send(pagina({
        titel: "Zelfkracht Index",
        inhoud: `<p class="mis">Deze deelpagina bestaat niet. De Zelfkracht Index zelf staat gewoon klaar.</p>
                 <a class="cta" href="${BASE}/scan?src=deel">Doe de Zelfkracht Index &rarr;</a>`
      }));
      return;
    }

    const tekst = `Deed net de Zelfkracht Index. Dit herkende ik: '${zin}'.`;
    const beeldUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/deelbeelden/${d}.png`;
    const og = `<meta property="og:type" content="website">
<meta property="og:url" content="${BASE}/deel/${d}">
<meta property="og:site_name" content="Zelfkracht Index">
<meta property="og:title" content="${esc(tekst)}">
<meta property="og:description" content="${esc(tekst)}">
<meta property="og:image" content="${esc(beeldUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1500">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(tekst)}">
<meta name="twitter:image" content="${esc(beeldUrl)}">
`;
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).send(pagina({
      titel: tekst,
      og,
      inhoud: `<img class="kaart" src="${esc(beeldUrl)}" alt="${esc(tekst)}">
               <a class="cta" href="${BASE}/scan?src=deel">Doe de Zelfkracht Index zelf &rarr;</a>`
    }));
  }catch(e){
    res.status(500).send(pagina({
      titel: "Zelfkracht Index",
      inhoud: `<p class="mis">Er ging iets mis bij het laden van deze pagina. Probeer het later nog eens.</p>
               <a class="cta" href="${BASE}/scan?src=deel">Doe de Zelfkracht Index &rarr;</a>`
    }));
  }
}
