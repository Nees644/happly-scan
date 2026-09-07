// test/teamkracht.test.js
// Acceptatiecriteria 1, 2, 3 en 7 uit de briefing, plus de randgevallen van de
// regelevaluatie. Draaien met: npm test
//
// Afwijking van de briefing bij criterium 1: daar staat dat R1 en R11 gelijk
// scoren en dat R1 op volgorde wint. Met de formule uit paragraaf 5 scoren ze
// niet gelijk (0,70 tegen 0,60). De formule is leidend (akkoord 07-09-2026),
// dus de verwachting hieronder is de doorgerekende uitkomst. De volgorde
// R1, R11, R12 blijft ongewijzigd.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bepaalProfiel, bepaalTeamlijn, bepaalBreuk, bepaalVerdeling,
  voorwaardeWaar, controleerVoorwaarde, scoreRegel, kiesDynamieken,
  vulPlaceholders, bouwTeambeeld, beoordeelDoel, verschuiving
} from "../teamkracht-logica.js";

import { leesRegels, leesProfielen, leesInterventies, leesDoelregels, leesTestdata, leesSeedblok } from "./seed-lezen.js";

const REGELS = leesRegels();
const { norm, deelnemers } = leesTestdata();
const CONFIG = { middenband_sd: 0.25, min_deelnemers_lijnen: 10, norm_bron: "vast" };

const beeld = (lijst) => bouwTeambeeld({ deelnemers: lijst, norm, config: CONFIG, regels: REGELS });

/* ---------------------------------------------- criterium 1: team Noord, 11 */

test("criterium 1: de profielverdeling van team Noord", () => {
  assert.deepEqual(beeld(deelnemers).verdeling, { HLL: 4, LHH: 2, HHH: 1, LLL: 2, MMM: 2 });
});

test("criterium 1: de breuk zit tussen zien en sturen", () => {
  const b = beeld(deelnemers);
  assert.equal(b.breuk, "zien_sturen");
  assert.deepEqual([b.team_zien, b.team_sturen, b.team_doen], [66.3, 51.2, 49.5]);
});

test("criterium 1: de dynamieken zijn R1, R11 en R12 in die volgorde", () => {
  const d = beeld(deelnemers).dynamieken;
  assert.deepEqual(d.map(x => x.code), ["R1", "R11", "R12"]);
  assert.deepEqual(d.map(x => x.score), [0.7, 0.6, 0.5]);
});

test("criterium 1: er staat een versterkende regel bij", () => {
  const codes = beeld(deelnemers).dynamieken.map(x => x.code);
  const versterkend = REGELS.filter(r => r.richting === "versterkt").map(r => r.code);
  assert.ok(codes.some(c => versterkend.includes(c)));
});

/* --------------------------------------------------- criterium 2: zeven man */

test("criterium 2: onder tien deelnemers geen individuele lijnen", () => {
  const b = beeld(deelnemers.slice(0, 7));
  assert.equal(b.n, 7);
  assert.equal(b.lijnen, null);
  assert.ok(b.verdeling.HLL > 0, "de verdeling blijft wel gevuld");
});

test("vanaf tien deelnemers zijn er wel lijnen, gesorteerd en zonder id", () => {
  const b = beeld(deelnemers);
  assert.equal(b.lijnen.length, 11);
  for (const lijn of b.lijnen){
    assert.equal(lijn.length, 4, "zien, sturen, doen en de afrondingsmarkering");
    assert.ok(lijn.every(Number.isInteger), "hele punten, geen kommagetallen");
  }
  const zien = b.lijnen.map(l => l[0]);
  assert.deepEqual(zien, [...zien].sort((a, b) => a - b));
});

test("criterium 3: de lijnen verraden de invoervolgorde niet", () => {
  const omgekeerd = beeld([...deelnemers].reverse());
  assert.deepEqual(beeld(deelnemers).lijnen, omgekeerd.lijnen);
});

/* ------------------------------------------------------------- profielen */

test("de middenband blijft middenband, de rest wordt afgerond", () => {
  assert.deepEqual(bepaalProfiel({ zien: 60, sturen: 52, doen: 48 }, norm, 0.25),
    { code: "MMM", ruw: "MMM", afgerond: false });
  // Zien duidelijk hoog, sturen en doen in de band: afronden naar het
  // dichtstbijzijnde patroon, hier tweemaal onder het gemiddelde.
  const p = bepaalProfiel({ zien: 84, sturen: 54, doen: 49 }, norm, 0.25);
  assert.equal(p.ruw, "HMM");
  assert.equal(p.code, "HLL");
  assert.equal(p.afgerond, true);
});

test("de breuk valt op geen of begin als er niets duidelijk zakt", () => {
  assert.equal(bepaalBreuk({ zien: 62, sturen: 55, doen: 50 }, norm), "geen");
  assert.equal(bepaalBreuk({ zien: 55, sturen: 49, doen: 45 }, norm), "begin");
});

/* --------------------------------------------------------------- regels */

test("alle voorwaarden in de seed gebruiken toegestane sleutels", () => {
  assert.equal(REGELS.length, 13);
  for (const r of REGELS) assert.equal(controleerVoorwaarde(r.voorwaarde), true);
});

test("een onbekende sleutel in een voorwaarde wordt geweigerd", () => {
  assert.throws(() => controleerVoorwaarde({ minimaal: { HLL: 2 } }), /onbekende sleutel/);
  assert.throws(() => controleerVoorwaarde({}), /leeg/);
});

test("min_een_van van R5 werkt als een of", () => {
  const r5 = REGELS.find(r => r.code === "R5");
  const ctx = n => ({ verdeling: n, n: 6, breuk: "geen", teamlijn: norm, norm });
  assert.equal(voorwaardeWaar(r5.voorwaarde, ctx({ HLH: 1, HHH: 1 })), true);
  assert.equal(voorwaardeWaar(r5.voorwaarde, ctx({ HLH: 1, HHL: 1 })), true);
  assert.equal(voorwaardeWaar(r5.voorwaarde, ctx({ HLH: 1, LLL: 5 })), false);
});

test("R4a en R4b splitsen op teamgrootte", () => {
  const r4a = REGELS.find(r => r.code === "R4a");
  const r4b = REGELS.find(r => r.code === "R4b");
  const ctx = (verdeling, n) => ({ verdeling, n, breuk: "geen", teamlijn: norm, norm });
  assert.equal(voorwaardeWaar(r4a.voorwaarde, ctx({ HHL: 2 }, 8)), true);
  assert.equal(voorwaardeWaar(r4a.voorwaarde, ctx({ HHL: 2 }, 12)), false);
  assert.equal(voorwaardeWaar(r4b.voorwaarde, ctx({ HHL: 3 }, 12)), true);
  assert.equal(voorwaardeWaar(r4b.voorwaarde, ctx({ HHL: 2 }, 12)), false);
});

test("een teamregel scoort vast, een profielregel naar rato", () => {
  const r12 = REGELS.find(r => r.code === "R12");
  const r1  = REGELS.find(r => r.code === "R1");
  const ctx = { verdeling: { HLL: 4, LHH: 2 }, n: 11, breuk: "zien_sturen", teamlijn: { zien: 66.3 }, norm };
  assert.equal(scoreRegel(r12, ctx), 0.5);
  assert.equal(Math.round(scoreRegel(r1, ctx) * 100) / 100, 0.7);
});

test("de derde plek gaat naar de hoogste versterkende regel als die ontbreekt", () => {
  const remmend = (code, volgorde) => ({
    code, richting: "remt", volgorde, gewicht_opslag: 0.2,
    voorwaarde: { min: { LLL: 1 } }
  });
  const regels = [
    remmend("A", 1), remmend("B", 2), remmend("C", 3),
    { code: "V", richting: "versterkt", volgorde: 4, gewicht_opslag: 0, voorwaarde: { min: { LLL: 1 } } }
  ];
  const ctx = { verdeling: { LLL: 4 }, n: 4, breuk: "geen", teamlijn: norm, norm };
  const codes = kiesDynamieken(regels, ctx).map(d => d.code);
  assert.deepEqual(codes, ["A", "B", "V"]);
});

test("bij gelijke score wint de lagere volgorde", () => {
  const maak = (code, volgorde) => ({
    code, richting: "remt", volgorde, gewicht_opslag: 0.1,
    voorwaarde: { min: { LLL: 1 } }
  });
  const ctx = { verdeling: { LLL: 3 }, n: 3, breuk: "geen", teamlijn: norm, norm };
  const codes = kiesDynamieken([maak("Z", 9), maak("A", 2)], ctx).map(d => d.code);
  assert.deepEqual(codes, ["A", "Z"]);
});

/* --------------------------------------------------------- koppen en taal */

test("placeholders worden telwoorden met een hoofdletter", () => {
  const r1 = REGELS.find(r => r.code === "R1");
  assert.equal(
    vulPlaceholders(r1.titel_geteld, { HLL: 4, LHH: 2 }, 11),
    "Vier Zieners en twee Aanpakkers"
  );
  const r10 = REGELS.find(r => r.code === "R10");
  assert.equal(vulPlaceholders(r10.titel_geteld, { MMM: 7 }, 11), "Zeven van de elf in de middenband");
});

test("criterium 7: geen gedachtestreep en geen uitroepteken in de seed", () => {
  const blok = leesSeedblok();
  for (const teken of ["—", "–", "!"]){
    assert.equal(blok.includes(teken), false, `teken ${JSON.stringify(teken)} staat in de seed`);
  }
});

test("elke regel heeft een dynamiek, een interventie en een gespreksvraag", () => {
  for (const r of REGELS){
    for (const veld of ["dynamiek", "interventie", "gespreksvraag"]){
      assert.ok(r[veld] && r[veld].trim().length > 10, `${r.code} mist ${veld}`);
    }
    assert.ok(r.titel.trim().length > 3, `${r.code} mist een kop`);
  }
});

test("elke interventie is meetbaar gemaakt", () => {
  const lijst = leesInterventies();
  assert.equal(lijst.length, 13);
  for (const i of lijst){
    assert.ok(i.tekst && i.tekst.trim().length > 20, `${i.code} mist tekst`);
    assert.ok(i.ritme && i.ritme.trim(), `${i.code} mist een ritme`);
    assert.ok(i.telling && i.telling.trim(), `${i.code} mist iets om te tellen`);
    assert.ok(i.gespreksvraag && i.gespreksvraag.includes("?"), `${i.code} mist een gespreksvraag`);
    assert.ok(i.breuk || (Array.isArray(i.profielen) && i.profielen.length),
      `${i.code} hangt aan niets`);
  }
});

test("elke breuk en elk profiel heeft minstens één interventie", () => {
  const lijst = leesInterventies();
  for (const breuk of ["zien_sturen", "sturen_doen", "geen", "begin"]){
    assert.ok(lijst.some(i => i.breuk === breuk), `geen interventie voor breuk ${breuk}`);
  }
  for (const p of leesProfielen()){
    assert.ok(lijst.some(i => (i.profielen || []).includes(p.code)),
      `geen interventie voor profiel ${p.code}`);
  }
});

/* ------------------------------------------------------- ambitiebanden */

const DOELREGELS = leesDoelregels();
const START = beeld(deelnemers);   // Zien 66,3  Sturen 51,2  Doen 49,5

const band = (doel, horizon = 12) => beoordeelDoel(START, doel, DOELREGELS, horizon);

test("de vier ambitiebanden dekken elke stijging", () => {
  assert.equal(DOELREGELS.length, 4);
  for (let punten = 0; punten <= 40; punten++){
    const uit = band({ zien: START.team_zien + punten, sturen: START.team_sturen, doen: START.team_doen });
    assert.ok(uit.code, `geen band voor een stijging van ${punten} punten`);
  }
});

test("de banden vallen op de grenzen die de opdrachtgever noemde", () => {
  const bij = punten => band({ zien: START.team_zien + punten, sturen: START.team_sturen, doen: START.team_doen });
  assert.equal(bij(3).titel,  "Lage ambitie");
  assert.equal(bij(7).titel,  "Normale ambitie");
  assert.equal(bij(12).titel, "Hoge ambitie");
  assert.equal(bij(20).titel, "Waarschijnlijk niet haalbaar");
  assert.equal(bij(5).titel,  "Normale ambitie", "vijf hoort bij normaal, niet bij laag");
  assert.equal(bij(15).titel, "Waarschijnlijk niet haalbaar", "vijftien is de bovengrens van hoog");
});

test("de sterkst verschoven vaardigheid bepaalt de band", () => {
  const uit = band({ zien: START.team_zien, sturen: START.team_sturen + 12, doen: START.team_doen + 1 });
  assert.equal(uit.titel, "Hoge ambitie");
  assert.equal(uit.zwaarste_per_jaar, 12);
});

test("een langere looptijd maakt dezelfde sprong minder ambitieus", () => {
  const doel = { zien: START.team_zien, sturen: START.team_sturen + 12, doen: START.team_doen };
  assert.equal(band(doel, 12).titel, "Hoge ambitie");
  assert.equal(band(doel, 24).titel, "Normale ambitie");
});

test("een verschil van een paar tienden is afronding, geen daling", () => {
  const uit = band({ zien: Math.round(START.team_zien), sturen: Math.round(START.team_sturen), doen: Math.round(START.team_doen) });
  assert.deepEqual(uit.dalingen, []);
});

test("een daling wordt apart gemeld en telt niet als ambitie", () => {
  const uit = band({ zien: START.team_zien - 8, sturen: START.team_sturen + 2, doen: START.team_doen });
  assert.deepEqual(uit.dalingen, ["zien"]);
  assert.equal(uit.titel, "Lage ambitie");
});

test("de verschuiving rekent netjes naar punten per jaar", () => {
  const d = verschuiving(START, { zien: START.team_zien + 6, sturen: START.team_sturen, doen: START.team_doen }, 6);
  assert.equal(d.zien.punten, 6);
  assert.equal(d.zien.per_jaar, 12);
});
