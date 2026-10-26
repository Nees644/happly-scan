// api/volhoudkracht-uitslag.js — Vercel serverless function
// De uitslagpagina op /volhoudkracht/:token. Het token uit de mail is het
// bewijs; er is geen inlog. Onbekend token geeft 404 zonder informatie.
//
// Het gemiddelde van alle scans gaat pas mee vanaf dertig invullingen
// (MINIMUM_VOOR_GEMIDDELDE); daarvoor staat er geen referentie.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { bouwUitslagPagina } from "../volhoudkracht-pagina.js";
import { MINIMUM_VOOR_GEMIDDELDE } from "../volhoudkracht-items.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nietGevonden(res){
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(404).send(`<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Niet gevonden</title>
<style>body{font-family:system-ui,sans-serif;background:#F7F3F0;color:#1A0B2E;display:flex;min-height:100vh;
align-items:center;justify-content:center;padding:24px;margin:0}p{max-width:44ch;line-height:1.6}</style>
</head><body><p>Deze pagina bestaat niet. Klopt de link uit uw mail?</p></body></html>`);
}

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const token = String(req.query?.t || "");
  if (!UUID.test(token)){ nietGevonden(res); return; }

  try{
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const q = await db.from("volhoudkracht")
      .select("id, woord, programma_naam, score, band, zwakste, dim_reden, dim_plan, dim_ritme, dim_weerstand, dim_contact, dim_meting")
      .eq("token", token).maybeSingle();
    if (q.error || !q.data){ nietGevonden(res); return; }
    const rij = q.data;

    db.from("volhoudkracht").update({ mail_geopend_op: new Date().toISOString() })
      .eq("id", rij.id).is("mail_geopend_op", null).then(() => {}, () => {});

    let aantalScans = 0, gemiddelde = null;
    const tel = await db.from("volhoudkracht").select("score", { count: "exact" }).limit(1000);
    if (!tel.error && tel.data){
      aantalScans = tel.count ?? tel.data.length;
      if (aantalScans >= MINIMUM_VOOR_GEMIDDELDE && tel.data.length){
        gemiddelde = tel.data.reduce((s, r) => s + (r.score || 0), 0) / tel.data.length;
      }
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(bouwUitslagPagina(rij, { aantalScans, gemiddelde }));
  }catch(e){
    res.status(500).send("Er ging iets mis bij het ophalen van de uitslag.");
  }
}
