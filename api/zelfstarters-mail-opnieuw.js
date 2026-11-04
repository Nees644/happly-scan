// api/zelfstarters-mail-opnieuw.js, Vercel serverless function
// Beheer: een Zelfstarters-mail opnieuw sturen naar een registratie.
// Beschermd met ZS_BEHEER_SLEUTEL (zelf gekozen, in Vercel) of CRON_SECRET.
//
// GET /api/zelfstarters-mail-opnieuw?nummer=ZS-2026-00001&soort=badge&s=<sleutel>
// soort: badge, welkom, uitslag, vervolg, plan

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { stuurMailOpnieuw } from "../zelfstarters-verwerken.js";
import { nummerIsGeldig } from "../zelfstarters-badge.js";

const SOORTEN = ["badge", "welkom", "uitslag", "vervolg", "plan"];

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const sleutels = [process.env.ZS_BEHEER_SLEUTEL, process.env.CRON_SECRET].filter(Boolean);
  const auth = String(req.headers?.authorization || "").replace(/^Bearer /, "");
  const s = String(req.query?.s || "");
  if (!sleutels.length || !sleutels.some(k => k === s || k === auth)){ res.status(401).json({ error: "unauthorized" }); return; }
  const nummer = String(req.query?.nummer || "").toUpperCase();
  const soort = String(req.query?.soort || "");
  if (!nummerIsGeldig(nummer) || !SOORTEN.includes(soort)){ res.status(400).json({ error: "nummer of soort ongeldig" }); return; }
  try{
    const uitkomst = await stuurMailOpnieuw(serviceClient(), nummer, soort);
    res.status(200).json({ uitkomst });
  }catch(e){
    await logFout("zelfstarters-mail-opnieuw", e.message);
    res.status(502).json({ error: e.message });
  }
}
