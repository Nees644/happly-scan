// api/deelbeeld.js — Vercel serverless function
// Ontvangt het deelbeeld (PNG-data-URL) dat de uitslagpagina op het canvas
// heeft getekend en zet het in de publieke storage-bucket "deelbeelden" als
// <deel_id>.png; dat bestand is de og:image van de deelpagina (/deel/[id]).
// Eenmalig per meting (upsert uit; een bestaand beeld is nooit te overschrijven,
// zodat een publiek gedeelde kaart niet achteraf vervangen kan worden).
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Migratie 05-08-2026c vereist (kolom deel_id plus bucket deelbeelden).

import { createClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIX = "data:image/png;base64,";

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { deel_id, beeld } = body;
    if (!UUID.test(deel_id || "")){ res.status(400).json({error:"ongeldig id"}); return; }
    if (typeof beeld !== "string" || !beeld.startsWith(PREFIX) || beeld.length > 2500000){
      res.status(400).json({error:"ongeldig beeld"}); return;
    }

    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Alleen voor bestaande metingen; het deel_id is het bewijs van eigenaarschap.
    const q = await db.from("index_scan_results").select("id").eq("deel_id", deel_id).single();
    if (q.error){ res.status(404).json({error:"onbekende meting"}); return; }

    const buf = Buffer.from(beeld.slice(PREFIX.length), "base64");
    const up = await db.storage.from("deelbeelden")
      .upload(`${deel_id}.png`, buf, { contentType: "image/png", upsert: false });
    if (up.error){
      const bestaat = /exists|duplicate/i.test(up.error.message || "");
      res.status(bestaat ? 409 : 500).json({error: bestaat ? "beeld bestaat al" : "opslag mislukt"});
      return;
    }
    res.status(200).json({ ok: true });
  }catch(e){
    res.status(500).json({ error: "deelbeeld mislukt" });
  }
}
