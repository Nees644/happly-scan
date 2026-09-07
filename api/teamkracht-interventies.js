// api/teamkracht-interventies.js — Vercel serverless function
// De interventiebibliotheek en de profielnamen voor de doelbeeldpagina.
// Geen persoonsgegevens; wel achter dezelfde authenticatie als het dashboard,
// omdat het materiaal van de opdrachtgever is. Vereist de migratie 07-09-2026.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const db = serviceClient();
  const [i, p] = await Promise.all([
    db.from("teamkracht_interventies")
      .select("code, titel, breuk, profielen, tekst, eigenaar_suggestie, ritme, telling, gespreksvraag, volgorde")
      .eq("actief", true).order("volgorde"),
    db.from("teamkracht_profielen").select("code, naam").eq("actief", true)
  ]);
  if (i.error || p.error){ res.status(500).json({ error: "ophalen mislukt" }); return; }

  res.status(200).json({ interventies: i.data, profielen: p.data });
}
