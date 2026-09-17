// api/leidersbeeld-kopen.js — Vercel serverless function
// De stap tussen het Leidersbeeld en de betaling: er komt een team, en het
// Leidersbeeld gaat eraan vast (A5 van briefings/leidersbeeld.md).
//
// Waarom hier een account nodig is terwijl het Leidersbeeld er geen vraagt: wie
// koopt, gaat daarna de meetlink delen, de deelnemers volgen en de kaart
// bekijken. Dat is geen pagina met een token maar een eigen omgeving. Het
// Leidersbeeld blijft gratis en zonder account; pas de aankoop vraagt er een.
//
// De betaling zelf loopt daarna langs /api/betaling-start, precies zoals bij
// elke andere losse koper. Dit is geen tweede betaalweg.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { magKoppelen, teamnaamVoor, verderDan } from "../leidersbeeld-koppelen.js";
import { neemLeiderdoelOver } from "../teamkracht-ruimte-db.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const maakToken = () =>
  Array.from({ length: 6 }, () => ALFABET[Math.floor(Math.random() * ALFABET.length)]).join("");

export default async function handler(req, res){
  // GET is openbaar en gaat op het token uit de mail, net als /leider/:token.
  // De koopagina heeft de naam en het adres nodig om ze niet nog eens te
  // hoeven vragen aan iemand die ze een week geleden al gaf.
  if (req.method === "GET") return await gegevens(req, res);
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res, ["lezer", "coach", "beheerder"]);
  if (!gebruiker) return;

  const token = String((typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {})).token || "");
  if (!UUID.test(token)){ res.status(400).json({ error: "ongeldige link" }); return; }

  const db = serviceClient();
  try{
    const q = await db.from("teamkracht_leidersbeeld")
      .select("id, team_id, status, leider_naam, leider_email, organisatie, teamomvang, partner_id, doel_tekst, doel_datum, doeltype")
      .eq("leider_token", token).maybeSingle();
    if (q.error || !q.data){ res.status(404).json({ error: "onbekende link" }); return; }
    const rij = q.data;

    const bezwaar = magKoppelen(rij, {
      email: gebruiker.email, userId: gebruiker.user_id, beheerder: gebruiker.rol === "beheerder"
    });
    if (bezwaar){ res.status(403).json({ error: bezwaar }); return; }

    // Het team krijgt de naam van de organisatie en de leider als coach. Hij
    // kan het later hernoemen; een team zonder naam is geen team.
    let team = null;
    for (let poging = 0; poging < 10 && !team; poging++){
      const ins = await db.from("teamkracht_teams").insert({
        naam: teamnaamVoor(rij),
        organisatie: rij.organisatie,
        coach_naam: rij.leider_naam,
        coach_user_id: gebruiker.user_id,
        token: maakToken()
      }).select("id, naam, token").single();
      if (!ins.error){ team = ins.data; break; }
      if (!/duplicate|unique/i.test(ins.error.message || "")) throw ins.error;
    }
    if (!team){ res.status(500).json({ error: "geen vrij token gevonden" }); return; }

    // Het doel van de leider is het voorlopige doel van het team (L5); het
    // team bevestigt of past het aan bij de meting.
    await neemLeiderdoelOver(db, team.id, rij);

    // Pas nu vast aan het Leidersbeeld. Andersom zou een mislukte teamaanmaak
    // een lead achterlaten die aan niets hangt.
    const bij = await db.from("teamkracht_leidersbeeld")
      .update({ team_id: team.id, status: verderDan(rij.status, "gekoppeld") })
      .eq("id", rij.id).is("team_id", null)
      .select("id").maybeSingle();
    if (!bij.data){
      // Iemand anders was net eerder. Het team blijft staan, maar de koppeling
      // gaat niet dubbel.
      res.status(409).json({ error: "dit Leidersbeeld is net aan een ander team gekoppeld" }); return;
    }

    res.status(200).json({ ok: true, team_id: team.id, team_token: team.token, naam: team.naam });
  }catch(e){
    await logFout("leidersbeeld-kopen", e.message);
    res.status(500).json({ error: "koppelen mislukt" });
  }
}

async function gegevens(req, res){
  const token = String(req.query?.t || "");
  if (!UUID.test(token)){ res.status(404).json({ error: "onbekende link" }); return; }
  const db = serviceClient();
  const q = await db.from("teamkracht_leidersbeeld")
    .select("leider_naam, leider_email, organisatie, teamomvang, team_id, status")
    .eq("leider_token", token).maybeSingle();
  if (q.error || !q.data){ res.status(404).json({ error: "onbekende link" }); return; }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    leider_naam: q.data.leider_naam,
    leider_email: q.data.leider_email,
    organisatie: q.data.organisatie,
    teamomvang: q.data.teamomvang,
    al_gekoppeld: !!q.data.team_id,
    status: q.data.status
  });
}
