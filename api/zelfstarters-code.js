// api/zelfstarters-code.js, Vercel serverless function
// Een kortingscode controleren voordat de klant betaalt.
// GET ?code=KNAB-42  ->  { partner: { naam, code, korting_pct }, prijzen }
// Een onbekende code geeft 400 met een leesbare fout.

import { serviceClient } from "../teamkracht-auth.js";
import { prijzen, partnerBijCode } from "./zelfstarters-start.js";

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  res.setHeader("Cache-Control", "no-store");
  const db = serviceClient();
  try{
    const partner = await partnerBijCode(db, req.query?.code);
    if (!partner){ res.status(400).json({ error: "Vul een kortingscode in." }); return; }
    res.status(200).json({ partner: { naam: partner.naam, code: partner.code, korting_pct: partner.korting_pct }, prijzen: await prijzen(db, partner) });
  }catch(e){
    res.status(e.status || 500).json({ error: e.message });
  }
}
