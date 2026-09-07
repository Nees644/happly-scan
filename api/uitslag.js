// api/uitslag.js — Vercel serverless function
// De eigen uitslag van een deelnemer op /uitslag/:token.
//
// Het token is het bewijs: wie het heeft, mag deze uitslag zien. Het staat
// alleen in de mail aan de deelnemer zelf, is een ander uuid dan het scan-id
// en dan het deel_id, en geeft nergens anders toegang toe. Geen sessie, geen
// inlog, en bewust geen enkele verwijzing naar het team.

import { createClient } from "@supabase/supabase-js";
import { bouwUitslagPagina } from "../uitslag-pagina.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function melding(res, code, tekst){
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(code).send(`<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Zelfkracht Index</title>
<style>body{font-family:system-ui,sans-serif;background:#F7F3F0;color:#1A0B2E;display:flex;min-height:100vh;
align-items:center;justify-content:center;padding:24px;margin:0}p{max-width:44ch;line-height:1.6;font-weight:300}</style>
</head><body><p>${tekst}</p></body></html>`);
}

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }

  const token = String(req.query?.t || "");
  if (!UUID.test(token)){
    melding(res, 400, "Deze link klopt niet. Controleer of je hem helemaal hebt gekopieerd uit je mail.");
    return;
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const q = await db.from("index_scan_results")
    .select("index_score, zien, sturen, doen, duiding, created_at, profiel_code")
    .eq("resultaat_token", token).single();
  if (q.error || !q.data){
    melding(res, 404, "Deze uitslag bestaat niet of is verlopen. Klopt de link uit je mail?");
    return;
  }

  // Het profiel hoort erbij zodra het team is doorgerekend; tot die tijd toont
  // de pagina gewoon de eigen uitslag zonder dat blok.
  let profiel = null;
  if (q.data.profiel_code){
    const p = await db.from("teamkracht_profielen")
      .select("code, naam, tekst_deelnemer")
      .eq("code", q.data.profiel_code).eq("actief", true).single();
    if (!p.error) profiel = p.data;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.status(200).send(bouwUitslagPagina({ meting: q.data, profiel }));
}
