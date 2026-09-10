// api/prijslijst.js — Vercel serverless function
// De prijs van een product, met de btw erbij gerekend. Openbaar, want prijzen
// zijn openbaar; het gaat via de view prijslijst zodat er nooit een kolom mee
// naar buiten kan die dat niet is.

import { createClient } from "@supabase/supabase-js";
import { bedragMetBtw } from "../betalen.js";

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const code = String(req.query?.code || "");

  if (code){
    const q = await db.from("prijslijst").select("*").eq("code", code).single();
    if (q.error || !q.data){ res.status(404).json({ error: "onbekend product" }); return; }
    res.status(200).json({ product: { ...q.data, ...bedragMetBtw(q.data) } });
    return;
  }

  const q = await db.from("prijslijst").select("*").order("soort").order("prijs_ex_btw");
  if (q.error){ res.status(500).json({ error: "ophalen mislukt" }); return; }
  res.status(200).json({ producten: (q.data || []).map(p => ({ ...p, ...bedragMetBtw(p) })) });
}
