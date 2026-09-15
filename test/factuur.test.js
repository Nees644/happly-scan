// test/factuur.test.js
// De factuur bij een aankoop vooraf. Tot 15 september 2026 kreeg een klant die
// vooraf afrekende helemaal geen factuur; alleen de maandrun maakte er een.
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { BEDRIJF, VERPLICHT, ontbreekt, compleet } from "../bedrijf.js";
import {
  KLANTVELDEN, klantCompleet, ontbrekendeKlantvelden, klantUit,
  btwVerlegd, regelsVoor, totalen, euro
} from "../factuur.js";
import { bouwFactuurHtml, factuurMail } from "../factuur-mail.js";

const VOLLEDIG = {
  naam: "Happly", adres: "Teststraat 1", postcode: "1000 AA", plaats: "Amsterdam",
  land: "NL", kvk: "12345678", btw_nummer: "NL123456789B01", email: "hallo@happly.nl"
};

const KLANT = {
  factuur_naam: "Testorganisatie Noord", factuur_adres: "Kade 12",
  factuur_postcode: "9700 AB", factuur_plaats: "Groningen", factuur_land: "NL",
  email: "leider@test.happly.nl"
};

/* ----------------------------------------------- wie de factuur verstuurt */
test("zonder complete bedrijfsgegevens gaat er geen factuur uit", () => {
  assert.deepEqual(VERPLICHT, ["naam", "adres", "postcode", "plaats", "kvk", "btw_nummer"]);
  assert.equal(compleet(VOLLEDIG), true);
  assert.equal(compleet({ ...VOLLEDIG, btw_nummer: "" }), false);
  assert.deepEqual(ontbreekt({ ...VOLLEDIG, kvk: "", adres: " " }), ["adres", "kvk"]);
});

test("bedrijf.js heeft alle velden die de factuur nodig heeft", () => {
  for (const veld of VERPLICHT) assert.ok(veld in BEDRIJF, `${veld} ontbreekt in BEDRIJF`);
});

/* Deze test is het slot op de deur. Loopt bedrijf.js ooit leeg, dan valt hij om
   voordat er een factuur zonder KvK of btw-nummer de deur uit gaat. */
test("de gegevens van Happly staan ingevuld", () => {
  assert.deepEqual(ontbreekt(), [], "bedrijf.js is niet compleet");
  assert.match(BEDRIJF.btw_nummer, /^NL\d{9}B\d{2}$/, "geen geldig Nederlands btw-nummer");
  assert.match(BEDRIJF.kvk, /^\d{8}$/, "een KvK-nummer heeft acht cijfers");
  assert.match(BEDRIJF.postcode, /^\d{4} ?[A-Z]{2}$/, "geen geldige postcode");
});

/* ------------------------------------------------------- wie hem ontvangt */
test("een factuur boven de honderd euro vraagt naam en adres van de klant", () => {
  assert.deepEqual(KLANTVELDEN, ["naam", "adres", "postcode", "plaats"]);
  const klant = klantUit(KLANT);
  assert.equal(klant.naam, "Testorganisatie Noord");
  assert.equal(klantCompleet(klant), true);
  assert.equal(klantCompleet(klantUit({ ...KLANT, factuur_adres: null })), false);
  assert.deepEqual(ontbrekendeKlantvelden(klantUit({ ...KLANT, factuur_plaats: "", factuur_postcode: "" })),
    ["postcode", "plaats"]);
});

test("de bedrijfsnaam gaat voor de eigen naam op de factuur", () => {
  assert.equal(klantUit({ organisatie: "Bureau Noord", naam: "Test Leider" }).naam, "Bureau Noord");
  assert.equal(klantUit({ naam: "Test Leider" }).naam, "Test Leider");
  assert.equal(klantUit({ factuur_naam: "Noord BV", organisatie: "Bureau Noord" }).naam, "Noord BV");
});

/* ------------------------------------------------------------ het bedrag */
test("het bedrag valt uiteen in ex btw, btw en totaal", () => {
  const bestelling = { bedrag_cent: 59895, btw_cent: 10395, product_code: "PAK-LOS" };
  const regels = regelsVoor({ product: { code: "PAK-LOS", naam: "Pakket", btw_promille: 210 }, bestelling });
  assert.equal(regels.length, 1);
  assert.equal(regels[0].bedrag_ex_btw, 49500);

  const bedrag = totalen(regels);
  assert.deepEqual(bedrag, { ex: 49500, btw: 10395, totaal: 59895 });
  assert.equal(bedrag.totaal, bestelling.bedrag_cent, "de factuur telt op tot wat er is afgerekend");
});

test("btw verlegd geldt buiten Nederland en nergens anders", () => {
  assert.equal(btwVerlegd({ btw_nummer: "NL123456789B01" }), false);
  assert.equal(btwVerlegd({ btw_nummer: "BE0123456789" }), true);
  assert.equal(btwVerlegd({}), false, "zonder btw-nummer gewoon btw");
  const regels = [{ bedrag_ex_btw: 49500, btw_promille: 210 }];
  assert.equal(totalen(regels, { verlegd: true }).btw, 0);
  assert.equal(totalen(regels, { verlegd: true }).totaal, 49500);
});

test("bedragen staan er in euro op", () => {
  assert.equal(euro(59895).replace(/ /g, " "), "€ 598,95");
  assert.equal(euro(0).replace(/ /g, " "), "€ 0,00");
});

/* --------------------------------------------------------- de factuur zelf */
const FACTUUR = {
  nummer: "2026-0001", created_at: "2026-09-15", periode_van: "2026-09-15",
  klant_naam: "Testorganisatie Noord", klant_adres: "Kade 12",
  klant_postcode: "9700 AB", klant_plaats: "Groningen", klant_land: "NL",
  bedrag_ex_btw: 49500, btw_cent: 10395, bedrag_totaal: 59895, status: "betaald",
  regels: [{ code: "PAK-LOS", omschrijving: "Pakket Teamfoto en hermeting", aantal: 1, bedrag_ex_btw: 49500 }]
};

test("op de factuur staat alles wat erop hoort", () => {
  const html = bouwFactuurHtml(FACTUUR, VOLLEDIG);
  for (const wat of ["2026-0001", "15 september 2026", "Testorganisatie Noord", "Kade 12",
                     "9700 AB", "Groningen", "KvK 12345678", "NL123456789B01",
                     "Pakket Teamfoto en hermeting", "Btw 21 procent", "Te betalen"]){
    assert.ok(html.includes(wat), `de factuur mist ${wat}`);
  }
  assert.ok(html.includes("voldaan via Mollie"));
  assert.equal(factuurMail(FACTUUR, VOLLEDIG).subject, "Factuur 2026-0001 van Happly");
});

test("bij btw verlegd staat er geen btw op", () => {
  const html = bouwFactuurHtml({ ...FACTUUR, btw_verlegd: true, btw_cent: 0, bedrag_totaal: 49500 }, VOLLEDIG);
  assert.ok(html.includes("Btw verlegd"));
  assert.ok(!html.includes("Btw 21 procent"));
});

test("een naam met een punthaak komt niet als opmaak op de factuur", () => {
  const html = bouwFactuurHtml({ ...FACTUUR, klant_naam: "<script>x</script>" }, VOLLEDIG);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

/* --------------------------------------------- de weg ernaartoe in de code */
test("een aankoop vooraf begint niet zonder factuurgegevens", () => {
  const route = readFileSync(new URL("../api/betaling-start.js", import.meta.url), "utf8");
  assert.ok(route.includes("klantCompleet"), "betaling-start controleert de factuurgegevens niet");
  assert.ok(route.includes("betaaltAchteraf"), "wie achteraf betaalt hoort niet geblokkeerd te worden");
});

test("een bestelling krijgt hoogstens een factuur", () => {
  const sql = readFileSync(new URL("../migratie-facturen-los-2026-09-15.sql", import.meta.url), "utf8");
  assert.ok(/create unique index[^;]*facturen \(bestelling_id\)/s.test(sql),
    "zonder unieke index kan dezelfde bestelling twee factuurnummers krijgen");
});
