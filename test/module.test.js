// test/module.test.js
// De inhoud van de Lezer-module en de toetsvragen. De teksten zijn geschreven
// om gelezen te worden; deze test kijkt alleen of ze er zijn, of ze de
// taalregels volgen en of de toets doet wat de briefing belooft.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { HOOFDSTUKKEN, LEESDREMPEL, isGratis } from "../module-inhoud.js";

const SEED = readFileSync(new URL("../seed-toetsvragen-2026-09-15.sql", import.meta.url), "utf8");

/* Elke rij uit het seedblok als {vraag, opties, juist, hoofdstuk}. */
function vragen(){
  const uit = [];
  const merk = /\('((?:[^']|'')*)',\s*'(\[[^\n]*\])',\s*(\d+),\s*(\d)\)/g;
  let m;
  while ((m = merk.exec(SEED)) !== null){
    uit.push({
      vraag: m[1].replace(/''/g, "'"),
      opties: JSON.parse(m[2]),
      juist: Number(m[3]),
      hoofdstuk: Number(m[4])
    });
  }
  return uit;
}

/* ----------------------------------------------------------- de hoofdstukken */
test("er zijn zes hoofdstukken, genummerd een tot en met zes", () => {
  assert.equal(HOOFDSTUKKEN.length, 6);
  assert.deepEqual(HOOFDSTUKKEN.map(h => h.nummer), [1, 2, 3, 4, 5, 6]);
  for (const h of HOOFDSTUKKEN){
    assert.ok(h.titel && h.titel.length > 5, `hoofdstuk ${h.nummer} mist een titel`);
    assert.ok(h.lead && h.lead.length > 20, `hoofdstuk ${h.nummer} mist een lead`);
  }
});

test("de hoofdstukken zijn geschreven en staan niet meer op plaatshouder", () => {
  for (const h of HOOFDSTUKKEN){
    const tekst = h.tekst.join(" ");
    assert.ok(!/PLAATSHOUDER/i.test(tekst), `hoofdstuk ${h.nummer} staat nog op plaatshouder`);
    assert.ok(h.tekst.length >= 6, `hoofdstuk ${h.nummer} heeft te weinig alinea's`);
    const woorden = tekst.split(/\s+/).length;
    assert.ok(woorden >= 400, `hoofdstuk ${h.nummer} is met ${woorden} woorden te kort`);
  }
});

test("hoofdstuk een en twee zijn gratis", () => {
  assert.deepEqual(LEESDREMPEL, [1, 2]);
  assert.equal(isGratis(1), true);
  assert.equal(isGratis(2), true);
  assert.equal(isGratis(3), false);
});

test("de module volgt de taalregels", () => {
  const alles = HOOFDSTUKKEN.map(h => `${h.titel} ${h.lead} ${h.tekst.join(" ")}`).join(" ");
  assert.ok(!alles.includes("\u2014"), "gedachtestreepje");
  assert.ok(!/!/.test(alles), "uitroepteken");
  for (const woord of ["nulpunt", "nameting", "nulmeting", "landelijk gemiddelde", "Samenspel", "dit team is"]){
    assert.ok(!alles.toLowerCase().includes(woord.toLowerCase()), `verboden woord: ${woord}`);
  }
});

test("de module zegt wat het instrument doet", () => {
  const per = Object.fromEntries(HOOFDSTUKKEN.map(h => [h.nummer, h.tekst.join(" ")]));
  // Een paar harde feiten uit de code. Wijkt de module hiervan af, dan leert
  // een gecertificeerde Lezer iets wat niet klopt.
  assert.ok(/minimaal vijf|minstens vijf/i.test(per[2]), "het minimum van vijf deelnemers ontbreekt");
  assert.ok(/tien/.test(per[2]), "de grens van tien voor individuele lijnen ontbreekt");
  assert.ok(/drie punten/.test(per[3]), "de drempel van drie punten voor een breuk ontbreekt");
  assert.ok(/negen/.test(per[4]), "het aantal profielen ontbreekt");
  assert.ok(/twaalf regels/.test(per[5]), "het aantal regels ontbreekt");
  assert.ok(/drie/.test(per[5]), "het aantal dynamieken op de kaart ontbreekt");
});

/* --------------------------------------------------------------- de toets */
test("de pool telt veertig vragen, verdeeld over de zes hoofdstukken", () => {
  const lijst = vragen();
  assert.equal(lijst.length, 40, "de briefing vraagt een pool van veertig");
  for (let h = 1; h <= 6; h++){
    const aantal = lijst.filter(v => v.hoofdstuk === h).length;
    assert.ok(aantal >= 5, `hoofdstuk ${h} heeft maar ${aantal} vragen`);
  }
});

test("elke vraag heeft vier opties en een geldig antwoord", () => {
  for (const v of vragen()){
    assert.equal(v.opties.length, 4, `verkeerd aantal opties: ${v.vraag}`);
    assert.ok(v.juist >= 0 && v.juist < 4, `juist valt buiten de opties: ${v.vraag}`);
    assert.equal(new Set(v.opties).size, 4, `dubbele optie: ${v.vraag}`);
    for (const optie of v.opties) assert.ok(optie.length > 2, `lege optie: ${v.vraag}`);
  }
});

test("geen dubbele vragen in de pool", () => {
  const lijst = vragen().map(v => v.vraag);
  assert.equal(new Set(lijst).size, lijst.length, "dezelfde vraag staat er twee keer in");
});

test("het juiste antwoord staat niet altijd op dezelfde plek", () => {
  const tel = [0, 0, 0, 0];
  for (const v of vragen()) tel[v.juist]++;
  for (let i = 0; i < 4; i++){
    assert.ok(tel[i] >= 4, `plek ${i} is het juiste antwoord bij maar ${tel[i]} vragen`);
  }
  // Wie het patroon doorheeft moet er niets aan hebben: geen enkele plek mag
  // de helft van de antwoorden dragen.
  assert.ok(Math.max(...tel) <= 20, "het juiste antwoord staat te vaak op dezelfde plek");
});

test("de toets volgt de taalregels", () => {
  for (const v of vragen()){
    const alles = [v.vraag, ...v.opties].join(" ");
    assert.ok(!alles.includes("\u2014"), `gedachtestreepje in: ${v.vraag}`);
    assert.ok(!/!/.test(alles), `uitroepteken in: ${v.vraag}`);
  }
});
