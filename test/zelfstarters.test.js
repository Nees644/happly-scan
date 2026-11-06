// test/zelfstarters.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { bouwZelfstarterBadgeSvg, geldig, nummerIsGeldig, controleRij } from "../zelfstarters-badge.js";
import { welkomMail, badgeMail, herinneringMail, scanLink, planHerinneringMail, planCheckMail } from "../zelfstarters-mail.js";

test("nummer heeft de vorm ZS-jaar-volgnummer", () => {
  assert.equal(nummerIsGeldig("ZS-2026-00001"), true);
  assert.equal(nummerIsGeldig("ZS-26-1"), false);
  assert.equal(nummerIsGeldig(""), false);
});

test("een registratie is geldig tot twaalf maanden na de laatste meting", () => {
  const nu = new Date("2027-03-01");
  assert.equal(geldig({ laatsteMetingOp: "2026-06-01", nu }), true);
  assert.equal(geldig({ laatsteMetingOp: "2026-02-01", nu }), false);
  assert.equal(geldig({ laatsteMetingOp: null, nu }), false);
});

test("de badge toont plus en jaartallen, en vervaagt als hij verlopen is", () => {
  const a = bouwZelfstarterBadgeSvg({ plus: true, meetjaren: [2026, 2027] });
  assert.match(a, /2026 · 2027/);
  assert.match(a, /<rect/);
  assert.doesNotMatch(a, /opacity/);
  const b = bouwZelfstarterBadgeSvg({ plus: false, meetjaren: [2026], verlopen: true });
  assert.match(b, /opacity="0.45"/);
  assert.doesNotMatch(b, /<rect/);
});

test("de openbare controle toont nooit een score en geen naam zonder toestemming", () => {
  const rij = controleRij({ status: "betaald", nummer: "ZS-2026-00007", naam: "Sanne", openbaar: false,
    betaald_op: "2026-11-03T10:00:00Z", laatste_meting_op: "2026-11-03T11:00:00Z", meetjaren: [2026],
    plus_class_gevolgd_op: null, verificatiecode: "x", index_score: 78 }, new Date("2026-12-01"));
  assert.equal(rij.naam, null);
  assert.equal(rij.toestand, "geldig");
  assert.equal("index_score" in rij, false);
  assert.equal(controleRij({ status: "open", nummer: null }), null);
});

test("de mails spreken met je en jouw, zonder u en zonder gedachtestreepjes", () => {
  const mails = [
    welkomMail({ naam: "Sanne de Vries", registratieId: "abc", type: "plus" }),
    herinneringMail({ naam: "Sanne", registratieId: "abc" }),
    badgeMail({ naam: "Sanne", nummer: "ZS-2026-00001", verificatiecode: "c", meetjaren: [2026], plus: false })
  ];
  for (const m of mails){
    const tekst = m.html.replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(tekst, /\bu\b|\buw\b/i);
    assert.doesNotMatch(tekst, /—|!/);
    assert.match(tekst, /\bje\b/);
  }
  assert.match(scanLink("abc"), /scan\?zs=abc$/);
});

import { beschikbaarheid, MAX_PER_DAG, MIN_PER_DAG, DAGEN, TERUGKOMDAGEN, terugkomdagen } from "../zelfstarters-dagen.js";
import { dagMail } from "../zelfstarters-mail.js";

test("een Dag is vol bij het maximum, gaat door vanaf het minimum en is dicht als hij voorbij is", () => {
  const telling = { [DAGEN[0].datum]: MAX_PER_DAG, [DAGEN[1].datum]: 3, [DAGEN[2].datum]: MIN_PER_DAG };
  const b = beschikbaarheid(telling, new Date("2026-12-01"));
  assert.equal(b[0].open, false);
  assert.equal(b[0].gaat_door, true);
  assert.equal(b[1].vrij, MAX_PER_DAG - 3);
  assert.equal(b[1].open, true);
  assert.equal(b[1].gaat_door, false);
  assert.equal(b[2].gaat_door, true);
  const later = beschikbaarheid({}, new Date("2027-01-20"));
  assert.equal(later.find(d => d.datum === "2027-01-15").open, false);
  assert.equal(later.find(d => d.datum === "2027-02-12").open, true);
  assert.equal(DAGEN.length, 6);
  assert.equal(TERUGKOMDAGEN.length, 2);
  assert.equal(terugkomdagen({}, new Date("2027-07-01"))[0].open, false);
});

test("de dagmail noemt de dag en heeft een wijzigknop, zonder u", () => {
  const m = dagMail({ naam: "Sanne", dag: DAGEN[0], registratieId: "abc" });
  assert.match(m.subject, /15 januari/);
  assert.match(m.html, /zelfstarters-dag\?z=abc/);
  assert.doesNotMatch(m.html.replace(/<[^>]+>/g, " "), /\bu\b|—|!/);
});

/* De gratis trede, sinds 3 november 2026. */
import { sterksteKant, ruimtePunten, uitslagVoor, planOpschonen, planAlsTekst, regelsVoorHerinnering, VOORBEELDEN, MOMENTEN, VAKGEBIEDEN } from "../zelfstarters-uitslag.js";
import { uitslagMail, vervolgMail, planMail } from "../zelfstarters-mail.js";

test("de sterkste kant is de hoogste ring, de ruimte zit in de twee andere, laagste eerst", () => {
  const s = { zien: 82, sturen: 61, doen: 74 };
  assert.equal(sterksteKant(s).dimensie, "zien");
  assert.deepEqual(ruimtePunten(s).map(p => p.dimensie), ["sturen", "doen"]);
  assert.match(ruimtePunten(s)[0].zin, /^Je meeste ruimte zit in Sturen/);
  // Gelijke scores: vaste volgorde, zodat de uitslag stabiel is.
  assert.equal(sterksteKant({ zien: 70, sturen: 70, doen: 70 }).dimensie, "zien");
});

test("gratis geeft score, sterkste kant en ruimte; duiding en plan pas na verificatie", () => {
  const scan = { index_score: 72, zien: 82, sturen: 61, doen: 74, duiding: "Lange duiding." };
  const gratis = uitslagVoor({ rij: { status: "geregistreerd", naam: "Sanne de Vries", nummer: "ZS-2026-00001", eerste_meting_op: "2026-11-03" }, scan });
  assert.equal(gratis.score, 72);
  assert.equal(gratis.geverifieerd, false);
  assert.equal("duiding" in gratis, false);
  assert.equal("scores" in gratis, false);
  assert.equal(gratis.voornaam, "Sanne");
  const betaald = uitslagVoor({ rij: { status: "betaald", naam: "Sanne", nummer: "ZS-2026-00001", eerste_meting_op: "2026-11-03", plan: null }, scan });
  assert.equal(betaald.duiding, "Lange duiding.");
  assert.ok(Array.isArray(betaald.momenten));
});

test("een geregistreerde is openbaar vindbaar zonder jaartal; zonder meting is er niets", () => {
  const rij = controleRij({ status: "geregistreerd", nummer: "ZS-2026-00009", naam: "Sanne", openbaar: true,
    eerste_meting_op: "2026-11-03T10:00:00Z", laatste_meting_op: "2026-11-03T10:00:00Z", meetjaren: [2026] }, new Date("2026-12-01"));
  assert.equal(rij.toestand, "geregistreerd");
  assert.equal(rij.geverifieerd, false);
  assert.deepEqual(rij.meetjaren, []);
  assert.equal(rij.naam, "Sanne");
  assert.equal(controleRij({ status: "open", nummer: null }), null);
});

test("het plan heeft hoogstens twee regels met een bekend moment en een actie", () => {
  const plan = planOpschonen([
    { dimensie: "sturen", moment: "gesprek", actie: "zeg ik wat ik zie voordat ik vraag wat zij willen" },
    { dimensie: "doen", moment: "onbekend", actie: "iets" },
    { dimensie: "doen", moment: "honderd", actie: "plan ik de eerste beslissing in week één" }
  ]);
  assert.equal(plan.length, 2);
  assert.match(planAlsTekst(plan)[0], /^Als het eerste gesprek met een opdrachtgever eraan komt, dan zeg ik/);
  assert.equal(planOpschonen([{ moment: "gesprek", actie: "x" }]), null);
  assert.ok(VAKGEBIEDEN.includes("Anders"));
});

test("een planregel kan een datum dragen en de herinnering komt de dag ervoor, één keer", () => {
  const plan = planOpschonen([
    { dimensie: "doen", moment: "start", actie: "maak ik een lijst van drie dingen", datum: "2026-11-20" },
    { dimensie: "zien", moment: "tegenslag", actie: "wacht ik een uur", datum: "geen datum" }
  ]);
  assert.equal(plan[0].datum, "2026-11-20");
  assert.equal(plan[1].datum, null);
  assert.equal(regelsVoorHerinnering(plan, new Date("2026-11-18T07:00:00Z")).length, 0);
  assert.equal(regelsVoorHerinnering(plan, new Date("2026-11-19T07:00:00Z")).length, 1);
  assert.equal(regelsVoorHerinnering(plan, new Date("2026-11-21T07:00:00Z")).length, 1);
  plan[0].herinnerd_op = "2026-11-19";
  assert.equal(regelsVoorHerinnering(plan, new Date("2026-11-19T07:00:00Z")).length, 0);
});

test("elk ruimtepunt heeft voor elk moment een voorbeeld dat begint met wat je doet", () => {
  for (const dim of ["zien", "sturen", "doen"]){
    for (const m of MOMENTEN){
      const v = VOORBEELDEN[dim][m.code];
      assert.ok(v && v.length > 20, `${dim}/${m.code}`);
      assert.doesNotMatch(v, /—|!/);
      assert.match(planAlsTekst([{ moment: m.code, actie: v }])[0], /^Als .+ eraan komt, dan \w+ ik /);
    }
  }
});

test("de nieuwe mails houden zich aan de taalregels; de dimensiescores blijven binnen, de zelfkrachtscore mag mee", () => {
  const s = { zien: 82, sturen: 61, doen: 74 };
  const u = uitslagMail({ naam: "Sanne", registratieId: "id", nummer: "ZS-2026-00001", score: 72, sterkste: sterksteKant(s), ruimte: ruimtePunten(s), jaar: 2026 });
  assert.match(u.html, /\b72\b/);
  assert.match(u.html, /Waar je aan kunt werken/);
  assert.doesNotMatch(u.html, /badge-geregistreerd/);
  const mails = [
    uitslagMail({ naam: "Sanne", registratieId: "id", nummer: "ZS-2026-00001", sterkste: sterksteKant(s), ruimte: ruimtePunten(s), jaar: 2026 }),
    vervolgMail({ naam: "Sanne", registratieId: "id", nummer: "ZS-2026-00001", ruimte: ruimtePunten(s), jaar: 2026 }),
    planMail({ naam: "Sanne", registratieId: "id", regels: ["Als x, dan y"], datums: ["2026-11-20", null] }),
    planHerinneringMail({ naam: "Sanne", registratieId: "id", regel: { momentLabel: "de eerste week van een opdracht", tekst: "Als x, dan y" } }),
    planCheckMail({ naam: "Sanne", registratieId: "id", regels: ["Als x, dan y"], stap: "m3" })
  ];
  for (const m of mails){
    const t = m.subject + " " + m.html;
    assert.doesNotMatch(t, /—|!/);
    assert.doesNotMatch(t, /\bu\b|\buw\b/i);
    assert.doesNotMatch(t, /\b(82|61|74|72)\b/);
  }
});

import { codeOpschonen, kortingCent, codeVoorNaam } from "../zelfstarters-korting.js";
import fs from "node:fs";

test("kortingscodes: opschonen, korting in hele centen, code uit naam", () => {
  assert.equal(codeOpschonen(" knab-42 "), "KNAB-42");
  assert.equal(codeOpschonen("ab"), null);
  assert.equal(codeOpschonen("met spatie x"), "METSPATIEX");
  assert.equal(codeOpschonen("ab?c"), null);
  assert.equal(kortingCent(7900, 25), 1975);
  assert.equal(kortingCent(29900, 30), 8970);
  assert.equal(kortingCent(7900, 0), 0);
  assert.equal(kortingCent(7900, 250), 7900);
  assert.match(codeVoorNaam("Knab Zakelijk"), /^KNABZAKE-\d{2}$/);
  assert.match(codeVoorNaam(""), /^PARTNER-\d{2}$/);
});

test("de partnermigratie geeft service_role toegang en legt de korting vast op de registratie", () => {
  const m = fs.readFileSync(new URL("../migratie-zelfstarters-partners-2026-11-05.sql", import.meta.url), "utf8");
  assert.match(m, /grant select, insert, update, delete on public\.zelfstarters_partners to service_role/);
  assert.match(m, /partner_id uuid references public\.zelfstarters_partners/);
  assert.match(m, /korting_cent integer/);
  assert.match(m, /'gratis'/);
});

test("korting van een partner geldt alleen op Verificatie & Voorkeur, nooit op de Zelfstarters Dag", async () => {
  const { prijzen } = await import("../api/zelfstarters-start.js");
  const rijen = [
    { code: "ZS-STD", prijs_ex_btw: 7900, btw_pct: 21, actief: true },
    { code: "ZS-DAG", prijs_ex_btw: 49900, btw_pct: 21, actief: true }
  ];
  const db = { from: () => ({ select: () => ({ in: () => ({ eq: async () => ({ data: rijen }) }) }) }) };
  const p = await prijzen(db, { korting_pct: 25 });
  assert.ok(p.standaard.met_korting, "standaard krijgt korting");
  assert.equal(p.plus.met_korting, undefined, "de Dag krijgt geen korting");
});
