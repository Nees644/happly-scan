// test/happly-site.test.js
// happly.nl. De pagina wordt met de hand op nginx gezet en staat hier als bron
// van waarheid, zodat hij niet opnieuw een jaar achterloopt op het product.
// Deze test bewaakt de feiten en de taalregels, niet de opmaak.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const HTML = readFileSync(new URL("../happly.html", import.meta.url), "utf8");
const MIGRATIE = readFileSync(new URL("../migratie-tarieven-v4-2026-09-14.sql", import.meta.url), "utf8");

/* Het bedrag uit de producttabel, in hele euro's. Niet splitsen op komma: in
   een productnaam staat er soms een ('Lezer, instap'). */
function prijsVan(code){
  const rij = MIGRATIE.split("\n").find(r => r.startsWith(`('${code}'`));
  assert.ok(rij, `product ${code} niet gevonden`);
  const m = rij.match(/^\('[^']+',\s*'[^']*',\s*(\d+),/);
  assert.ok(m, `geen bedrag bij ${code}`);
  return Number(m[1]) / 100;
}

test("de prijzen op de site komen uit de producttabel", () => {
  for (const code of ["PAK-LOS", "HM-LOS", "LEZ-1"]){
    const euro = prijsVan(code);
    assert.ok(HTML.includes(`€ ${euro}`), `de site noemt niet € ${euro} voor ${code}`);
  }
});

test("de oude prijzen staan er niet meer", () => {
  // De site stond tot 15 september 2026 vol met tarieven die nooit zijn
  // gebouwd: een abonnement van 89 per maand, een praktijkvorm van 349, een
  // Teamfoto van 395 en een hermeting van 295.
  for (const bedrag of ["€ 89", "€ 349", "€ 395", "€ 295", "€ 890", "€ 3.490"]){
    assert.ok(!HTML.includes(bedrag), `de site noemt nog ${bedrag}`);
  }
});

test("geen beloftes die het product niet waarmaakt", () => {
  for (const belofte of ["eerste Teamfoto bij een klant van jou is kosteloos",
                         "twee Teamfoto's per jaar",
                         "tien Teamfoto's per jaar",
                         "Onbeperkt metingen, twee"]){
    assert.ok(!HTML.includes(belofte), `de site belooft nog: ${belofte}`);
  }
});

test("de site volgt de taalregels", () => {
  for (const woord of ["nulmeting", "nameting", "landelijke beeld", "landelijk gemiddelde", "Samenspel"]){
    assert.ok(!HTML.toLowerCase().includes(woord.toLowerCase()), `verboden woord: ${woord}`);
  }
  assert.ok(!HTML.includes("—"), "gedachtestreepje");
});

test("het minimum van vijf deelnemers staat er, en acht nergens", () => {
  assert.ok(/vanaf vijf deelnemers|minimaal vijf|Vijf\./i.test(HTML), "het minimum ontbreekt");
  assert.ok(!/minimaal acht|acht deelnemers/i.test(HTML));
});

test("wat er is gebouwd staat er ook op", () => {
  for (const [wat, zoek] of [
    ["het Leidersbeeld", "Leidersbeeld"],
    ["de certificering", "Lezer-module"],
    ["het register", "register"],
    ["de demo", "teamkracht-demo-interactief"]
  ]){
    assert.ok(HTML.includes(zoek), `${wat} staat niet op de site`);
  }
});

test("er staat niets op de site dat niet bestaat", () => {
  // Het Eigenaarschapsprogramma stond er met een knop en een eigen map. Het
  // bestaat niet in de producttabel en is op 15 september 2026 weggehaald.
  for (const wat of ["Eigenaarschapsprogramma", "eigenaarschap/"]){
    assert.ok(!HTML.includes(wat), `de site verwijst nog naar ${wat}`);
  }

  // Elke link binnen de site wijst naar een anker dat er ook is.
  const ankers = [...HTML.matchAll(/href="#([a-z-]+)"/g)].map(m => m[1]);
  for (const anker of new Set(ankers)){
    if (anker === "top") continue;
    assert.ok(HTML.includes(`id="${anker}"`), `de link naar #${anker} gaat nergens heen`);
  }
});

test("een leidinggevende hoeft niet te zoeken naar het Leidersbeeld", () => {
  // De strook staat boven het verhaal voor professionals, zodat een
  // leidinggevende hem ziet zonder te scrollen.
  const strook = HTML.indexOf('id="leidersbeeld"');
  const professionals = HTML.indexOf('id="professionals"');
  assert.ok(strook > 0, "de strook voor leidinggevenden ontbreekt");
  assert.ok(strook < professionals, "de strook staat onder het verhaal voor professionals");

  assert.ok(HTML.includes('href="#leidersbeeld"'), "het Leidersbeeld staat niet in de navigatie");

  // En de drempel staat er expliciet niet: geen account, geen betaalgegevens.
  for (const belofte of ["geen account", "Drie minuten"]){
    assert.ok(HTML.includes(belofte), `de strook mist: ${belofte}`);
  }
});

test("de weg van Leidersbeeld naar teambeeld staat er als verhaal", () => {
  const sectie = HTML.split('id="organisaties"')[1].split("</section>")[0];
  // Vier stappen, in volgorde: jouw beeld, het team, de twee naast elkaar,
  // opnieuw meten. Zonder die volgorde is het Leidersbeeld een losse meting
  // in plaats van de eerste stap naar een Teamfoto.
  for (const stap of ["Jouw Leidersbeeld", "Het team meet", "De twee naast elkaar", "Opnieuw meten"]){
    assert.ok(sectie.includes(stap), `de stap ontbreekt: ${stap}`);
  }
  assert.ok(sectie.indexOf("Jouw Leidersbeeld") < sectie.indexOf("Het team meet"),
    "de stappen staan niet op volgorde");
  assert.ok(sectie.includes("vijf"), "het minimum voor een teambeeld ontbreekt in het verhaal");
});

test("de links wijzen naar wat er draait", () => {
  for (const url of ["https://www.teamkrachtindex.nl/leidersbeeld",
                     "https://www.teamkrachtindex.nl/register",
                     "https://scan.happly.nl/module"]){
    assert.ok(HTML.includes(url), `de link naar ${url} ontbreekt`);
  }
});

test("het b2b-verdienmodel staat niet op de site", () => {
  // Zelfde regel als op teamkrachtindex.nl: een eindklant leest mee, dus de
  // inkoopprijs van een partner hoort hier niet te staan.
  for (const geheim of ["PAK-PZL", "PAK-PRO", "€ 249", "€ 145", "inkoop", "marge", "adviesprijs"]){
    assert.ok(!HTML.toLowerCase().includes(geheim.toLowerCase()), `de site verklapt ${geheim}`);
  }
});
