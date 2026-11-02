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
