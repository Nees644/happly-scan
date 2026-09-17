// api/teamkracht-teamdoel.js — Vercel serverless function
// Het doel van een team (briefing doel-ruimte v1, paragraaf 7.1): de zin in
// eigen woorden en de keuzezin die het doeltype bepaalt.
//
// GET  ?team=TOKEN  geeft alleen de doeltekst van een actief team, zonder
//                   inlog. Wie het token heeft is uitgenodigd en ziet op de
//                   uitnodigingspagina "Dit team werkt naar: ...". Niets
//                   anders: geen naam van de coach, geen scores, geen id.
// POST {team_id, doel_tekst, doeltype}  zet of wijzigt het doel, achter de
//                   inlog van de coach. Daarna worden de beelden van het team
//                   opnieuw gelezen: een nieuwe rij in teamkracht_ruimte per
//                   beeld, de oude blijven staan (paragraaf 10). Geen enkele
//                   score verandert.

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { doelVelden, herleesTeam } from "../teamkracht-ruimte-db.js";
import { keuzezin } from "../teamkracht-ruimte.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method === "GET") return await doelBijToken(req, res);
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }

  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const teamId = String(body.team_id || "");
  if (!UUID.test(teamId)){ res.status(400).json({ error: "ongeldig team_id" }); return; }

  const doel = doelVelden({
    doel_tekst: body.doel_tekst, doeltype: body.doeltype,
    door: body.door === "teamleider" ? "teamleider" : "begeleider"
  });
  if (!doel || !doel.doel_tekst){ res.status(400).json({ error: "geef het doel in één zin en kies wat er vooral nodig is" }); return; }

  const db = serviceClient();
  const team = await db.from("teamkracht_teams").select("id, naam, coach_user_id").eq("id", teamId).single();
  if (team.error || !team.data){ res.status(404).json({ error: "onbekend team" }); return; }
  if (gebruiker.rol !== "beheerder" && team.data.coach_user_id !== gebruiker.user_id){
    res.status(403).json({ error: "geen toegang" }); return;
  }

  const up = await db.from("teamkracht_teams").update(doel).eq("id", teamId)
    .select("id, doel_tekst, doeltype, doeltype_bron, doel_ingevuld_op, doel_ingevuld_door").single();
  if (up.error){ await logFout("teamkracht-teamdoel", "doel niet opgeslagen"); res.status(500).json({ error: "doel niet opgeslagen" }); return; }

  // De lezing van de bestaande beelden volgt het nieuwe doel.
  let herlezen = [];
  try{ herlezen = await herleesTeam(db, { ...team.data, ...up.data }); }
  catch(e){ await logFout("teamkracht-teamdoel", "herlezen mislukt"); }

  res.status(200).json({
    ok: true,
    doel: { ...up.data, keuzezin: keuzezin(up.data.doeltype, "team") },
    herlezen: herlezen.map(r => ({ meting_id: r.meting_id, eerste_stap_dimensie: r.eerste_stap_dimensie, status: r.status }))
  });
}

async function doelBijToken(req, res){
  const token = String(req.query?.team || "").trim().toUpperCase();
  res.setHeader("Cache-Control", "no-store");
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(token)){ res.status(200).json({ doel_tekst: null }); return; }
  try{
    const db = serviceClient();
    const t = await db.from("teamkracht_teams").select("doel_tekst").eq("token", token).eq("actief", true).maybeSingle();
    res.status(200).json({ doel_tekst: (t.data && t.data.doel_tekst) || null });
  }catch(e){
    res.status(200).json({ doel_tekst: null });
  }
}
