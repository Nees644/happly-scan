// test/doel-ruimte.test.js
// Leesregels L1 tot en met L7 uit briefing/teamkracht/briefing_code_doel_ruimte_v1.md
// en de acceptatiecriteria die zonder database en zonder scherm te toetsen
// zijn: 2, 3, 4, 5, 6, 7, 8 (op de gegenereerde zinnen) en 12.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  KETEN, KEUZEZINNEN_TEAM, KEUZEZINNEN_INDIVIDU, keuzezin,
  ketenFallback, bepaalLeidendeDimensie, ketencheck, referentieVoor,
  bepaalRuimte, profielkoppeling, telProfielen, namenInTeam,
  verdelingIndividueleRuimte, vulZinnen, vergelijkDoeltype,
  LABEL_GEDEELD_DOEL, LABEL_VERSCHIL_DOEL, sorteerDynamieken
} from "../teamkracht-ruimte.js";
import { LEESREGELS_CONFIG, KETEN_DREMPEL, OP_ORDE_DREMPEL } from "../teamkracht-leesregels-config.js";
import { bouwTeambeeld } from "../teamkracht-logica.js";
import { leesRegels, leesProfielen, leesTestdata } from "./seed-lezen.js";

const HIER = dirname(fileURLToPath(import.meta.url));

const REGELS = leesRegels();
const PROFIELEN = leesProfielen();
const { norm, deelnemers } = leesTestdata();
const CONFIG = { middenband_sd: 0.25, min_deelnemers_lijnen: 10, norm_bron: "vast" };

/* De teamlijn van team Noord, zoals de kaart hem berekent. */
const NOORD = bouwTeambeeld({ deelnemers, norm, config: CONFIG, regels: REGELS, profielen: PROFIELEN });
const teamlijn = { zien: NOORD.team_zien, sturen: NOORD.team_sturen, doen: NOORD.team_doen };

/* De woorden uit paragraaf 8 die nergens in de uitvoer mogen staan. */
const VERBODEN = ["kloof", "gap", "tekort", "blinde vlek", "zwak", "achterstand", "potentieel", "samenspel", "training", "cohort", "streak"];

function geenVerbodenWoorden(tekst, waar){
  const laag = tekst.toLowerCase();
  for (const w of VERBODEN) assert.ok(!laag.includes(w), `${waar} bevat het woord ${w}`);
  assert.ok(!tekst.includes("—") && !tekst.includes("–"), `${waar} bevat een gedachtestreepje`);
  assert.ok(!/!/.test(tekst), `${waar} bevat een uitroepteken`);
}

/* ------------------------------------------------------------- de drempels */

test("de drempels staan in de config en zijn de startwaarden uit de briefing", () => {
  assert.equal(KETEN_DREMPEL, 10);
  assert.equal(OP_ORDE_DREMPEL, 5);
  assert.equal(LEESREGELS_CONFIG.min_deelnemers_individuele_verdeling, 10);
  assert.equal(LEESREGELS_CONFIG.regelversie, "L-v1");
});

test("de dimensiescores staan op de schaal van 0 tot 100, dus er wordt niet omgerekend", () => {
  for (const d of deelnemers) for (const v of KETEN){
    assert.ok(Number.isInteger(d[v]) && d[v] >= 0 && d[v] <= 100);
  }
});

/* -------------------------------------------------------------------- L1 */

test("L1: de keuzezinnen staan letterlijk en in de volgorde van de briefing", () => {
  assert.deepEqual(KEUZEZINNEN_TEAM.map(k => k.doeltype), ["zien", "sturen", "doen", "onbekend"]);
  assert.equal(keuzezin("zien"), "Dat we hetzelfde beeld hebben van wat er speelt en wat er moet gebeuren");
  assert.equal(keuzezin("sturen"), "Dat we knopen doorhakken en verantwoordelijkheid nemen");
  assert.equal(keuzezin("doen"), "Dat we afmaken wat we afspreken");
  assert.equal(keuzezin("onbekend"), "Weet ik nog niet");
  assert.deepEqual(KEUZEZINNEN_INDIVIDU.map(k => k.doeltype), ["zien", "sturen", "doen", "onbekend"]);
  assert.equal(keuzezin("zien", "individu"), "Dat ik scherp heb wat er speelt en wat er moet gebeuren");
  assert.equal(keuzezin("sturen", "individu"), "Dat ik knopen doorhak en verantwoordelijkheid neem");
  assert.equal(keuzezin("doen", "individu"), "Dat ik afmaak wat ik me voorneem");
  assert.equal(keuzezin("onbekend", "individu"), "Weet ik nog niet");
});

test("L1: de klant kiest, de keuze bepaalt het doeltype", () => {
  assert.deepEqual(bepaalLeidendeDimensie({ doeltype: "sturen", scores: teamlijn }),
    { leidende_dimensie: "sturen", doeltype_bron: "klant" });
});

test("L1: zonder doel of bij onbekend wint de laagste dimensie, bij gelijke stand de vroegste", () => {
  assert.equal(ketenFallback({ zien: 70, sturen: 48, doen: 62 }), "sturen");
  assert.equal(ketenFallback({ zien: 50, sturen: 50, doen: 50 }), "zien");
  assert.equal(ketenFallback({ zien: 60, sturen: 50, doen: 50 }), "sturen");
  assert.deepEqual(bepaalLeidendeDimensie({ doeltype: "onbekend", scores: teamlijn }),
    { leidende_dimensie: "doen", doeltype_bron: "keten" });
  assert.deepEqual(bepaalLeidendeDimensie({ doeltype: null, scores: teamlijn }),
    { leidende_dimensie: "doen", doeltype_bron: "keten" });
});

/* -------------------------------------------------------------------- L2 */

test("L2: het voorbeeld uit de briefing, Sturen ligt 14 onder Doen", () => {
  assert.deepEqual(ketencheck("doen", { zien: 70, sturen: 48, doen: 62 }),
    { eerste_stap_dimensie: "sturen", ketencheck_actief: true });
});

test("L2: twee eerdere dimensies die voldoen, de vroegste wint", () => {
  assert.deepEqual(ketencheck("doen", { zien: 40, sturen: 45, doen: 62 }),
    { eerste_stap_dimensie: "zien", ketencheck_actief: true });
});

test("L2: precies op de drempel telt mee, eronder niet", () => {
  assert.equal(ketencheck("doen", { zien: 70, sturen: 52, doen: 62 }).ketencheck_actief, true);
  assert.equal(ketencheck("doen", { zien: 70, sturen: 53, doen: 62 }).ketencheck_actief, false);
  assert.equal(ketencheck("zien", { zien: 30, sturen: 80, doen: 80 }).ketencheck_actief, false, "voor Zien is er niets eerder in de keten");
});

/* -------------------------------------------------------------------- L3 */

test("L3: de referentie is de hoogste van eigen sterkste en de landelijke grens", () => {
  const scores = { zien: 66, sturen: 51, doen: 49 };
  assert.deepEqual(referentieVoor("sturen", { scores, norm }), { referentie_type: "eigen_sterkste", referentie_waarde: 66 });
  const hoog = { zien: 62, sturen: 55, doen: 50, sd_zien: 12, sd_sturen: 12, sd_doen: 12 };
  assert.deepEqual(referentieVoor("zien", { scores: { zien: 55, sturen: 50, doen: 40 }, norm: hoog }),
    { referentie_type: "landelijk_bovenste_helft", referentie_waarde: 71.6 }, "grens Zien is 62 plus 0,8 maal 12 en ligt boven eigen sterkste 55");
  assert.deepEqual(referentieVoor("doen", { scores: { zien: 62, sturen: 50, doen: 40 }, norm: hoog }),
    { referentie_type: "eigen_sterkste", referentie_waarde: 62 }, "grens Doen is 59,6 en ligt onder eigen sterkste 62; de grens hoort bij de dimensie zelf");
});

/* ------------------------------------------------- criterium 2: ketencheck */

test("criterium 2: doeltype doen met Sturen minstens 10 onder Doen", () => {
  const r = bepaalRuimte({ doeltype: "doen", scores: { zien: 70, sturen: 48, doen: 62 }, norm });
  assert.equal(r.leidende_dimensie, "doen");
  assert.equal(r.eerste_stap_dimensie, "sturen");
  assert.equal(r.ketencheck_actief, true);
  assert.equal(r.doeltype_bron, "klant");
  assert.equal(r.status, "ruimte");
  assert.equal(r.referentie_type, "eigen_sterkste");
  assert.equal(r.referentie_waarde, 70);
  assert.equal(r.ruimte_punten, 22);
  const [zin1] = vulZinnen(r, { doel_tekst: "Afmaken wat we afspreken" });
  assert.equal(zin1, "Voor afmaken wat we afspreken is Doen bepalend. Sturen gaat eraan vooraf, daar begint de ruimte.");
});

/* ------------------------------------- criterium 3: op orde schuift door */

test("criterium 3: team Noord met doeltype zien, Zien op orde, de lezing schuift naar Sturen", () => {
  // Noord heeft Zien 66,3; de strenge grens ligt op 62 plus 0,8 maal 12 is 71,6.
  // Het criterium vraagt Zien boven de landelijke bovenste helft, dus Zien
  // gaat hier naar 75 en Sturen en Doen blijven de teamlijn van Noord.
  const scores = { ...teamlijn, zien: 75 };
  assert.ok(scores.zien > norm.zien + 0.8 * norm.sd_zien, "Zien ligt boven de landelijke grens");
  const r = bepaalRuimte({ doeltype: "zien", scores, norm });
  assert.equal(r.leidende_dimensie, "zien");
  assert.ok(r.op_orde_dimensies.includes("zien"), "Zien staat op orde");
  assert.equal(r.eerste_stap_dimensie, "sturen");
  assert.equal(r.status, "ruimte");
  assert.equal(r.ketencheck_actief, false, "Sturen komt na Zien, dus geen ketencheck-zin");
  const [, zin2] = vulZinnen(r, { doel_tekst: "Hetzelfde beeld" });
  assert.match(zin2, /^De grootste ruimte zit in Sturen: 24 punten tot jullie eigen sterkste dimensie\.$/);
});

/* ------------------------------------------ criterium 4: alles op orde */

test("criterium 4: alle drie boven de referentie", () => {
  const r = bepaalRuimte({ doeltype: "sturen", scores: { zien: 80, sturen: 78, doen: 82 }, norm });
  assert.equal(r.status, "op_orde");
  assert.equal(r.ruimte_punten, 0);
  assert.equal(r.eerste_stap_dimensie, "sturen");
  assert.deepEqual(r.op_orde_dimensies, ["zien", "sturen", "doen"]);
  const [zin1, zin2, zin3] = vulZinnen(r, { doel_tekst: "Knopen doorhakken" });
  assert.equal(zin1, "Voor knopen doorhakken is Sturen bepalend.");
  assert.equal(zin2, "Sturen staat op orde. De ruimte zit nu in het vasthouden en in het doel zelf scherper maken.");
  assert.equal(zin3, "In Zien, Sturen, Doen laten jullie al zien hoe het eruitziet als het loopt.");
});

/* ------------------------------ criterium 5: zonder landelijk beeld */

test("criterium 5: zonder landelijk beeld alleen de eigen sterkste, en het woord landelijk valt niet", () => {
  const hoog = { zien: 90, sturen: 90, doen: 90, sd_zien: 12, sd_sturen: 12, sd_doen: 12 };
  const met = bepaalRuimte({ doeltype: "doen", scores: { zien: 55, sturen: 50, doen: 40 }, norm: hoog });
  assert.equal(met.referentie_type, "landelijk_bovenste_helft");
  assert.equal(met.referentie_waarde, 99.6);
  const [, zin2] = vulZinnen(met, { doel_tekst: "Afmaken" });
  assert.equal(zin2, "De grootste ruimte zit in Doen: 60 punten tot de bovenste helft van het gemiddelde.", "op de kaart heet het gemiddelde, niet landelijk");
  const zonder = bepaalRuimte({ doeltype: "doen", scores: { zien: 55, sturen: 50, doen: 40 }, norm: hoog, landelijk_beeld: false });
  assert.equal(zonder.referentie_type, "eigen_sterkste");
  assert.equal(zonder.referentie_waarde, 55);
  assert.equal(zonder.config_snapshot.landelijk_beeld, false);
  for (const zin of vulZinnen(zonder, { doel_tekst: "Afmaken" })){
    assert.ok(!zin.toLowerCase().includes("landelijk"), zin);
  }
});

/* ---------------------------------- criterium 6: de anonieme verdeling */

test("criterium 6: negen deelnemers geen strip, tien wel, en nooit waarden per persoon", () => {
  const negen = deelnemers.slice(0, 9);
  assert.equal(verdelingIndividueleRuimte({ deelnemers: negen, dimensie: "sturen", referentie_waarde: 66.3 }), null);
  const tien = verdelingIndividueleRuimte({ deelnemers: deelnemers.slice(0, 10), dimensie: "sturen", referentie_waarde: 66.3 });
  assert.deepEqual(Object.keys(tien).sort(), ["eronder", "op_of_boven"]);
  assert.equal(tien.op_of_boven + tien.eronder, 10);
  assert.equal(tien.op_of_boven, 3, "Sturen 70, 68 en 84 zitten op of boven 66,3");
});

/* ------------------------------------------- criterium 7: Leidersbeeld */

test("criterium 7: gelijk doeltype geeft gedeeld beeld, anders verschil in beeld met beide zinnen", () => {
  const gelijk = vergelijkDoeltype("doen", "doen");
  assert.equal(gelijk.label, LABEL_GEDEELD_DOEL);
  assert.equal(gelijk.label, "Gedeeld beeld over wat nodig is");
  const anders = vergelijkDoeltype("doen", "zien");
  assert.equal(anders.label, LABEL_VERSCHIL_DOEL);
  assert.equal(anders.label, "Verschil in beeld over wat nodig is");
  assert.equal(anders.team_zin, "Dat we afmaken wat we afspreken");
  assert.equal(anders.leider_zin, "Dat we hetzelfde beeld hebben van wat er speelt en wat er moet gebeuren");
  assert.equal(vergelijkDoeltype(null, "zien"), null, "zonder teamdoel geen label");
});

/* ---------------------------------------------- criterium 9: geen doel */

test("criterium 9: zonder doel leest de lezing via de keten", () => {
  const r = bepaalRuimte({ doeltype: null, scores: teamlijn, norm });
  assert.equal(r.doeltype, "onbekend");
  assert.equal(r.doeltype_bron, "keten");
  assert.equal(r.leidende_dimensie, "doen");
  const zinnen = vulZinnen(r, { doel_tekst: null, vorm: "individu" });
  assert.equal(zinnen.length, 3);
  assert.ok(!zinnen[0].includes("Voor "), "zonder doel geen doel in zin 1");
});

/* ---------------------------------------- de individuele variant van L6 */

test("L6: de individuele variant staat in de jij-vorm en vergelijkt nooit met anderen", () => {
  const hoog = { zien: 90, sturen: 90, doen: 90, sd_zien: 12, sd_sturen: 12, sd_doen: 12 };
  const ind = bepaalRuimte({ doeltype: "doen", scores: { zien: 55, sturen: 50, doen: 40 }, norm: hoog, niveau: "individu" });
  assert.equal(ind.referentie_type, "eigen_sterkste", "individueel altijd de eigen sterkste, ook met een hoog gemiddelde");
  assert.equal(ind.config_snapshot.landelijk_beeld, false);
  const r = bepaalRuimte({ doeltype: "doen", scores: { zien: 70, sturen: 48, doen: 62 }, norm, niveau: "individu" });
  const [, zin2, zin3] = vulZinnen(r, { doel_tekst: "Afmaken wat ik me voorneem", vorm: "individu" });
  assert.equal(zin2, "De grootste ruimte zit in Sturen: 22 punten tot je eigen sterkste dimensie.");
  assert.equal(zin3, "In Zien laat je al zien hoe het eruitziet als het loopt.");
});

test("L6: zonder dimensie op orde is de eerste stap klein", () => {
  const hoog = { zien: 90, sturen: 90, doen: 90, sd_zien: 12, sd_sturen: 12, sd_doen: 12 };
  const r = bepaalRuimte({ doeltype: "doen", scores: { zien: 55, sturen: 50, doen: 40 }, norm: hoog });
  assert.deepEqual(r.op_orde_dimensies, []);
  const [, , zin3] = vulZinnen(r, { doel_tekst: "Afmaken" });
  assert.equal(zin3, "De eerste stap is klein: Doen een paar punten omhoog, de rest volgt in de keten.");
});

/* --------------------------------------- criterium 8: de woordenlijst */

test("criterium 8: geen verboden woorden in de zinnen, voor alle doeltypen en beide vormen", () => {
  const gevallen = [
    { zien: 70, sturen: 48, doen: 62 }, { zien: 80, sturen: 78, doen: 82 },
    { zien: 55, sturen: 50, doen: 40 }, teamlijn, { zien: 50, sturen: 50, doen: 50 }
  ];
  for (const scores of gevallen) for (const doeltype of ["zien", "sturen", "doen", "onbekend", null]){
    for (const landelijk_beeld of [true, false]) for (const vorm of ["team", "individu"]){
      const r = bepaalRuimte({ doeltype, scores, norm, landelijk_beeld });
      const zinnen = vulZinnen(r, { doel_tekst: doeltype ? "Dat we het samen doen" : null, vorm });
      geenVerbodenWoorden(zinnen.join(" "), `zinnen bij ${JSON.stringify({ scores, doeltype, landelijk_beeld, vorm })}`);
    }
  }
  geenVerbodenWoorden([...KEUZEZINNEN_TEAM, ...KEUZEZINNEN_INDIVIDU].map(k => k.zin).join(" "), "de keuzezinnen");
  geenVerbodenWoorden(`${LABEL_GEDEELD_DOEL} ${LABEL_VERSCHIL_DOEL}`, "de labels van L5");
});

test("taalregels: het woord landelijk komt in geen enkele zin voor", () => {
  const hoog = { zien: 90, sturen: 90, doen: 90, sd_zien: 12, sd_sturen: 12, sd_doen: 12 };
  for (const niveau of ["team", "individu"]) for (const doeltype of ["zien", "sturen", "doen", null]){
    const r = bepaalRuimte({ doeltype, scores: { zien: 55, sturen: 50, doen: 40 }, norm: hoog, niveau });
    for (const zin of vulZinnen(r, { doel_tekst: doeltype ? "Samen verder" : null, vorm: niveau })){
      assert.ok(!zin.toLowerCase().includes("landelijk"), zin);
    }
  }
});

test("de verwoording verandert nooit een score: de ruimte is rekenwerk op de teamlijn", () => {
  const r = bepaalRuimte({ doeltype: "doen", scores: teamlijn, norm });
  assert.equal(r.huidige_waarde, teamlijn[r.eerste_stap_dimensie]);
  assert.deepEqual([NOORD.team_zien, NOORD.team_sturen, NOORD.team_doen], [66.3, 51.2, 49.5], "de teamlijn van Noord is onveranderd");
  assert.equal(NOORD.breuk, "zien_sturen");
  assert.deepEqual(NOORD.dynamieken.map(d => d.code), ["R1", "R11", "R12"]);
});

/* ---------------------------------------- criterium 12: de koppeltabel */

test("criterium 12: de profielkoppeling volgt uit de codes en staat in de testoutput", () => {
  const k = profielkoppeling(PROFIELEN);

  const regels = KETEN.map(d => ({
    dimensie: d.charAt(0).toUpperCase() + d.slice(1),
    "dragen nu al": k[d].draag_namen.join(", "),
    "geven de meeste beweging": k[d].beweging_namen.join(", ")
  }));
  console.log("\nL4 · profielkoppeling, afgeleid uit teamkracht_profielen (seed 07-09-2026)");
  console.table(regels);

  // De verwachting uit L4, ter controle tegen het model.
  const naam = code => PROFIELEN.find(p => p.code === code).naam;
  assert.equal(naam("HLL"), "Ziener");
  assert.ok(k.zien.draag_codes.includes("HLL") && k.doen.beweging_codes.includes("HLL"), "Ziener: Zien hoog, Doen laag");
  assert.ok(k.doen.draag_codes.includes("LHH") && k.zien.beweging_codes.includes("LHH"), "Aanpakker: Doen hoog, Zien laag");
  assert.ok(k.zien.draag_codes.includes("HLH") && k.doen.draag_codes.includes("HLH") && k.sturen.beweging_codes.includes("HLH"), "Meewerker: Zien en Doen hoog, Sturen laag");
  assert.ok(k.sturen.draag_codes.includes("HHL"), "Beslisser: Sturen hoog");
  for (const d of KETEN) assert.ok(k[d].draag_codes.includes("HHH"), "Trekker: alles hoog");
  for (const d of KETEN) assert.ok(k[d].beweging_codes.includes("LLL"), "Afwachter: alles laag");
  for (const d of KETEN) assert.ok(k[d].beweging_codes.includes("MMM"), "Middenband hoort bij beweging");
  for (const d of KETEN) assert.ok(!k[d].draag_codes.includes("MMM"), "Middenband draagt nooit");

  // Elk profiel zit per dimensie in precies één van de twee groepen.
  for (const d of KETEN){
    const alle = [...k[d].draag_codes, ...k[d].beweging_codes].sort();
    assert.deepEqual(alle, PROFIELEN.map(p => p.code).sort());
  }
});

test("L4: de aantallen in team Noord, nooit namen", () => {
  const k = profielkoppeling(PROFIELEN);
  // Noord: 4 Zieners (HLL), 2 Aanpakkers (LHH), 1 Trekker (HHH), 2 Afwachters (LLL), 2 middenband.
  assert.equal(telProfielen(NOORD.verdeling, k.sturen.draag_codes), 3, "Sturen dragen: Trekker en twee Aanpakkers");
  assert.equal(telProfielen(NOORD.verdeling, k.sturen.beweging_codes), 8, "Sturen beweging: vier Zieners, twee Afwachters, twee middenband");
  assert.deepEqual(namenInTeam(NOORD.verdeling, k.sturen.draag_codes, k.sturen.draag_namen), ["Trekker", "Aanpakker"]);
  assert.deepEqual(namenInTeam(NOORD.verdeling, k.sturen.beweging_codes, k.sturen.beweging_namen), ["Ziener", "Afwachter", "Middenband"]);
});

/* -------------------------------------------------------------------- L7 */

test("L7: een dynamiek die de eerste stap raakt komt bovenaan, de selectie blijft gelijk", () => {
  const dyn = [{ code: "R12", score: 0.5 }, { code: "R9", score: 0.4 }, { code: "R8", score: 0.3 }];
  const uit = sorteerDynamieken(dyn, REGELS, "doen");
  assert.deepEqual(uit.map(d => d.code).sort(), ["R12", "R8", "R9"], "dezelfde drie");
  assert.equal(uit[0].code, "R9", "Afbakeners (LHL) hebben Doen laag en raken de eerste stap");
  assert.deepEqual(sorteerDynamieken(dyn, REGELS, "zien").map(d => d.code), ["R12", "R9", "R8"], "R12 gaat over de breuk bij Zien en staat al bovenaan");
});

/* ------------------------------------------------------------- het schema */

test("de migratie legt de velden uit paragraaf 4 aan en verwijdert niets", () => {
  const sql = readFileSync(join(HIER, "..", "migratie-doel-ruimte-2026-09-17.sql"), "utf8");
  for (const tabel of ["teamkracht_teams", "index_scan_results", "teamkracht_leidersbeeld"]){
    assert.ok(sql.includes(`alter table public.${tabel}\n  add column if not exists doel_tekst`), `doel op ${tabel}`);
  }
  assert.ok(sql.includes("create table if not exists public.teamkracht_ruimte"));
  assert.ok(sql.includes("create table if not exists public.teamkracht_maatregelen"));
  for (const kolom of ["leidende_dimensie", "eerste_stap_dimensie", "ketencheck_actief", "referentie_type",
                       "referentie_waarde", "huidige_waarde", "ruimte_punten", "status", "op_orde_dimensies",
                       "draagprofielen", "bewegingsprofielen", "berekend_op", "regelversie"]){
    assert.ok(sql.includes(kolom), `kolom ${kolom} in teamkracht_ruimte`);
  }
  assert.ok(sql.includes("doelbereik") && sql.includes("anders_gedaan_tekst"));
  assert.ok(!/\bdrop (table|column)\b/i.test(sql), "er wordt niets verwijderd");
  assert.ok(!/\brename\b/i.test(sql), "er wordt niets hernoemd");
  assert.ok(!sql.includes("—"), "geen gedachtestreepje in de migratie");
});
