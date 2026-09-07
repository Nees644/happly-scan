// scripts/bouw-voorbeeldkaart.js
// Rendert de Teamkrachtkaart voor het fictieve team Noord uit de briefing en
// schrijft hem naar teamkracht-voorbeeld.html. Alleen om het beeld te kunnen
// beoordelen op de preview-deploy; er komt geen database aan te pas en er
// staan geen echte deelnemers in. Verwijderen voordat de branch naar main gaat.
//
// Draaien met: npm run voorbeeld

import { writeFileSync } from "node:fs";
import { bouwTeambeeld } from "../teamkracht-logica.js";
import { bouwKaartHtml } from "../teamkracht-kaart.js";
import { leesRegels, leesProfielen, leesInterventies, leesDoelregels, leesTestdata } from "../test/seed-lezen.js";

const { norm, deelnemers } = leesTestdata();
const regels = leesRegels();
const profielen = leesProfielen();
const config = { middenband_sd: 0.25, min_deelnemers_lijnen: 10, norm_bron: "vast" };

const teambeeld = bouwTeambeeld({ deelnemers, norm, config, regels });

const formaat = process.argv[2] || "a4";
const poster = process.argv.includes("--poster");
const html = bouwKaartHtml({ teambeeld, regels, profielen, teamnaam: "Noord (voorbeeld)", formaat, poster });

const uit = poster ? `teamkracht-voorbeeld-poster-${formaat}.html` : "teamkracht-voorbeeld.html";
writeFileSync(new URL(`../${uit}`, import.meta.url), html);
console.log(`${uit} geschreven: n=${teambeeld.n}, breuk=${teambeeld.breuk}, dynamieken=${teambeeld.dynamieken.map(d => d.code).join(", ")}`);

// Terugvaldata voor teamkracht-doel.html, zodat die pagina zonder database te
// bekijken is en er toch maar één bron voor de teksten bestaat: supabase.sql.
if (!poster){
  const { profielen: _weg, ...zonderProfielen } = teambeeld;
  const data = `// GEGENEREERD BESTAND, niet met de hand bewerken.
// Gemaakt door scripts/bouw-voorbeeldkaart.js uit het seedblok van supabase.sql
// en de testdata uit de briefing. Alleen bedoeld als terugval voor
// teamkracht-doel.html zolang er geen echt teambeeld is; er staan geen echte
// deelnemers in.

export const VOORBEELD_TEAMBEELD = ${JSON.stringify(zonderProfielen, null, 2)};

export const VOORBEELD_INTERVENTIES = ${JSON.stringify(leesInterventies(), null, 2)};

export const VOORBEELD_PROFIELEN = ${JSON.stringify(profielen, null, 2)};

export const VOORBEELD_DOELREGELS = ${JSON.stringify(leesDoelregels(), null, 2)};

export const VOORBEELD_REGELS = ${JSON.stringify(regels, null, 2)};

export const VOORBEELD_DEELNEMERS = ${JSON.stringify(deelnemers)};

export const VOORBEELD_NORM = ${JSON.stringify(norm)};

export const VOORBEELD_CONFIG = ${JSON.stringify(config)};
`;
  writeFileSync(new URL("../teamkracht-voorbeeld-data.js", import.meta.url), data);
  console.log("teamkracht-voorbeeld-data.js geschreven");
}
