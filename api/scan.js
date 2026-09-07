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
    const { index, zien, sturen, doen, items, age, work, duiding, duiding_fallback, deel_zin, team } = body;
    if ([index,zien,sturen,doen].some(v => typeof v !== "number")){
      res.status(400).json({error:"ongeldige invoer"}); return;
    }
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Teamtoken uit de link van de coach. Onbekend of ingetrokken token: de
    // meting wordt gewoon opgeslagen zonder koppeling, want een deelnemer die
    // de vragen heeft ingevuld mag zijn uitslag nooit kwijtraken aan een
    // typefout in een link.
    let teamId = null;
    if (typeof team === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(team.trim().toUpperCase())){
      const t = await db.from("teamkracht_teams")
        .select("id").eq("token", team.trim().toUpperCase()).eq("actief", true).single();
      if (!t.error && t.data) teamId = t.data.id;
    }

    const basis = {
      index_score: index,
      zien, sturen, doen,
      items: items || null,
      age_band: age || null,
      work_situation: work || null
    };
    // Losstaand, zodat het getrapte vangnet hieronder blijft werken als de
    // migratie 07-09-2026 nog niet is gedraaid.
    if (teamId) basis.teamkracht_team_id = teamId;
    const metDuiding = {
      ...basis,
      duiding: duiding || null,
      duiding_generated_at: duiding ? new Date().toISOString() : null,
      duiding_fallback: duiding ? !!duiding_fallback : null
    };
    // Getrapt vangnet zolang een migratie (deel_id 05-08-2026c, deel_zin
    // 05-08-2026b, duiding 24-07-2026) nog niet draait: van volledig naar basis.
    const volledig = {
      ...metDuiding,
      deel_zin: (typeof deel_zin === "string" && deel_zin.trim()) ? deel_zin.trim().slice(0,140) : null
    };
    let r = await db.from("index_scan_results").insert(volledig).select("id,deel_id").single();
    if (r.error){
      r = await db.from("index_scan_results").insert(volledig).select("id").single();
    }
    if (r.error){
      r = await db.from("index_scan_results").insert(metDuiding).select("id").single();
    }
    if (r.error){
      r = await db.from("index_scan_results").insert(basis).select("id").single();
    }
    if (r.error){ res.status(500).json({error:"opslag mislukt"}); return; }
    res.status(200).json({ id: r.data.id, deel_id: r.data.deel_id || null });
  }catch(e){
    res.status(500).json({ error: "opslag mislukt" });
  }
}
