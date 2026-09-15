// leider-pagina.js — de eigen pagina van de teamleider op /leider/:token.
//
// Toestand a en b uit paragraaf 6 van briefings/leidersbeeld.md. Toestand c
// (de vrijgegeven kaart met R13) komt in stap 4, toestand d in stap 5.
//
// Het landelijk beeld staat hier niet (K9): dat blijft het voordeel van de
// partner met licentie. De pagina toont dus alleen de drie punten van de
// leider zelf, zonder vergelijking.

import { MINIMUM_DEELNEMERS, kanKaartKrijgen } from "./leidersbeeld.js";

const PAARS = "#1A0B2E", MAGENTA = "#D6026F", ROOM = "#F7F3F0", LIJN = "#E6DFE9", GRIJS = "#6B6472";

export function ontsnap(t){
  return String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* De drie kolommen. Een open cirkel met een korte streeplijn in magenta, zelfde
   markering als het Leidersbeeld op de Teamkrachtkaart krijgt. */
export function kolommen({ zien, sturen, doen }){
  const H = 260, TOP = 24, HOOG = 180, BREED = 430, KOL = BREED / 3;
  const y = waarde => TOP + HOOG - (waarde / 100) * HOOG;

  const punt = (waarde, label, i) => {
    const midden = i * KOL + KOL / 2;
    return `
      <line x1="${midden - 34}" y1="${y(waarde)}" x2="${midden + 34}" y2="${y(waarde)}"
            stroke="${MAGENTA}" stroke-width="2" stroke-dasharray="6 4"/>
      <circle cx="${midden}" cy="${y(waarde)}" r="7" fill="#fff" stroke="${MAGENTA}" stroke-width="2.5"/>
      <text x="${midden}" y="${y(waarde) - 15}" text-anchor="middle"
            font-family="'DM Sans',system-ui,sans-serif" font-size="15" font-weight="600" fill="${MAGENTA}">${waarde}</text>
      <text x="${midden}" y="${TOP + HOOG + 26}" text-anchor="middle"
            font-family="'DM Sans',system-ui,sans-serif" font-size="14" fill="${PAARS}">${label}</text>`;
  };

  return `<svg viewBox="0 0 ${BREED} ${H}" role="img" aria-label="Jouw beeld op zien, sturen en doen" style="width:100%;height:auto">
    <line x1="0" y1="${TOP + HOOG}" x2="${BREED}" y2="${TOP + HOOG}" stroke="${LIJN}" stroke-width="1.5"/>
    ${[0, 1, 2].map(i => `<line x1="${i * KOL + KOL / 2}" y1="${TOP}" x2="${i * KOL + KOL / 2}" y2="${TOP + HOOG}" stroke="${LIJN}" stroke-width="1"/>`).join("")}
    ${punt(zien, "Zien", 0)}${punt(sturen, "Sturen", 1)}${punt(doen, "Doen", 2)}
  </svg>`;
}

/* Toestand b: het team is gekoppeld, de kaart is er nog niet. */
function deelname({ ingevuld, uitgenodigd }){
  if (!Number.isInteger(ingevuld)) return "";
  const van = Number.isInteger(uitgenodigd) && uitgenodigd > 0 ? ` van ${uitgenodigd}` : "";
  return `<div class="blok">
    <div class="eyebrow">De meting loopt</div>
    <p><b>${ingevuld}${van}</b> ${ingevuld === 1 ? "teamlid heeft" : "teamleden hebben"} de vragen ingevuld. Je krijgt bericht zodra de kaart klaar is.</p>
  </div>`;
}

/* Toestand a: nog geen team. */
function nogGeenTeam({ organisatie, teamomvang, partnernaam }){
  const klein = !kanKaartKrijgen(teamomvang);
  const vervolg = klein
    ? `<p>Een Teamfoto vraagt minimaal ${MINIMUM_DEELNEMERS} deelnemers. Groeit je team, dan staat je Leidersbeeld klaar.</p>`
    : partnernaam
      ? `<p>Je werkt met ${ontsnap(partnernaam)}. Die regelt de meting met je.</p>`
      : `<p>Bij een Teamfoto vult het team dezelfde vragen in. Je ziet dan op een kaart waar jouw beeld en het beeld van het team gelijk lopen, en waar niet.</p>
         <p style="margin-top:14px"><a class="knop" href="/teamkrachtindex">Wat een Teamfoto is</a></p>`;

  return `<div class="blok">
    <p class="groot">Dit is jouw beeld van ${ontsnap(organisatie)}. Hoe het team het zelf doet, weet je na de meting.</p>
    ${vervolg}
  </div>`;
}

export function bouwLeiderPagina({ rij, team = null, deelnemers = null, partnernaam = null }){
  const stand = team ? "b" : "a";
  const inhoud = stand === "b"
    ? deelname(deelnemers || {})
    : nogGeenTeam({ organisatie: rij.organisatie, teamomvang: rij.teamomvang, partnernaam });

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jouw Leidersbeeld · Teamkracht Index</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;color:${PAARS};background:${ROOM};line-height:1.6;font-size:17px}
.wrap{max-width:620px;margin:0 auto;padding:44px 22px 80px}
h1{font-family:'DM Serif Display',Georgia,serif;font-weight:400;font-size:clamp(1.9rem,4.4vw,2.6rem);line-height:1.15;margin-bottom:.35em}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${MAGENTA};margin-bottom:10px}
.kaart{background:#fff;border:1px solid ${LIJN};border-radius:14px;padding:26px;margin-top:26px}
.blok{margin-top:26px}
.groot{font-size:19px}
p+p{margin-top:1em}
.knop{display:inline-block;font-weight:600;font-size:16px;background:${MAGENTA};color:#fff;border-radius:999px;padding:12px 26px;text-decoration:none}
.legenda{font-size:13.5px;color:${GRIJS};margin-top:16px;display:flex;align-items:center;gap:9px}
.legenda span{width:15px;height:15px;border-radius:50%;border:2.5px solid ${MAGENTA};background:#fff;flex:none}
footer{font-size:13.5px;color:${GRIJS};margin-top:44px;border-top:1px solid ${LIJN};padding-top:22px}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">Leidersbeeld</div>
  <h1>Jouw Teamkracht Index is ${rij.index_score}</h1>
  <div class="kaart">
    ${kolommen({ zien: rij.zien, sturen: rij.sturen, doen: rij.doen })}
    <div class="legenda"><span></span> Jouw beeld van het team</div>
  </div>
  ${inhoud}
  <footer>Happly · Teamkracht Index</footer>
</div>
</body>
</html>`;
}
