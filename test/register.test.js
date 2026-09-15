// test/register.test.js
// Het openbare register, de verificatie en de badge. Acceptatiecriteria 3 en 5
// van briefings/certificering.md. Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

import {
  NIVEAU_LABEL, slugVan, uniekeSlug, statusVan, registerRij, veiligeWebsite
} from "../register.js";
import { bouwRegisterLijst, bouwRegisterPagina, bouwNietGevonden } from "../register-pagina.js";
import { bouwBadgeSvg, naamRegels, BREEDTE, HOOGTE } from "../badge.js";

const CERT = {
  naam_op_certificaat: "Maarten Neeskens", niveau: "lezer",
  uitgegeven_op: "2026-09-15", status: "actief",
  verificatiecode: "3f6b2c10-1111-4222-8333-444455556666"
};
const GEBRUIKER = {
  naam: "Maarten Neeskens", organisatie: "Happly", website: "happly.nl",
  register_toestemming: true, register_slug: "maarten-neeskens", licentie_actief: true
};

/* ------------------------------------------------------------- de slug */
test("een slug is kleine letters, cijfers en streepjes", () => {
  assert.equal(slugVan("Maarten Neeskens"), "maarten-neeskens");
  assert.equal(slugVan("José Müller-van Dijk"), "jose-muller-van-dijk");
  assert.equal(slugVan("  Anna  "), "anna");
  assert.equal(slugVan("!!!"), null, "zonder letters is er geen adres");
  assert.equal(slugVan(""), null);
});

test("dezelfde naam levert geen botsing op", () => {
  assert.equal(uniekeSlug("Jan Jansen", []), "jan-jansen");
  assert.equal(uniekeSlug("Jan Jansen", ["jan-jansen"]), "jan-jansen-2");
  assert.equal(uniekeSlug("Jan Jansen", ["jan-jansen", "jan-jansen-2"]), "jan-jansen-3");
});

/* ------------------------------------------------------------ de status */
test("een Lezer is actief op zijn certificaat, niet op een abonnement", () => {
  assert.equal(statusVan(CERT, {}).actief, true, "licentie_actief staat standaard op false");
  assert.equal(statusVan(CERT, { licentie_actief: false }).actief, true,
    "een Lezer heeft geen licentie; die mag hem niet op niet actief zetten");
  assert.equal(statusVan({ ...CERT, status: "ingetrokken" }, {}).actief, false);
  assert.equal(statusVan({ ...CERT, status: "ingetrokken_op_verzoek" }, {}).actief, false);
  assert.equal(statusVan({ ...CERT, status: "verlopen" }, {}).actief, false);
});

test("bij een Begeleider telt de licentie wel mee", () => {
  const beg = { ...CERT, niveau: "begeleider" };
  assert.equal(statusVan(beg, { licentie_actief: true }).actief, true);
  assert.equal(statusVan(beg, { licentie_actief: false }).actief, false);
  assert.equal(statusVan(beg, {}).actief, false, "zonder lopende licentie geen actieve partner");
  assert.equal(statusVan(beg, { licentie_actief: true, licentie_tot: "2020-01-01" }).actief, false);
  assert.equal(statusVan(beg, { licentie_actief: true, licentie_tot: "2099-01-01" }).actief, true);
});

test("een niet actief certificaat houdt zijn pagina", () => {
  const rij = registerRij({
    certificaat: { ...CERT, status: "ingetrokken" }, gebruiker: GEBRUIKER
  });
  assert.ok(rij, "de pagina hoort te blijven bestaan");
  assert.equal(rij.actief, false);
  assert.equal(rij.status, "Niet actief");
  assert.ok(rij.uitleg, "er hoort te staan waarom");
});

/* ------------------------------------------------------- de toestemming */
test("zonder toestemming is er geen vermelding", () => {
  assert.equal(registerRij({ certificaat: CERT, gebruiker: { ...GEBRUIKER, register_toestemming: false } }), null);
  assert.equal(registerRij({ certificaat: CERT, gebruiker: { ...GEBRUIKER, register_slug: null } }), null);
  assert.equal(registerRij({ certificaat: null, gebruiker: GEBRUIKER }), null);
});

test("de naam op het certificaat gaat voor de naam van nu", () => {
  const rij = registerRij({
    certificaat: { ...CERT, naam_op_certificaat: "M. Neeskens" },
    gebruiker: { ...GEBRUIKER, naam: "Maarten Neeskens" }
  });
  assert.equal(rij.naam, "M. Neeskens", "een diploma verandert niet mee met een profiel");
});

test("een website van een gebruiker komt niet als code op de pagina", () => {
  assert.equal(veiligeWebsite("happly.nl"), "https://happly.nl/");
  assert.equal(veiligeWebsite("https://happly.nl"), "https://happly.nl/");
  assert.equal(veiligeWebsite("javascript:alert(1)"), null);
  assert.equal(veiligeWebsite("geen-punt"), null);
  assert.equal(veiligeWebsite(""), null);
});

/* --------------------------------------------------------- de pagina's */
test("de persoonspagina toont naam, niveau, status en datum", () => {
  const rij = registerRij({ certificaat: CERT, gebruiker: GEBRUIKER });
  const html = bouwRegisterPagina({ rij });
  for (const wat of ["Maarten Neeskens", "Lezer", "Actief", "15 september 2026", CERT.verificatiecode]){
    assert.ok(html.includes(wat), `de pagina mist ${wat}`);
  }
  assert.ok(html.includes("index,follow"), "de persoonspagina hoort vindbaar te zijn");
});

test("een verificatiepagina staat niet in een zoekmachine", () => {
  const rij = registerRij({ certificaat: CERT, gebruiker: GEBRUIKER });
  assert.ok(bouwRegisterPagina({ rij, viaCode: true }).includes("noindex"));
});

test("een naam met opmaak erin komt er als tekst op", () => {
  const rij = registerRij({
    certificaat: { ...CERT, naam_op_certificaat: "<script>x</script>" }, gebruiker: GEBRUIKER
  });
  const html = bouwRegisterPagina({ rij });
  assert.ok(!html.includes("<script>x"), "een naam mag geen code worden");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("de lijst staat op naam en niet op datum of score", () => {
  const maak = naam => registerRij({
    certificaat: { ...CERT, naam_op_certificaat: naam },
    gebruiker: { ...GEBRUIKER, register_slug: slugVan(naam) }
  });
  const html = bouwRegisterLijst({ rijen: [maak("Anna Appel"), maak("Bert Bos")] });
  assert.ok(html.indexOf("Anna Appel") < html.indexOf("Bert Bos"));
  assert.ok(bouwRegisterLijst({ rijen: [] }).includes("nog niemand"));
});

test("een lege pagina zegt niet of de code bestaat", () => {
  const html = bouwNietGevonden({ viaCode: true });
  assert.ok(html.includes("noindex"));
  assert.ok(!html.includes("toestemming"), "anders is af te leiden dat er wel een certificaat is");
});

/* ------------------------------------------------------------- de badge */
test("op de badge staan naam, niveau, jaar en de verificatie", () => {
  const svg = bouwBadgeSvg({ naam: "Maarten Neeskens", niveau: "lezer", datum: "2026-09-15", verificatiecode: CERT.verificatiecode });
  assert.ok(svg.startsWith("<svg"));
  for (const wat of ["Maarten Neeskens", "Lezer", "2026", "teamkrachtindex.nl/verificatie", CERT.verificatiecode]){
    assert.ok(svg.includes(wat), `de badge mist ${wat}`);
  }
  assert.ok(svg.includes(`viewBox="0 0 ${BREEDTE} ${HOOGTE}"`), "de badge is niet vierkant");
});

test("een lange naam past op twee regels en niet meer", () => {
  assert.deepEqual(naamRegels("Maarten Neeskens"), ["Maarten Neeskens"]);
  const lang = naamRegels("Johanna Wilhelmina van der Heijden-Bakker");
  assert.equal(lang.length, 2);
  for (const regel of lang) assert.ok(regel.length <= 26, `regel te lang: ${regel}`);
});

test("een naam met opmaak komt er als tekst op de badge", () => {
  const svg = bouwBadgeSvg({ naam: '"><script>x</script>', niveau: "lezer", datum: "2026-09-15", verificatiecode: CERT.verificatiecode });
  assert.ok(!svg.includes("<script>x"));
});

test("de badge is vector en wordt niet op de server tot plaatje gemaakt", () => {
  const route = readFileSync(new URL("../api/badge.js", import.meta.url), "utf8");
  assert.ok(route.includes("image/svg+xml"));
  const pagina = readFileSync(new URL("../badge.html", import.meta.url), "utf8");
  assert.ok(pagina.includes("canvas"), "de png wordt nergens gemaakt");
  assert.ok(pagina.includes("toBlob"));
});

/* ------------------------------------------------------------- de routes */
test("de openbare routes staan in vercel.json", () => {
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const paden = Object.fromEntries(vercel.rewrites.map(r => [r.source, r.destination]));
  assert.equal(paden["/register"], "/api/register");
  assert.equal(paden["/register/:slug"], "/api/register?slug=:slug");
  assert.equal(paden["/verificatie/:code"], "/api/register?code=:code");

  // Het register hoort op teamkrachtindex.nl en mag daar niet worden
  // doorgestuurd naar scan.happly.nl.
  for (const r of vercel.redirects){
    assert.ok(!/\|register\||\|verificatie\|/.test(r.source || ""),
      "het register wordt doorgestuurd en staat dan niet op teamkrachtindex.nl");
  }
});

test("het register vraagt geen inlog", () => {
  const route = readFileSync(new URL("../api/register.js", import.meta.url), "utf8");
  assert.ok(!route.includes("eisGebruiker"), "een register achter een inlog is geen register");
  assert.ok(!route.includes("haalGebruiker"));
});

test("de nieuwe bestanden staan in git", () => {
  const inGit = execSync("git ls-files", { encoding: "utf8" }).split("\n");
  for (const bestand of ["register.js", "register-pagina.js", "badge.js",
                         "api/register.js", "api/badge.js", "badge.html", "toets.html", "api/toets.js"]){
    assert.ok(inGit.includes(bestand), `${bestand} staat niet in git`);
  }
});
