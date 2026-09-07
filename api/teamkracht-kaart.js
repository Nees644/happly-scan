// api/teamkracht-kaart.js — Vercel serverless function
// De Teamkrachtkaart van een berekend teambeeld, als HTML of als losse SVG.
// Formaat a4, a3 of a1 liggend; afdrukken naar PDF gaat via de browser, de
// print-CSS zet het papierformaat goed. Vereist de migratie 07-09-2026.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";
import { bouwKaartHtml, tekenKaartSvg } from "../teamkracht-kaart.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATEN = ["a4", "a3", "a1"];

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const id = String(req.query?.teambeeld_id || "");
  const formaat = FORMATEN.includes(req.query?.formaat) ? req.query.formaat : "a4";
  const als = req.query?.als === "svg" ? "svg" : "html";
  const poster = req.query?.poster === "1";
  if (!UUID.test(id)){ res.status(400).json({ error: "ongeldig teambeeld_id" }); return; }

  const db = serviceClient();
  const beeld = await db.from("teamkracht_teambeeld").select("*").eq("id", id).single();
  if (beeld.error || !beeld.data){ res.status(404).json({ error: "onbekend teambeeld" }); return; }

  const team = await db.from("teamkracht_teams")
    .select("naam, coach_user_id").eq("id", beeld.data.team_id).single();
  if (team.error){ res.status(404).json({ error: "onbekend team" }); return; }
  if (gebruiker.rol !== "beheerder" && team.data.coach_user_id !== gebruiker.user_id){
    res.status(403).json({ error: "geen toegang" }); return;
  }

  if (als === "svg"){
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.status(200).send(tekenKaartSvg(beeld.data));
    return;
  }

  const [regels, profielen] = await Promise.all([
    db.from("teamkracht_regels")
      .select("code, titel, titel_geteld, richting, dynamiek, interventie, gespreksvraag").eq("actief", true),
    db.from("teamkracht_profielen").select("code, naam").eq("actief", true)
  ]);
  if (regels.error || profielen.error){ res.status(500).json({ error: "teksten niet leesbaar" }); return; }

  const html = bouwKaartHtml({
    teambeeld: beeld.data,
    regels: regels.data || [],
    profielen: profielen.data || [],
    teamnaam: team.data.naam,
    formaat,
    poster
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
