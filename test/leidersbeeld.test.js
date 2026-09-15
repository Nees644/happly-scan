// test/leidersbeeld.test.js
// De acceptatiecriteria van briefings/leidersbeeld.md die zonder database te
// controleren zijn: A1 (het formulier weigert een halve invulling), A2 (de rij
// die wordt weggeschreven), A3 (de vier toestanden) en A4 (precies een
// herinnering). Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

import { ITEMS, SCHAAL, scores, index } from "../items.js";
import {
  MINIMUM_DEELNEMERS, TEAMOMVANG, kanKaartKrijgen, controleerGegevens,
  maakInzending, schoonHerkomst, uuidOfNull, voornaam, mailOnderwerp,
  herinneringOnderwerp, magHerinneren, toestand
} from "../leidersbeeld.js";

const GOED = {
  leider_naam: "Test Leider",
  leider_email: "Leider@Test.Happly.nl",
  organisatie: "Testorganisatie Noord",
  teamomvang: "10-20",
  privacy: true,
  antwoorden: [3,3,1,3, 3,1,3,1, 2,3,2,2]
};

/* ------------------------------------------------ de vragenset loopt niet uit
   elkaar. items.js en scan.html moeten dezelfde twaalf items in dezelfde
   volgorde hebben, anders meet het Leidersbeeld iets anders dan het team. */
test("items.js en scan.html hebben dezelfde vragenset", () => {
  const html = readFileSync(new URL("../scan.html", import.meta.url), "utf8");
  const blok = html.split("const ITEMS = [")[1].split("];")[0];
  const uitHtml = [...blok.matchAll(/code:"([A-Z]\d)"[^}]*?rev:(true|false)[^}]*?text:"([^"]+)"/g)]
    .map(m => ({ code: m[1], rev: m[2] === "true", tekst: m[3] }));

  assert.equal(uitHtml.length, ITEMS.length, "aantal items");
  ITEMS.forEach((it, i) => {
    assert.equal(uitHtml[i].code, it.code, `code op plek ${i}`);
    assert.equal(uitHtml[i].rev, it.rev, `omkering van ${it.code}`);
    assert.equal(uitHtml[i].tekst, it.tekst, `tekst van ${it.code}`);
  });
});

test("elk item heeft een versie over het team", () => {
  for (const it of ITEMS){
    assert.ok(it.tekst_team && it.tekst_team.length > 10, `${it.code} mist tekst_team`);
    assert.notEqual(it.tekst_team, it.tekst, `${it.code} is niet omgezet naar het team`);
  }
});

/* ------------------------------------------------------------------ scoring */
test("de schaal loopt van nul tot honderd en de index is het gemiddelde", () => {
  const laag = scores(new Array(12).fill(0));
  const hoog = scores([4,4,0,4, 4,0,4,0, 4,4,0,4]);
  // Alles op nul is niet nul: de vier omgekeerde items draaien om. Zien en
  // Doen hebben er een, Sturen twee, vandaar 25, 50 en 25.
  assert.deepEqual([laag.zien, laag.sturen, laag.doen], [25, 50, 25]);
  assert.equal(laag.index, 33);
  assert.equal(hoog.index, 100);
  assert.equal(hoog.zien, 100);
  assert.equal(index({ zien: 60, sturen: 50, doen: 40 }), 50);
  assert.equal(SCHAAL.length, 5);
});

test("een halve of ongeldige invulling levert geen score op", () => {
  assert.equal(scores([1,2,3]), null);
  assert.equal(scores(new Array(12).fill(5)), null);
  assert.equal(scores(new Array(12).fill(1.5)), null);
  assert.equal(scores("nee"), null);
});

/* --------------------------------------------------------- A1 · het formulier */
test("A1 · zonder naam, mail, organisatie, omvang of vinkje geen inzending", () => {
  const leeg = controleerGegevens({});
  assert.equal(leeg.ok, false);
  assert.deepEqual(leeg.fouten.map(f => f.veld),
    ["leider_naam", "leider_email", "organisatie", "teamomvang", "privacy"]);

  assert.equal(controleerGegevens({ ...GOED, privacy: false }).ok, false, "vinkje is verplicht");
  assert.equal(controleerGegevens({ ...GOED, leider_email: "geen mailadres" }).ok, false);
  assert.equal(controleerGegevens({ ...GOED, teamomvang: "8-12" }).ok, false, "oude band bestaat niet meer");
  assert.equal(controleerGegevens(GOED).ok, true);
});

test("A1 · een inzending zonder alle twaalf antwoorden wordt geweigerd", () => {
  const uit = maakInzending({ ...GOED, antwoorden: [1,2,3] });
  assert.equal(uit.ok, false);
  assert.equal(uit.fouten[0].veld, "antwoorden");
});

/* ------------------------------------------------------- A2 · wat er in gaat */
test("A2 · de rij bevat het indexgetal, de herkomst en het akkoord", () => {
  const uit = maakInzending({ ...GOED, src: "professionals", kwartaal: true },
                            new Date("2026-09-15T10:00:00Z"));
  assert.equal(uit.ok, true);
  assert.equal(uit.rij.status, "ingevuld");
  assert.equal(uit.rij.leider_email, "leider@test.happly.nl", "mailadres gaat in kleine letters");
  assert.equal(uit.rij.herkomst_src, "professionals");
  assert.equal(uit.rij.partner_id, null);
  assert.equal(uit.rij.opt_in_kwartaal, true);
  assert.ok(uit.rij.privacy_akkoord_op, "het akkoord wordt vastgelegd");
  assert.equal(uit.rij.index_score, index(uit.rij));
  assert.equal(Object.keys(uit.rij.antwoorden).length, 12);
});

test("A2 · herkomst en partner uit de URL worden geschoond", () => {
  assert.equal(schoonHerkomst("  Professionals  "), "professionals");
  assert.equal(schoonHerkomst("<script>x</script>"), "scriptxscript");
  assert.equal(schoonHerkomst(""), null);
  assert.equal(schoonHerkomst("a".repeat(80)).length, 40);
  assert.equal(uuidOfNull("niet-een-uuid"), null);
  assert.equal(uuidOfNull("3F6B2C10-1111-4222-8333-444455556666"),
                          "3f6b2c10-1111-4222-8333-444455556666");
});

/* --------------------------------------------------- de banden en het minimum */
test("de banden lopen langs het minimum van vijf", () => {
  assert.equal(MINIMUM_DEELNEMERS, 5);
  assert.deepEqual(TEAMOMVANG, ["2-4", "5-9", "10-20", "21+"]);
  assert.equal(kanKaartKrijgen("2-4"), false);
  assert.equal(kanKaartKrijgen("5-9"), true);
  assert.equal(kanKaartKrijgen("21+"), true);
  assert.equal(kanKaartKrijgen("8-12"), false, "een band die niet bestaat geeft geen kaart");
});

test("het minimum van vijf staat nergens als acht in de teksten", () => {
  for (const bestand of ["leidersbeeld.html", "leidersbeeld.js", "leider-pagina.js"]){
    const tekst = readFileSync(new URL(`../${bestand}`, import.meta.url), "utf8");
    assert.ok(!/minimaal acht|acht deelnemers/i.test(tekst), `${bestand} noemt acht deelnemers`);
  }
});

/* ------------------------------------------------------------ A3 · toestanden */
test("A3 · de vier toestanden van de eigen pagina", () => {
  assert.equal(toestand({ team_id: null }), "a");
  assert.equal(toestand({ team_id: "x" }), "b");
  assert.equal(toestand({ team_id: "x" }, { kaartVrij: true }), "c");
  assert.equal(toestand({ team_id: "x" }, { hermetingOpen: true }), "d");
});

/* ----------------------------------------------------------- A4 · herinnering */
test("A4 · de herinnering gaat na zeven dagen en precies een keer", () => {
  const nu = new Date("2026-09-22T07:00:00Z");
  const basis = { status: "ingevuld", created_at: "2026-09-15T07:00:00Z", afgemeld: false };
  assert.equal(magHerinneren(basis, nu), true);
  assert.equal(magHerinneren({ ...basis, created_at: "2026-09-18T07:00:00Z" }, nu), false, "te vroeg");
  assert.equal(magHerinneren({ ...basis, herinnering_op: "2026-09-22T07:00:00Z" }, nu), false, "al gehad");
  assert.equal(magHerinneren({ ...basis, afgemeld: true }, nu), false, "afgemeld");
  assert.equal(magHerinneren({ ...basis, status: "gekoppeld" }, nu), false, "heeft al een team");
  assert.equal(magHerinneren({ ...basis, status: "gesloten" }, nu), false);
});

/* ------------------------------------------------------------------ teksten */
test("de mailonderwerpen bevatten het getal", () => {
  assert.equal(mailOnderwerp(67), "Het Leidersbeeld van jouw team is 67");
  assert.equal(herinneringOnderwerp(67), "Jouw Leidersbeeld is 67. En het team?");
  assert.equal(voornaam("maarten neeskens"), "Maarten");
  assert.equal(voornaam(""), "");
});

test("geen gedachtestreepjes en geen uitroeptekens in de nieuwe teksten", () => {
  for (const bestand of ["leidersbeeld.js", "leidersbeeld.html", "leider-pagina.js", "items.js"]){
    // De kopregel van een bestand mag het streepje houden, zoals overal in deze
    // repo. Het gaat om de teksten die een lezer te zien krijgt.
    const tekst = readFileSync(new URL(`../${bestand}`, import.meta.url), "utf8")
      .split("\n").filter(regel => !regel.trim().startsWith("//")).join("\n");
    assert.ok(!tekst.includes("—"), `${bestand} bevat een gedachtestreepje`);
    assert.ok(!/[a-z]!/.test(tekst), `${bestand} bevat een uitroepteken`);
  }
});

/* -------------------------------------------- de bestanden staan ook in git */
test("de nieuwe bestanden staan in git en komen dus op productie", () => {
  const inGit = execSync("git ls-files", { encoding: "utf8" }).split("\n");
  for (const bestand of ["items.js", "leidersbeeld.js", "leidersbeeld.html",
                         "leider-pagina.js", "api/leidersbeeld.js", "api/leider.js"]){
    assert.ok(inGit.includes(bestand), `${bestand} staat niet in git`);
  }
});
