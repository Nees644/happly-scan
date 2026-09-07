// api/teamkracht-doel.js — Vercel serverless function
// Legt het doelbeeld vast dat de coach met de schuifjes heeft bepaald
// (teamkracht-doel.html). Fase 2 van het traject; de tabel is aangelegd in de
// migratie 07-09-2026.
//
// Harde regel van de opdrachtgever (07-09-2026): Sturen en Doen komen bij het
// doelbeeld boven het landelijke beeld uit. Die grens zit in de schuifjes en
// wordt hier nog een keer gecontroleerd, want een grens in de browser is geen
// grens. Zien is vrij.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODES = ["sturen_doen_boven_norm", "naar_landelijk", "halverwege", "bundel"];

const getal = v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const { teambeeld_id, doel_code, doel_zien, doel_sturen, doel_doen, gekozen_door } = body;

  if (!UUID.test(teambeeld_id || "")){ res.status(400).json({ error: "ongeldig teambeeld_id" }); return; }
  if (!CODES.includes(doel_code)){ res.status(400).json({ error: "onbekende doel_code" }); return; }
  if (![doel_zien, doel_sturen, doel_doen].every(getal)){ res.status(400).json({ error: "doelwaarden moeten tussen 0 en 100 liggen" }); return; }
  if (!["team", "coach"].includes(gekozen_door)){ res.status(400).json({ error: "gekozen_door moet team of coach zijn" }); return; }

  const db = serviceClient();
  const beeld = await db.from("teamkracht_teambeeld")
    .select("id, team_id, norm_sturen, norm_doen").eq("id", teambeeld_id).single();
  if (beeld.error || !beeld.data){ res.status(404).json({ error: "onbekend teambeeld" }); return; }

  if (gebruiker.rol !== "beheerder"){
    const t = await db.from("teamkracht_teams").select("coach_user_id").eq("id", beeld.data.team_id).single();
    if (t.error || t.data?.coach_user_id !== gebruiker.user_id){
      res.status(403).json({ error: "geen toegang" }); return;
    }
  }

  // De norm die bij dit startbeeld is bevroren, niet de norm van vandaag.
  if (doel_sturen <= beeld.data.norm_sturen || doel_doen <= beeld.data.norm_doen){
    res.status(400).json({ error: "Sturen en Doen moeten boven het landelijke beeld liggen" });
    return;
  }

  // beoordeling blijft null zolang teamkracht_doelregels leeg is; zodra er
  // normdata is wordt de uitkomst hier bevroren, net als de norm bij het
  // teambeeld, zodat later zichtbaar blijft wat het team destijds is verteld.
  const ins = await db.from("teamkracht_doel").insert({
    teambeeld_id, doel_code, doel_zien, doel_sturen, doel_doen, gekozen_door,
    gekozen_user_id: gebruiker.user_id
  }).select("id, created_at").single();
  if (ins.error){ res.status(500).json({ error: "vastleggen mislukt" }); return; }

  res.status(200).json({ id: ins.data.id, created_at: ins.data.created_at });
}
