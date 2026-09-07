// api/teamkracht-bereken.js — Vercel serverless function
// Berekent het teambeeld van een team en slaat het op. Dit is de enige plek
// waar individuele scores en het teambeeld elkaar raken; wat eruit komt bevat
// geen namen, geen adressen en geen id's.
//
// De norm wordt bevroren in het teambeeld. Een hermeting van hetzelfde team
// gebruikt de norm van zijn eigen startbeeld, zodat het eindbeeld niet
// verschuift doordat de referentie ondertussen is bijgesteld.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";
import { bouwTeambeeld } from "../teamkracht-logica.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const { team_id } = body;
  const soort = body.soort === "hermeting" ? "hermeting" : "start";
  if (!UUID.test(team_id || "")){ res.status(400).json({ error: "ongeldig team_id" }); return; }

  const db = serviceClient();

  const team = await db.from("teamkracht_teams")
    .select("id, naam, coach_user_id").eq("id", team_id).single();
  if (team.error || !team.data){ res.status(404).json({ error: "onbekend team" }); return; }
  if (gebruiker.rol !== "beheerder" && team.data.coach_user_id !== gebruiker.user_id){
    res.status(403).json({ error: "geen toegang" }); return;
  }

  const cfg = await db.from("teamkracht_config").select("*").eq("id", 1).single();
  if (cfg.error || !cfg.data){ res.status(500).json({ error: "instellingen ontbreken" }); return; }
  const config = cfg.data;

  // Een hermeting kijkt alleen naar metingen van na het startbeeld, en erft de
  // norm daarvan. Zonder startbeeld is er niets om overheen te leggen.
  let vanaf = null, norm = null;
  if (soort === "hermeting"){
    const start = await db.from("teamkracht_teambeeld")
      .select("created_at, norm_zien, norm_sturen, norm_doen, config_snapshot")
      .eq("team_id", team_id).eq("soort", "start")
      .order("created_at", { ascending: false }).limit(1).single();
    if (start.error || !start.data){
      res.status(400).json({ error: "maak eerst het startbeeld" }); return;
    }
    vanaf = start.data.created_at;
    norm = {
      zien: Number(start.data.norm_zien),
      sturen: Number(start.data.norm_sturen),
      doen: Number(start.data.norm_doen),
      sd_zien: Number(config.sd_zien), sd_sturen: Number(config.sd_sturen), sd_doen: Number(config.sd_doen)
    };
  }

  if (!norm){
    if (config.norm_bron === "landelijk"){
      const ref = await db.from("teamkracht_referentie").select("*").single();
      if (ref.error || !ref.data?.n){ res.status(500).json({ error: "referentie niet leesbaar" }); return; }
      norm = {
        zien: Number(ref.data.norm_zien), sturen: Number(ref.data.norm_sturen), doen: Number(ref.data.norm_doen),
        sd_zien: Number(ref.data.sd_zien), sd_sturen: Number(ref.data.sd_sturen), sd_doen: Number(ref.data.sd_doen)
      };
    } else {
      norm = {
        zien: Number(config.norm_zien), sturen: Number(config.norm_sturen), doen: Number(config.norm_doen),
        sd_zien: Number(config.sd_zien), sd_sturen: Number(config.sd_sturen), sd_doen: Number(config.sd_doen)
      };
    }
  }
  if (Object.values(norm).some(v => !Number.isFinite(v))){
    res.status(500).json({ error: "de norm is niet volledig ingevuld" }); return;
  }

  let mq = db.from("index_scan_results")
    .select("id, zien, sturen, doen, created_at")
    .eq("teamkracht_team_id", team_id);
  if (vanaf) mq = mq.gt("created_at", vanaf);
  const metingen = await mq;
  if (metingen.error){ res.status(500).json({ error: "metingen niet leesbaar" }); return; }

  const deelnemers = (metingen.data || []).map(r => ({ zien: r.zien, sturen: r.sturen, doen: r.doen }));
  const drempel = Number(config.min_deelnemers_kaart ?? 5);
  if (deelnemers.length < drempel){
    res.status(400).json({
      error: `Nog te weinig deelnemers voor een kaart: ${deelnemers.length} van de ${drempel}.`,
      n: deelnemers.length, nodig: drempel
    });
    return;
  }

  const regels = await db.from("teamkracht_regels")
    .select("code, titel, titel_geteld, richting, voorwaarde, dynamiek, signaal, interventie, gespreksvraag, gewicht_opslag, actief, volgorde")
    .eq("actief", true).order("volgorde");
  if (regels.error){ res.status(500).json({ error: "regels niet leesbaar" }); return; }

  let teambeeld;
  try{
    teambeeld = bouwTeambeeld({ deelnemers, norm, config, regels: regels.data || [], soort });
  }catch(e){
    res.status(500).json({ error: "berekening mislukt" }); return;
  }
  const { profielen, ...opslag } = teambeeld;

  const ins = await db.from("teamkracht_teambeeld")
    .insert({ ...opslag, team_id }).select("id").single();
  if (ins.error){ res.status(500).json({ error: "opslaan mislukt" }); return; }

  // Profielcode terug naar de eigen meting. Alleen de deelnemer zelf ziet hem,
  // via zijn resultaat_token; hij staat niet in het teambeeld en niet in de kaart.
  await Promise.all((metingen.data || []).map((r, i) =>
    db.from("index_scan_results").update({ profiel_code: profielen[i].code }).eq("id", r.id)
  ));

  res.status(200).json({ id: ins.data.id, ...opslag, team_naam: team.data.naam });
}
