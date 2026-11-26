// api/sterker-aanmelden.js, Vercel serverless function
// GET: de drie programma's met hun prijs uit de tabel producten, voor het
// formulier. POST: aanmelden; maakt de factuur en geeft de betaallink terug.

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { PRODUCTEN, meldAan } from "../sterker.js";

export default async function handler(req, res){
  const db = serviceClient();
  if (req.method === "GET"){
    const r = await db.from("producten").select("code, naam, prijs_ex_btw, bevat, voorwaarde")
      .in("code", Object.values(PRODUCTEN)).eq("actief", true);
    const uit = Object.entries(PRODUCTEN).map(([soort, code]) => {
      const p = (r.data || []).find(x => x.code === code);
      return p ? { soort, naam: p.naam, prijs_ex_btw: p.prijs_ex_btw, bevat: p.bevat, voorwaarde: p.voorwaarde } : null;
    }).filter(Boolean);
    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).json({ producten: uit });
    return;
  }
  if (req.method !== "POST"){ res.status(405).json({ error: "methode" }); return; }
  const invoer = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  try{
    const uit = await meldAan(db, req, invoer);
    res.status(200).json(uit);
  }catch(e){
    if (e.status && e.status < 500){ res.status(e.status).json({ error: e.message }); return; }
    await logFout("sterker-aanmelden", e.message);
    res.status(500).json({ error: "Het aanmelden lukte niet. Probeer het zo nog eens, of mail hallo@happly.nl." });
  }
}
