// api/teamkracht-doelregels.js — Vercel serverless function
// De ambitiebanden voor de doelbeeldpagina. Geen persoonsgegevens, wel achter
// dezelfde authenticatie, omdat het beheerd materiaal is.

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const q = await serviceClient().from("teamkracht_doelregels")
    .select("code, titel, voorwaarde, oordeel, melding, actief, volgorde")
    .eq("actief", true).order("volgorde");
  if (q.error){ await logFout("teamkracht-doelregels", "ophalen mislukt"); res.status(500).json({ error: "ophalen mislukt" }); return; }
  res.status(200).json({ doelregels: q.data });
}
