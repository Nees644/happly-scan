// test/happly-site.test.js
// happly.nl. De pagina wordt met de hand op nginx gezet en staat hier als bron
// van waarheid, zodat hij niet opnieuw een jaar achterloopt op het product.
// Deze test bewaakt de feiten en de taalregels, niet de opmaak.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const HTML = readFileSync(new URL("../happly.html", import.meta.url), "utf8");

test("er staan geen bedragen op de site", () => {
  // Besluit 15 september 2026: de verkoop loopt in het proces, niet op de
  // voorpagina. Een leidinggevende ziet het bedrag op zijn eigen pagina na het
  // Leidersbeeld; een coach vraagt het per mail. Een prijslijst op de site is
  // daar alleen maar een drempel voor, en hij veroudert.
  assert.ok(!HTML.includes("\u20ac"), "er staat een eurobedrag op de site");
  assert.ok(!/\b\d{2,3} (euro|per maand|per jaar)\b/.test(HTML), "er staat een bedrag in woorden op de site");
  assert.ok(!/id="investering"/.test(HTML), "de prijssectie staat er nog");
});

test("de vraag wat het kost wordt wel beantwoord", () => {
  // Weglaten is iets anders dan ontwijken: er hoort te staan waar het bedrag
  // vandaan komt en wanneer je het ziet.
  assert.ok(HTML.includes("Wat kost een Teamfoto?"), "de vraag staat niet in de vragenlijst");
  const antwoord = HTML.split("Wat kost een Teamfoto?")[1].split("</details>")[0];
  assert.ok(/na je Leidersbeeld/.test(antwoord), "er staat niet wanneer je het bedrag ziet");
  assert.ok(/hallo@happly\.nl/.test(antwoord), "er staat geen weg om het te vragen");
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

test("de pagina stelt een vraag die voor allebei de lezers werkt", () => {
  // De pagina sprak afwisselend een coach en een leidinggevende aan, met een
  // kop die alleen voor de coach klopte. Nu een vraag die voor allebei geldt,
  // met twee deuren eronder.
  const hero = HTML.split('class="hero"')[1].split("</main>")[0];
  assert.ok(/Hoe goed ken je/.test(hero), "de hero stelt de vraag niet");
  assert.ok(hero.includes("Leidersbeeld"), "het Leidersbeeld staat niet in de hero");
  assert.ok(hero.includes("/leidersbeeld?src="), "de knop in de hero gaat niet naar het Leidersbeeld");
  assert.ok(!/Happly voor professionals/.test(hero),
    "de hero kiest weer partij voor een van de twee lezers");
});

test("er zijn twee deuren, een voor de leider en een voor de coach", () => {
  const strook = HTML.split('id="leidersbeeld"')[1].split("</section>")[0];
  assert.ok(strook.includes("Je leidt een team"), "de deur voor de leidinggevende ontbreekt");
  assert.ok(strook.includes("Je begeleidt teams"), "de deur voor de coach ontbreekt");
  assert.equal((strook.match(/class="deur"/g) || []).length, 2, "het zijn er geen twee");
  // De leider gaat rechtstreeks naar de vragen, de coach naar zijn eigen
  // verhaal; dat zijn twee verschillende volgende stappen.
  assert.ok(strook.includes("/leidersbeeld?src=site_leider"));
  assert.ok(strook.includes('href="#professionals"'));
});

test("de coach krijgt het Leidersbeeld als eigen aanleiding aangeboden", () => {
  const sectie = HTML.split('id="professionals"')[1].split("</section>")[0];
  assert.ok(sectie.includes("eigen link"), "de partnerlink staat er niet in");
  assert.ok(/Vraag je eigen link aan/.test(sectie), "de coach heeft geen knop");
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
    assert.ok(HTML.includes(belofte), `de drempelvrije belofte mist: ${belofte}`);
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

test("de herkomst uit de URL gaat mee naar het Leidersbeeld", () => {
  // Een post landt op happly.nl en niet rechtstreeks op de vragen. Dan moet
  // de site de src doorgeven, anders staat elke lead uit een post in het
  // overzicht als site_hero en is niet te zien wat de post opleverde.
  assert.ok(HTML.includes('searchParams.set("src"'), "de site geeft de herkomst niet door");
  assert.ok(HTML.includes('a[href*="teamkrachtindex.nl/leidersbeeld"]'),
    "de doorgifte raakt niet de links naar het Leidersbeeld");
  // Alleen tekens die schoonHerkomst() aan de andere kant ook toelaat.
  assert.ok(/\^\[a-z0-9_-\]\{1,40\}\$/.test(HTML), "de src wordt niet gecontroleerd voordat hij wordt doorgegeven");
});

test("de LinkedIn-post landt op happly.nl met een herkomst", () => {
  const post = readFileSync(new URL("../campagne/linkedin-leidersbeeld.md", import.meta.url), "utf8");
  assert.ok(post.includes("https://happly.nl/?src=linkedin"), "de post landt niet op de voorpagina");
  assert.ok(!post.includes("teamkrachtindex.nl/leidersbeeld?src=linkedin"),
    "de post gaat nog rechtstreeks naar de vragen");
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
