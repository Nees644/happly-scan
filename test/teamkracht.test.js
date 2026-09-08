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

import { bedragMetBtw, soortBetaling, magKopen, omschrijving, EENMALIG } from "../betalen.js";
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
  assert.equal(p["LEZ-2"], 39500);
  assert.equal(p["LIC-M"], 2900);
  assert.equal(p["LIC-J"], 29000);
  assert.equal(Object.keys(p).length, 18);
});

test("de klantlogica uit de briefing klopt op de echte prijzen", () => {
  const p = Object.fromEntries(leesProducten().map(x => [x.code, x.prijs_ex_btw]));
  // De middenoptie moet goedkoper zijn dan instap plus een losse jaarlicentie.
  assert.ok(p["LEZ-2"] < p["LEZ-1"] + p["LIC-J"], "Lezer midden is niet goedkoper");
  assert.ok(p["BEG-2"] < p["BEG-1"] + p["LIC-J"], "Begeleider midden is niet goedkoper");
  assert.ok(p["OPL-2"] < p["OPL-1"] + 10 * p["CERT-AFD"], "Opleider midden is niet goedkoper");
  // Bulk moet per plek goedkoper zijn dan de middenoptie.
  assert.ok(p["LEZ-10"] / 10 < p["LEZ-2"], "Lezer bulk is niet goedkoper per plek");
  assert.ok(p["BEG-8"] / 8 < p["BEG-2"], "Begeleider bulk is niet goedkoper per plek");
  // En een bundel licenties goedkoper dan losse jaarlicenties.
  assert.ok(p["LIC-ORG-10"] / 10 < p["LIC-J"], "Bundel van tien is niet goedkoper");
  assert.ok(p["LIC-ORG-30"] / 30 < p["LIC-ORG-10"] / 10, "Bundel van dertig is niet goedkoper per plek");
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

test("alleen de eenmalige producten kunnen nu worden afgerekend", () => {
  assert.deepEqual(EENMALIG, ["TF", "HM", "LEZ-1"]);
  assert.equal(soortBetaling("TF"), "eenmalig");
  assert.equal(soortBetaling("LIC-M"), "abonnement");
  assert.equal(soortBetaling("LEZ-2"), "eenmalig_met_abonnement");
  assert.equal(soortBetaling("BEG-1"), null);
});

test("een Teamfoto kan niet worden gekocht zonder leesdrempel of team", () => {
  const tf = { code: "TF", naam: "Teamfoto", prijs_ex_btw: 9500, actief: true, fase: "A" };
  const basis = { product: tf, gebruiker: { licentie_actief: false }, heeftStartbeeld: false };
  assert.match(magKopen({ ...basis, teamId: null, heeftLeesdrempel: true }), /team/);
  assert.match(magKopen({ ...basis, teamId: "x", heeftLeesdrempel: false }), /hoofdstuk 1 en 2/);
  assert.equal(magKopen({ ...basis, teamId: "x", heeftLeesdrempel: true }), null);
});

test("met een licentie hoeft er niets te worden afgerekend", () => {
  const tf = { code: "TF", naam: "Teamfoto", prijs_ex_btw: 9500, actief: true, fase: "A" };
  assert.match(
    magKopen({ product: tf, gebruiker: { licentie_actief: true }, teamId: "x", heeftLeesdrempel: true }),
    /inbegrepen/);
});

test("een hermeting kan niet zonder startbeeld", () => {
  const hm = { code: "HM", naam: "Hermeting", prijs_ex_btw: 9500, actief: true, fase: "A" };
  const basis = { product: hm, gebruiker: {}, teamId: "x", heeftLeesdrempel: true };
  assert.match(magKopen({ ...basis, heeftStartbeeld: false }), /eerst een Teamfoto/);
  assert.equal(magKopen({ ...basis, heeftStartbeeld: true }), null);
});

test("wat later komt is nu niet te koop", () => {
  const beg = { code: "BEG-1", naam: "Begeleider", prijs_ex_btw: 69500, actief: true, fase: "later" };
  assert.match(magKopen({ product: beg, gebruiker: {} }), /nog niet beschikbaar/);
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

test("een licentie dekt de kaart, een bestelling ook, anders niet", () => {
  const team = "11111111-1111-1111-1111-111111111111";
  const nu = new Date("2026-09-09");

  const metLicentie = rechtOpKaart({
    gebruiker: { licentie_actief: true, licentie_tot: "2027-01-01" }, teamId: team, vandaag: nu });
  assert.deepEqual(metLicentie, { mag: true, reden: "licentie", bestelling_id: null });

  const verlopenLicentie = rechtOpKaart({
    gebruiker: { licentie_actief: true, licentie_tot: "2026-08-01" }, teamId: team, vandaag: nu });
  assert.equal(verlopenLicentie.mag, false);

  const bestelling = { id: "b1", product_code: "TF", status: "betaald", verbruikt_op: null, team_id: team, geldig_tot: "2027-09-09" };
  const metBestelling = rechtOpKaart({ gebruiker: {}, bestellingen: [bestelling], teamId: team, vandaag: nu });
  assert.deepEqual(metBestelling, { mag: true, reden: "bestelling", bestelling_id: "b1" });

  // Al verbruikt, voor een ander team, of niet betaald: geen recht.
  for (const kapot of [
    { ...bestelling, verbruikt_op: "2026-09-01" },
    { ...bestelling, team_id: "22222222-2222-2222-2222-222222222222" },
    { ...bestelling, status: "open" }
  ]){
    assert.equal(rechtOpKaart({ gebruiker: {}, bestellingen: [kapot], teamId: team, vandaag: nu }).mag, false);
  }
});

test("een verlopen aankoop krijgt een ander antwoord dan geen aankoop", () => {
  const team = "11111111-1111-1111-1111-111111111111";
  const nu = new Date("2026-09-09");
  const verlopen = { id: "b1", product_code: "TF", status: "betaald", verbruikt_op: null, team_id: team, geldig_tot: "2026-01-01" };
  assert.match(rechtOpKaart({ gebruiker: {}, bestellingen: [verlopen], teamId: team, vandaag: nu }).reden, /verlopen/);
  assert.match(rechtOpKaart({ gebruiker: {}, bestellingen: [], teamId: team, vandaag: nu }).reden, /licentie nodig/);
});

test("een hermeting vraagt een hermeting, geen Teamfoto", () => {
  const team = "11111111-1111-1111-1111-111111111111";
  const tf = { id: "b1", product_code: "TF", status: "betaald", verbruikt_op: null, team_id: team, geldig_tot: null };
  const uit = rechtOpKaart({ gebruiker: {}, bestellingen: [tf], teamId: team, soort: "hermeting" });
  assert.equal(uit.mag, false);
});
