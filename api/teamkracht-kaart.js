// api/teamkracht-kaart.js — Vercel serverless function
// De Teamkrachtkaart van een berekend teambeeld, als HTML of als losse SVG.
// Formaat a4, a3 of a1 liggend; afdrukken naar PDF gaat via de browser, de
// print-CSS zet het papierformaat goed. Vereist de migratie 07-09-2026.

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { bouwKaartHtml, tekenKaartSvg } from "../teamkracht-kaart.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATEN = ["a4", "a3", "a1"];

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const id = String(req.query?.teambeeld_id || "");
  const doelId = String(req.query?.doel_id || "");
  const formaat = FORMATEN.includes(req.query?.formaat) ? req.query.formaat : "a4";
  const als = req.query?.als === "svg" ? "svg" : "html";
  const poster = req.query?.poster === "1";
  if (!id && !doelId){ res.status(400).json({ error: "geef teambeeld_id of doel_id" }); return; }
  if (id && !UUID.test(id)){ res.status(400).json({ error: "ongeldig teambeeld_id" }); return; }
  if (doelId && !UUID.test(doelId)){ res.status(400).json({ error: "ongeldig doel_id" }); return; }

  const db = serviceClient();

  // Bij een doel_id komt het teambeeld eruit: een doelbeeld ligt altijd over
  // een startbeeld, en zonder dat startbeeld is er niets om overheen te leggen.
  let doel = null, plan = null;
  let beeldId = id;
  if (doelId){
    const d = await db.from("teamkracht_doel")
      .select("id, teambeeld_id, doel_zien, doel_sturen, doel_doen, horizon_maanden, beoordeling, created_at")
      .eq("id", doelId).single();
    if (d.error || !d.data){ res.status(404).json({ error: "onbekend doelbeeld" }); return; }
    beeldId = d.data.teambeeld_id;
    doel = {
      zien: d.data.doel_zien, sturen: d.data.doel_sturen, doen: d.data.doel_doen,
      horizon_maanden: d.data.horizon_maanden,
      titel: d.data.beoordeling?.titel || null,
      melding: d.data.beoordeling?.melding || null
    };
  }

  const beeld = await db.from("teamkracht_teambeeld").select("*").eq("id", beeldId).single();
  if (beeld.error || !beeld.data){ await logFout("teamkracht-kaart", "onbekend teambeeld"); res.status(404).json({ error: "onbekend teambeeld" }); return; }

  const team = await db.from("teamkracht_teams")
    .select("naam, coach_user_id").eq("id", beeld.data.team_id).single();
  if (team.error){ res.status(404).json({ error: "onbekend team" }); return; }
  if (gebruiker.rol !== "beheerder" && team.data.coach_user_id !== gebruiker.user_id){
    res.status(403).json({ error: "geen toegang" }); return;
  }

  if (als === "svg"){
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.status(200).send(tekenKaartSvg(beeld.data, { doel }));
    return;
  }

  // Het plan hoort bij het doel: wat het team gaat doen om er te komen.
  if (doelId){
    const p = await db.from("teamkracht_plan")
      .select("interventie_code, eigen_tekst, eigenaar, ritme, telling, eigen_gespreksvraag, volgorde")
      .eq("doel_id", doelId).order("volgorde");
    if (!p.error && p.data?.length){
      const codes = p.data.map(r => r.interventie_code).filter(Boolean);
      const i = codes.length
        ? await db.from("teamkracht_interventies").select("code, titel, tekst, breuk, profielen").in("code", codes)
        : { data: [] };
      const bib = Object.fromEntries((i.data || []).map(x => [x.code, x]));
      plan = p.data.map(r => {
        const b = bib[r.interventie_code] || {};
        return {
          titel: b.titel || r.interventie_code,
          tekst: r.eigen_tekst || b.tekst || null,
          eigenaar: r.eigenaar, ritme: r.ritme, telling: r.telling,
          gespreksvraag: r.eigen_gespreksvraag,
          herkomst: b.breuk ? `BIJ DE BREUK` : "BIJ EEN PROFIEL"
        };
      });
    }
  }

  const [regels, profielen] = await Promise.all([
    db.from("teamkracht_regels")
      .select("code, titel, titel_geteld, richting, dynamiek, interventie, gespreksvraag").eq("actief", true),
    db.from("teamkracht_profielen").select("code, naam").eq("actief", true)
  ]);
  if (regels.error || profielen.error){ await logFout("teamkracht-kaart", "teksten niet leesbaar"); res.status(500).json({ error: "teksten niet leesbaar" }); return; }

  const html = bouwKaartHtml({
    teambeeld: beeld.data,
    regels: regels.data || [],
    profielen: profielen.data || [],
    teamnaam: team.data.naam,
    formaat,
    poster,
    doel,
    plan
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
