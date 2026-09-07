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
import { leesRegels, leesProfielen, leesTestdata } from "../test/seed-lezen.js";

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
