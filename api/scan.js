// api/scan.js — Vercel serverless function
// Slaat elke voltooide Index-meting op (voor de itemanalyse na 200 metingen),
// inclusief de gegenereerde duiding: één insert, geen latere update nodig.
// Serverside via de Supabase service role, zodat de anon-SELECT ingetrokken kan blijven.
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { index, zien, sturen, doen, items, age, work, duiding, duiding_fallback } = body;
    if ([index,zien,sturen,doen].some(v => typeof v !== "number")){
      res.status(400).json({error:"ongeldige invoer"}); return;
    }
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const basis = {
      index_score: index,
      zien, sturen, doen,
      items: items || null,
      age_band: age || null,
      work_situation: work || null
    };
    let r = await db.from("index_scan_results").insert({
      ...basis,
      duiding: duiding || null,
      duiding_generated_at: duiding ? new Date().toISOString() : null,
      duiding_fallback: duiding ? !!duiding_fallback : null
    }).select("id").single();
    if (r.error){
      // Vangnet zolang de duiding-migratie (supabase.sql, 24-07-2026) nog niet draait.
      r = await db.from("index_scan_results").insert(basis).select("id").single();
    }
    if (r.error){ res.status(500).json({error:"opslag mislukt"}); return; }
    res.status(200).json({ id: r.data.id });
  }catch(e){
    res.status(500).json({ error: "opslag mislukt" });
  }
}
