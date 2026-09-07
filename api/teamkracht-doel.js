// api/teamkracht-doel.js — Vercel serverless function
// Legt het doelbeeld vast dat de coach met de schuifjes heeft bepaald
// (teamkracht-doel.html). Fase 2 van het traject; de tabel is aangelegd in de
// migratie 07-09-2026.
//
// Harde regel van de opdrachtgever (07-09-2026): Sturen en Doen komen bij het
// doelbeeld boven het gemiddelde uit. Sinds 07-09-2026 geldt dat voor alle
// drie de vaardigheden, ook Zien. De schuifjes markeren het gemiddelde en de
// pagina meldt wat er nog onder blijft; blokkeren doet zij niet, want met het
// huidige gemiddelde zou dat voor veel teams een onhaalbaar doel afdwingen.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";
import { beoordeelDoel } from "../teamkracht-logica.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODES = ["sturen_doen_boven_norm", "naar_landelijk", "halverwege", "bundel"];

const getal = v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
/* Vrije tekst uit de browser: knippen op een redelijke lengte, leeg wordt null. */
const tekst = v => (typeof v === "string" && v.trim()) ? v.trim().slice(0, 600) : null;

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const { teambeeld_id, doel_code, doel_zien, doel_sturen, doel_doen, gekozen_door } = body;
  const plan = Array.isArray(body.plan) ? body.plan.slice(0, 20) : [];
  const horizon = Number.isInteger(body.horizon_maanden) ? body.horizon_maanden : 12;

  if (!UUID.test(teambeeld_id || "")){ res.status(400).json({ error: "ongeldig teambeeld_id" }); return; }
  if (!CODES.includes(doel_code)){ res.status(400).json({ error: "onbekende doel_code" }); return; }
  if (![doel_zien, doel_sturen, doel_doen].every(getal)){ res.status(400).json({ error: "doelwaarden moeten tussen 0 en 100 liggen" }); return; }
  if (!["team", "coach"].includes(gekozen_door)){ res.status(400).json({ error: "gekozen_door moet team of coach zijn" }); return; }
  if (horizon < 1 || horizon > 60){ res.status(400).json({ error: "horizon_maanden moet tussen 1 en 60 liggen" }); return; }

  const db = serviceClient();
  const beeld = await db.from("teamkracht_teambeeld")
    .select("id, team_id, team_zien, team_sturen, team_doen, norm_zien, norm_sturen, norm_doen")
    .eq("id", teambeeld_id).single();
  if (beeld.error || !beeld.data){ res.status(404).json({ error: "onbekend teambeeld" }); return; }

  if (gebruiker.rol !== "beheerder"){
    const t = await db.from("teamkracht_teams").select("coach_user_id").eq("id", beeld.data.team_id).single();
    if (t.error || t.data?.coach_user_id !== gebruiker.user_id){
      res.status(403).json({ error: "geen toegang" }); return;
    }
  }

  // Geen harde blokkade meer op de referentielijn (besluit 07-09-2026): met de
  // gemeten referentie zou die voor veel teams een sprong van meer dan vijftien
  // punten afdwingen, en dat is precies wat de doelregels onhaalbaar noemen.
  // Het oordeel wordt wel vastgelegd, bevroren, zodat later zichtbaar blijft
  // wat de coach te zien kreeg toen hij dit doel koos.
  const regels = await db.from("teamkracht_doelregels")
    .select("code, titel, voorwaarde, oordeel, melding, actief, volgorde").eq("actief", true);
  const beoordeling = beoordeelDoel(
    beeld.data,
    { zien: doel_zien, sturen: doel_sturen, doen: doel_doen },
    regels.data || [],
    horizon
  );
  beoordeling.boven_referentie = {
    sturen: doel_sturen > beeld.data.norm_sturen,
    doen: doel_doen > beeld.data.norm_doen
  };

  const ins = await db.from("teamkracht_doel").insert({
    teambeeld_id, doel_code, doel_zien, doel_sturen, doel_doen, gekozen_door,
    horizon_maanden: horizon, beoordeling,
    gekozen_user_id: gebruiker.user_id
  }).select("id, created_at").single();
  if (ins.error){ res.status(500).json({ error: "vastleggen mislukt" }); return; }

  const doel_id = ins.data.id;

  // Het interventieplan hoort bij het doel: wat het team gaat doen om de
  // verschuiving waar te maken. Mislukt dit, dan blijft het doel wel staan;
  // een half opgeslagen doel is beter dan geen doel.
  let planFout = null;
  if (plan.length){
    const rijen = plan
      .filter(r => typeof r.interventie_code === "string" && r.interventie_code.length <= 12)
      .map((r, i) => ({
        doel_id,
        interventie_code: r.interventie_code,
        eigen_tekst: tekst(r.eigen_tekst),
        eigenaar: tekst(r.eigenaar),
        ritme: tekst(r.ritme),
        telling: tekst(r.telling),
        eigen_gespreksvraag: tekst(r.eigen_gespreksvraag),
        volgorde: i + 1
      }));
    if (rijen.length){
      const p = await db.from("teamkracht_plan").insert(rijen);
      if (p.error) planFout = "plan niet opgeslagen";
    }

    // Oogst: elke vraag die de coach zelf formuleerde, naast de suggestie die
    // hij verving. Hier leert de bibliotheek van wat er echt wordt gevraagd.
    const geoogst = plan
      .filter(r => tekst(r.eigen_gespreksvraag)
                && tekst(r.eigen_gespreksvraag) !== tekst(r.suggestie))
      .map(r => ({
        interventie_code: r.interventie_code,
        suggestie: tekst(r.suggestie),
        vraag: tekst(r.eigen_gespreksvraag),
        coach_user_id: gebruiker.user_id,
        teambeeld_id
      }));
    if (geoogst.length) await db.from("teamkracht_coachvragen").insert(geoogst);
  }

  res.status(200).json({
    id: doel_id,
    created_at: ins.data.created_at,
    beoordeling,
    plan_opgeslagen: plan.length && !planFout,
    ...(planFout ? { waarschuwing: planFout } : {})
  });
}
