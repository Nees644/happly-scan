// api/leider.js — Vercel serverless function
// De eigen pagina van de teamleider op /leider/:token.
//
// Het token uit de mail is het bewijs; er is geen inlog en die komt er ook
// niet (paragraaf 12). Onbekend token geeft 404 zonder informatie: uit een
// foutmelding mag niet af te leiden zijn of een Leidersbeeld bestaat.
//
// Toestand a en b uit paragraaf 6. Toestand c volgt in stap 4, d in stap 5.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { bouwLeiderPagina } from "../leider-pagina.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nietGevonden(res){
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(404).send(`<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Niet gevonden</title>
<style>body{font-family:system-ui,sans-serif;background:#F7F3F0;color:#1A0B2E;display:flex;min-height:100vh;
align-items:center;justify-content:center;padding:24px;margin:0}p{max-width:44ch;line-height:1.6}</style>
</head><body><p>Deze pagina bestaat niet. Klopt de link uit je mail?</p></body></html>`);
}

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }

  const token = String(req.query?.t || "");
  if (!UUID.test(token)){ nietGevonden(res); return; }

  try{
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const q = await db.from("teamkracht_leidersbeeld")
      .select("id, team_id, organisatie, teamomvang, zien, sturen, doen, index_score, partner_id, status")
      .eq("leider_token", token).maybeSingle();
    if (q.error || !q.data){ nietGevonden(res); return; }
    const rij = q.data;

    // De klik op de knop in de mail laat zien dat de mail is aangekomen. Een
    // eerste bezoek zet dat vast; latere bezoeken veranderen niets.
    db.from("teamkracht_leidersbeeld")
      .update({ mail_geopend_op: new Date().toISOString() })
      .eq("id", rij.id).is("mail_geopend_op", null).then(() => {}, () => {});

    let team = null, deelnemers = null, partnernaam = null;
    if (rij.team_id){
      const t = await db.from("teamkracht_teams").select("id, naam").eq("id", rij.team_id).maybeSingle();
      if (!t.error && t.data){
        team = t.data;
        const tel = await db.from("index_scan_results")
          .select("id", { count: "exact", head: true })
          .eq("teamkracht_team_id", rij.team_id);
        deelnemers = { ingevuld: tel.count ?? 0, uitgenodigd: null };
      }
    }
    if (rij.partner_id){
      const p = await db.from("teamkracht_gebruikers").select("naam").eq("user_id", rij.partner_id).maybeSingle();
      if (!p.error && p.data && p.data.naam) partnernaam = p.data.naam;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(bouwLeiderPagina({ rij, team, deelnemers, partnernaam, token }));
  }catch(e){
    nietGevonden(res);
  }
}
