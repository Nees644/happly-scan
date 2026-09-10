// test/teamkracht.test.js
// Acceptatiecriteria 1, 2, 3 en 7 uit de briefing, plus de randgevallen van de
// regelevaluatie. Draaien met: npm test
//
// Afwijking van de briefing bij criterium 1: daar staat dat R1 en R11 gelijk
// scoren en dat R1 op volgorde wint. Met de formule uit paragraaf 5 scoren ze
// niet gelijk (0,70 tegen 0,60). De formule is leidend (akkoord 07-09-2026),
// dus de verwachting hieronder is de doorgerekende uitkomst. De volgorde
// R1, R11, R12 blijft ongewijzigd.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  bepaalProfiel, bepaalTeamlijn, bepaalBreuk, bepaalVerdeling,
  voorwaardeWaar, controleerVoorwaarde, scoreRegel, kiesDynamieken,
  vulPlaceholders, bouwTeambeeld, beoordeelDoel, verschuiving
} from "../teamkracht-logica.js";

import { leesRegels, leesProfielen, leesInterventies, leesDoelregels, leesTestdata, leesSeedblok, leesSql } from "./seed-lezen.js";

const REGELS = leesRegels();
const { norm, deelnemers } = leesTestdata();
const CONFIG = { middenband_sd: 0.25, min_deelnemers_lijnen: 10, norm_bron: "vast" };

const beeld = (lijst) => bouwTeambeeld({ deelnemers: lijst, norm, config: CONFIG, regels: REGELS });

/* ---------------------------------------------- criterium 1: team Noord, 11 */

test("criterium 1: de profielverdeling van team Noord", () => {
  assert.deepEqual(beeld(deelnemers).verdeling, { HLL: 4, LHH: 2, HHH: 1, LLL: 2, MMM: 2 });
});

test("criterium 1: de breuk zit tussen zien en sturen", () => {
  const b = beeld(deelnemers);
  assert.equal(b.breuk, "zien_sturen");
  assert.deepEqual([b.team_zien, b.team_sturen, b.team_doen], [66.3, 51.2, 49.5]);
});

test("criterium 1: de dynamieken zijn R1, R11 en R12 in die volgorde", () => {
  const d = beeld(deelnemers).dynamieken;
  assert.deepEqual(d.map(x => x.code), ["R1", "R11", "R12"]);
  assert.deepEqual(d.map(x => x.score), [0.7, 0.6, 0.5]);
});

test("criterium 1: er staat een versterkende regel bij", () => {
  const codes = beeld(deelnemers).dynamieken.map(x => x.code);
  const versterkend = REGELS.filter(r => r.richting === "versterkt").map(r => r.code);
  assert.ok(codes.some(c => versterkend.includes(c)));
});

/* --------------------------------------------------- criterium 2: zeven man */

test("criterium 2: onder tien deelnemers geen individuele lijnen", () => {
  const b = beeld(deelnemers.slice(0, 7));
  assert.equal(b.n, 7);
  assert.equal(b.lijnen, null);
  assert.ok(b.verdeling.HLL > 0, "de verdeling blijft wel gevuld");
});

test("vanaf tien deelnemers zijn er wel lijnen, gesorteerd en zonder id", () => {
  const b = beeld(deelnemers);
  assert.equal(b.lijnen.length, 11);
  for (const lijn of b.lijnen){
    assert.equal(lijn.length, 4, "zien, sturen, doen en de afrondingsmarkering");
    assert.ok(lijn.every(Number.isInteger), "hele punten, geen kommagetallen");
  }
  const zien = b.lijnen.map(l => l[0]);
  assert.deepEqual(zien, [...zien].sort((a, b) => a - b));
});

test("criterium 3: de lijnen verraden de invoervolgorde niet", () => {
  const omgekeerd = beeld([...deelnemers].reverse());
  assert.deepEqual(beeld(deelnemers).lijnen, omgekeerd.lijnen);
});

/* ------------------------------------------------------------- profielen */

test("de middenband blijft middenband, de rest wordt afgerond", () => {
  assert.deepEqual(bepaalProfiel({ zien: 60, sturen: 52, doen: 48 }, norm, 0.25),
    { code: "MMM", ruw: "MMM", afgerond: false });
  // Zien duidelijk hoog, sturen en doen in de band: afronden naar het
  // dichtstbijzijnde patroon, hier tweemaal onder het gemiddelde.
  const p = bepaalProfiel({ zien: 84, sturen: 54, doen: 49 }, norm, 0.25);
  assert.equal(p.ruw, "HMM");
  assert.equal(p.code, "HLL");
  assert.equal(p.afgerond, true);
});

test("de breuk valt op geen of begin als er niets duidelijk zakt", () => {
  assert.equal(bepaalBreuk({ zien: 62, sturen: 55, doen: 50 }, norm), "geen");
  assert.equal(bepaalBreuk({ zien: 55, sturen: 49, doen: 45 }, norm), "begin");
});

/* --------------------------------------------------------------- regels */

test("alle voorwaarden in de seed gebruiken toegestane sleutels", () => {
  assert.equal(REGELS.length, 13);
  for (const r of REGELS) assert.equal(controleerVoorwaarde(r.voorwaarde), true);
});

test("een onbekende sleutel in een voorwaarde wordt geweigerd", () => {
  assert.throws(() => controleerVoorwaarde({ minimaal: { HLL: 2 } }), /onbekende sleutel/);
  assert.throws(() => controleerVoorwaarde({}), /leeg/);
});

test("min_een_van van R5 werkt als een of", () => {
  const r5 = REGELS.find(r => r.code === "R5");
  const ctx = n => ({ verdeling: n, n: 6, breuk: "geen", teamlijn: norm, norm });
  assert.equal(voorwaardeWaar(r5.voorwaarde, ctx({ HLH: 1, HHH: 1 })), true);
  assert.equal(voorwaardeWaar(r5.voorwaarde, ctx({ HLH: 1, HHL: 1 })), true);
  assert.equal(voorwaardeWaar(r5.voorwaarde, ctx({ HLH: 1, LLL: 5 })), false);
});

test("R4a en R4b splitsen op teamgrootte", () => {
  const r4a = REGELS.find(r => r.code === "R4a");
  const r4b = REGELS.find(r => r.code === "R4b");
  const ctx = (verdeling, n) => ({ verdeling, n, breuk: "geen", teamlijn: norm, norm });
  assert.equal(voorwaardeWaar(r4a.voorwaarde, ctx({ HHL: 2 }, 8)), true);
  assert.equal(voorwaardeWaar(r4a.voorwaarde, ctx({ HHL: 2 }, 12)), false);
  assert.equal(voorwaardeWaar(r4b.voorwaarde, ctx({ HHL: 3 }, 12)), true);
  assert.equal(voorwaardeWaar(r4b.voorwaarde, ctx({ HHL: 2 }, 12)), false);
});

test("een teamregel scoort vast, een profielregel naar rato", () => {
  const r12 = REGELS.find(r => r.code === "R12");
  const r1  = REGELS.find(r => r.code === "R1");
  const ctx = { verdeling: { HLL: 4, LHH: 2 }, n: 11, breuk: "zien_sturen", teamlijn: { zien: 66.3 }, norm };
  assert.equal(scoreRegel(r12, ctx), 0.5);
  assert.equal(Math.round(scoreRegel(r1, ctx) * 100) / 100, 0.7);
});

test("de derde plek gaat naar de hoogste versterkende regel als die ontbreekt", () => {
  const remmend = (code, volgorde) => ({
    code, richting: "remt", volgorde, gewicht_opslag: 0.2,
    voorwaarde: { min: { LLL: 1 } }
  });
  const regels = [
    remmend("A", 1), remmend("B", 2), remmend("C", 3),
    { code: "V", richting: "versterkt", volgorde: 4, gewicht_opslag: 0, voorwaarde: { min: { LLL: 1 } } }
  ];
  const ctx = { verdeling: { LLL: 4 }, n: 4, breuk: "geen", teamlijn: norm, norm };
  const codes = kiesDynamieken(regels, ctx).map(d => d.code);
  assert.deepEqual(codes, ["A", "B", "V"]);
});

test("bij gelijke score wint de lagere volgorde", () => {
  const maak = (code, volgorde) => ({
    code, richting: "remt", volgorde, gewicht_opslag: 0.1,
    voorwaarde: { min: { LLL: 1 } }
  });
  const ctx = { verdeling: { LLL: 3 }, n: 3, breuk: "geen", teamlijn: norm, norm };
  const codes = kiesDynamieken([maak("Z", 9), maak("A", 2)], ctx).map(d => d.code);
  assert.deepEqual(codes, ["A", "Z"]);
});

/* --------------------------------------------------------- koppen en taal */

test("placeholders worden telwoorden met een hoofdletter", () => {
  const r1 = REGELS.find(r => r.code === "R1");
  assert.equal(
    vulPlaceholders(r1.titel_geteld, { HLL: 4, LHH: 2 }, 11),
    "Vier Zieners en twee Aanpakkers"
  );
  const r10 = REGELS.find(r => r.code === "R10");
  assert.equal(vulPlaceholders(r10.titel_geteld, { MMM: 7 }, 11), "Zeven van de elf in de middenband");
});

test("criterium 7: geen gedachtestreep en geen uitroepteken in de seed", () => {
  const blok = leesSeedblok();
  for (const teken of ["—", "–", "!"]){
    assert.equal(blok.includes(teken), false, `teken ${JSON.stringify(teken)} staat in de seed`);
  }
});

test("elke regel heeft een dynamiek, een interventie en een gespreksvraag", () => {
  for (const r of REGELS){
    for (const veld of ["dynamiek", "interventie", "gespreksvraag"]){
      assert.ok(r[veld] && r[veld].trim().length > 10, `${r.code} mist ${veld}`);
    }
    assert.ok(r.titel.trim().length > 3, `${r.code} mist een kop`);
  }
});

test("elke interventie is meetbaar gemaakt", () => {
  const lijst = leesInterventies();
  assert.equal(lijst.length, 13);
  for (const i of lijst){
    assert.ok(i.tekst && i.tekst.trim().length > 20, `${i.code} mist tekst`);
    assert.ok(i.ritme && i.ritme.trim(), `${i.code} mist een ritme`);
    assert.ok(i.telling && i.telling.trim(), `${i.code} mist iets om te tellen`);
    assert.ok(i.gespreksvraag && i.gespreksvraag.includes("?"), `${i.code} mist een gespreksvraag`);
    assert.ok(i.breuk || (Array.isArray(i.profielen) && i.profielen.length),
      `${i.code} hangt aan niets`);
  }
});

test("elke breuk en elk profiel heeft minstens één interventie", () => {
  const lijst = leesInterventies();
  for (const breuk of ["zien_sturen", "sturen_doen", "geen", "begin"]){
    assert.ok(lijst.some(i => i.breuk === breuk), `geen interventie voor breuk ${breuk}`);
  }
  for (const p of leesProfielen()){
    assert.ok(lijst.some(i => (i.profielen || []).includes(p.code)),
      `geen interventie voor profiel ${p.code}`);
  }
});

/* ------------------------------------------------------- ambitiebanden */

const DOELREGELS = leesDoelregels();
const START = beeld(deelnemers);   // Zien 66,3  Sturen 51,2  Doen 49,5

const band = (doel, horizon = 12) => beoordeelDoel(START, doel, DOELREGELS, horizon);

test("de vier ambitiebanden dekken elke stijging", () => {
  assert.equal(DOELREGELS.length, 4);
  for (let punten = 0; punten <= 40; punten++){
    const uit = band({ zien: START.team_zien + punten, sturen: START.team_sturen, doen: START.team_doen });
    assert.ok(uit.code, `geen band voor een stijging van ${punten} punten`);
  }
});

test("de banden vallen op de grenzen die de opdrachtgever noemde", () => {
  const bij = punten => band({ zien: START.team_zien + punten, sturen: START.team_sturen, doen: START.team_doen });
  assert.equal(bij(3).titel,  "Lage ambitie");
  assert.equal(bij(7).titel,  "Normale ambitie");
  assert.equal(bij(12).titel, "Hoge ambitie");
  assert.equal(bij(20).titel, "Waarschijnlijk niet haalbaar");
  assert.equal(bij(5).titel,  "Normale ambitie", "vijf hoort bij normaal, niet bij laag");
  assert.equal(bij(15).titel, "Waarschijnlijk niet haalbaar", "vijftien is de bovengrens van hoog");
});

test("de sterkst verschoven vaardigheid bepaalt de band", () => {
  const uit = band({ zien: START.team_zien, sturen: START.team_sturen + 12, doen: START.team_doen + 1 });
  assert.equal(uit.titel, "Hoge ambitie");
  assert.equal(uit.zwaarste_per_jaar, 12);
});

test("een langere looptijd maakt dezelfde sprong minder ambitieus", () => {
  const doel = { zien: START.team_zien, sturen: START.team_sturen + 12, doen: START.team_doen };
  assert.equal(band(doel, 12).titel, "Hoge ambitie");
  assert.equal(band(doel, 24).titel, "Normale ambitie");
});

test("een verschil van een paar tienden is afronding, geen daling", () => {
  const uit = band({ zien: Math.round(START.team_zien), sturen: Math.round(START.team_sturen), doen: Math.round(START.team_doen) });
  assert.deepEqual(uit.dalingen, []);
});

test("een daling wordt apart gemeld en telt niet als ambitie", () => {
  const uit = band({ zien: START.team_zien - 8, sturen: START.team_sturen + 2, doen: START.team_doen });
  assert.deepEqual(uit.dalingen, ["zien"]);
  assert.equal(uit.titel, "Lage ambitie");
});

test("de verschuiving rekent netjes naar punten per jaar", () => {
  const d = verschuiving(START, { zien: START.team_zien + 6, sturen: START.team_sturen, doen: START.team_doen }, 6);
  assert.equal(d.zien.punten, 6);
  assert.equal(d.zien.per_jaar, 12);
});

/* ------------------------------------------------------------ beheer */

import { SCHEMA, taalcontrole } from "../teamkracht-beheer-schema.js";

/* De beheerpagina schrijft rechtstreeks in de tabellen. Eén typefout in een
   kolomnaam levert pas bij het opslaan een fout op, en dan bij de gebruiker.
   Daarom hier tegen de migratie aan gehouden. */
function kolommenVan(tabel){
  const sql = leesSql();
  const start = sql.indexOf(`create table if not exists public.${tabel} (`);
  if (start < 0) throw new Error(`tabel ${tabel} niet gevonden`);
  const eind = sql.indexOf("\n);", start);
  const body = sql.slice(start, eind)
    .split("\n").slice(1)
    .map(r => r.replace(/--.*$/, "").trim())
    .filter(Boolean)
    .join(" ");

  // Meerdere kolommen op één regel komen voor, en een check-clausule bevat zelf
  // komma's. Dus splitsen op komma's buiten haakjes.
  const delen = [];
  let diep = 0, huidig = "";
  for (const teken of body){
    if (teken === "(") diep++;
    else if (teken === ")") diep--;
    if (teken === "," && diep === 0){ delen.push(huidig); huidig = ""; continue; }
    huidig += teken;
  }
  delen.push(huidig);

  return delen.map(d => d.trim().split(/\s/)[0]).filter(Boolean);
}

test("elke kolom in het beheerschema bestaat ook echt", () => {
  for (const [naam, def] of Object.entries(SCHEMA)){
    const kolommen = kolommenVan(def.tabel);
    assert.ok(kolommen.includes(def.sleutel), `${naam}: sleutel ${def.sleutel} bestaat niet`);
    for (const veld of def.velden){
      assert.ok(kolommen.includes(veld.kolom), `${naam}: kolom ${veld.kolom} bestaat niet in ${def.tabel}`);
    }
    if (def.updated) assert.ok(kolommen.includes("updated_at"), `${naam}: geen updated_at`);
  }
});

test("het beheerschema laat niets bewerken wat bevroren hoort te blijven", () => {
  const verboden = ["teamkracht_teambeeld", "teamkracht_doel", "teamkracht_plan",
                    "teamkracht_coachvragen", "teamkracht_teams", "teamkracht_gebruikers"];
  for (const def of Object.values(SCHEMA)){
    assert.ok(!verboden.includes(def.tabel), `${def.tabel} hoort niet bewerkbaar te zijn`);
  }
});

test("de taalregel weigert een gedachtestreep en een uitroepteken", () => {
  assert.equal(taalcontrole("Een gewone zin, met een komma."), null);
  assert.equal(taalcontrole("Een koppel-teken mag wel."), null);
  assert.match(taalcontrole("Zo niet!"), /uitroepteken/);
  assert.match(taalcontrole("Zo — niet"), /gedachtestreep/);
  assert.match(taalcontrole("Zo – niet"), /gedachtestreep/);
});

/* ------------------------------------------------------------- advies */

import { niveau as niveauVan, ontwikkelruimte } from "../zelfkracht-uitslag.js";

test("het advies is precies de stap naar het volgende niveau", () => {
  for (let score = 0; score <= 100; score++){
    const or = ontwikkelruimte(score);
    if (score >= 90){
      assert.equal(or.onderhoud, true, `${score} hoort onderhouden te zijn`);
      continue;
    }
    assert.equal(or.onderhoud, false);
    // De banden zijn 30, 20, 20 en 20 punten breed, dus dertig is het maximum
    // en dat komt alleen voor bij een score van nul.
    assert.ok(or.plus >= 1 && or.plus <= 30, `${score} geeft een advies van ${or.plus}`);
    assert.equal(niveauVan(score + or.plus), or.niveau,
      `${score} plus ${or.plus} hoort ${or.niveau} te zijn`);
    assert.notEqual(niveauVan(score), or.niveau, `${score} staat al op ${or.niveau}`);
  }
});

test("het advies blijft een stap en wordt geen berg", () => {
  // Vanaf Beperkt is elke band twintig punten breed; alleen wie helemaal
  // onderin de band Laag zit krijgt een groter getal te zien.
  const vanafBeperkt = Array.from({ length: 60 }, (_, i) => ontwikkelruimte(30 + i).plus);
  assert.ok(Math.max(...vanafBeperkt) <= 20, "een advies van meer dan twintig punten is geen stap");

  // Ter vergelijking: de oude regel mikte vanuit elke score op 80 of 90.
  const oudeRegel = s => (s >= 90 ? null : s >= 80 ? 90 - s : 80 - s);
  assert.equal(oudeRegel(22), 58);
  assert.equal(ontwikkelruimte(22).plus, 8, "de nieuwe regel maakt van dezelfde score een stap");
});

/* ------------------------------------------------- bevroren teksten */

test("criterium 4: een beeld bevriest de teksten die erop staan", () => {
  const b = bouwTeambeeld({
    deelnemers, norm, config: CONFIG, regels: REGELS, profielen: leesProfielen()
  });
  // Alleen wat op deze kaart komt: de drie dynamieken en de profielen uit de verdeling.
  assert.deepEqual(Object.keys(b.teksten.regels).sort(), ["R1", "R11", "R12"]);
  assert.deepEqual(Object.keys(b.teksten.profielen).sort(), Object.keys(b.verdeling).sort());
  assert.equal(b.teksten.profielen.HLL, "Ziener");
  for (const bevroren of Object.values(b.teksten.regels)){
    for (const veld of ["titel", "dynamiek", "interventie", "gespreksvraag"]){
      assert.ok(bevroren[veld] && bevroren[veld].length > 3, `${veld} ontbreekt in de momentopname`);
    }
  }
});

test("criterium 4: een latere tekstwijziging raakt een eerder beeld niet", async () => {
  const { bouwKaartHtml } = await import("../teamkracht-kaart.js");
  const profielen = leesProfielen();
  const oud = bouwTeambeeld({ deelnemers, norm, config: CONFIG, regels: REGELS, profielen });

  // De beheerder herschrijft R1 en hernoemt een profiel.
  const nieuweRegels = REGELS.map(r =>
    r.code === "R1" ? { ...r, titel: "Compleet andere kop", dynamiek: "Compleet andere dynamiektekst." } : r);
  const nieuweProfielen = profielen.map(p => p.code === "HLL" ? { ...p, naam: "Waarnemer" } : p);

  const kaartOud = bouwKaartHtml({ teambeeld: oud, regels: nieuweRegels, profielen: nieuweProfielen });
  assert.ok(kaartOud.includes("Ziet alles, rent de andere kant op"), "de oude kaart houdt zijn eigen kop");
  assert.ok(!kaartOud.includes("Compleet andere kop"), "de oude kaart mag niet meeveranderen");
  assert.ok(kaartOud.includes("Zieners"), "de oude kaart houdt de oude profielnaam");

  const nieuw = bouwTeambeeld({ deelnemers, norm, config: CONFIG, regels: nieuweRegels, profielen: nieuweProfielen });
  const kaartNieuw = bouwKaartHtml({ teambeeld: nieuw, regels: nieuweRegels, profielen: nieuweProfielen });
  assert.ok(kaartNieuw.includes("Compleet andere kop"), "een nieuw beeld toont de nieuwe tekst");
  assert.ok(kaartNieuw.includes("Waarnemers"), "een nieuw beeld toont de nieuwe profielnaam");
});

test("een beeld van voor de migratie valt terug op de tabellen", async () => {
  const { bouwKaartHtml } = await import("../teamkracht-kaart.js");
  const profielen = leesProfielen();
  const zonderTeksten = bouwTeambeeld({ deelnemers, norm, config: CONFIG, regels: REGELS, profielen });
  delete zonderTeksten.teksten;
  const kaart = bouwKaartHtml({ teambeeld: zonderTeksten, regels: REGELS, profielen });
  assert.ok(kaart.includes("Ziet alles, rent de andere kant op"));
  assert.ok(kaart.includes("Zieners"));
});

test("criterium 3: er staat niets in de SVG dat naar een deelnemer wijst", async () => {
  const { tekenKaartSvg } = await import("../teamkracht-kaart.js");
  const svg = tekenKaartSvg(bouwTeambeeld({ deelnemers, norm, config: CONFIG, regels: REGELS }));

  for (const [wat, patroon] of [
    ["een e-mailadres", /[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
    ["een uuid", /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i],
    ["een id-attribuut", /\bid\s*=/],
    ["een titel of tooltip", /<title|data-|aria-describedby/],
    ["een naamachtig attribuut", /\b(name|naam|email|deelnemer)\s*=/i]
  ]){
    assert.ok(!patroon.test(svg), `de SVG bevat ${wat}`);
  }
  // Wel het beeld zelf: drie kolommen, elf lijnen plus de teamlijn.
  assert.equal((svg.match(/<polyline/g) || []).length, 12);
});

/* ---------------------------------------------------------- betalen */

import { bedragMetBtw, soortBetaling, magKopen, omschrijving, tegoedGeldig, prijskaart } from "../betalen.js";
import { koper, groepVanCode, magGroepKopen, magSeatToevoegen, seatsOver } from "../toegang.js";
import { centenNaarBedrag } from "../mollie.js";

/* De prijzen uit de migratie, zodat de controles op de echte bedragen draaien
   en niet op getallen die ik hier overtyp. */
function leesProducten(){
  const sql = readFileSync(new URL("../migratie-certificering-2026-09-09.sql", import.meta.url), "utf8");
  const start = sql.indexOf("insert into public.producten");
  const eind  = sql.indexOf("on conflict (code) do nothing;", start);
  return [...sql.slice(start, eind).matchAll(/^\('([A-Z0-9-]+)',\s*'([^']+)',\s*(\d+),/gm)]
    .map(m => ({ code: m[1], naam: m[2], prijs_ex_btw: Number(m[3]), btw_promille: 210, actief: true, fase: "A" }));
}

test("de prijzen uit de migratie zijn de prijzen uit de briefing", () => {
  const p = Object.fromEntries(leesProducten().map(x => [x.code, x.prijs_ex_btw]));
  assert.equal(p["TF"], 9500);
  assert.equal(p["HM"], 9500);
  assert.equal(p["LEZ-1"], 14900);
  assert.equal(p["LIC-M"], 2900);
  assert.equal(p["LIC-J"], 29000);
  assert.equal(p["LEZ-2"], undefined, "LEZ-2 hoort niet meer in de migratie te staan");
  assert.equal(Object.keys(p).length, 17);
});


test("btw wordt op hele centen afgerond", () => {
  assert.deepEqual(bedragMetBtw({ prijs_ex_btw: 9500, btw_promille: 210 }), { ex: 9500, btw: 1995, totaal: 11495 });
  assert.deepEqual(bedragMetBtw({ prijs_ex_btw: 2900, btw_promille: 210 }), { ex: 2900, btw: 609, totaal: 3509 });
  // Een bedrag dat niet rond uitkomt: 149 euro plus 21 procent is 180,29.
  assert.deepEqual(bedragMetBtw({ prijs_ex_btw: 14900, btw_promille: 210 }), { ex: 14900, btw: 3129, totaal: 18029 });
  assert.throws(() => bedragMetBtw({ prijs_ex_btw: 95.5 }), /heel aantal centen/);
});

test("Mollie krijgt altijd twee decimalen als tekst", () => {
  assert.equal(centenNaarBedrag(11495), "114.95");
  assert.equal(centenNaarBedrag(3509), "35.09");
  assert.equal(centenNaarBedrag(0), "0.00");
  assert.throws(() => centenNaarBedrag(95.5), /heel aantal centen/);
});

test("wat eenmalig is, wat een abonnement is, en wat allebei", () => {
  // Volgt uit het product zelf. verlengt_als is sinds 10-09-2026 alleen nog bij
  // PRO-START gevuld: die betaalt vandaag eenmalig en wordt over een jaar een
  // abonnement.
  assert.equal(soortBetaling({ code: "PAK-LOS", interval: "eenmalig" }), "eenmalig");
  assert.equal(soortBetaling({ code: "ORG-1", interval: "jaar" }), "abonnement");
  assert.equal(soortBetaling({ code: "PRO-M", interval: "maand" }), "abonnement");
  assert.equal(soortBetaling({ code: "LEZ-1", interval: "eenmalig" }), "eenmalig");
  assert.equal(soortBetaling({ code: "PRO-START", interval: "eenmalig", verlengt_als: "PRO-J" }), "eenmalig_met_abonnement");
  assert.equal(soortBetaling(null), null);
});

test("een pakket vraagt een team, en geen leesdrempel meer", () => {
  const pak = { code: "PAK-LOS", naam: "Pakket", prijs_ex_btw: 34500, groep: "PAK", prijsniveau: "los", interval: "eenmalig", actief: true, fase: "A" };
  const los = koper({ gebruiker: {} });
  assert.match(magKopen({ product: pak, wie: los, teamId: null }), /team/);
  // De leesdrempel is vervallen (tarievenbriefing v3, sectie 1): met een team
  // erbij mag het meteen, ook zonder een hoofdstuk gelezen te hebben.
  assert.equal(magKopen({ product: pak, wie: los, teamId: "x" }), null);
});

test("de client kan geen goedkoper tarief kiezen", () => {
  const goedkoop = { code: "PAK-ORG3", naam: "Pakket", prijs_ex_btw: 14500, groep: "PAK", prijsniveau: "org3", interval: "eenmalig", actief: true, fase: "A" };
  const los = koper({ gebruiker: {} });
  assert.match(magKopen({ product: goedkoop, wie: los, teamId: "x" }), /hoort niet bij je abonnement/);
});

test("een bèta en een bureau met tegoed rekenen niets af", () => {
  const pak = (niveau) => ({ code: "PAK", naam: "Pakket", prijs_ex_btw: 0, groep: "PAK", prijsniveau: niveau, interval: "eenmalig", actief: true, fase: "A" });
  const beta = koper({ gebruiker: { beta: true, beta_tot: "2099-01-01" } });
  assert.match(magKopen({ product: pak("beta"), wie: beta, teamId: "x" }), /reken je niets af/);

  const bur = koper({ gebruiker: {}, bureau: { abonnement_tot: "2099-01-01", pak_tegoed: 15, pak_verbruikt: 0 } });
  assert.match(magKopen({ product: pak("bur"), wie: bur, teamId: "x" }), /bundeltegoed/);
});

test("een extra hermeting kan niet zonder startbeeld en niet met tegoed", () => {
  const hm = { code: "HM-LOS", naam: "Hermeting", prijs_ex_btw: 14500, groep: "HM", prijsniveau: "los", interval: "eenmalig", actief: true, fase: "A" };
  const wie = koper({ gebruiker: {} });
  const basis = { product: hm, wie, teamId: "x" };
  assert.match(magKopen({ ...basis, heeftStartbeeld: false }), /eerst een Teamfoto/);
  // Zolang de hermeting uit het pakket er nog ligt, hoeft er niets bij.
  const metTegoed = { hermeting_tegoed: 1, hermeting_tot: "2099-01-01" };
  assert.match(magKopen({ ...basis, heeftStartbeeld: true, team: metTegoed }), /zit al in het pakket/);
  assert.equal(magKopen({ ...basis, heeftStartbeeld: true, team: { hermeting_tegoed: 0 } }), null);
});

test("wat later komt is nu niet te koop, en een tweede abonnement ook niet", () => {
  const opl = { code: "OPL-1", naam: "Opleider", prijs_ex_btw: 250000, groep: "OPL", interval: "eenmalig", actief: true, fase: "later" };
  assert.match(magKopen({ product: opl, wie: koper({ gebruiker: {} }) }), /nog niet beschikbaar/);

  const org = { code: "ORG-1", naam: "Organisatie klein", prijs_ex_btw: 49000, groep: "ORG", interval: "jaar", actief: true, fase: "A" };
  const lid = koper({ gebruiker: {}, organisatie: { staffel: "klein", abonnement_tot: "2099-01-01" } });
  assert.match(magKopen({ product: org, wie: lid }), /heeft al een abonnement/);
});

test("de omschrijving op het afschrift blijft kort en herkenbaar", () => {
  const p = { code: "TF", naam: "Teamfoto, een team" };
  assert.equal(omschrijving(p, "Team Noord"), "Happly Teamfoto, een team (Team Noord)");
  assert.ok(omschrijving(p, "x".repeat(200)).length <= 100);
});

/* ------------------------------------------------------ module en recht */

import { HOOFDSTUKKEN, LEESDREMPEL, isGratis } from "../module-inhoud.js";
import { rechtOpKaart } from "../betalen.js";

test("de module heeft zes hoofdstukken waarvan twee gratis", () => {
  assert.equal(HOOFDSTUKKEN.length, 6);
  assert.deepEqual(HOOFDSTUKKEN.map(h => h.nummer), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(LEESDREMPEL, [1, 2]);
  assert.ok(isGratis(1) && isGratis(2));
  assert.ok(!isGratis(3) && !isGratis(6));
  for (const h of HOOFDSTUKKEN){
    assert.ok(h.titel && h.lead && h.tekst.length, `hoofdstuk ${h.nummer} is niet compleet`);
  }
});

test("het pakket dekt de kaart, het tegoed de hermeting, anders niet", () => {
  const team = "11111111-1111-1111-1111-111111111111";
  const nu = new Date("2026-09-09");
  const los = koper({ gebruiker: {}, vandaag: nu });

  const pakket = { id: "b1", product_code: "PAK-LOS", status: "betaald", verbruikt_op: null, team_id: team, geldig_tot: "2027-09-09" };
  const start = rechtOpKaart({ wie: los, bestellingen: [pakket], teamId: team, vandaag: nu });
  assert.deepEqual(start, { mag: true, reden: "bestelling", bestelling_id: "b1", tegoed: false });

  // De hermeting komt uit het tegoed van het team, niet uit een tweede aankoop.
  const metTegoed = { hermeting_tegoed: 1, hermeting_tot: "2027-03-09" };
  const her = rechtOpKaart({ wie: los, team: metTegoed, bestellingen: [pakket], teamId: team, soort: "hermeting", vandaag: nu });
  assert.deepEqual(her, { mag: true, reden: "tegoed", bestelling_id: null, tegoed: true });

  // Een bèta betaalt nergens voor.
  const beta = koper({ gebruiker: { beta: true, beta_tot: "2027-03-09" }, vandaag: nu });
  assert.equal(rechtOpKaart({ wie: beta, teamId: team, vandaag: nu }).reden, "beta");

  // Al verbruikt, voor een ander team, of niet betaald: geen recht.
  for (const kapot of [
    { ...pakket, verbruikt_op: "2026-09-01" },
    { ...pakket, team_id: "22222222-2222-2222-2222-222222222222" },
    { ...pakket, status: "open" }
  ]){
    assert.equal(rechtOpKaart({ wie: los, bestellingen: [kapot], teamId: team, vandaag: nu }).mag, false);
  }

  // Een oude TF-bestelling van voor 09-09-2026 blijft werken.
  const oud = { ...pakket, id: "b0", product_code: "TF" };
  assert.equal(rechtOpKaart({ wie: los, bestellingen: [oud], teamId: team, vandaag: nu }).bestelling_id, "b0");
});

test("een tegoed dat is verlopen telt niet meer mee", () => {
  const team = "11111111-1111-1111-1111-111111111111";
  const nu = new Date("2026-09-09");
  const los = koper({ gebruiker: {}, vandaag: nu });
  assert.ok(tegoedGeldig({ hermeting_tegoed: 1, hermeting_tot: "2026-09-09" }, nu));
  assert.ok(!tegoedGeldig({ hermeting_tegoed: 1, hermeting_tot: "2026-09-08" }, nu));
  assert.ok(!tegoedGeldig({ hermeting_tegoed: 0, hermeting_tot: "2099-01-01" }, nu));

  const op = rechtOpKaart({
    wie: los, team: { hermeting_tegoed: 1, hermeting_tot: "2026-08-01" },
    teamId: team, soort: "hermeting", vandaag: nu });
  assert.equal(op.mag, false);
  assert.match(op.reden, /liep tot 1-8-2026/);
});

test("een verlopen aankoop krijgt een ander antwoord dan geen aankoop", () => {
  const team = "11111111-1111-1111-1111-111111111111";
  const nu = new Date("2026-09-09");
  const los = koper({ gebruiker: {}, vandaag: nu });
  const verlopen = { id: "b1", product_code: "PAK-LOS", status: "betaald", verbruikt_op: null, team_id: team, geldig_tot: "2026-01-01" };
  assert.match(rechtOpKaart({ wie: los, bestellingen: [verlopen], teamId: team, vandaag: nu }).reden, /verlopen/);
  assert.match(rechtOpKaart({ wie: los, bestellingen: [], teamId: team, vandaag: nu }).reden, /pakket nodig/);
});

test("een pakket zonder tegoed dekt geen tweede hermeting", () => {
  const team = "11111111-1111-1111-1111-111111111111";
  const los = koper({ gebruiker: {} });
  const pakket = { id: "b1", product_code: "PAK-LOS", status: "betaald", verbruikt_op: null, team_id: team, geldig_tot: null };
  const uit = rechtOpKaart({ wie: los, team: { hermeting_tegoed: 0 }, bestellingen: [pakket], teamId: team, soort: "hermeting" });
  assert.equal(uit.mag, false);
  assert.match(uit.reden, /extra hermeting/);
});

/* ------------------------------------------------- tarieven v3 (09-09-2026) */

import { prijsVoor } from "../betalen.js";

/* Alle prijzen uit de twee migraties samen, zodat de controles op de bedragen
   draaien die straks in Supabase staan en niet op getallen die ik hier
   overtyp. De nieuwe migratie wint van de oude, want die past prijzen aan. */
function leesPrijzen(){
  const oud = readFileSync(new URL("../migratie-certificering-2026-09-09.sql", import.meta.url), "utf8");
  const nieuw = readFileSync(new URL("../migratie-tarieven-2026-09-09.sql", import.meta.url), "utf8");
  const uit = {};

  const start = oud.indexOf("insert into public.producten");
  const eind = oud.indexOf("on conflict (code) do nothing;", start);
  for (const m of oud.slice(start, eind).matchAll(/^\('([A-Z0-9-]+)',\s*'([^']+)',\s*(\d+),/gm)){
    uit[m[1]] = Number(m[3]);
  }
  // De insert-blokken van de nieuwe migratie: code, naam, bedrag.
  for (const m of nieuw.matchAll(/^\('([A-Z0-9-]+)',\s*'([^']+)',\s*(\d+),/gm)){
    uit[m[1]] = Number(m[3]);
  }
  // En het update-blok met de vier nieuwe prijzen: code, bedrag, naam.
  for (const m of nieuw.matchAll(/^\s{2}\('([A-Z0-9-]+)',\s*(\d+),\s*'/gm)){
    uit[m[1]] = Number(m[2]);
  }
  return uit;
}

/* De codes die volgens de omschakeling op actief = false gaan. Die staat in een
   eigen bestand, want hij hoort pas te draaien als de nieuwe code live is. */
function leesVervallen(){
  const blok = readFileSync(new URL("../migratie-tarieven-2026-09-09-blok-z.sql", import.meta.url), "utf8");
  return new Set([...blok.matchAll(/where code in \(([^)]+)\)/g)]
    .flatMap(m => [...m[1].matchAll(/'([A-Z0-9-]+)'/g)].map(x => x[1])));
}

test("het pakket en de hermeting staan er voor elke lijn in", () => {
  const p = leesPrijzen();
  assert.equal(p["PAK-LOS"], 34500);
  assert.equal(p["PAK-ORG1"], 19500);
  assert.equal(p["PAK-ORG2"], 17500);
  assert.equal(p["PAK-ORG3"], 14500);
  assert.equal(p["PAK-PRO"], 14500);
  assert.equal(p["PAK-BUR"], 0);
  assert.equal(p["PAK-BUR-EXTRA"], 12500);
  assert.equal(p["HM-LOS"], 14500);
  assert.equal(p["HM-ORG1"], 9500);
  assert.equal(p["HM-ORG2"], 9500);
  assert.equal(p["HM-ORG3"], 7500);
  assert.equal(p["HM-PRO"], 9500);
  assert.equal(p["HM-BUR"], 7500);
});

test("elke lijn hoger is goedkoper per pakket", () => {
  const p = leesPrijzen();
  const trap = [p["PAK-LOS"], p["PAK-ORG1"], p["PAK-ORG2"], p["PAK-ORG3"]];
  for (let i = 1; i < trap.length; i++){
    assert.ok(trap[i] < trap[i - 1], `stap ${i} van de staffel daalt niet`);
  }
  assert.ok(p["PAK-PRO"] <= p["PAK-ORG3"], "een Professional betaalt meer dan Organisatie groot");
  assert.ok(p["PAK-BUR-EXTRA"] < p["PAK-PRO"], "buiten het bureautegoed is niet goedkoper dan Professional");
});

/* --- sectie 3, Organisatie --- */

/* Wat n teams kosten op een lijn: het abonnement plus n maal het pakket. */
const kostenOrg = (p, staffel, n) =>
  ({ los: 0, org1: p["ORG-1"], org2: p["ORG-2"], org3: p["ORG-3"] }[staffel])
  + n * p[{ los: "PAK-LOS", org1: "PAK-ORG1", org2: "PAK-ORG2", org3: "PAK-ORG3" }[staffel]];

test("sectie 3: de pakketprijs daalt per staffel", () => {
  const p = leesPrijzen();
  assert.ok(p["PAK-ORG1"] > p["PAK-ORG2"] && p["PAK-ORG2"] > p["PAK-ORG3"], "195 > 175 > 145 klopt niet");
});

test("sectie 3: bij vier teams is ORG-1 goedkoper dan vier keer Los", () => {
  const p = leesPrijzen();
  assert.equal(kostenOrg(p, "org1", 4), 127000);
  assert.equal(kostenOrg(p, "los", 4), 138000);
  assert.ok(kostenOrg(p, "org1", 4) < kostenOrg(p, "los", 4));
});

test("sectie 3: het omslagpunt tegenover Los ligt bij 4, 6 en 10 teams", () => {
  const p = leesPrijzen();
  const omslag = (staffel) => {
    for (let n = 1; n <= 200; n++) if (kostenOrg(p, staffel, n) < kostenOrg(p, "los", n)) return n;
    return null;
  };
  assert.equal(omslag("org1"), 4);
  assert.equal(omslag("org2"), 6);
  assert.equal(omslag("org3"), 10);
});

test("bekend punt: de staffels lopen op seats, niet op prijs", () => {
  const p = leesPrijzen();
  // ORG-1 blijft de goedkoopste rekening tot ver voorbij zijn drie seats. Wie
  // op prijs kiest gaat dus nooit naar midden of groot; die stappen worden
  // gekocht om de seats en het dashboard. Zie het rapport bij vraag 1.
  const eerstGoedkoper = (a, b) => {
    for (let n = 1; n <= 500; n++) if (kostenOrg(p, a, n) < kostenOrg(p, b, n)) return n;
    return null;
  };
  assert.equal(eerstGoedkoper("org2", "org1"), 26);
  assert.equal(eerstGoedkoper("org3", "org2"), 34);
  assert.ok(kostenOrg(p, "org1", 10) < kostenOrg(p, "org3", 10), "bij tien teams is groot nog altijd duurder");
});

/* --- sectie 4, Professional --- */

test("sectie 4: het startpakket is goedkoper dan de onderdelen los", () => {
  const p = leesPrijzen();
  const los = p["BEG-1"] + p["PRO-J"] + 5 * p["PAK-PRO"];
  assert.equal(los, 221000);
  assert.ok(p["PRO-START"] < los, "PRO-START is niet goedkoper dan los kopen");
});

test("sectie 4: een jaar is goedkoper dan twaalf maanden", () => {
  const p = leesPrijzen();
  assert.equal(12 * p["PRO-M"], 70800);
  assert.ok(p["PRO-J"] < 12 * p["PRO-M"]);
});

/* --- sectie 5, Bureau --- */

const perPakket = (p, code, tegoed) => p[code] / tegoed;

test("sectie 5: de prijs per pakket daalt per staffel", () => {
  const p = leesPrijzen();
  const klein  = perPakket(p, "BUR-1", 15);
  const midden = perPakket(p, "BUR-2", 40);
  const groot  = perPakket(p, "BUR-3", 100);
  assert.equal(klein, 16600);
  assert.equal(midden, 12250);   // de briefing rondt dit af op 122 euro
  assert.equal(groot, 9900);
  assert.ok(klein > midden && midden > groot);
});

test("sectie 5: een eenling vlucht niet naar Bureau", () => {
  const p = leesPrijzen();
  assert.equal(perPakket(p, "BUR-1", 15), 16600);
  assert.ok(perPakket(p, "BUR-1", 15) > p["PAK-PRO"], "Bureau klein is per pakket niet duurder dan Professional");
});

test("sectie 5: bijkopen boven een kleine bundel loont niet meer dan de volgende staffel", () => {
  const p = leesPrijzen();
  // Veertig pakketten via klein plus bijkopen kost meer dan de bundel midden.
  // Bij 95 euro buiten tegoed was dat andersom en verdiende BUR-2 zichzelf niet
  // terug; met 125 klopt de trap.
  const viaKlein = p["BUR-1"] + 25 * p["PAK-BUR-EXTRA"];
  assert.equal(viaKlein, 561500);
  assert.ok(viaKlein > p["BUR-2"], "Bureau midden is nog altijd niet de goedkopere weg");
});

test("sectie 5: de zestig pakketten van groot boven midden kosten 83 euro per stuk", () => {
  const p = leesPrijzen();
  const perExtra = (p["BUR-3"] - p["BUR-2"]) / 60;
  assert.equal(Math.round(perExtra), 8333);
  assert.ok(perExtra < p["PAK-BUR-EXTRA"], "doorgroeien naar groot is duurder dan bijkopen");
});

test("sectie 5: buiten het tegoed blijft een bureau goedkoper uit dan een Professional", () => {
  const p = leesPrijzen();
  assert.equal(p["PAK-BUR-EXTRA"], 12500);
  assert.ok(p["PAK-BUR-EXTRA"] < p["PAK-PRO"], "buiten tegoed is niet goedkoper dan Professional");
});

/* --- sectie 6, certificering --- */

test("sectie 6: een abonnement is goedkoper dan hetzelfde abonnement met LEZ-1 erbij", () => {
  const p = leesPrijzen();
  // De beheerder van een organisatie krijgt de module en de toets bij het
  // abonnement, dus LEZ-1 er los bij kopen is weggegooid geld.
  assert.equal(p["LEZ-1"] + p["ORG-1"], 63900);
  assert.ok(p["ORG-1"] < p["LEZ-1"] + p["ORG-1"], "ORG-1 is niet goedkoper");
  assert.ok(p["OPL-2"] < p["OPL-1"] + 10 * p["CERT-AFD"], "OPL-2 is niet goedkoper");
  assert.equal(p["OPL-1"] + 10 * p["CERT-AFD"], 395000);
});

test("sectie 6: tien plekken zijn per plek goedkoper dan een abonnement", () => {
  const p = leesPrijzen();
  assert.equal(p["LEZ-10"] / 10, 19900);
  assert.ok(p["LEZ-10"] / 10 < p["ORG-1"], "tien plekken zijn per plek niet goedkoper dan ORG-1");
});


test("de bèta krijgt zijn korting van 355 euro", () => {
  const p = leesPrijzen();
  assert.equal(p["PRO-START"] - 89500, 35500);
});

/* --- wat vervalt --- */

test("de oude productcodes gaan uit en niet weg", () => {
  const weg = leesVervallen();
  for (const code of ["TF", "HM", "BEG-2", "BEG-8", "LIC-ORG-10", "LIC-ORG-30", "LIC-ORG-X", "LIC-M", "LIC-J"]){
    assert.ok(weg.has(code), `${code} wordt niet uitgezet`);
  }
  // Eén uitzondering op de regel dat een rij blijft staan: LEZ-2 is vervallen,
  // is nooit verkocht, en staat ook niet meer in de bronmigratie. De delete
  // hoort alleen te vuren als er geen bestelling aan hangt.
  const sql = readFileSync(new URL("../migratie-tarieven-2026-09-09.sql", import.meta.url), "utf8");
  const deletes = [...sql.matchAll(/delete from public\.producten[\s\S]*?;/g)].map(m => m[0]);
  assert.equal(deletes.length, 1, "er wordt meer dan een productrij verwijderd");
  assert.match(deletes[0], /'LEZ-2'/);
  assert.match(deletes[0], /not exists \(select 1 from public\.bestellingen/);
});

/* --- de prijsbepaling --- */

const PRODUCTEN_PAK_HM = [
  { code: "PAK-LOS",       groep: "PAK", prijsniveau: "los",       prijs_ex_btw: 34500, actief: true },
  { code: "PAK-ORG1",      groep: "PAK", prijsniveau: "org1",      prijs_ex_btw: 19500, actief: true },
  { code: "PAK-ORG2",      groep: "PAK", prijsniveau: "org2",      prijs_ex_btw: 17500, actief: true },
  { code: "PAK-ORG3",      groep: "PAK", prijsniveau: "org3",      prijs_ex_btw: 14500, actief: true },
  { code: "PAK-PRO",       groep: "PAK", prijsniveau: "pro",       prijs_ex_btw: 14500, actief: true },
  { code: "PAK-BUR",       groep: "PAK", prijsniveau: "bur",       prijs_ex_btw: 0,     actief: true },
  { code: "PAK-BUR-EXTRA", groep: "PAK", prijsniveau: "bur_extra", prijs_ex_btw: 12500, actief: true },
  { code: "HM-LOS",        groep: "HM",  prijsniveau: "los",       prijs_ex_btw: 14500, actief: true },
  { code: "HM-ORG1",       groep: "HM",  prijsniveau: "org1",      prijs_ex_btw: 9500,  actief: true },
  { code: "HM-ORG2",       groep: "HM",  prijsniveau: "org2",      prijs_ex_btw: 9500,  actief: true },
  { code: "HM-ORG3",       groep: "HM",  prijsniveau: "org3",      prijs_ex_btw: 7500,  actief: true },
  { code: "HM-PRO",        groep: "HM",  prijsniveau: "pro",       prijs_ex_btw: 9500,  actief: true },
  { code: "HM-BUR",        groep: "HM",  prijsniveau: "bur",       prijs_ex_btw: 7500,  actief: true }
];

test("de bèta gaat voor de lijn, en de lijn voor los", () => {
  const nu = new Date("2026-09-09");
  const bureau = { actief: true, abonnement_tot: "2027-01-01", pak_tegoed: 15, pak_verbruikt: 0 };
  const org = { actief: true, abonnement_tot: "2027-01-01", staffel: "midden" };
  const niveau = (a) => koper({ ...a, vandaag: nu }).prijsniveau;

  // Bèta wint van alles, ook van een lopende bureaubundel.
  assert.equal(niveau({ gebruiker: { beta: true, beta_tot: "2027-03-09" }, bureau }), "beta");
  assert.equal(niveau({ gebruiker: { beta: true, beta_tot: "2026-08-01" } }), "los");
  // Bureau gaat voor Professional, en het tegoed bepaalt welke rij.
  assert.equal(niveau({ gebruiker: {}, bureau }), "bur");
  assert.equal(niveau({ gebruiker: {}, bureau: { ...bureau, pak_verbruikt: 15 } }), "bur_extra");
  // Professional gaat voor Organisatie.
  const pro = { niveau: "begeleider", licentie_actief: true, licentie_tot: "2027-01-01" };
  assert.equal(niveau({ gebruiker: pro, organisatie: org }), "pro");
  // Een verlopen abonnement valt terug op los.
  assert.equal(niveau({ gebruiker: {}, organisatie: { ...org, abonnement_tot: "2026-01-01" } }), "los");
  assert.equal(niveau({ gebruiker: {}, organisatie: org }), "org2");
  assert.equal(niveau({ gebruiker: {} }), "los");
});

test("het niveau wijst een prijs aan, en de bèta betaalt nul", () => {
  assert.equal(prijsVoor(PRODUCTEN_PAK_HM, "PAK", "org3").prijs_ex_btw, 14500);
  assert.equal(prijsVoor(PRODUCTEN_PAK_HM, "PAK", "los").code, "PAK-LOS");
  const beta = prijsVoor(PRODUCTEN_PAK_HM, "PAK", "beta");
  assert.equal(beta.prijs_ex_btw, 0);
  assert.equal(beta.code, "PAK-LOS");     // wel te zien welk pakket er is geleverd
  assert.equal(beta.reden, "beta");
  assert.equal(prijsVoor(PRODUCTEN_PAK_HM, "HM", "los").prijs_ex_btw, 14500);
  assert.equal(prijsVoor(PRODUCTEN_PAK_HM, "PAK", "onzin"), null);
});

/* ------------------------------------ teams staan nooit naast elkaar op score */

/* De regel uit de briefing is een ontwerpregel en die is niet af te dwingen met
   een assert op een getal. Wat wel kan: de lijstroute mag geen scorekolom
   ophalen. Wie er ooit een bij zet om een kolom in het dashboard te vullen,
   loopt hier tegenaan en moet er iets over besluiten. */
test("de teamlijst haalt geen scores op", () => {
  const bron = readFileSync(new URL("../api/teamkracht-team.js", import.meta.url), "utf8");
  const selects = [...bron.matchAll(/\.select\("([^"]*)"\)/g)].map(m => m[1]);
  const lijst = selects.find(s => s.includes("team_id") && s.includes("soort"));
  assert.ok(lijst, "de query op teamkracht_teambeeld is niet meer te vinden");
  for (const kolom of ["zien", "sturen", "doen", "score", "gemiddelde", "lijnen", "verdeling"]){
    assert.ok(!new RegExp(`\\b${kolom}\\b`).test(lijst), `de teamlijst haalt ${kolom} op`);
  }
});

/* ----------------------------------------------- de vier koperslijnen (v3) */

const NU = new Date("2026-09-09");
const wie = (a) => koper({ ...a, vandaag: NU });

test("Los is de stand van wie niets heeft", () => {
  const k = wie({ gebruiker: {} });
  assert.equal(k.lijn, "los");
  assert.equal(k.prijsniveau, "los");
  assert.equal(k.register, null);
  assert.equal(k.leadknop, false);
  assert.equal(k.organisatiedashboard, false);
});

test("Organisatie: staffel bepaalt de prijs, seats staan erbij", () => {
  const k = wie({ gebruiker: {}, organisatie: { staffel: "groot", seats_max: null, abonnement_tot: "2027-01-01" } });
  assert.equal(k.lijn, "organisatie");
  assert.equal(k.prijsniveau, "org3");
  assert.equal(k.organisatiedashboard, true);
  assert.equal(k.seats_max, null);          // onbeperkt
  // Een organisatie komt niet in het register en heeft geen leadknop.
  assert.equal(k.register, null);
  assert.equal(k.leadknop, false);
});

test("Professional zonder certificaat Begeleider is geen Professional", () => {
  // Betaald of niet: zonder certificaat geldt de licentie niet. Dat is de
  // voorwaarde uit sectie 4 en hij hoort hier te staan, niet in de UI.
  const zonder = wie({ gebruiker: { licentie_actief: true, licentie_tot: "2027-01-01", niveau: "lezer" } });
  assert.equal(zonder.lijn, "los");
  assert.equal(zonder.prijsniveau, "los");
  assert.equal(zonder.leadknop, false);

  const met = wie({ gebruiker: { licentie_actief: true, licentie_tot: "2027-01-01", niveau: "begeleider" } });
  assert.equal(met.lijn, "professional");
  assert.equal(met.register, "actief");
  assert.equal(met.leadknop, true);
  assert.equal(met.naam_op_kaart, true);
});

test("een verlopen Professional valt terug op los en houdt zijn certificaat", () => {
  // Sectie 4: registerstatus niet actief, leadknop uit, lijn los. Het
  // certificaat blijft, dus reactivatie kan zonder nieuwe toets.
  const k = wie({ gebruiker: { licentie_actief: true, licentie_tot: "2026-08-01", niveau: "begeleider" } });
  assert.equal(k.lijn, "los");
  assert.equal(k.register, "niet actief");
  assert.equal(k.leadknop, false);
  assert.equal(k.begeleider, true);
});

test("Bureau: het tegoed bepaalt of het pakket uit de bundel komt", () => {
  const bundel = { staffel: "klein", seats_max: 3, pak_tegoed: 15, abonnement_tot: "2027-01-01" };
  const over = wie({ gebruiker: { niveau: "begeleider" }, bureau: { ...bundel, pak_verbruikt: 3 } });
  assert.equal(over.lijn, "bureau");
  assert.equal(over.prijsniveau, "bur");
  assert.equal(over.tegoed_over, 12);
  assert.match(over.reden, /12 pakketten over/);

  const op = wie({ gebruiker: { niveau: "begeleider" }, bureau: { ...bundel, pak_verbruikt: 15 } });
  assert.equal(op.prijsniveau, "bur_extra");
  assert.equal(op.tegoed_over, 0);
});

test("een bureauseat zonder certificaat koopt uit het tegoed maar staat niet in het register", () => {
  // Sectie 5, letterlijk: zonder certificaat telt de seat als
  // Organisatie-gebruiker, dus wel het tarief en niet de vermelding.
  const bundel = { staffel: "klein", pak_tegoed: 15, pak_verbruikt: 0, abonnement_tot: "2027-01-01" };
  const k = wie({ gebruiker: { niveau: "geen" }, bureau: bundel });
  assert.equal(k.prijsniveau, "bur");
  assert.equal(k.register, null);
  assert.equal(k.leadknop, false);
  assert.equal(k.naam_op_kaart, false);
  assert.equal(k.bureaudashboard, true);
});

test("een verlopen bundel of abonnement telt niet meer mee", () => {
  const k = wie({ gebruiker: {}, bureau: { staffel: "klein", pak_tegoed: 15, pak_verbruikt: 0, abonnement_tot: "2026-08-01" } });
  assert.equal(k.lijn, "los");
  const uit = wie({ gebruiker: {}, organisatie: { staffel: "klein", abonnement_tot: "2027-01-01", actief: false } });
  assert.equal(uit.lijn, "los");
});

test("de bèta is een Professional zonder abonnement", () => {
  // Sectie 7: pakket en hermeting nul, lijn professional, certificaat
  // voorlopig, registerstatus beta.
  const k = wie({ gebruiker: { beta: true, beta_tot: "2027-03-09", niveau: "geen" } });
  assert.equal(k.lijn, "professional");
  assert.equal(k.prijsniveau, "beta");
  assert.equal(k.register, "beta");
  assert.equal(k.leadknop, true);
  assert.equal(k.begeleider, true);
});

test("elke lijn koopt wat bij die lijn hoort", () => {
  assert.ok(magGroepKopen("los", "ORG"), "Los moet naar Organisatie kunnen");
  assert.ok(!magGroepKopen("organisatie", "ORG"), "een organisatie koopt geen tweede abonnement");
  assert.ok(!magGroepKopen("professional", "PRO"), "een Professional koopt geen tweede licentie");
  assert.ok(!magGroepKopen("bureau", "BUR"), "een bureau koopt geen tweede bundel");
  for (const lijn of ["los", "organisatie", "professional", "bureau"]){
    assert.ok(magGroepKopen(lijn, "PAK"), `${lijn} moet een pakket kunnen kopen`);
    assert.ok(magGroepKopen(lijn, "HM"), `${lijn} moet een hermeting kunnen kopen`);
  }
});

test("seats zijn op of onbeperkt", () => {
  assert.equal(seatsOver({ seats_max: 3, bezet: 1 }), 2);
  assert.equal(seatsOver({ seats_max: 3, bezet: 5 }), 0);
  assert.equal(seatsOver({ seats_max: null, bezet: 99 }), null);

  assert.equal(magSeatToevoegen({ soort: "organisatie", over: 0 }).mag, false);
  assert.equal(magSeatToevoegen({ soort: "organisatie", over: null }).mag, true);
  // Bij een bureau is het geen weigering maar een mededeling.
  const zonder = magSeatToevoegen({ soort: "bureau", over: 2, gebruiker: { niveau: "geen" } });
  assert.equal(zonder.mag, true);
  assert.match(zonder.melding, /register/);
  assert.equal(magSeatToevoegen({ soort: "bureau", over: 2, gebruiker: { niveau: "begeleider" } }).melding, null);
});

test("een oude productcode wijst nog steeds naar zijn groep", () => {
  assert.equal(groepVanCode("TF"), "PAK");
  assert.equal(groepVanCode("PAK-ORG2"), "PAK");
  assert.equal(groepVanCode("HM"), "HM");
  assert.equal(groepVanCode("HM-BUR"), "HM");
  assert.equal(groepVanCode("ORG-1"), "ORG");
  assert.equal(groepVanCode("PRO-START"), "PRO");
  assert.equal(groepVanCode("LEZ-1"), "LEZ");
  assert.equal(groepVanCode("onzin"), null);
});

test("de prijskaart zegt wat het kost, waarom, en wat het zonder abonnement was", () => {
  const k = wie({ gebruiker: {}, organisatie: { staffel: "midden", abonnement_tot: "2027-01-01" } });
  const uit = prijskaart({ producten: PRODUCTEN_PAK_HM, wie: k });
  assert.equal(uit.PAK.code, "PAK-ORG2");
  assert.equal(uit.PAK.ex, 17500);
  assert.equal(uit.PAK.btw, 3675);
  assert.equal(uit.PAK.reden, "Organisatie midden");
  assert.equal(uit.HM.ex, 9500);
  // Wat het zonder abonnement zou kosten staat er altijd bij (sectie 1).
  assert.equal(uit.zonder_abonnement.ex, 34500);

  // Ligt er nog een hermeting in het pakket, dan is dat het antwoord en niet
  // een bedrag.
  const met = prijskaart({
    producten: PRODUCTEN_PAK_HM, wie: k,
    team: { hermeting_tegoed: 1, hermeting_tot: "2027-03-09" }, vandaag: NU });
  assert.equal(met.HM.inbegrepen, true);
  assert.match(met.HM.reden, /Zit in het pakket/);
});

test("een bèta ziet nul, met het pakket er nog onder", () => {
  const k = wie({ gebruiker: { beta: true, beta_tot: "2027-03-09" } });
  const uit = prijskaart({ producten: PRODUCTEN_PAK_HM, wie: k });
  assert.equal(uit.PAK.ex, 0);
  assert.equal(uit.PAK.code, "PAK-LOS");   // wel te zien wat er is geleverd
  assert.equal(uit.HM.ex, 0);
});

test("een bureau met een leeg tegoed betaalt nog steeds het bureautarief voor een hermeting", () => {
  // Het tegoed gaat alleen over pakketten. Zonder deze terugval zou een bureau
  // dat zijn bundel op heeft helemaal geen hermetingprijs krijgen.
  const k = wie({ gebruiker: { niveau: "begeleider" },
    bureau: { staffel: "klein", pak_tegoed: 15, pak_verbruikt: 15, abonnement_tot: "2027-01-01" } });
  assert.equal(k.prijsniveau, "bur_extra");
  const uit = prijskaart({ producten: PRODUCTEN_PAK_HM, wie: k });
  assert.equal(uit.PAK.ex, 12500);         // boven het tegoed
  assert.equal(uit.HM.ex, 7500);           // bureautarief, tegoed of niet
});

/* ------------------------------------------------------------ abonnementen */

import { vervolgAbonnement } from "../betalen.js";

const ORG1 = { code: "ORG-1", naam: "Organisatie klein", prijs_ex_btw: 49000, interval: "jaar", groep: "ORG" };
const PROJ = { code: "PRO-J", naam: "Professional, jaar", prijs_ex_btw: 59000, interval: "jaar", groep: "PRO" };
const PROM = { code: "PRO-M", naam: "Professional, maand", prijs_ex_btw: 5900, interval: "maand", groep: "PRO" };

test("een jaarabonnement begint precies een jaar na de eerste betaling", () => {
  const uit = vervolgAbonnement({ product: ORG1, vanaf: new Date("2026-09-10") });
  assert.equal(uit.code, "ORG-1");
  assert.equal(uit.interval, "12 months");
  assert.equal(uit.startDate, "2027-09-10");
  assert.equal(uit.centen, 59290);          // 490 euro plus 21 procent btw
});

test("een maandabonnement begint een maand later", () => {
  const uit = vervolgAbonnement({ product: PROM, vanaf: new Date("2026-09-10") });
  assert.equal(uit.interval, "1 month");
  assert.equal(uit.startDate, "2026-10-10");
});

test("PRO-START loopt door op het abonnement uit verlengt_als", () => {
  // Vraag 3 van de briefing: het eerste jaar is inbegrepen in de instapprijs,
  // daarna loopt het abonnement zelf. De klant betaalt vandaag 1.250 en over
  // een jaar 590, niet nog eens 1.250.
  const start = { code: "PRO-START", naam: "Professional, startpakket", prijs_ex_btw: 125000, interval: "eenmalig", verlengt_als: "PRO-J" };
  const uit = vervolgAbonnement({ product: start, verlengProduct: PROJ, vanaf: new Date("2026-09-10") });
  assert.equal(uit.code, "PRO-J");
  assert.equal(uit.centen, 71390);          // 590 euro plus 21 procent btw
  assert.equal(uit.startDate, "2027-09-10");
});

test("een los product laat niets doorlopen", () => {
  const pak = { code: "PAK-LOS", naam: "Pakket", prijs_ex_btw: 34500, interval: "eenmalig" };
  assert.equal(vervolgAbonnement({ product: pak }), null);
  const lez1 = { code: "LEZ-1", naam: "Lezer, instap", prijs_ex_btw: 14900, interval: "eenmalig" };
  assert.equal(vervolgAbonnement({ product: lez1 }), null);
  // En een bundel zonder het bijbehorende abonnement erbij ook niet, in plaats
  // van stilletjes het verkeerde bedrag laten lopen.
  const start = { code: "PRO-START", naam: "Startpakket", prijs_ex_btw: 125000, interval: "eenmalig", verlengt_als: "PRO-J" };
  assert.equal(vervolgAbonnement({ product: start, verlengProduct: null }), null);
});

test("het organisatiedashboard haalt geen scores op en sorteert er niet op", () => {
  // Dezelfde bewaking als op de teamlijst. De regel is een ontwerpregel en niet
  // met een assert op een getal af te dwingen; wat wel kan is voorkomen dat er
  // ooit stilletjes een scorekolom bij komt om een kolom in het scherm te
  // vullen. Zie rapport-tarieven-v3.md, vraag 5.
  const bron = readFileSync(new URL("../api/organisatie.js", import.meta.url), "utf8");
  const selects = [...bron.matchAll(/\.select\("([^"]*)"\)/g)].map(m => m[1]);
  const beelden = selects.find(s => s.includes("team_id") && s.includes("soort"));
  assert.ok(beelden, "de query op teamkracht_teambeeld is niet meer te vinden");
  for (const kolom of ["zien", "sturen", "doen", "score", "breuk", "gemiddelde", "lijnen", "verdeling"]){
    assert.ok(!new RegExp(`\\b${kolom}\\b`).test(beelden), `het dashboard haalt ${kolom} op`);
  }
  // En er wordt nergens gesorteerd op iets wat van een score is afgeleid.
  for (const [, veld] of bron.matchAll(/\.order\("([^"]*)"/g)){
    assert.ok(/created_at|toegevoegd_op/.test(veld), `er wordt gesorteerd op ${veld}`);
  }
});

test("de teamkaart in het scherm leest alleen velden die geen score zijn", () => {
  // Op het woord "score" testen zou de uitleg op de pagina raken en niet de
  // data. Dit kijkt naar wat de teamkaart daadwerkelijk uit een team en een
  // beeld leest, en houdt die set klein.
  const bron = readFileSync(new URL("../organisatie.html", import.meta.url), "utf8");
  const start = bron.indexOf("function teamKaart(");
  const eind = bron.indexOf("\nasync function voegToe(", start);
  assert.ok(start > 0 && eind > start, "teamKaart is niet meer te vinden");
  const blok = bron.slice(start, eind);

  const MAG = new Set([
    "naam", "coach", "aantal_metingen", "beelden", "soort", "n", "created_at",
    "hermeting_tegoed", "hermeting_tot", "find", "map", "join"
  ]);
  for (const [, veld] of blok.matchAll(/\b[tb]\.([a-z_][a-z0-9_]*)/gi)){
    assert.ok(MAG.has(veld), `de teamkaart leest ${veld}, en dat staat niet op de lijst`);
  }
});

/* --------------------------------------------------- volgorde in de migraties */

/* Een migratie draait van boven naar beneden in één transactie. Wordt er ergens
   een tabel bevraagd die verderop pas wordt aangemaakt, dan valt het hele blok
   om op een foutmelding die niets zegt over de oorzaak.

   Dat gebeurde op 10 september 2026: een blok dat in organisatie_leden keek
   stond twee blokken boven de plek waar die tabel ontstaat. Deze test kijkt per
   bestand of alles bestaat op het moment dat het wordt gebruikt. */
for (const bestand of [
  "migratie-certificering-2026-09-09.sql",
  "migratie-tarieven-2026-09-09.sql",
  "migratie-tarieven-2026-09-09-blok-z.sql"
]){
  test(`${bestand} gebruikt niets voordat het bestaat`, () => {
    const regels = readFileSync(new URL(`../${bestand}`, import.meta.url), "utf8").split("\n");

    // Waar iets in dít bestand wordt aangemaakt. Wat er niet in staat komt uit
    // een eerdere migratie en is hier dus geen zorg.
    const gemaakt = new Map();
    regels.forEach((r, i) => {
      const m = r.match(/create table if not exists public\.(\w+)/)
             || r.match(/create or replace (?:view|function) public\.(\w+)/);
      if (m && !gemaakt.has(m[1])) gemaakt.set(m[1], i + 1);
    });

    const gebruik = /(?:from|join|references|update|on|insert into) public\.(\w+)\b/g;
    regels.forEach((r, i) => {
      if (r.trim().startsWith("--")) return;
      for (const [, naam] of r.matchAll(gebruik)){
        const maak = gemaakt.get(naam);
        if (maak && i + 1 < maak){
          assert.fail(`regel ${i + 1} gebruikt ${naam}, maar die wordt pas op regel ${maak} aangemaakt`);
        }
      }
    });
  });
}
