// test/happly-site.test.js
// happly.nl. De pagina wordt met de hand op TransIP gezet en staat hier als bron
// van waarheid, zodat hij niet opnieuw achterloopt op het product. Sinds
// 5 oktober 2026 is dit de Happly-merksite: Klein zetje. Grote beweging.
// Deze test bewaakt de feiten en de taalregels, niet de opmaak.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const HTML = readFileSync(new URL("../happly.html", import.meta.url), "utf8");

test("er staan geen bedragen op de site", () => {
  // Besluit 15 september 2026, bevestigd 5 oktober 2026: prijzen staan niet
  // op de voorpagina. Wie wil weten wat het kost, neemt contact op.
  assert.ok(!HTML.includes("\u20ac"), "er staat een eurobedrag op de site");
  assert.ok(!/\b\d{2,3} (euro|per maand|per jaar)\b/.test(HTML), "er staat een bedrag in woorden op de site");
});

test("de pay-off en de succeskrachtformule staan erop", () => {
  // Strategie 5 oktober 2026: Happly is het merk naar buiten, met deze
  // pay-off, en de formule verklaart het verband tussen zelfkracht en volhouden.
  assert.ok(HTML.includes("Klein zetje. <em"), "de pay-off staat niet in de hero");
  assert.ok(HTML.includes("Zelfkracht + Volhouden = Succes"), "de succeskrachtformule ontbreekt");
  assert.ok(/<title>[^<]*Klein zetje\. Grote beweging\./.test(HTML), "de titel draagt de pay-off niet");
});

test("de namen kloppen: Scan is het instrument, Index het landelijke getal", () => {
  // Besluit 5 oktober 2026. Op de voorpagina gaat het over het instrument.
  assert.ok(!HTML.includes("Zelfkracht Index"), "de voorpagina noemt het instrument nog Index");
  assert.ok(!/Teamkracht Index(?! en Zelfkracht Index zijn)/.test(HTML), "de voorpagina noemt de teammeting nog Index");
  assert.ok(!/\bLezer\b/.test(HTML), "de oude niveaunaam Lezer staat er nog");
});

test("de site volgt de taalregels", () => {
  for (const woord of ["nulmeting", "nameting", "landelijke beeld", "landelijk gemiddelde", "Samenspel", "cohort", "streak", "hulpje", "buddy"]){
    assert.ok(!HTML.toLowerCase().includes(woord.toLowerCase()), `verboden woord: ${woord}`);
  }
  assert.ok(!HTML.includes("\u2014"), "gedachtestreepje");
});

test("elke link binnen de pagina wijst naar een anker dat er is", () => {
  const ankers = [...HTML.matchAll(/href="#([a-z-]+)"/g)].map(m => m[1]);
  for (const anker of new Set(ankers)){
    if (anker === "top") continue;
    assert.ok(HTML.includes(`id="${anker}"`), `de link naar #${anker} gaat nergens heen`);
  }
});

test("een leidinggevende kan meteen het gratis Leidersbeeld doen", () => {
  // De verkoopweg voor teams loopt via het Leidersbeeld naar de Teamfoto. De
  // voorpagina van 5 oktober was hem eerst kwijt; deze test houdt hem erop.
  const sectie = HTML.split('id="werkgevers"')[1].split("</section>")[0];
  assert.ok(sectie.includes("teamkrachtindex.nl/leidersbeeld?src=site_leider"), "de knop naar het Leidersbeeld ontbreekt");
  assert.ok(/geen account/.test(sectie), "de drempelvrije belofte ontbreekt");
});

test("de herkomst uit de URL gaat mee naar het Leidersbeeld", () => {
  // Een post landt op happly.nl en niet rechtstreeks op de vragen. Dan moet
  // de site de src doorgeven, anders is niet te zien wat een post opleverde.
  assert.ok(HTML.includes('searchParams.set("src"'), "de site geeft de herkomst niet door");
  assert.ok(HTML.includes('a[href*="teamkrachtindex.nl/leidersbeeld"]'),
    "de doorgifte raakt niet de links naar het Leidersbeeld");
  // Alleen tekens die schoonHerkomst() aan de andere kant ook toelaat.
  assert.ok(/\^\[a-z0-9_-\]\{1,40\}\$/.test(HTML), "de src wordt niet gecontroleerd voordat hij wordt doorgegeven");
});

test("de links wijzen naar wat er draait", () => {
  for (const url of ["https://www.teamkrachtindex.nl/leidersbeeld",
                     "https://www.teamkrachtindex.nl/register",
                     "https://www.teamkrachtindex.nl/teamkracht-demo-interactief",
                     "https://scan.happly.nl/module",
                     "https://scan.happly.nl"]){
    assert.ok(HTML.includes(url), `de link naar ${url} ontbreekt`);
  }
});

test("het contactformulier gaat naar het eigen formulier van happly.nl", () => {
  assert.ok(HTML.includes("formspree.io/f/mwlvkbaw"), "het formulier wijst niet naar het happly.nl-formulier");
});

test("de LinkedIn-post landt op happly.nl met een herkomst", () => {
  const post = readFileSync(new URL("../campagne/linkedin-leidersbeeld.md", import.meta.url), "utf8");
  assert.ok(post.includes("https://happly.nl/?src=linkedin"), "de post landt niet op de voorpagina");
  assert.ok(!post.includes("teamkrachtindex.nl/leidersbeeld?src=linkedin"),
    "de post gaat nog rechtstreeks naar de vragen");
});

test("de site belooft geen kwartaalbeeld dat er nog niet is", () => {
  // Besluit 21 september 2026: geen datum en geen kwartaalritme beloven zolang
  // de eerste editie niet bestaat en er geen verzending is gebouwd. De
  // toestemming wordt wel gevraagd, in woorden die nu al kloppen.
  assert.ok(!/eind september 2026|Ieder kwartaal publiceren/.test(HTML), "de site belooft nog een editie met een datum");
  const lb = readFileSync(new URL("../leidersbeeld.html", import.meta.url), "utf8");
  assert.ok(lb.includes("Houd mij op de hoogte van wat we uit alle metingen samen leren."));
  assert.ok(!lb.includes("Stuur mij het kwartaalbeeld"), "het vinkje belooft nog een kwartaalbeeld");
  // Het vinkje blijft standaard uit: toestemming is een uitdrukkelijke ja.
  assert.ok(!/id="kwartaal"[^>]*checked/.test(lb));
});

test("het b2b-verdienmodel staat niet op de site", () => {
  // Zelfde regel als op teamkrachtindex.nl: een eindklant leest mee, dus de
  // inkoopprijs van een partner hoort hier niet te staan.
  for (const geheim of ["PAK-PZL", "PAK-PRO", "€ 249", "€ 145", "inkoop", "marge", "adviesprijs"]){
    assert.ok(!HTML.toLowerCase().includes(geheim.toLowerCase()), `de site verklapt ${geheim}`);
  }
});
