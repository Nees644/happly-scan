// teamkracht-ruimte-db.js
// De ruimte berekenen en opslaan (briefing doel-ruimte v1, paragraaf 10):
// serverside bij het afronden van een meting en bij het toevoegen of wijzigen
// van een doel, in teamkracht_ruimte. De uitslagpagina leest de nieuwste rij
// en rekent niet opnieuw. Bij een gewijzigd doel komt er een nieuwe rij met
// dezelfde meting_id; de oude blijven staan.
//
// De rekenregels staan in teamkracht-ruimte.js en zijn zonder database te
// testen. Hier staat alleen wat de database erbij nodig heeft: de norm die bij
// het beeld hoort, of de coach een landelijk beeld heeft, en de rijen zelf.
//
// Beelden en metingen van voor 17 september 2026 hebben nog geen rij. Die
// krijgen er een zodra iemand de uitslag opent: zelfde berekening, zelfde
// opslag, alleen later. Zo rendert een bestaande meting zonder doel met een
// lezing via de keten (criterium 1) zonder dat er een migratie van data nodig
// is.

import { bepaalRuimte, profielkoppeling, doelDatum } from "./teamkracht-ruimte.js";
export { doelDatum };
import { bepaalProfiel } from "./teamkracht-logica.js";
import { haalKoper } from "./koper-db.js";

const RIJKOLOMMEN = "id, meting_id, niveau, leidende_dimensie, eerste_stap_dimensie, ketencheck_actief, referentie_type, referentie_waarde, huidige_waarde, ruimte_punten, status, op_orde_dimensies, draagprofielen, bewegingsprofielen, berekend_op, regelversie, config_snapshot";

/* De norm die bij een teambeeld hoort: bevroren gemiddelde en, sinds R13, de
   bevroren spreiding. Oudere beelden zonder spreiding in het snapshot vallen
   terug op wat de aanroeper meegeeft. */
export function normUitTeambeeld(beeld, terugval = {}){
  const snap = beeld.config_snapshot || {};
  const pak = (a, b) => { const v = Number(a ?? b); return Number.isFinite(v) ? v : null; };
  return {
    zien: pak(beeld.norm_zien), sturen: pak(beeld.norm_sturen), doen: pak(beeld.norm_doen),
    sd_zien: pak(snap.sd_zien, terugval.sd_zien),
    sd_sturen: pak(snap.sd_sturen, terugval.sd_sturen),
    sd_doen: pak(snap.sd_doen, terugval.sd_doen)
  };
}

/* Wel of geen landelijk beeld voor dit team: dezelfde bron als de kaart, de
   lijn van de coach. Zonder coach of bij een fout: wel, want elke kaart van
   voor v4 heeft het. */
export async function landelijkBeeldVoorTeam(db, team){
  if (!team || !team.coach_user_id) return true;
  try{
    const wie = await haalKoper(db, team.coach_user_id);
    return wie.landelijk_beeld !== false;
  }catch(e){ return true; }
}

/* De rij voor een team, zonder database: te testen. */
export function rijVoorTeam({ teambeeld, team = {}, landelijk_beeld = true, profielen = [], norm = null }){
  const scores = { zien: Number(teambeeld.team_zien), sturen: Number(teambeeld.team_sturen), doen: Number(teambeeld.team_doen) };
  const r = bepaalRuimte({
    doeltype: team.doeltype || null, scores,
    norm: norm || normUitTeambeeld(teambeeld),
    landelijk_beeld, niveau: "team"
  });
  const k = profielkoppeling(profielen)[r.eerste_stap_dimensie] || { draag_codes: [], beweging_codes: [] };
  return {
    meting_id: teambeeld.id,
    niveau: "team",
    ...zonderRekenwerk(r),
    draagprofielen: k.draag_codes,
    bewegingsprofielen: k.beweging_codes,
    config_snapshot: { ...r.config_snapshot, doeltype: r.doeltype, doeltype_bron: r.doeltype_bron, doel_tekst: team.doel_tekst || null, doel_datum: team.doel_datum || null }
  };
}

/* De rij voor een persoon. In de individuele uitslag is de referentie altijd
   de eigen sterkste dimensie (besluit 17 september 2026); de norm is hier
   alleen nodig voor het profiel, en dat doet de aanroeper. */
export function rijVoorMeting({ meting }){
  const scores = { zien: Number(meting.zien), sturen: Number(meting.sturen), doen: Number(meting.doen) };
  const r = bepaalRuimte({ doeltype: meting.doeltype || null, scores, norm: null, landelijk_beeld: false, niveau: "individu" });
  return {
    meting_id: meting.id,
    niveau: "individu",
    ...zonderRekenwerk(r),
    draagprofielen: [],
    bewegingsprofielen: [],
    config_snapshot: { ...r.config_snapshot, doeltype: r.doeltype, doeltype_bron: r.doeltype_bron, doel_tekst: meting.doel_tekst || null, doel_datum: meting.doel_datum || null }
  };
}

/* Wat er in de tabel past: de kolommen van paragraaf 4.2. per_dimensie is
   rekenwerk voor de zinnen en gaat niet mee. */
function zonderRekenwerk(r){
  return {
    leidende_dimensie: r.leidende_dimensie,
    eerste_stap_dimensie: r.eerste_stap_dimensie,
    ketencheck_actief: r.ketencheck_actief,
    referentie_type: r.referentie_type,
    referentie_waarde: r.referentie_waarde,
    huidige_waarde: r.huidige_waarde,
    ruimte_punten: r.ruimte_punten,
    status: r.status,
    op_orde_dimensies: r.op_orde_dimensies,
    regelversie: r.regelversie,
    // Niet in de tabel, wel nodig voor de zinnen: gaan mee in het object en
    // worden bij het opslaan weggelaten.
    doeltype: r.doeltype,
    doeltype_bron: r.doeltype_bron
  };
}

/* Opslaan. Geeft de rij terug zoals hij nu geldt, ook als het opslaan mislukt:
   de uitslag hoort er te zijn, met of zonder rij in de tabel. */
export async function bewaarRuimte(db, rij){
  const { doeltype, doeltype_bron, ...opslag } = rij;
  try{
    const ins = await db.from("teamkracht_ruimte").insert(opslag).select(RIJKOLOMMEN).single();
    if (!ins.error && ins.data) return { ...ins.data, doeltype, doeltype_bron, opgeslagen: true };
  }catch(e){ /* hieronder */ }
  return { ...rij, opgeslagen: false };
}

/* De nieuwste rij voor een meting op een niveau, of null. Het doeltype dat bij
   de berekening gold staat in het snapshot; dat komt mee als veld, zodat de
   zinnen niet hoeven te raden. */
export async function nieuwsteRuimte(db, meting_id, niveau){
  try{
    const q = await db.from("teamkracht_ruimte").select(RIJKOLOMMEN)
      .eq("meting_id", meting_id).eq("niveau", niveau)
      .order("berekend_op", { ascending: false }).limit(1).maybeSingle();
    if (q.error || !q.data) return null;
    const snap = q.data.config_snapshot || {};
    return { ...q.data, doeltype: snap.doeltype || "onbekend", doeltype_bron: snap.doeltype_bron || "keten" };
  }catch(e){ return null; }
}

/* De ruimte van een teambeeld: de opgeslagen rij, of anders nu berekend en
   opgeslagen (beelden van voor deze briefing). */
export async function ruimteVoorTeambeeld(db, { teambeeld, team, profielen = null, landelijk_beeld = null }){
  const bestaand = await nieuwsteRuimte(db, teambeeld.id, "team");
  if (bestaand) return bestaand;
  return berekenTeamRuimte(db, { teambeeld, team, profielen, landelijk_beeld });
}

/* Berekenen en opslaan, altijd een nieuwe rij. Voor het afronden van een
   meting en voor een gewijzigd doel. */
export async function berekenTeamRuimte(db, { teambeeld, team, profielen = null, landelijk_beeld = null }){
  if (!profielen){
    const p = await db.from("teamkracht_profielen").select("code, naam").eq("actief", true);
    profielen = p.data || [];
  }
  if (landelijk_beeld === null) landelijk_beeld = await landelijkBeeldVoorTeam(db, team);
  let terugval = {};
  const snap = teambeeld.config_snapshot || {};
  if (snap.sd_zien === undefined){
    const cfg = await db.from("teamkracht_config").select("sd_zien, sd_sturen, sd_doen").eq("id", 1).maybeSingle();
    terugval = cfg.data || {};
  }
  const rij = rijVoorTeam({ teambeeld, team, landelijk_beeld, profielen, norm: normUitTeambeeld(teambeeld, terugval) });
  return bewaarRuimte(db, rij);
}

/* Alle beelden van een team opnieuw lezen na een doelwijziging: het nieuwste
   startbeeld en het nieuwste eindbeeld krijgen elk een nieuwe rij. */
export async function herleesTeam(db, team){
  const b = await db.from("teamkracht_teambeeld").select("*").eq("team_id", team.id)
    .order("created_at", { ascending: false });
  const beelden = b.data || [];
  const nieuwste = ["start", "hermeting"]
    .map(soort => beelden.find(x => x.soort === soort)).filter(Boolean);
  const uit = [];
  for (const beeld of nieuwste) uit.push(await berekenTeamRuimte(db, { teambeeld: beeld, team }));
  return uit;
}

/* De ruimte van een individuele meting: opgeslagen rij of nu berekend. Zet
   ook het profiel als dat er nog niet is, met de vaste norm uit
   teamkracht_config: de uitslag toont het eigen profiel met één zin
   (paragraaf 6.2), ook voor wie niet via een team meet. */
export async function ruimteVoorMeting(db, meting){
  const bestaand = await nieuwsteRuimte(db, meting.id, "individu");
  if (bestaand) return bestaand;
  return berekenIndividueleRuimte(db, meting);
}

export async function berekenIndividueleRuimte(db, meting){
  const rij = rijVoorMeting({ meting });
  const uit = await bewaarRuimte(db, rij);
  if (!meting.profiel_code){
    try{
      const code = await profielVoorMeting(db, meting);
      if (code){
        await db.from("index_scan_results").update({ profiel_code: code }).eq("id", meting.id).is("profiel_code", null);
        uit.profiel_code = code;
      }
    }catch(e){ /* zonder profiel gewoon de ruimte */ }
  }
  return uit;
}

/* Het profiel van één persoon tegen de vaste norm. Bij een teammeting zet
   api/teamkracht-bereken het profiel met de norm van het beeld; dit is
   alleen voor wie zonder team meet. */
async function profielVoorMeting(db, meting){
  const cfg = await db.from("teamkracht_config")
    .select("middenband_sd, norm_bron, norm_zien, norm_sturen, norm_doen, sd_zien, sd_sturen, sd_doen")
    .eq("id", 1).maybeSingle();
  if (cfg.error || !cfg.data) return null;
  let norm;
  if (cfg.data.norm_bron === "landelijk"){
    const ref = await db.from("teamkracht_referentie").select("*").maybeSingle();
    if (ref.error || !ref.data?.n) return null;
    norm = { zien: +ref.data.norm_zien, sturen: +ref.data.norm_sturen, doen: +ref.data.norm_doen,
             sd_zien: +ref.data.sd_zien, sd_sturen: +ref.data.sd_sturen, sd_doen: +ref.data.sd_doen };
  } else {
    norm = { zien: +cfg.data.norm_zien, sturen: +cfg.data.norm_sturen, doen: +cfg.data.norm_doen,
             sd_zien: +cfg.data.sd_zien, sd_sturen: +cfg.data.sd_sturen, sd_doen: +cfg.data.sd_doen };
  }
  if (Object.values(norm).some(v => !Number.isFinite(v))) return null;
  return bepaalProfiel({ zien: meting.zien, sturen: meting.sturen, doen: meting.doen }, norm, Number(cfg.data.middenband_sd ?? 0.25)).code;
}

/* Het doel van de leider wordt het voorlopige doel van het team als het team
   er nog geen heeft (L5). Het team bevestigt of past aan bij de meting. */
export async function neemLeiderdoelOver(db, teamId, leidersbeeld){
  if (!leidersbeeld || !leidersbeeld.doeltype) return false;
  try{
    const t = await db.from("teamkracht_teams").select("id, doeltype").eq("id", teamId).maybeSingle();
    if (t.error || !t.data || t.data.doeltype) return false;
    const up = await db.from("teamkracht_teams").update({
      doel_tekst: leidersbeeld.doel_tekst || null,
      doel_datum: leidersbeeld.doel_datum || null,
      doeltype: leidersbeeld.doeltype,
      doeltype_bron: leidersbeeld.doeltype === "onbekend" ? "keten" : "klant",
      doel_ingevuld_op: new Date().toISOString(),
      doel_ingevuld_door: "leider"
    }).eq("id", teamId).is("doeltype", null);
    return !up.error;
  }catch(e){ return false; }
}

/* De doelvelden zoals ze in een tabel gaan, uit wat de klant instuurde.
   doeltype onbekend betekent: lezing via de keten. */
export const DOELTYPEN = ["zien", "sturen", "doen", "onbekend"];
export const DOEL_INGEVULD_DOOR = ["teamleider", "begeleider", "deelnemer", "leider"];

export function doelVelden({ doel_tekst, doeltype, doel_datum, door }, nu = new Date()){
  const tekst = typeof doel_tekst === "string" ? doel_tekst.trim().slice(0, 200) : "";
  const type = DOELTYPEN.includes(doeltype) ? doeltype : "onbekend";
  const datum = doelDatum(doel_datum);
  if (!tekst && type === "onbekend" && !datum) return null;
  return {
    doel_tekst: tekst || null,
    doel_datum: datum,
    doeltype: type,
    doeltype_bron: type === "onbekend" ? "keten" : "klant",
    doel_ingevuld_op: nu.toISOString(),
    doel_ingevuld_door: DOEL_INGEVULD_DOOR.includes(door) ? door : null
  };
}
