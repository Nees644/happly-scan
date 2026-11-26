// test/happly-site.test.js
// happly.nl. De pagina wordt met de hand op TransIP gezet en staat hier als bron
// van waarheid, zodat hij niet opnieuw achterloopt op wat er online staat.
// Sinds 26 november 2026 gaat de site over één product: Sterker op je werk in
// 15 minuten per week. Dit vervangt de merksite van 5, 6 en 13 oktober 2026.
// Deze test bewaakt de feiten en de taalregels, niet de opmaak.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const HTML = readFileSync(new URL("../happly.html", import.meta.url), "utf8");
const sectie = id => HTML.split(`id="${id}"`)[1].split("</section>")[0];
const zichtbaar = HTML.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>/g, "")
  .replace(/<img[^>]*>/g, "").replace(/<[^>]+>/g, " ");

test("de site gaat over één product: Sterker op je werk in 15 minuten per week", () => {
  // Besluit 26 november 2026: online de focus op één product.
  assert.ok(/<title>Sterker op je werk in 15 minuten per week/.test(HTML), "de titel draagt de claim niet");
  const hero = sectie("sterker");
  assert.ok(/<h1>.*Sterker op je werk.*in 15 minuten per week\.<\/em><\/h1>/.test(hero), "de claim is niet de kop");
  for (const oud of ["volhouden", "volhoudkracht", "methode", "zorg", "werkgevers", "ondernemers", "professionals", "zetjes"]){
    assert.ok(!HTML.includes(`<section id="${oud}"`), `het oude blok #${oud} staat er nog`);
  }
  const menu = HTML.split('<ul class="menu">')[1].split("</ul>")[0];
  const ankers = [...menu.matchAll(/href="#([a-z-]+)"/g)].map(m => m[1]);
  assert.deepEqual(ankers, ["mensen", "leider", "meedoen", "investering", "over"], "het menu klopt niet");
});

test("de pay-off hoort niet meer bij happly.nl", () => {
  // Besluit 26 november 2026: Klein zetje. Grote beweging. hoort voortaan alleen
  // bij de tool Zetjes.
  assert.ok(!HTML.includes("Klein zetje"), "de pay-off staat nog op de site");
});

test("de bedragen staan in De investering en kloppen met elkaar", () => {
  // Besluit 25 november 2026: 395 voor je mensen, 695 voor de leidinggevende,
  // 990 voor de jaarplek, een heel team op offerte. Vervangt het besluit van
  // 15 september 2026 dat er geen bedragen op de voorpagina staan.
  const bedragen = new Set([...HTML.matchAll(/&euro;(\d+)/g)].map(m => m[1]));
  assert.deepEqual([...bedragen].sort(), ["395", "695", "990"], "er staat een ander bedrag op de site");
  const inv = sectie("investering");
  for (const b of ["395", "695", "990"]) assert.ok(inv.includes(`&euro;${b}`), `${b} ontbreekt in De investering`);
  assert.ok(inv.includes("Op offerte"), "het team op offerte ontbreekt");
  assert.ok(inv.includes("exclusief btw"), "de btw-zin ontbreekt");
});

test("elke optie bij De investering heeft een knop die iets doet", () => {
  const inv = sectie("investering");
  const knoppen = [...inv.matchAll(/<a class="btn[^"]*" href="([^"]+)"/g)].map(m => m[1]);
  assert.equal(knoppen.length, 4, "niet elke optie heeft een knop");
  assert.ok(knoppen.includes("https://scan.happly.nl/leidersbeeld?src=site_investering"), "de leidinggevende gaat niet naar het Leidersbeeld");
  // De andere drie zetten het onderwerp in het formulier, en dat onderwerp bestaat.
  for (const o of [...inv.matchAll(/data-onderwerp="([^"]+)"/g)].map(m => m[1])){
    assert.ok(HTML.includes(`<option>${o}</option>`), `het onderwerp ${o} staat niet in het formulier`);
  }
});

test("een leidinggevende kan meteen het gratis Leidersbeeld doen", () => {
  const menu = HTML.split("<header>")[1].split("</header>")[0];
  assert.ok(menu.includes("scan.happly.nl/leidersbeeld"), "de menuknop naar het Leidersbeeld ontbreekt");
  assert.ok(sectie("sterker").includes("scan.happly.nl/leidersbeeld"), "de heroknop naar het Leidersbeeld ontbreekt");
});

test("de Over vertelt de missie, de coach en Zetjes", () => {
  const over = sectie("over");
  assert.ok(over.includes("Mijn missie:"), "de missie is niet de kop");
  assert.ok(over.includes("je eigen coach") && over.includes("Zetjes"), "de coach of Zetjes ontbreekt");
  assert.ok(!over.includes("online coach") && !over.includes("virtuele coach"), "de Over gebruikt nog een oude naam");
});

test("de site volgt de taalregels", () => {
  for (const woord of ["cohort", "streak", "afhaker", "opgever", "stopper", "doorzet", "misgaan", "karakter", "discipline", "budget"]){
    assert.ok(!zichtbaar.toLowerCase().includes(woord), `verboden woord: ${woord}`);
  }
  assert.ok(!HTML.includes("—"), "gedachtestreepje");
  assert.ok(!zichtbaar.includes("!"), "uitroepteken");
  // Besluit 6 november 2026: geen kleine labels boven een kop.
  assert.ok(!/class="eyebrow"/.test(HTML.split("<body")[1]), "er staat een label boven een kop");
});

test("de site spreekt overal met je en jouw, nergens met u", () => {
  assert.ok(!/\b[Uu]w?\b/.test(zichtbaar), "er staat nog u of uw op de site");
});

test("elke link binnen de pagina wijst naar een anker dat er is", () => {
  const ankers = [...HTML.matchAll(/href="#([a-z-]+)"/g)].map(m => m[1]);
  for (const anker of new Set(ankers)){
    if (anker === "top") continue;
    assert.ok(HTML.includes(`id="${anker}"`), `de link naar #${anker} gaat nergens heen`);
  }
});

test("de herkomst uit de URL gaat mee naar het Leidersbeeld", () => {
  assert.ok(HTML.includes('searchParams.set("src"'), "de site geeft de herkomst niet door");
  assert.ok(HTML.includes('a[href*="scan.happly.nl/leidersbeeld"]'),
    "de doorgifte raakt niet de links naar het Leidersbeeld");
  assert.ok(/\^\[a-z0-9_-\]\{1,40\}\$/.test(HTML), "de src wordt niet gecontroleerd voordat hij wordt doorgegeven");
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

test("het Leidersbeeld belooft geen kwartaalbeeld dat er nog niet is", () => {
  // Besluit 21 september 2026. Het vinkje blijft standaard uit.
  const lb = readFileSync(new URL("../leidersbeeld.html", import.meta.url), "utf8");
  assert.ok(lb.includes("Houd mij op de hoogte van wat we uit alle metingen samen leren."));
  assert.ok(!lb.includes("Stuur mij het kwartaalbeeld"), "het vinkje belooft nog een kwartaalbeeld");
  assert.ok(!/id="kwartaal"[^>]*checked/.test(lb));
});

test("het b2b-verdienmodel staat niet op de site", () => {
  for (const geheim of ["PAK-PZL", "PAK-PRO", "inkoop", "marge", "adviesprijs", "ontwikkelbudget"]){
    assert.ok(!zichtbaar.toLowerCase().includes(geheim.toLowerCase()), `de site verklapt ${geheim}`);
  }
});

test("geen link naar teamkrachtindex.nl", () => {
  assert.ok(!HTML.includes("teamkrachtindex.nl"), "er staat nog een link naar het oude domein");
});

test("sterkeropjewerk.nl stuurt via https door naar happly.nl, met herkomst", () => {
  // 26 november 2026: de doorsturing bij TransIP had geen https, en Safari
  // waarschuwt dan dat de verbinding niet veilig is. Vercel geeft het domein
  // een certificaat en stuurt elk pad door.
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const r = vercel.redirects.find(x => (x.has || []).some(h => h.type === "host" && h.value.includes("sterkeropjewerk")));
  assert.ok(r, "er is geen doorsturing voor sterkeropjewerk.nl");
  assert.equal(r.source, "/(.*)");
  const mw = readFileSync(new URL("../middleware.js", import.meta.url), "utf8");
  assert.ok(mw.includes("sterkeropjewerk") && mw.includes("Response.redirect(DOEL_STERKER"), "de voordeur van sterkeropjewerk.nl stuurt niet door");
  assert.equal(r.destination, "https://happly.nl/?src=sterkeropjewerk");
});
