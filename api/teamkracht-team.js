// api/teamkracht-team.js — Vercel serverless function
// Teams aanmaken en opvragen. Een team is één meetmoment bij één groep; het
// token in de link koppelt de metingen eraan. Vereist de migratie 07-09-2026.
//
// GET  geeft de teams van deze coach (de beheerder ziet alles) met het aantal
//      metingen erbij, zodat het dashboard weet of er genoeg deelnemers zijn.
// POST maakt een team met een uniek token van zes tekens.

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { rechtOpKaart, bedragMetBtw } from "../betalen.js";

/* Zelfde alfabet als campaigns.token: geen I, O, nul of één, zodat een token
   telefonisch door te geven is. */
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const maakToken = () =>
  Array.from({ length: 6 }, () => ALFABET[Math.floor(Math.random() * ALFABET.length)]).join("");

const tekst = (v, max = 120) =>
  (typeof v === "string" && v.trim()) ? v.trim().slice(0, max) : null;

export default async function handler(req, res){
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;
  const db = serviceClient();

  if (req.method === "GET"){
    let q = db.from("teamkracht_teams")
      .select("id, created_at, naam, organisatie, coach_naam, token, actief")
      .order("created_at", { ascending: false });
    if (gebruiker.rol !== "beheerder") q = q.eq("coach_user_id", gebruiker.user_id);
    const teams = await q;
    if (teams.error){ await logFout("teamkracht-team", "ophalen mislukt"); res.status(500).json({ error: "ophalen mislukt" }); return; }

    // Aantal metingen per team. Geen scores, geen namen: alleen een telling.
    const metingen = await db.from("index_scan_results")
      .select("teamkracht_team_id")
      .in("teamkracht_team_id", (teams.data || []).map(t => t.id));
    const telling = {};
    for (const r of metingen.data || []){
      telling[r.teamkracht_team_id] = (telling[r.teamkracht_team_id] || 0) + 1;
    }

    // De beelden die al zijn berekend, zodat het dashboard weet of het
    // startbeeld er is en of er dus een hermeting bij kan.
    const beelden = await db.from("teamkracht_teambeeld")
      .select("id, team_id, soort, n, breuk, created_at")
      .in("team_id", (teams.data || []).map(t => t.id))
      .order("created_at", { ascending: true });
    const perTeam = {};
    for (const b of beelden.data || []){
      (perTeam[b.team_id] = perTeam[b.team_id] || []).push(b);
    }

    // De doelbeelden die bij die beelden horen, zodat het dashboard ze kan
    // teruggeven; zonder dit verdween een vastgelegd doel uit het zicht.
    const doelen = await db.from("teamkracht_doel")
      .select("id, teambeeld_id, doel_zien, doel_sturen, doel_doen, horizon_maanden, created_at")
      .in("teambeeld_id", (beelden.data || []).map(b => b.id))
      .order("created_at", { ascending: true });
    const beeldTeam = Object.fromEntries((beelden.data || []).map(b => [b.id, b.team_id]));
    for (const d of doelen.data || []){
      const teamId = beeldTeam[d.teambeeld_id];
      if (!teamId) continue;
      const lijst = perTeam[teamId] || [];
      const beeld = lijst.find(b => b.id === d.teambeeld_id);
      if (beeld) (beeld.doelen = beeld.doelen || []).push(d);
    }

    // Wat de coach mag en wat het kost. Vooraf meesturen in plaats van pas bij
    // het klikken: iemand hoort te weten wat een knop gaat kosten voordat hij
    // erop drukt.
    const [gq, bq, pq, vq] = await Promise.all([
      db.from("teamkracht_gebruikers")
        .select("licentie_actief, licentie_tot, niveau").eq("user_id", gebruiker.user_id).single(),
      db.from("bestellingen")
        .select("id, product_code, status, verbruikt_op, team_id, geldig_tot")
        .eq("gebruiker_id", gebruiker.user_id),
      db.from("producten").select("code, naam, prijs_ex_btw, btw_promille").in("code", ["TF", "HM"]),
      db.from("module_voortgang").select("hoofdstuk").eq("gebruiker_id", gebruiker.user_id).in("hoofdstuk", [1, 2])
    ]);

    const bestellingen = bq.data || [];
    const prijzen = Object.fromEntries((pq.data || []).map(p => [p.code, { ...p, ...bedragMetBtw(p) }]));
    const leesdrempel = (vq.data || []).length >= 2;

    res.status(200).json({
      gebruiker: {
        rol: gebruiker.rol,
        licentie_actief: !!gq.data?.licentie_actief,
        licentie_tot: gq.data?.licentie_tot || null,
        leesdrempel_gehaald: leesdrempel
      },
      prijzen,
      teams: (teams.data || []).map(t => {
        const beelden = perTeam[t.id] || [];
        const soort = beelden.some(b => b.soort === "start") ? "hermeting" : "start";
        return {
          ...t,
          aantal_metingen: telling[t.id] || 0,
          beelden,
          volgende_soort: soort,
          recht: rechtOpKaart({ gebruiker: gq.data, bestellingen, teamId: t.id, soort })
        };
      })
    });
    return;
  }

  if (req.method === "POST"){
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const naam = tekst(body.naam);
    if (!naam){ res.status(400).json({ error: "naam is verplicht" }); return; }

    // Botsingen zijn zeldzaam maar niet onmogelijk; tien pogingen is ruim.
    for (let poging = 0; poging < 10; poging++){
      const ins = await db.from("teamkracht_teams").insert({
        naam,
        organisatie: tekst(body.organisatie),
        coach_naam: tekst(body.coach_naam),
        coach_user_id: gebruiker.user_id,
        token: maakToken()
      }).select("id, naam, token").single();

      if (!ins.error){ res.status(200).json(ins.data); return; }
      if (!/duplicate|unique/i.test(ins.error.message || "")){
        await logFout("teamkracht-team", "aanmaken mislukt"); res.status(500).json({ error: "aanmaken mislukt" }); return;
      }
    }
    await logFout("teamkracht-team", "geen vrij token gevonden"); res.status(500).json({ error: "geen vrij token gevonden" });
    return;
  }

  res.status(405).json({ error: "method" });
}
