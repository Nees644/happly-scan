// api/prijs.js — Vercel serverless function
// Wat het pakket en de hermeting deze gebruiker kosten, en waarom. Sectie 8.4
// van de tarievenbriefing v3.
//
// Server-side, altijd. De frontend rekent nooit zelf een staffel uit: dan zou
// de knop een ander bedrag kunnen tonen dan er wordt afgeschreven, en dat is
// precies het soort verschil waar je een klant niet mee lastigvalt.
//
// GET /api/prijs            de prijzen voor deze gebruiker
// GET /api/prijs?team_id=…  idem, met het hermetingtegoed van dat team erbij

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { haalKoper, haalProducten } from "../koper-db.js";
import { prijskaart } from "../betalen.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const teamId = req.query?.team_id ? String(req.query.team_id) : null;
  if (teamId && !UUID.test(teamId)){ res.status(400).json({ error: "ongeldig team_id" }); return; }

  const db = serviceClient();

  try{
    const [wie, producten] = await Promise.all([
      haalKoper(db, gebruiker.user_id),
      haalProducten(db)
    ]);

    let team = null;
    if (teamId){
      const t = await db.from("teamkracht_teams")
        .select("id, naam, coach_user_id, hermeting_tegoed, hermeting_tot")
        .eq("id", teamId).maybeSingle();
      if (!t.data){ res.status(404).json({ error: "onbekend team" }); return; }
      if (wie.rol !== "beheerder" && t.data.coach_user_id !== gebruiker.user_id){
        res.status(403).json({ error: "dit team is niet van jou" }); return;
      }
      team = t.data;
    }

    res.status(200).json({
      lijn: wie.lijn,
      prijsniveau: wie.prijsniveau,
      reden: wie.reden,
      rechten: {
        register: wie.register,
        leadknop: wie.leadknop,
        naam_op_kaart: wie.naam_op_kaart,
        doelbeeld: wie.doelbeeld,
        organisatiedashboard: wie.organisatiedashboard,
        bureaudashboard: wie.bureaudashboard,
        seats_max: wie.seats_max,
        tegoed_over: wie.tegoed_over
      },
      prijzen: prijskaart({ producten, wie, team })
    });
  }catch(e){
    await logFout("prijs", e.message);
    res.status(500).json({ error: "de prijs kon niet worden bepaald" });
  }
}
