// test/zelfstarters.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { bouwZelfstarterBadgeSvg, geldig, nummerIsGeldig, controleRij } from "../zelfstarters-badge.js";
import { welkomMail, badgeMail, herinneringMail, scanLink } from "../zelfstarters-mail.js";

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

import { beschikbaarheid, PLEKKEN_PER_DAG, DAGEN } from "../zelfstarters-plusclass.js";
import { dagMail } from "../zelfstarters-mail.js";

test("een dag is vol bij het maximum en dicht als hij voorbij is", () => {
  const telling = { [DAGEN[0].datum]: PLEKKEN_PER_DAG, [DAGEN[1].datum]: 3 };
  const b = beschikbaarheid(telling, new Date("2026-12-01"));
  assert.equal(b[0].open, false);
  assert.equal(b[1].vrij, PLEKKEN_PER_DAG - 3);
  assert.equal(b[1].open, true);
  const later = beschikbaarheid({}, new Date("2027-01-20"));
  assert.equal(later.find(d => d.datum === "2027-01-16").open, false);
  assert.equal(later.find(d => d.datum === "2027-01-22").open, true);
});

test("de dagmail noemt de dag en heeft een wijzigknop, zonder u", () => {
  const m = dagMail({ naam: "Sanne", dag: DAGEN[0], registratieId: "abc" });
  assert.match(m.subject, /15 januari/);
  assert.match(m.html, /zelfstarters\/dag\?z=abc/);
  assert.doesNotMatch(m.html.replace(/<[^>]+>/g, " "), /\bu\b|—|!/);
});

/* De gratis trede, sinds 3 november 2026. */
import { sterksteKant, ruimtePunten, uitslagVoor, planOpschonen, planAlsTekst, VAKGEBIEDEN } from "../zelfstarters-uitslag.js";
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

test("de nieuwe mails houden zich aan de taalregels en geven de score niet weg", () => {
  const s = { zien: 82, sturen: 61, doen: 74 };
  const mails = [
    uitslagMail({ naam: "Sanne", registratieId: "id", nummer: "ZS-2026-00001", sterkste: sterksteKant(s), ruimte: ruimtePunten(s), jaar: 2026 }),
    vervolgMail({ naam: "Sanne", registratieId: "id", nummer: "ZS-2026-00001", ruimte: ruimtePunten(s), jaar: 2026 }),
    planMail({ naam: "Sanne", registratieId: "id", regels: ["Als x, dan y"] })
  ];
  for (const m of mails){
    const t = m.subject + " " + m.html;
    assert.doesNotMatch(t, /—|!/);
    assert.doesNotMatch(t, /\bu\b|\buw\b/i);
    assert.doesNotMatch(t, /\b(82|61|74|72)\b/);
  }
});
