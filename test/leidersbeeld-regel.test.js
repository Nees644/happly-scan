// test/leidersbeeld-regel.test.js
// Regel R13 en de kaart: acceptatiecriteria A9 en A10 van
// briefings/leidersbeeld.md. Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DREMPEL_SD, TEKSTEN, ALLES_GEDEELD, SLOTZIN,
  beoordeelDimensie, beoordeelLeidersbeeld, statusregel
} from "../leidersbeeld-regel.js";
import { bouwKaartHtml, tekenKaartSvg } from "../teamkracht-kaart.js";
import { bouwTeambeeld } from "../teamkracht-logica.js";
import { leesRegels, leesProfielen, leesTestdata } from "./seed-lezen.js";

const { norm, deelnemers } = leesTestdata();
const CONFIG = { middenband_sd: 0.25, min_deelnemers_lijnen: 10, norm_bron: "vast" };
const REGELS = leesRegels();
const BEELD = bouwTeambeeld({ deelnemers, norm, config: CONFIG, regels: REGELS, profielen: leesProfielen() });

const LEIDER = JSON.parse(readFileSync(new URL("../testdata_leidersbeeld_noord.json", import.meta.url), "utf8"));
const SD = { sd_zien: 12, sd_sturen: 12, sd_doen: 12 };

/* -------------------------------------------------------- de drempel zelf */
test("de drempel is een halve standaarddeviatie", () => {
  assert.equal(DREMPEL_SD, 0.5);
  assert.equal(beoordeelDimensie(60, 60, 12).uitkomst, "gedeeld");
  assert.equal(beoordeelDimensie(65.9, 60, 12).uitkomst, "gedeeld", "net onder de drempel is ruis");
  assert.equal(beoordeelDimensie(66, 60, 12).uitkomst, "leider_hoger", "precies op de drempel telt");
  assert.equal(beoordeelDimensie(54, 60, 12).uitkomst, "leider_lager");
  assert.equal(beoordeelDimensie(54.1, 60, 12).uitkomst, "gedeeld");
});

/* ------------------------------------------------------------------- A9 */
test("A9 · team Noord: Zien gedeeld, Sturen leider hoger, Doen gedeeld", () => {
  const uit = beoordeelLeidersbeeld({
    leidersbeeld: LEIDER.scores,
    teamlijn: { zien: BEELD.team_zien, sturen: BEELD.team_sturen, doen: BEELD.team_doen },
    sd: SD
  });
  assert.equal(uit.per.zien.uitkomst, "gedeeld");
  assert.equal(uit.per.sturen.uitkomst, "leider_hoger");
  assert.equal(uit.per.doen.uitkomst, "gedeeld");
  assert.deepEqual(uit.volgorde, ["sturen"]);
  assert.equal(uit.blokken[0].tekst, TEKSTEN.sturen.leider_hoger, "het blok begint met de Sturen-zin");
  assert.equal(uit.kop, "Verschil in beeld op Sturen");
  assert.equal(uit.slotzin, SLOTZIN);
});

test("het grootste verschil boven de drempel staat vooraan", () => {
  const uit = beoordeelLeidersbeeld({
    leidersbeeld: { zien: 70, sturen: 72, doen: 40 },
    teamlijn: { zien: 60, sturen: 60, doen: 60 },
    sd: SD
  });
  assert.deepEqual(uit.volgorde, ["doen", "sturen", "zien"], "20, 12 en 10 punten verschil");
  assert.equal(uit.blokken[0].uitkomst, "leider_lager");
  assert.equal(uit.kop, "Verschil in beeld op Zien, Sturen en Doen");
});

test("zijn alle drie gedeeld, dan een zin voor het geheel en geen slotzin", () => {
  const uit = beoordeelLeidersbeeld({
    leidersbeeld: { zien: 61, sturen: 59, doen: 60 },
    teamlijn: { zien: 60, sturen: 60, doen: 60 },
    sd: SD
  });
  assert.equal(uit.allesGedeeld, true);
  assert.equal(uit.blokken.length, 0);
  assert.equal(uit.inleiding, ALLES_GEDEELD);
  assert.equal(uit.slotzin, null);
  assert.equal(statusregel(uit.per), "Gedeeld beeld op Zien, Sturen en Doen");
});

test("er komt nooit een totaalscore van het verschil uit", () => {
  const uit = beoordeelLeidersbeeld({
    leidersbeeld: { zien: 70, sturen: 50, doen: 60 },
    teamlijn: { zien: 60, sturen: 60, doen: 60 },
    sd: SD
  });
  assert.ok(!("totaal" in uit), "twee verschillen die elkaar opheffen zeggen niets");
  assert.ok(!("score" in uit));
});

test("zonder Leidersbeeld of zonder spreiding geen oordeel", () => {
  assert.equal(beoordeelLeidersbeeld({ leidersbeeld: null, teamlijn: {}, sd: SD }), null);
  assert.equal(beoordeelLeidersbeeld({ leidersbeeld: {}, teamlijn: null, sd: SD }), null);
  assert.equal(beoordeelLeidersbeeld({ leidersbeeld: {}, teamlijn: {}, sd: null }), null);
});

/* ------------------------------------------------------------------ A10 */
test("A10 · de kaart toont het Leidersbeeld en het blok, en zonder is er niets", () => {
  const met = bouwKaartHtml({
    teambeeld: BEELD, regels: REGELS, profielen: leesProfielen(),
    teamnaam: "Noord", leidersbeeld: LEIDER.scores
  });
  assert.ok(met.includes("LEIDERSBEELD EN TEAMLIJN"), "het blok staat er niet");
  assert.ok(met.includes("Verschil in beeld op Sturen"));
  assert.ok(met.includes("leidersbeeld"), "de markering mist een label");

  const zonder = bouwKaartHtml({
    teambeeld: BEELD, regels: REGELS, profielen: leesProfielen(), teamnaam: "Noord"
  });
  assert.ok(!zonder.includes("LEIDERSBEELD EN TEAMLIJN"), "bij op_kaart false hoort er niets te staan");
});

test("A10 · de kaart rendert op a4 en a1 met het Leidersbeeld erin", () => {
  for (const formaat of ["a4", "a1"]){
    const html = bouwKaartHtml({
      teambeeld: BEELD, regels: REGELS, profielen: leesProfielen(),
      teamnaam: "Noord", formaat, leidersbeeld: LEIDER.scores
    });
    assert.ok(html.includes("<svg"), `${formaat} tekent niets`);
    assert.ok(html.includes("Verschil in beeld op Sturen"), `${formaat} mist het blok`);
  }
});

test("de markering is een open cirkel in magenta, drie stuks", () => {
  const svg = tekenKaartSvg(BEELD, { leidersbeeld: LEIDER.scores });
  const open = [...svg.matchAll(/<circle[^>]*fill="#fff"[^>]*stroke="#D6026F"/g)];
  assert.equal(open.length, 3, "een per dimensie");
  assert.ok(svg.includes("stroke-dasharray=\"7,5\""), "de streeplijn mist");
  assert.equal(tekenKaartSvg(BEELD, {}).includes("leidersbeeld"), false);
});

/* ----------------------------------------------- de spreiding is bevroren */
test("de spreiding gaat mee in het teambeeld, zodat de duiding niet verschuift", () => {
  assert.equal(BEELD.config_snapshot.sd_zien, 12);
  assert.equal(BEELD.config_snapshot.sd_sturen, 12);
  assert.equal(BEELD.config_snapshot.sd_doen, 12);
});

test("een oud beeld zonder bevroren spreiding levert nog steeds een kaart", () => {
  const oud = { ...BEELD, config_snapshot: { norm_bron: "vast" } };
  const html = bouwKaartHtml({
    teambeeld: oud, regels: REGELS, profielen: leesProfielen(),
    teamnaam: "Noord", leidersbeeld: LEIDER.scores
  });
  assert.ok(html.includes("LEIDERSBEELD EN TEAMLIJN"));
});

/* ------------------------------------------------- geen oordeel over de mens */
test("de teksten gaan over het beeld en niet over de leider als persoon", () => {
  const alle = [ALLES_GEDEELD, SLOTZIN, ...Object.values(TEKSTEN).flatMap(t => Object.values(t))];
  for (const tekst of alle){
    assert.ok(!/—/.test(tekst), "gedachtestreepje");
    assert.ok(!/!/.test(tekst), "uitroepteken");
    assert.ok(!/(slecht|fout van jou|je faalt|onvoldoende)/i.test(tekst), `oordelende tekst: ${tekst}`);
  }
  for (const dim of ["zien", "sturen", "doen"]){
    for (const kant of ["leider_hoger", "leider_lager"]){
      assert.ok(TEKSTEN[dim][kant].includes("Gespreksvraag:"), `${dim} ${kant} mist de gespreksvraag`);
    }
  }
});
