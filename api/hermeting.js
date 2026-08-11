// api/hermeting.js — Vercel serverless function
// Hermetingdetectie (briefing 12-08-2026): per e-mailadres telt alleen de eerste
// afgeronde meting mee in de onderzoeksdata. Dit endpoint checkt op de mailstap
// of een adres al eerder een afgeronde meting heeft, zodat de uitslagpagina de
// vriendelijke melding kan tonen. Het label zelf zet api/lead.js serverside.
// Antwoord bewust minimaal: alleen ja/nee en de datum van de eerste meting;
// nooit ids of scores (het scan-id blijft privé, zie de deel_id-migratie).
// Normalisatie identiek aan api/lead.js en de migratie 12-08-2026: trim + lower.
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      res.status(200).json({ hermeting:false }); return;
    }
    const adres = email.toLowerCase();
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    // Kleine tabel (orde honderden metingen): adressen ophalen en in JS
    // normaliseren is robuuster dan een ilike-patroon met wildcard-escaping.
    const q = await db.from("index_scan_results")
      .select("created_at,email")
      .not("email", "is", null)
      .order("created_at", { ascending: true });
    const eerste = (q.data || []).find(r => (r.email || "").trim().toLowerCase() === adres);
    if (!eerste){ res.status(200).json({ hermeting:false }); return; }
    res.status(200).json({ hermeting:true, eerste_datum: eerste.created_at });
  }catch(e){
    res.status(200).json({ hermeting:false });   // detectie mag de flow nooit breken
  }
}
