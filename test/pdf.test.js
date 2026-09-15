// test/pdf.test.js
// De twee pdf's: de factuur en de Teamkrachtkaart. Er komt geen browser aan te
// pas, dus dit is te testen zonder Playwright of een headless Chrome.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { inflateSync } from "node:zlib";

import { PAPIER, MM, LETTERS, logoBuffer } from "../pdf-basis.js";
import { maakFactuurPdf } from "../factuur-pdf.js";
import { maakKaartPdf, FORMATEN } from "../kaart-pdf.js";
import { BEDRIJF } from "../bedrijf.js";
import { bouwTeambeeld } from "../teamkracht-logica.js";
import { leesRegels, leesProfielen, leesTestdata } from "./seed-lezen.js";

const { norm, deelnemers } = leesTestdata();
const REGELS = leesRegels(), PROFIELEN = leesProfielen();
const BEELD = bouwTeambeeld({
  deelnemers, norm, regels: REGELS, profielen: PROFIELEN,
  config: { middenband_sd: 0.25, min_deelnemers_lijnen: 10, norm_bron: "vast" }
});
const LEIDER = JSON.parse(readFileSync(new URL("../testdata_leidersbeeld_noord.json", import.meta.url), "utf8")).scores;

const FACTUUR = {
  nummer: "2026-0001", created_at: "2026-09-15", periode_van: "2026-09-15",
  klant_naam: "Testorganisatie Noord", klant_adres: "Kade 12",
  klant_postcode: "9700 AB", klant_plaats: "Groningen", klant_land: "NL",
  bedrag_ex_btw: 49500, btw_cent: 10395, bedrag_totaal: 59895, status: "betaald",
  regels: [{ code: "PAK-LOS", omschrijving: "Pakket Teamfoto en hermeting", aantal: 1, bedrag_ex_btw: 49500 }]
};

/* Het papierformaat staat in de pdf zelf, in punten. Zo is te controleren dat
   een A1 echt een A1 is en niet een vergrote A4. */
function mediaBox(buffer){
  const m = buffer.toString("latin1").match(/MediaBox \[([-\d. ]+)\]/);
  assert.ok(m, "geen MediaBox in de pdf");
  return m[1].trim().split(/\s+/).map(Number).slice(2);
}

const mm = punten => Math.round(punten / MM);

/* Hoeveel tekenwerk er in de pdf zit, uitgepakt. De letters zitten er als
   ingebedde subset in, dus de woorden zelf staan er als glyfnummers en niet als
   leesbare tekst; vergelijken op omvang zegt daarom meer dan zoeken op een zin.
   Dat de tekst echt tekst is en geen plaatje, controleert de test hieronder op
   de ToUnicode-tabel: die maakt kopieren en zoeken mogelijk. */
function inhoudGrootte(pdf){
  const ruw = pdf.toString("latin1");
  let totaal = 0;
  const merk = /stream\r?\n/g;
  let m;
  while ((m = merk.exec(ruw)) !== null){
    const begin = m.index + m[0].length;
    const eind = ruw.indexOf("endstream", begin);
    if (eind < 0) continue;
    try{
      totaal += inflateSync(Buffer.from(ruw.slice(begin, eind), "latin1")).length;
    }catch(e){ /* geen ingepakte stroom */ }
  }
  return totaal;
}

/* ------------------------------------------------------------ de letters */
test("de huisletters en het beeldmerk staan in de repo", () => {
  for (const [naam, bestand] of Object.entries(LETTERS)){
    assert.ok(existsSync(bestand), `letter ${naam} ontbreekt`);
  }
  assert.ok(logoBuffer(), "het beeldmerk ontbreekt");

  const inGit = execSync("git ls-files", { encoding: "utf8" }).split("\n");
  for (const bestand of ["assets/happly-logo.png",
                         "assets/fonts/DMSans-Variable.ttf",
                         "assets/fonts/DMSerifDisplay-Regular.ttf"]){
    assert.ok(inGit.includes(bestand), `${bestand} staat niet in git`);
  }
});

/* ------------------------------------------------------------- de factuur */
test("de factuur is een A4 staand", async () => {
  const pdf = await maakFactuurPdf(FACTUUR, BEDRIJF);
  assert.ok(pdf.length > 5000, "verdacht klein");
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.deepEqual(mediaBox(pdf).map(mm), [210, 297]);
});

test("de factuur bevat tekst en geen plaatje van tekst", async () => {
  const pdf = await maakFactuurPdf(FACTUUR, BEDRIJF);
  const ruw = pdf.toString("latin1");
  // ToUnicode is de tabel die van glyf naar letter wijst. Zonder die tabel is
  // een pdf een plaatje: niet te kopieren, niet te doorzoeken, en een
  // boekhoudprogramma leest er niets uit.
  assert.ok(ruw.includes("/ToUnicode"), "de tekst is niet te kopieren of te doorzoeken");
  assert.ok(ruw.includes("/FontFile2"), "de huisletter is niet ingebed");
  assert.ok(inhoudGrootte(pdf) > 10000, "er staat nauwelijks iets op");
});

test("de pdf van de factuur wordt niet gemaakt zonder bedrijfsgegevens", () => {
  const verwerk = readFileSync(new URL("../betaling-verwerken.js", import.meta.url), "utf8");
  const blok = verwerk.split("export async function maakFactuur")[1];
  assert.ok(blok.indexOf("bedrijfCompleet") < blok.indexOf("maakFactuurPdf"),
    "de pdf wordt gemaakt voordat de bedrijfsgegevens zijn gecontroleerd");
});

/* --------------------------------------------------------------- de kaart */
test("de kaart komt op A4, A3 en A1, elk met het goede papierformaat", async () => {
  const verwacht = { a4: [297, 210], a3: [420, 297], a1: [841, 594] };
  for (const [formaat, maten] of Object.entries(verwacht)){
    const pdf = await maakKaartPdf({
      teambeeld: BEELD, regels: REGELS, profielen: PROFIELEN,
      teamnaam: "Noord", formaat, leidersbeeld: LEIDER
    });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.deepEqual(mediaBox(pdf).map(mm), maten, `${formaat} heeft het verkeerde formaat`);
  }
  assert.deepEqual(Object.keys(FORMATEN), ["a4", "a3", "a1"]);
});

test("een A1 is niet zwaarder dan een A4: het is dezelfde tekening", async () => {
  const maak = formaat => maakKaartPdf({
    teambeeld: BEELD, regels: REGELS, profielen: PROFIELEN,
    teamnaam: "Noord", formaat, leidersbeeld: LEIDER
  });
  const [a4, a1] = await Promise.all([maak("a4"), maak("a1")]);
  // Vector, geen pixels: het verschil zit in de getallen, niet in beeldpunten.
  assert.ok(Math.abs(a1.length - a4.length) < a4.length * 0.15,
    "de A1 is veel groter dan de A4; dat wijst op een plaatje in plaats van vectoren");
});

test("het Leidersbeeld voegt zichtbaar iets toe aan de pdf", async () => {
  const maak = leidersbeeld => maakKaartPdf({
    teambeeld: BEELD, regels: REGELS, profielen: PROFIELEN,
    teamnaam: "Noord", formaat: "a4", leidersbeeld
  });
  const [met, zonder] = await Promise.all([maak(LEIDER), maak(null)]);
  assert.ok(inhoudGrootte(met) > inhoudGrootte(zonder) + 500,
    "met Leidersbeeld hoort er een markering en een tekstblok bij te komen");
  assert.ok(met.toString("latin1").includes("/ToUnicode"), "de kaart is geen plaatje");
});

test("de kaartroute kent pdf als uitvoer en neemt de letters mee", () => {
  const route = readFileSync(new URL("../api/teamkracht-kaart.js", import.meta.url), "utf8");
  assert.ok(route.includes('als === "pdf"'), "de route geeft geen pdf");
  assert.ok(route.includes("application/pdf"));

  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(vercel.functions["api/teamkracht-kaart.js"].includeFiles, "assets/**",
    "zonder de letters en het beeldmerk valt de pdf op productie om");
  assert.equal(vercel.functions["api/betaling-webhook.js"].includeFiles, "assets/**");
});
