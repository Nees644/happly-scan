// test/toets.test.js
// De toets van de Lezer-module: twintig uit veertig, zestien goed, drie
// pogingen per dertig dagen. Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  AANTAL_VRAGEN, LAT, MAX_POGINGEN, VENSTER_DAGEN, POGING_GELDIG_UREN,
  magStarten, openPoging, trekVragen, husselen, zonderAntwoord, nakijken, leesadvies
} from "../toets.js";

/* Een pool zoals hij in de database staat: zeven vragen voor hoofdstuk 1 tot
   en met 4, zes voor 5 en 6. */
function pool(){
  const uit = [];
  let n = 0;
  for (let h = 1; h <= 6; h++){
    for (let i = 0; i < (h <= 4 ? 7 : 6); i++){
      uit.push({ id: `v${++n}`, vraag: `vraag ${n}`, opties: ["a", "b", "c", "d"], juist: n % 4, hoofdstuk: h, actief: true });
    }
  }
  return uit;
}

const vast = () => 0.42;
const dagen = n => new Date(Date.now() - n * 86400000).toISOString();

/* --------------------------------------------------------- de getallen */
test("de getallen komen uit de briefing", () => {
  assert.equal(AANTAL_VRAGEN, 20);
  assert.equal(LAT, 16);
  assert.equal(MAX_POGINGEN, 3);
  assert.equal(VENSTER_DAGEN, 30);
  assert.equal(pool().length, 40);
});

/* ----------------------------------------------------------- de pogingen */
test("drie pogingen in dertig dagen, daarna wachten", () => {
  const af = d => ({ gestart_op: dagen(d), afgerond_op: dagen(d), geslaagd: false });
  assert.equal(magStarten([]).mag, true);
  assert.equal(magStarten([af(1), af(2)]).mag, true);
  assert.equal(magStarten([af(1), af(2), af(3)]).mag, false);
  assert.equal(magStarten([af(1), af(2), af(3)]).reden, "te veel pogingen");

  // Een poging van meer dan dertig dagen geleden telt niet meer mee.
  assert.equal(magStarten([af(1), af(2), af(31)]).mag, true);
});

test("wie geslaagd is doet de toets niet nog eens", () => {
  const uit = magStarten([{ gestart_op: dagen(1), afgerond_op: dagen(1), geslaagd: true }]);
  assert.equal(uit.mag, false);
  assert.equal(uit.reden, "geslaagd");
});

test("een poging die nog loopt wordt hervat en telt niet als nieuwe", () => {
  const lopend = { id: "p1", gestart_op: new Date(Date.now() - 10 * 60000).toISOString(), afgerond_op: null };
  const uit = magStarten([lopend]);
  assert.equal(uit.mag, true);
  assert.equal(uit.reden, "hervatten");
  assert.equal(uit.poging.id, "p1");
});

test("een poging die is blijven liggen verloopt", () => {
  const oud = { id: "p1", gestart_op: new Date(Date.now() - (POGING_GELDIG_UREN + 1) * 3600000).toISOString(), afgerond_op: null };
  assert.equal(openPoging([oud]), null, "anders kun je de vragen bekijken en morgen terugkomen");
  assert.equal(magStarten([oud]).reden, "nieuw");
});

test("de melding zegt wanneer je weer mag", () => {
  const uit = magStarten([1, 2, 3].map(d => ({ gestart_op: dagen(d), afgerond_op: dagen(d), geslaagd: false })));
  assert.match(uit.tekst, /vanaf \d+ \w+ \d{4}/, "zonder datum is de melding niet bruikbaar");
});

/* ------------------------------------------------------------ het trekken */
test("er worden twintig verschillende vragen getrokken", () => {
  const getrokken = trekVragen(pool(), AANTAL_VRAGEN, vast);
  assert.equal(getrokken.length, 20);
  assert.equal(new Set(getrokken.map(v => v.id)).size, 20, "dezelfde vraag twee keer");
});

test("de twintig zijn verdeeld over alle zes de hoofdstukken", () => {
  for (let ronde = 0; ronde < 20; ronde++){
    const getrokken = trekVragen(pool(), AANTAL_VRAGEN);
    const per = {};
    for (const v of getrokken) per[v.hoofdstuk] = (per[v.hoofdstuk] || 0) + 1;
    assert.equal(Object.keys(per).length, 6, "een hoofdstuk komt niet aan bod");
    const aantallen = Object.values(per);
    assert.ok(Math.max(...aantallen) - Math.min(...aantallen) <= 1,
      `scheve verdeling: ${JSON.stringify(per)}`);
  }
});

test("twee pogingen leveren niet dezelfde toets op", () => {
  const een = trekVragen(pool(), AANTAL_VRAGEN).map(v => v.id).sort().join();
  let anders = false;
  for (let i = 0; i < 10 && !anders; i++){
    anders = trekVragen(pool(), AANTAL_VRAGEN).map(v => v.id).sort().join() !== een;
  }
  assert.ok(anders, "een pool van veertig hoort verschillende toetsen te geven");
});

test("een inactieve vraag doet niet mee", () => {
  const lijst = pool().map(v => ({ ...v, actief: v.hoofdstuk !== 3 }));
  const getrokken = trekVragen(lijst, AANTAL_VRAGEN);
  assert.equal(getrokken.some(v => v.hoofdstuk === 3), false);
});

test("husselen houdt alles erin", () => {
  const lijst = pool();
  const geschud = husselen(lijst);
  assert.equal(geschud.length, lijst.length);
  assert.deepEqual(new Set(geschud.map(v => v.id)), new Set(lijst.map(v => v.id)));
});

/* ------------------------------------------------ het juiste antwoord blijft */
test("het juiste antwoord gaat nooit naar de browser", () => {
  const schoon = zonderAntwoord(pool()[0]);
  assert.equal("juist" in schoon, false, "het antwoord staat in het netwerkverkeer");
  assert.deepEqual(Object.keys(schoon).sort(), ["hoofdstuk", "id", "opties", "vraag"]);

  const route = readFileSync(new URL("../api/toets.js", import.meta.url), "utf8");
  const bijStart = route.split("async function start(")[1].split("async function inleveren(")[0];
  assert.ok(bijStart.includes("zonderAntwoord"), "de route stuurt de hele vraagrij mee");
  assert.ok(!/res\.status\(200\)\.json\(\{[^}]*juist/.test(bijStart));
});

test("nakijken gebeurt op de server", () => {
  const route = readFileSync(new URL("../api/toets.js", import.meta.url), "utf8");
  assert.ok(route.includes("nakijken("), "de route kijkt niet zelf na");
  const pagina = readFileSync(new URL("../toets.html", import.meta.url), "utf8");
  assert.ok(!pagina.includes("juist"), "de pagina kent het juiste antwoord");
  assert.ok(!pagina.includes("nakijken"), "de pagina kijkt zelf na");
});

/* ------------------------------------------------------------ het nakijken */
test("zestien goed is geslaagd, vijftien niet", () => {
  const vragen = trekVragen(pool(), AANTAL_VRAGEN, vast);
  const goedAantal = n => Object.fromEntries(vragen.slice(0, n).map(v => [v.id, v.juist]));

  assert.equal(nakijken(vragen, goedAantal(20)).score, 20);
  assert.equal(nakijken(vragen, goedAantal(16)).geslaagd, true);
  assert.equal(nakijken(vragen, goedAantal(15)).geslaagd, false);
  assert.equal(nakijken(vragen, {}).score, 0);
});

test("een onbeantwoorde vraag telt als fout en niet als gok", () => {
  const vragen = trekVragen(pool(), AANTAL_VRAGEN, vast);
  const uit = nakijken(vragen, {});
  assert.equal(uit.score, 0);
  assert.ok(uit.antwoorden.every(a => a.gekozen === null && a.goed === false));
});

test("de uitslag zegt per hoofdstuk hoe het ging", () => {
  const vragen = trekVragen(pool(), AANTAL_VRAGEN, vast);
  const uit = nakijken(vragen, Object.fromEntries(vragen.map(v => [v.id, v.juist])));
  const totaal = Object.values(uit.perHoofdstuk).reduce((t, r) => t + r.totaal, 0);
  assert.equal(totaal, 20);
  assert.equal(Object.keys(uit.perHoofdstuk).length, 6);
});

test("wie zakt krijgt hoogstens twee hoofdstukken als leesadvies", () => {
  const advies = leesadvies({
    1: { goed: 3, totaal: 4 }, 2: { goed: 1, totaal: 4 },
    3: { goed: 4, totaal: 4 }, 4: { goed: 0, totaal: 3 }
  });
  // Hoofdstuk 2 en 4 misten er allebei drie; bij gelijk aantal wint het laagste
  // hoofdstuk, zodat het advies in leesvolgorde staat.
  assert.deepEqual(advies, [2, 4], "de meeste gemiste vragen eerst");
  assert.deepEqual(leesadvies({ 1: { goed: 4, totaal: 4 } }), [], "wie niets miste krijgt geen advies");
});

/* ------------------------------------------------------ certificaat en rol */
test("het certificaat komt alleen na een voldoende", () => {
  const route = readFileSync(new URL("../api/toets.js", import.meta.url), "utf8");
  const blok = route.split("const uitslag = nakijken")[1];
  assert.ok(/if \(uitslag\.geslaagd\)\{\s*\n\s*certificaat = await geefCertificaat/.test(blok),
    "het certificaat hangt niet aan de uitslag");
  assert.ok(route.includes('niveau: "lezer"'), "het niveau wordt niet gezet");
});

test("de toestemming voor het register staat standaard uit", () => {
  const route = readFileSync(new URL("../api/toets.js", import.meta.url), "utf8");
  assert.ok(route.includes("body.register_toestemming === true"),
    "toestemming hoort een uitdrukkelijke ja te zijn");
  const pagina = readFileSync(new URL("../toets.html", import.meta.url), "utf8");
  assert.ok(!/id="register"[^>]*checked/.test(pagina), "het vinkje staat voorgevinkt aan");
});

test("rol lezer mag bij de module en bij de toets", () => {
  for (const bestand of ["api/toets.js", "api/module-voortgang.js", "api/prijs.js"]){
    const route = readFileSync(new URL(`../${bestand}`, import.meta.url), "utf8");
    assert.ok(/eisGebruiker\([^)]*"lezer"/s.test(route) || route.includes('ROLLEN'),
      `${bestand} sluit de rol lezer buiten, en dat is de rol die iedereen bij registratie krijgt`);
  }
});
