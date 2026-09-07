// api/teamkracht-teambeeld.js — Vercel serverless function
// Geeft één berekend teambeeld terug, zonder persoonsgegevens. Achter dezelfde
// authenticatie als het dashboard: alleen de coach van dat team of de
// beheerder. Vereist de migratie 07-09-2026.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const id = String(req.query?.id || "");
  if (!UUID.test(id)){ res.status(400).json({ error: "ongeldig id" }); return; }

  const db = serviceClient();
  const q = await db.from("teamkracht_teambeeld")
    .select("id, soort, n, team_zien, team_sturen, team_doen, norm_zien, norm_sturen, norm_doen, verdeling, breuk, dynamieken, lijnen, config_snapshot, team_id")
    .eq("id", id).single();
  if (q.error || !q.data){ res.status(404).json({ error: "onbekend teambeeld" }); return; }

  // Een coach ziet alleen de teams die van hem zijn; de beheerder alles.
  if (gebruiker.rol !== "beheerder"){
    const t = await db.from("teamkracht_teams").select("coach_user_id").eq("id", q.data.team_id).single();
    if (t.error || t.data?.coach_user_id !== gebruiker.user_id){
      res.status(403).json({ error: "geen toegang" }); return;
    }
  }

  const { team_id, ...beeld } = q.data;
  res.status(200).json(beeld);
}
