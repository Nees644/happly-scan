// test/doel-ruimte.test.js
// Leesregels L1 tot en met L7 uit briefing/teamkracht/briefing_code_doel_ruimte_v1.md
// en de acceptatiecriteria die zonder database en zonder scherm te toetsen
// zijn: 2, 3, 4, 5, 6, 7, 8 (op de gegenereerde zinnen) en 12.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
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
import { rijVoorTeam, rijVoorMeting, doelVelden, normUitTeambeeld, doelDatum } from "../teamkracht-ruimte-db.js";
import { ruimteGegevens, TEKST, mailDoelregel, herkenningszinMetDoel, eersteZin, tekenRuimteBalken } from "../teamkracht-ruimte-blokken.js";
import { bouwKaartHtml, tekenKaartSvg } from "../teamkracht-kaart.js";
import { maakKaartPdf } from "../kaart-pdf.js";
import { bouwUitslagPagina } from "../uitslag-pagina.js";
import { bouwLeiderPagina } from "../leider-pagina.js";
import { resultaatMail } from "../leidersbeeld-mail.js";
import { existsSync, writeFileSync } from "node:fs";

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


/* ============================================================ rendering */

const TEAMDOEL = { doel_tekst: "Dat we afmaken wat we afspreken, zonder dat de coach erachteraan moet", doeltype: "doen", doel_datum: "2026-12-01" };
const BEELD_MET_ID = { id: "11111111-1111-4111-8111-111111111111", ...NOORD };
const RUIMTE_NOORD = rijVoorTeam({ teambeeld: BEELD_MET_ID, team: TEAMDOEL, profielen: PROFIELEN });
const RUIMTE_ZONDER = rijVoorTeam({ teambeeld: BEELD_MET_ID, team: {}, profielen: PROFIELEN });

const KAART = opties => bouwKaartHtml({
  teambeeld: NOORD, regels: REGELS, profielen: PROFIELEN, teamnaam: "Noord", ...opties
});

/* Tekst uit html, zonder tags en zonder de stijl. */
const platteTekst = html => html
  .replace(/<style[\s\S]*?<\/style>/g, "").replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

test("de rij voor een team volgt het doel en de norm van het beeld", () => {
  assert.equal(RUIMTE_NOORD.niveau, "team");
  assert.equal(RUIMTE_NOORD.meting_id, BEELD_MET_ID.id);
  assert.equal(RUIMTE_NOORD.leidende_dimensie, "doen");
  assert.equal(RUIMTE_NOORD.doeltype_bron, "klant");
  assert.deepEqual(normUitTeambeeld(BEELD_MET_ID), { zien: 62, sturen: 55, doen: 50, sd_zien: 12, sd_sturen: 12, sd_doen: 12 });
  assert.ok(RUIMTE_NOORD.draagprofielen.length && RUIMTE_NOORD.bewegingsprofielen.length, "de L4-groepen gaan mee in de rij");
  assert.equal(RUIMTE_ZONDER.doeltype_bron, "keten");
  assert.equal(RUIMTE_ZONDER.leidende_dimensie, "doen", "zonder doel de laagste dimensie van Noord");
});

test("de rij voor een persoon vergelijkt nooit met anderen", () => {
  const r = rijVoorMeting({ meting: { id: "m1", zien: 70, sturen: 48, doen: 62, doeltype: "doen", doel_tekst: "Afmaken" } });
  assert.equal(r.niveau, "individu");
  assert.equal(r.referentie_type, "eigen_sterkste");
  assert.deepEqual(r.draagprofielen, []);
  assert.equal(r.config_snapshot.landelijk_beeld, false);
});

test("doelVelden: overgeslagen is onbekend en leest via de keten", () => {
  assert.equal(doelVelden({ doel_tekst: "", doeltype: null, door: "deelnemer" }), null);
  const d = doelVelden({ doel_tekst: "  Afmaken.  ", doeltype: "doen", door: "deelnemer" });
  assert.equal(d.doel_tekst, "Afmaken.");
  assert.equal(d.doeltype_bron, "klant");
  assert.equal(d.doel_ingevuld_door, "deelnemer");
  const o = doelVelden({ doel_tekst: "Iets", doeltype: "weet ik niet", door: "teamleider" });
  assert.equal(o.doeltype, "onbekend");
  assert.equal(o.doeltype_bron, "keten");
  assert.equal(doelVelden({ doel_tekst: "x".repeat(300), doeltype: "zien", door: "leider" }).doel_tekst.length, 200);
  assert.equal(doelVelden({ doel_tekst: "Afmaken", doeltype: "doen", doel_datum: "2026-12-01", door: "deelnemer" }).doel_datum, "2026-12-01");
  assert.equal(doelVelden({ doel_tekst: "Afmaken", doeltype: "doen", doel_datum: "2026-13-01", door: "deelnemer" }).doel_datum, null, "geen dertiende maand");
  assert.equal(doelDatum("2026-02-30"), null);
  assert.equal(doelDatum("2026-02-28"), "2026-02-28");
});

/* ---------------------------------------------- de kaart, blok 1 tot 5 */

test("de kaart draagt de vijf blokken in de vaste volgorde", () => {
  const html = KAART({ ruimte: RUIMTE_NOORD, teamdoel: TEAMDOEL });
  const t = platteTekst(html);
  const T = TEKST.team;
  const plek = w => { const i = t.indexOf(w); assert.ok(i >= 0, `ontbreekt: ${w}`); return i; };
  const doel = plek(T.doel_kop);
  assert.ok(t.includes(TEAMDOEL.doel_tekst), "het doel staat er letterlijk");
  assert.ok(t.includes("Voor 1 december 2026."), "de termijn staat onder het doel");
  assert.ok(t.includes("Dat we afmaken wat we afspreken"), "de keuzezin staat eronder");
  const breuk = plek("De keten zakt tussen Zien en Sturen");
  const ruimte = plek(T.ruimte_kop);
  const dyn = plek("Waarschijnlijke dynamieken");
  const route = plek(T.route_kop);
  const res = plek(T.resultaat_kop);
  assert.ok(doel < breuk && breuk < ruimte && ruimte < dyn && dyn < route && route < res, "volgorde doel, doen, ruimte, route, resultaat");
  assert.ok(t.includes(T.route_leeg) && t.includes(T.resultaat_leeg), "blok 4 en 5 met de leeg-tekst");
  assert.ok(html.includes('aria-label="Waar de winst zit'), "de balkenvisual staat erin");
  assert.ok(html.includes("Dragen Doen nu al:") || html.includes("Dragen Sturen nu al:") || html.includes("Dragen Zien nu al:"), "de profielregel");
  assert.ok(html.includes("Geven de meeste beweging:"));
  assert.ok(!html.includes('class="doel-knop"'), "met doel geen knop");
});

test("criterium 1: zonder doel blijft blok 2 gelijk, blok 1 toont de fallback en blok 3 leest via de keten", () => {
  const met = KAART({ ruimte: RUIMTE_NOORD, teamdoel: TEAMDOEL });
  const zonder = KAART({ ruimte: RUIMTE_ZONDER, teamdoel: null });
  const oud = KAART({});
  assert.ok(zonder.includes("Nog geen doel benoemd. De kaart leest via de keten."));
  assert.ok(zonder.includes('class="doel-knop"') && zonder.includes(">Doel toevoegen<"), "de knop");
  // Blok 2: de tekening en de breuk zijn in alle drie gelijk.
  const svg = tekenKaartSvg(NOORD);
  for (const html of [met, zonder, oud]){
    assert.ok(html.includes(svg), "dezelfde tekening");
    assert.ok(html.includes("De keten zakt tussen Zien en Sturen"));
    assert.ok(html.includes("Zieners") && html.includes("Aanpakkers"), "dezelfde profielverdeling");
  }
  assert.ok(zonder.includes("De kaart leest via de keten:"), "zin 1 in de keten-variant");
  assert.ok(!oud.includes(TEKST.team.ruimte_kop), "zonder ruimterij geen blok 3, de oude kaart blijft de oude kaart");
});

test("criterium 1: de scores van drie beelden zijn gelijk aan de bevroren momentopname", () => {
  const sets = [
    deelnemers,
    deelnemers.slice(0, 7),
    [...deelnemers].reverse().map(d => ({ zien: d.zien - 3, sturen: d.sturen + 2, doen: d.doen }))
  ];
  const nu = sets.map(lijst => {
    const b = bouwTeambeeld({ deelnemers: lijst, norm, config: CONFIG, regels: REGELS, profielen: PROFIELEN });
    return { n: b.n, team_zien: b.team_zien, team_sturen: b.team_sturen, team_doen: b.team_doen,
             verdeling: b.verdeling, breuk: b.breuk, dynamieken: b.dynamieken,
             profielen: b.profielen.map(p => p.code) };
  });
  const pad = join(HIER, "snapshot-teambeelden.json");
  if (!existsSync(pad)) writeFileSync(pad, JSON.stringify(nu, null, 2) + "\n");
  const bevroren = JSON.parse(readFileSync(pad, "utf8"));
  assert.deepEqual(nu, bevroren, "geen enkele score wijkt af van de momentopname");
});

test("criterium 5 op de kaart: zonder landelijk beeld nergens het woord landelijk in blok 3", () => {
  const rij = rijVoorTeam({ teambeeld: BEELD_MET_ID, team: TEAMDOEL, profielen: PROFIELEN, landelijk_beeld: false });
  assert.equal(rij.referentie_type, "eigen_sterkste");
  const g = ruimteGegevens({ ruimte: rij, scores: teamlijn, ...TEAMDOEL, vorm: "team", verdeling: NOORD.verdeling, profielen: PROFIELEN });
  for (const z of g.zinnen) assert.ok(!z.toLowerCase().includes("landelijk"), z);
});

test("criterium 6 op de kaart: de strip staat er bij elf deelnemers en niet bij negen", () => {
  const elf = ruimteGegevens({ ruimte: RUIMTE_NOORD, scores: teamlijn, ...TEAMDOEL, vorm: "team", verdeling: NOORD.verdeling, profielen: PROFIELEN, lijnen: NOORD.lijnen });
  assert.ok(elf.strip && elf.strip.op_of_boven + elf.strip.eronder === 11);
  const negen = bouwTeambeeld({ deelnemers: deelnemers.slice(0, 9), norm, config: CONFIG, regels: REGELS, profielen: PROFIELEN });
  const rij9 = rijVoorTeam({ teambeeld: { id: "b9", ...negen }, team: TEAMDOEL, profielen: PROFIELEN });
  const g9 = ruimteGegevens({ ruimte: rij9, scores: { zien: negen.team_zien, sturen: negen.team_sturen, doen: negen.team_doen }, ...TEAMDOEL, vorm: "team", verdeling: negen.verdeling, profielen: PROFIELEN, lijnen: negen.lijnen });
  assert.equal(g9.strip, null);
  const html9 = bouwKaartHtml({ teambeeld: negen, regels: REGELS, profielen: PROFIELEN, ruimte: rij9, teamdoel: TEAMDOEL });
  assert.ok(!html9.includes("al op of boven de referentie"));
});

test("L7 op de kaart: de dynamieken staan in de volgorde van de eerste stap", () => {
  const g = ruimteGegevens({ ruimte: RUIMTE_NOORD, scores: teamlijn, ...TEAMDOEL, vorm: "team", verdeling: NOORD.verdeling, profielen: PROFIELEN, dynamieken: NOORD.dynamieken, regels: REGELS });
  assert.deepEqual(g.dynamieken.map(d => d.code).sort(), NOORD.dynamieken.map(d => d.code).sort(), "dezelfde selectie");
  const html = KAART({ ruimte: RUIMTE_NOORD, teamdoel: TEAMDOEL });
  const posities = g.dynamieken.map(d => html.indexOf(`&middot; ${d.code}</p>`));
  assert.ok(posities.every((p, i) => i === 0 || p > posities[i - 1]), "de kaart volgt die volgorde");
});

test("criterium 4 in de visual: alles op orde geeft geen gearceerd segment", () => {
  const rij = rijVoorTeam({ teambeeld: { id: "b4", ...NOORD, team_zien: 82, team_sturen: 80, team_doen: 84 }, team: TEAMDOEL, profielen: PROFIELEN });
  assert.equal(rij.status, "op_orde");
  const g = ruimteGegevens({ ruimte: rij, scores: { zien: 82, sturen: 80, doen: 84 }, ...TEAMDOEL, vorm: "team", verdeling: NOORD.verdeling, profielen: PROFIELEN });
  assert.ok(g.balken.every(b => b.ruimte_tot === null));
  assert.ok(!tekenRuimteBalken(g).includes("url(#arcering"));
  assert.ok(tekenRuimteBalken(ruimteGegevens({ ruimte: RUIMTE_NOORD, scores: teamlijn, ...TEAMDOEL, vorm: "team", verdeling: NOORD.verdeling, profielen: PROFIELEN })).includes("url(#arcering"), "met ruimte wel");
});

/* --------------------------------------------------- criterium 10: de pdf */

test("criterium 10: de pdf tekent blok 1, 3, 4 en 5 op A4 en A1", async () => {
  for (const formaat of ["a4", "a1"]){
    const met = await maakKaartPdf({ teambeeld: NOORD, regels: REGELS, profielen: PROFIELEN, teamnaam: "Noord", formaat, ruimte: RUIMTE_NOORD, teamdoel: TEAMDOEL });
    const zonder = await maakKaartPdf({ teambeeld: NOORD, regels: REGELS, profielen: PROFIELEN, teamnaam: "Noord", formaat });
    assert.ok(met.length > 1000 && zonder.length > 1000);
    assert.ok(met.length > zonder.length, `${formaat}: de blokken staan in de pdf`);
    assert.match(met.toString("latin1"), /MediaBox/);
    assert.ok(!met.toString("latin1").includes("/Count 2"), "één vel");
  }
});

/* ------------------------------------------- de individuele uitslag */

test("de individuele uitslag heeft de vijf blokken in de jij-vorm", () => {
  const meting = { id: "m1", index_score: 60, zien: 70, sturen: 48, doen: 62, duiding: null, created_at: "2026-09-17T10:00:00Z",
                   profiel_code: "HLL", doel_tekst: "Dat ik afmaak waar ik aan begin", doeltype: "doen" };
  const profiel = PROFIELEN.find(p => p.code === "HLL");
  const ruimte = rijVoorMeting({ meting });
  const html = bouwUitslagPagina({ meting, profiel, ruimte });
  const t = platteTekst(html);
  const I = TEKST.individu;
  const i1 = t.indexOf(I.doel_kop), i2 = t.indexOf("Waar je nu staat"), i3 = t.indexOf(I.ruimte_kop), i4 = t.indexOf(I.route_kop), i5 = t.indexOf(I.resultaat_kop);
  assert.ok(i1 >= 0 && i1 < i2 && i2 < i3 && i3 < i4 && i4 < i5, "volgorde doel, doen, ruimte, route, resultaat");
  assert.ok(t.includes("Dat ik afmaak waar ik aan begin"));
  assert.ok(t.includes("Dat ik afmaak wat ik me voorneem"), "de ik-keuzezin");
  assert.ok(t.includes("laat je al zien") || t.includes("De eerste stap is klein"), "jij-vorm");
  assert.ok(t.includes("je eigen sterkste dimensie"));
  assert.ok(t.includes("Ziener."), "het eigen profiel met één zin");
  assert.ok(!t.includes("teamleden"), "geen profielaantallen bij één persoon");
  assert.ok(t.includes(I.route_leeg) && t.includes(I.resultaat_leeg));
});

test("criterium 9: overgeslagen doel op de individuele uitslag", () => {
  const meting = { id: "m2", index_score: 60, zien: 70, sturen: 48, doen: 62, duiding: null, created_at: "2026-09-17T10:00:00Z", profiel_code: null, doel_tekst: null, doeltype: null };
  const ruimte = rijVoorMeting({ meting });
  assert.equal(ruimte.doeltype_bron, "keten");
  const html = bouwUitslagPagina({ meting, profiel: null, ruimte });
  assert.ok(html.includes("Nog geen doel benoemd."));
  assert.ok(html.includes("De kaart leest via de keten:"), "blok 3 leest via de keten");
  assert.equal(herkenningszinMetDoel("Wat je vaak genoeg doet, wordt automatisch.", null), "Wat je vaak genoeg doet, wordt automatisch.");
  assert.equal(herkenningszinMetDoel("Wat je vaak genoeg doet, wordt automatisch.", "Afmaken waar ik aan begin"),
    "Wat je vaak genoeg doet, wordt automatisch. Mijn doel: Afmaken waar ik aan begin.");
});

test("de mailregel boven de indexwaarde", () => {
  const ruimte = rijVoorMeting({ meting: { id: "m3", zien: 70, sturen: 48, doen: 62, doeltype: "doen" } });
  assert.equal(mailDoelregel({ doel_tekst: "Afmaken waar ik aan begin", ruimte }), "Je doel: Afmaken waar ik aan begin. Waar de winst zit: Sturen.");
  assert.equal(mailDoelregel({ doel_tekst: "Afmaken waar ik aan begin.", doel_datum: "2026-12-01", ruimte }), "Je doel: Afmaken waar ik aan begin, voor 1 december 2026. Waar de winst zit: Sturen.");
  assert.equal(mailDoelregel({ doel_tekst: null, ruimte }), null);
  assert.equal(eersteZin("Ik zie scherp wat er speelt, ook wat niemand hardop zegt. Vaak zeg ik het pas na afloop."), "Ik zie scherp wat er speelt, ook wat niemand hardop zegt.");
});

/* ------------------------------------------------- het Leidersbeeld */

test("criterium 7 op de leiderpagina en in de mail", () => {
  const rij = { organisatie: "Noord", teamomvang: "10-20", zien: 70, sturen: 60, doen: 50, index_score: 60, doeltype: "zien" };
  const anders = bouwLeiderPagina({ rij, team: { id: "t" }, deelnemers: { ingevuld: 3, uitgenodigd: null },
    doelvergelijking: { gelijk: false, label: "Verschil in beeld over wat nodig is", team_zin: "Dat we afmaken wat we afspreken", leider_zin: "Dat we hetzelfde beeld hebben van wat er speelt en wat er moet gebeuren" } });
  assert.ok(anders.includes("Verschil in beeld over wat nodig is"));
  assert.ok(anders.includes("Dat we afmaken wat we afspreken") && anders.includes("Dat we hetzelfde beeld hebben"), "beide zinnen naast elkaar");
  const gelijk = bouwLeiderPagina({ rij, team: { id: "t" }, deelnemers: { ingevuld: 3 },
    doelvergelijking: { gelijk: true, label: "Gedeeld beeld over wat nodig is" } });
  assert.ok(gelijk.includes("Gedeeld beeld over wat nodig is"));
  const zonder = bouwLeiderPagina({ rij, team: { id: "t" }, deelnemers: { ingevuld: 3 } });
  assert.ok(!zonder.includes("over wat nodig is"), "zonder teamdoel geen label");

  const mail = resultaatMail({ naam: "Test Leider", index: 61, token: "abc" });
  assert.ok(mail.html.includes("Wat is de gemeten Teamkracht Index van jouw team? En zit de ruimte waar jij hem verwacht?"));
});

/* --------------------------------------------- criterium 8: de uitvoer */

test("criterium 8: de gerenderde html, svg en mail van de testset bevatten geen verboden woorden", () => {
  const meting = { id: "m1", index_score: 60, zien: 70, sturen: 48, doen: 62, duiding: null, created_at: "2026-09-17T10:00:00Z", profiel_code: "HLL", doel_tekst: "Dat ik afmaak waar ik aan begin", doeltype: "doen" };
  const uitvoer = {
    "kaart met doel": KAART({ ruimte: RUIMTE_NOORD, teamdoel: TEAMDOEL }),
    "kaart zonder doel": KAART({ ruimte: RUIMTE_ZONDER }),
    "kaart zonder landelijk beeld": KAART({ ruimte: rijVoorTeam({ teambeeld: BEELD_MET_ID, team: TEAMDOEL, profielen: PROFIELEN, landelijk_beeld: false }), teamdoel: TEAMDOEL, landelijk_beeld: false }),
    "individuele uitslag": bouwUitslagPagina({ meting, profiel: PROFIELEN.find(p => p.code === "HLL"), ruimte: rijVoorMeting({ meting }) }),
    "leiderpagina": bouwLeiderPagina({ rij: { organisatie: "Noord", teamomvang: "10-20", zien: 70, sturen: 60, doen: 50, index_score: 60 }, team: { id: "t" }, deelnemers: { ingevuld: 3 },
      doelvergelijking: { gelijk: false, label: "Verschil in beeld over wat nodig is", team_zin: "a", leider_zin: "b" } }),
    "resultaatmail": resultaatMail({ naam: "Test", index: 61, token: "abc" }).html
  };
  // "training" en "cohort" horen bij de Sprint-teksten van de bestaande uitslag
  // en vallen buiten deze briefing; de lijst hier is die van paragraaf 3 en 8
  // voor wat deze briefing zelf op het scherm zet.
  for (const [naam, html] of Object.entries(uitvoer)){
    const t = platteTekst(html).toLowerCase();
    for (const w of ["kloof", "gap", "tekort", "blinde vlek", "zwak", "achterstand", "potentieel", "samenspel", "cohort", "streak"]){
      assert.ok(!t.includes(w), `${naam} bevat het woord ${w}`);
    }
    assert.ok(!platteTekst(html).includes("\u2014"), `${naam} bevat een gedachtestreepje`);
  }
});

/* ----------------------------------------- criterium 11 en de schermen */

test("criterium 11: geen route schrijft in teamkracht_maatregelen", () => {
  const map = join(HIER, "..", "api");
  const bestanden = execSync(`ls "${map}"`).toString().trim().split("\n");
  for (const b of bestanden){
    const code = readFileSync(join(map, b), "utf8");
    assert.ok(!code.includes("teamkracht_maatregelen"), `${b} raakt teamkracht_maatregelen`);
    assert.ok(!/doelbereik|anders_gedaan_tekst/.test(code), `${b} schrijft de hermetingsvelden`);
  }
});

test("de keuzezinnen op de schermen zijn gelijk aan die in de module", () => {
  const lees = pad => readFileSync(join(HIER, "..", pad), "utf8");
  const uitScan = [...lees("scan.html").split("const DOEL_ZINNEN = [")[1].split("];")[0].matchAll(/doeltype: "(\w+)",\s*zin: "([^"]+)"/g)].map(m => ({ doeltype: m[1], zin: m[2] }));
  assert.deepEqual(uitScan, KEUZEZINNEN_INDIVIDU.map(k => ({ ...k })));
  const uitDash = [...lees("teamkracht.html").split("const DOEL_ZINNEN = [")[1].split("];")[0].matchAll(/doeltype: "(\w+)",\s*zin: "([^"]+)"/g)].map(m => ({ doeltype: m[1], zin: m[2] }));
  assert.deepEqual(uitDash, KEUZEZINNEN_TEAM.map(k => ({ ...k })));
  const scan = lees("scan.html");
  assert.ok(scan.includes('logEvent("doel_ingevuld")') && scan.includes('logEvent("doel_overgeslagen")'), "de twee funnel-events");
  assert.ok(scan.includes("Waar wil je staan?") && scan.includes("<div class=\"qtxt\" style=\"font-size:18px\">Wanneer?</div>") && scan.includes(">Sla over<"));
  const lb = lees("leidersbeeld.html");
  assert.ok(lb.includes("Waar moet dit team staan?") && lb.includes("Wanneer moet dat staan?") && lb.includes("Wat is er vooral nodig om dat te halen?") && lb.includes('id="doel-overslaan"'));
  const doelpagina = lees("teamkracht-doel.html");
  const uitDoel = [...doelpagina.split("const DOEL_ZINNEN = [")[1].split("];")[0].matchAll(/doeltype: "(\w+)",\s*zin: "([^"]+)"/g)].map(m => ({ doeltype: m[1], zin: m[2] }));
  assert.deepEqual(uitDoel, KEUZEZINNEN_TEAM.map(k => ({ ...k })), "de doelbeeldpagina heeft dezelfde keuzezinnen");
  assert.ok(doelpagina.includes("Het doel in woorden") && doelpagina.includes("Wanneer moet dat staan?"));
  const dash = lees("teamkracht.html");
  assert.ok(dash.includes("Waar moet dit team staan? Eén zin, in jullie eigen woorden.") && dash.includes("Wanneer moet dat staan?") && dash.includes("Doel toevoegen") && dash.includes("Aanpassen"));
  for (const b of ["scan.html", "leidersbeeld.html", "teamkracht.html"]) assert.ok(!lees(b).includes("tien weken") && !lees(b).includes("drie maanden"), `${b}: de termijn vult de klant in`);
});

/* ------------------------------------------- het voorbeeld in het lege vak */
test("het voorbeelddoel past bij de dimensie met de meeste ruimte", async () => {
  const { voorbeelddoel, VOORBEELDDOEL } = await import("../teamkracht-ruimte.js");
  assert.equal(voorbeelddoel({ zien: 75, sturen: 50, doen: 60 }), VOORBEELDDOEL.sturen);
  assert.equal(voorbeelddoel({ zien: 40, sturen: 50, doen: 60 }), VOORBEELDDOEL.zien);
  assert.equal(voorbeelddoel({ zien: 70, sturen: 70, doen: 45 }), VOORBEELDDOEL.doen);
  // Gelijke stand: de vroegste in de keten, zoals overal in de leesregels.
  assert.equal(voorbeelddoel({ zien: 50, sturen: 50, doen: 50 }), VOORBEELDDOEL.zien);
  // Zonder scores geen gok op de meting, maar een vast voorbeeld.
  assert.equal(voorbeelddoel(null), VOORBEELDDOEL.sturen);
  assert.equal(voorbeelddoel({ zien: "x" }), VOORBEELDDOEL.sturen);
});

test("een voorbeelddoel is een voorbeeld en volgt de taalregels", async () => {
  const { VOORBEELDDOEL } = await import("../teamkracht-ruimte.js");
  for (const [dim, zin] of Object.entries(VOORBEELDDOEL)){
    assert.ok(zin.startsWith("Bijvoorbeeld: "), `${dim} zegt niet dat het een voorbeeld is`);
    assert.ok(zin.length <= 200, `${dim} past niet in het vak van tweehonderd tekens`);
    assert.ok(!zin.includes("\u2014") && !zin.includes("!"), `${dim} breekt de taalregels`);
    // Tijdloos: een voorbeeld met een feestdag erin leest in januari vreemd.
    assert.ok(!/kerst|zomer|pasen|jaarwisseling/i.test(zin), `${dim} hangt aan een seizoen`);
  }
});

test("het Leidersbeeld vraagt het doel in je eigen woorden en geeft een voorbeeld", () => {
  const lb = readFileSync(new URL("../leidersbeeld.html", import.meta.url), "utf8");
  // De leider vult dit alleen in; jullie hoort bij de sessie in het dashboard.
  assert.ok(lb.includes("in je eigen woorden"), "de leider wordt met jullie aangesproken");
  assert.ok(!lb.includes("in jullie eigen woorden"));
  assert.ok(lb.includes("voorbeelddoel("), "het lege vak krijgt geen voorbeeld");
  // Een placeholder, geen waarde: het voorbeeld mag nooit als doel worden verstuurd.
  assert.ok(lb.includes('.placeholder = voorbeelddoel'), "het voorbeeld wordt als waarde gezet");
  assert.ok(!/el\("doel-tekst"\)\.value\s*=\s*voorbeelddoel/.test(lb));
});
