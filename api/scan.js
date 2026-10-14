// api/scan.js — Vercel serverless function
// Slaat elke voltooide Index-meting op (voor de itemanalyse na 200 metingen),
// inclusief de gegenereerde duiding: één insert, geen latere update nodig.
// Serverside via de Supabase service role, zodat de anon-SELECT ingetrokken kan blijven.
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { doelVelden, berekenIndividueleRuimte } from "../teamkracht-ruimte-db.js";
import { ruimteGegevens, doelBlokHtml, ruimteBlokHtml } from "../teamkracht-ruimte-blokken.js";

async function meldAanReis({ reisToken, meting, scanId, index, zien, sturen, doen }){
  const url = (process.env.REIS_URL || "").replace(/\/$/, "");
  const geheim = process.env.REIS_SCAN_SECRET;
  if (!url || !geheim){ console.error("reis: REIS_URL of REIS_SCAN_SECRET ontbreekt, melding overgeslagen"); return; }
  try{
    const r = await fetch(`${url}/api/reis-scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${geheim}` },
      body: JSON.stringify({ reisToken, meting, scanId, index, zien, sturen, doen }),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) console.error("reis: melding geweigerd", r.status);
  }catch(e){ console.error("reis: melding mislukt", e.message); }
}

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { index, zien, sturen, doen, items, age, work, duiding, duiding_fallback, deel_zin, team, doel_tekst, doeltype, doel_datum, reis, meting } = body;
    if ([index,zien,sturen,doen].some(v => typeof v !== "number")){
      res.status(400).json({error:"ongeldige invoer"}); return;
    }
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Teamtoken uit de link van de coach. Onbekend of ingetrokken token: de
    // meting wordt gewoon opgeslagen zonder koppeling, want een deelnemer die
    // de vragen heeft ingevuld mag zijn uitslag nooit kwijtraken aan een
    // typefout in een link.
    let teamId = null;
    if (typeof team === "string" && /^[A-HJ-NP-Z2-9]{6}$/.test(team.trim().toUpperCase())){
      const t = await db.from("teamkracht_teams")
        .select("id").eq("token", team.trim().toUpperCase()).eq("actief", true).single();
      if (!t.error && t.data) teamId = t.data.id;
    }

    const basis = {
      index_score: index,
      zien, sturen, doen,
      items: items || null,
      age_band: age || null,
      work_situation: work || null
    };
    // Losstaand, zodat het getrapte vangnet hieronder blijft werken als de
    // migratie 07-09-2026 nog niet is gedraaid.
    if (teamId) basis.teamkracht_team_id = teamId;

    // Reistoken uit de link van de Volhoudreis (scan?reis=<32 hex>&meting=start|eind).
    // De scan weet verder niets van de reis; na de opslag gaan de vier getallen
    // naar de reisserver (meldAanReis). Een onbekende token wordt gewoon
    // meegeschreven: de reisserver beslist of hij bestaat.
    const reisToken = (typeof reis === "string" && /^[0-9a-f]{32}$/.test(reis.trim())) ? reis.trim() : null;
    const reisMeting = meting === "eind" ? "eind" : "start";
    if (reisToken){ basis.reis_token = reisToken; basis.reis_meting = reisMeting; }
    const metDuiding = {
      ...basis,
      duiding: duiding || null,
      duiding_generated_at: duiding ? new Date().toISOString() : null,
      duiding_fallback: duiding ? !!duiding_fallback : null
    };
    // Getrapt vangnet zolang een migratie (deel_id 05-08-2026c, deel_zin
    // 05-08-2026b, duiding 24-07-2026) nog niet draait: van volledig naar basis.
    // Het eigen doel (briefing doel-ruimte v1, paragraaf 7.2), ingevuld na de
    // mailstap en voor de uitslag. Overgeslagen is doeltype onbekend, en dan
    // leest de uitslag via de keten. De herkenningszin mag langer zijn sinds
    // het doel erachter kan staan.
    const doel = doelVelden({ doel_tekst, doeltype, doel_datum, door: "deelnemer" }) || {};
    const metDoel = { ...metDuiding, ...doel };
    const volledig = {
      ...metDoel,
      deel_zin: (typeof deel_zin === "string" && deel_zin.trim()) ? deel_zin.trim().slice(0,360) : null
    };
    let r = await db.from("index_scan_results").insert(volledig).select("id,deel_id").single();
    if (r.error){
      r = await db.from("index_scan_results").insert(volledig).select("id").single();
    }
    if (r.error){
      // Vangnet zolang migratie-doel-ruimte-2026-09-17.sql nog niet draait.
      const { doel_tekst: _d, doel_datum: _dd, doeltype: _t, doeltype_bron: _b, doel_ingevuld_op: _o, doel_ingevuld_door: _r, ...zonderDoel } = volledig;
      r = await db.from("index_scan_results").insert(zonderDoel).select("id,deel_id").single();
    }
    if (r.error){
      r = await db.from("index_scan_results").insert(metDuiding).select("id").single();
    }
    if (r.error){
      r = await db.from("index_scan_results").insert(basis).select("id").single();
    }
    if (r.error){ res.status(500).json({error:"opslag mislukt"}); return; }

    // De ruimte, nu berekend en opgeslagen (paragraaf 10). De uitslag op het
    // scherm krijgt blok 1 en 3 kant en klaar terug, zodat scherm, mail en
    // /uitslag/:token uit dezelfde rij lezen. Stil bij een fout: de meting
    // staat er, en dat is wat telt.
    let blokken = null;
    try{
      const meting = { id: r.data.id, zien, sturen, doen, ...doel, profiel_code: null };
      const ruimte = await berekenIndividueleRuimte(db, meting);
      let profiel = null;
      if (ruimte.profiel_code){
        const pq = await db.from("teamkracht_profielen").select("code, naam, tekst_deelnemer")
          .eq("code", ruimte.profiel_code).eq("actief", true).maybeSingle();
        profiel = pq.data || null;
      }
      const g = ruimteGegevens({ ruimte, scores: { zien, sturen, doen }, doel_tekst: doel.doel_tekst || null,
                                 doel_datum: doel.doel_datum || null, doeltype: doel.doeltype || null, vorm: "individu", profiel });
      blokken = { doel: doelBlokHtml(g, { vorm: "individu" }), ruimte: ruimteBlokHtml(g, { vorm: "individu", id: "scan" }) };
    }catch(e){ blokken = null; }

    // Melding aan de Volhoudreis, afgewacht vóór de respons (Vercel beëindigt de
    // functie daarna). Mislukt de melding, dan staat de meting er gewoon en
    // komt er alleen een regel in de log; de deelnemer merkt niets.
    if (reisToken) await meldAanReis({ reisToken, meting: reisMeting, scanId: r.data.id, index, zien, sturen, doen });

    res.status(200).json({ id: r.data.id, deel_id: r.data.deel_id || null, blokken });
  }catch(e){
    res.status(500).json({ error: "opslag mislukt" });
  }
}
