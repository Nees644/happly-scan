// test/volhoudkracht.test.js
// De regels van briefings/volhoudkracht-scan.md die zonder database te
// controleren zijn: de vragenset (24, vier niveaus, zes dimensies), de
// scoring en de zwakste schakel, de banden, de taalregels op alle teksten,
// en wat er nooit op de uitslagpagina staat. Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ITEMS, DIMENSIES, NIVEAUS, WOORDEN, BANDEN, MAX_TOTAAL, MINIMUM_VOOR_GEMIDDELDE,
  itemsVoor, scoreVolhoudkracht, bandVoor, controleerGegevens, maakInzending, mailOnderwerp
} from "../volhoudkracht-items.js";
import { BAND_TEKST, SCHAKEL_TEKST, SLOT_TEKST, duiding } from "../volhoudkracht-duiding.js";
import { resultaatMail, uitslagUrl } from "../volhoudkracht-mail.js";
import { bouwUitslagPagina } from "../volhoudkracht-pagina.js";

function antwoordenMet(waarde, uitzonderingen = {}){
  const a = {};
  for (const it of ITEMS) a[it.id] = waarde;
  return { ...a, ...uitzonderingen };
}

const GEGEVENS = {
  woord: "training", programma_naam: "Leidinggeven voor starters", aanbieder: "eigen",
  naam: "Anna de Vries", email: "anna@voorbeeld.nl", organisatie: "Bureau Voorbeeld", privacy: true
};

test("de vragenset is 24 bewijsvragen, vier per dimensie, elk met vier niveaus", () => {
  assert.equal(ITEMS.length, 24);
  assert.equal(DIMENSIES.length, 6);
  assert.equal(NIVEAUS.length, 4);
  for (const d of DIMENSIES) assert.equal(ITEMS.filter(it => it.dim === d.code).length, 4, `dimensie ${d.code}`);
  for (const it of ITEMS){
    assert.equal(it.niveaus.length, 4, it.id);
    assert.match(it.id, /^[RPTWCM][1-4]$/);
  }
  assert.equal(MAX_TOTAAL, 72);
});

test("het woord van de invuller vult [programma] in, en impuls komt nergens voor", () => {
  const items = itemsVoor("traject");
  assert.ok(items.every(it => !it.vraag.includes("[programma]") && it.niveaus.every(n => !n.includes("[programma]"))));
  assert.ok(items.some(it => it.vraag.includes("het traject")));
  const training = itemsVoor("training");
  assert.ok(training.some(it => it.vraag.includes("de training")), "het lidwoord gaat mee met het woord");
  assert.ok(!training.some(it => it.vraag.includes("het training")));
  assert.ok(duiding({ woord: "training", band: "start", zwakste: "C" }).zwaksteTekst.includes("elke training"));
  assert.ok(duiding({ woord: "traject", band: "start", zwakste: "C" }).zwaksteTekst.includes("elk traject"));
  const alles = JSON.stringify([ITEMS, BAND_TEKST, SCHAKEL_TEKST, SLOT_TEKST]).toLowerCase();
  assert.ok(!alles.includes("impuls"), "impuls is een intern woord");
  assert.ok(!/\blek(t|ken)?\b/.test(alles), "lek en lekt horen niet in de teksten");
});

test("de taalregels gelden voor alle teksten: geen gedachtestreepjes, geen uitroeptekens, geen afhakers", () => {
  const teksten = [
    ...ITEMS.flatMap(it => [it.vraag, ...it.niveaus]),
    ...Object.values(BAND_TEKST),
    ...Object.values(SCHAKEL_TEKST).flatMap(s => [s.duiding, s.aanbod]),
    SLOT_TEKST,
    ...BANDEN.flatMap(b => [b.naam, b.kop])
  ];
  for (const t of teksten){
    assert.ok(!/[—–]/.test(t), `gedachtestreepje in: ${t}`);
    assert.ok(!t.includes("!"), `uitroepteken in: ${t}`);
    assert.ok(!/\b(afhakers|opgevers|stoppers)\b/i.test(t), `verboden zelfstandig naamwoord in: ${t}`);
    assert.ok(!/\bdoorzetten\b/i.test(t), `doorzetten in: ${t}`);
  }
});

test("de score is het totaal op 100, per dimensie op 100, en een ontbrekend antwoord geeft niets", () => {
  assert.equal(scoreVolhoudkracht(antwoordenMet(3)).score, 100);
  assert.equal(scoreVolhoudkracht(antwoordenMet(0)).score, 0);
  const half = scoreVolhoudkracht(antwoordenMet(2));
  assert.equal(half.score, 67);
  assert.ok(Object.values(half.dimensies).every(v => v === 67));
  const zonder = antwoordenMet(2); delete zonder.M4;
  assert.equal(scoreVolhoudkracht(zonder), null);
  assert.equal(scoreVolhoudkracht(antwoordenMet(2, { R1: 4 })), null);
  assert.equal(scoreVolhoudkracht(antwoordenMet(2, { R1: "2" })), null);
});

test("de zwakste schakel is de laagste dimensie, bij gelijke stand eerst contact en dan meting", () => {
  const r = scoreVolhoudkracht(antwoordenMet(3, { T1: 0, T2: 0, T3: 0, T4: 1 }));
  assert.equal(r.zwakste, "T");
  const gelijk = scoreVolhoudkracht(antwoordenMet(1));
  assert.equal(gelijk.zwakste, "C", "bij gelijke stand gaat contact voor");
  const zonderC = scoreVolhoudkracht(antwoordenMet(1, { C1: 3, C2: 3, C3: 3, C4: 3 }));
  assert.equal(zonderC.zwakste, "M", "daarna meting");
});

test("de banden liggen op 40 en 70, en elke band en schakel heeft een tekst", () => {
  assert.equal(bandVoor(39).code, "start");
  assert.equal(bandVoor(40).code, "bedoeld");
  assert.equal(bandVoor(69).code, "bedoeld");
  assert.equal(bandVoor(70).code, "georganiseerd");
  assert.equal(bandVoor(100).code, "georganiseerd");
  for (const b of BANDEN) assert.ok(BAND_TEKST[b.code], `band ${b.code}`);
  for (const d of DIMENSIES) assert.ok(SCHAKEL_TEKST[d.code]?.duiding && SCHAKEL_TEKST[d.code]?.aanbod, `schakel ${d.code}`);
  const u = duiding({ woord: "training", band: "bedoeld", zwakste: "C" });
  assert.ok(u.bandKop.includes("training") && !u.bandKop.includes("[programma]"));
  assert.equal(u.zwaksteNaam, "Contact");
});

test("het formulier weigert een halve invulling en de rij bevat de scores van de server", () => {
  assert.equal(controleerGegevens(GEGEVENS).ok, true);
  assert.equal(controleerGegevens({ ...GEGEVENS, woord: "cursus" }).ok, false);
  assert.equal(controleerGegevens({ ...GEGEVENS, privacy: false }).ok, false);
  assert.equal(controleerGegevens({ ...GEGEVENS, email: "geen adres" }).ok, false);
  const uit = maakInzending({ ...GEGEVENS, antwoorden: antwoordenMet(2, { C1: 0, C2: 0, C3: 0, C4: 0 }), src: "site_hero" });
  assert.equal(uit.ok, true);
  assert.equal(uit.rij.score, 56);
  assert.equal(uit.rij.dim_contact, 0);
  assert.equal(uit.rij.zwakste, "C");
  assert.equal(uit.rij.band, "bedoeld");
  assert.equal(uit.rij.herkomst_src, "site_hero");
  assert.equal(uit.rij.email, "anna@voorbeeld.nl");
  assert.equal(maakInzending({ ...GEGEVENS, antwoorden: {} }).ok, false);
  assert.equal(maakInzending({ ...GEGEVENS, antwoorden: antwoordenMet(1), src: "<script>" }).rij.herkomst_src, null);
});

test("de mail noemt het getal, de band en de zwakste schakel en linkt naar de uitslag", () => {
  const m = resultaatMail({ naam: "Anna de Vries", score: 56, band: "bedoeld", zwakste: "C", woord: "training", programma_naam: "Leidinggeven voor starters", token: "11111111-1111-1111-1111-111111111111" });
  assert.equal(m.subject, mailOnderwerp(56));
  assert.ok(m.html.includes("Beste Anna,"));
  assert.ok(m.html.includes(">56<"));
  assert.ok(m.html.includes("Contact"));
  assert.ok(m.html.includes(uitslagUrl("11111111-1111-1111-1111-111111111111")));
  assert.ok(!m.html.includes("[programma]"));
});

test("de uitslagpagina toont de zes dimensies en de zwakste schakel, en nooit een ranglijst of een gemiddelde onder de dertig scans", () => {
  const rij = { woord: "programma", programma_naam: "CooL Noord", score: 56, band: "bedoeld", zwakste: "C",
    dim_reden: 67, dim_plan: 67, dim_ritme: 67, dim_weerstand: 67, dim_contact: 0, dim_meting: 67 };
  const html = bouwUitslagPagina(rij, { aantalScans: 12, gemiddelde: 55 });
  for (const d of DIMENSIES) assert.ok(html.includes(`<span>${d.naam}</span>`), d.naam);
  assert.ok(html.includes(">56<"));
  assert.ok(html.includes("Uw zwakste schakel"));
  assert.ok(!html.includes("gemiddelde van alle scans"), "geen gemiddelde onder de dertig scans");
  assert.ok(!/rangl|positie|plaats \d|top \d/i.test(html), "geen ranglijst");
  assert.ok(!html.includes("[programma]"));
  const met = bouwUitslagPagina(rij, { aantalScans: MINIMUM_VOOR_GEMIDDELDE, gemiddelde: 55 });
  assert.ok(met.includes("gemiddelde van alle scans: 55"));
});

test("de scanpagina stuurt naar de route en laadt de vragen uit het ene bestand", () => {
  const html = readFileSync(new URL("../volhoudkracht.html", import.meta.url), "utf8");
  assert.ok(html.includes('from "/volhoudkracht-items.js"'), "de vragen staan niet nog eens in de pagina");
  assert.ok(html.includes('fetch("/api/volhoudkracht"'));
  assert.ok(!/[—]/.test(html), "gedachtestreepje in de pagina");
  for (const w of WOORDEN) assert.ok(html.includes(`${w}`), w);
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(vercel.rewrites.some(r => r.source === "/volhoudkracht/:token" && r.destination === "/api/volhoudkracht-uitslag?t=:token"));
});

test("de migratie geeft de nieuwe tabel aan service_role en eindigt met een controleregel", () => {
  const sql = readFileSync(new URL("../migratie-volhoudkracht-2026-10-26.sql", import.meta.url), "utf8");
  assert.ok(/grant select, insert, update, delete on public\.volhoudkracht to service_role/.test(sql));
  assert.ok(!/to (anon|authenticated)/.test(sql.replace(/for select to authenticated/g, "")), "niets aan anon of authenticated");
  assert.ok(/create table if not exists public\.volhoudkracht/.test(sql));
  assert.ok(!/\bdrop table\b|\bdelete from\b|\btruncate\b/i.test(sql), "de migratie verwijdert niets");
  assert.ok(/select[\s\S]*as scans;\s*$/.test(sql.trim() + "\n"), "de controleregel ontbreekt");
});
