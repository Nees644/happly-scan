// badge.js — de badge bij een certificaat, als svg.
//
// Een badge is een plaatje dat iemand op LinkedIn zet. Het enige wat hij moet
// doen is kloppen en na te gaan zijn: naam, niveau, jaar en het adres waar de
// uitgifte te controleren is. Vandaar dat de verificatiecode erin staat en
// niet alleen een logo.
//
// Vector, zodat hij op elke maat scherp is. De png wordt in de browser uit deze
// svg gemaakt; er komt dus geen tekenprogramma op de server aan te pas.

import { NIVEAU_LABEL, jaarVan } from "./register.js";

export const BREEDTE = 600;
export const HOOGTE = 600;

const PAARS = "#1A0B2E", MAGENTA = "#D6026F", ROOM = "#F7F3F0", LAVENDEL = "#B9AECB";

function ontsnap(t){
  return String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Een naam kan lang zijn. Twee regels is het maximum; wat daarna komt wordt
   afgekapt, want een badge met vier regels naam is geen badge meer. */
export function naamRegels(naam, perRegel = 22){
  const woorden = String(naam || "").trim().split(/\s+/).filter(Boolean);
  const regels = [];
  let huidig = "";
  for (const woord of woorden){
    const kandidaat = huidig ? `${huidig} ${woord}` : woord;
    if (kandidaat.length > perRegel && huidig){ regels.push(huidig); huidig = woord; }
    else huidig = kandidaat;
    if (regels.length === 2) break;
  }
  if (regels.length < 2 && huidig) regels.push(huidig);
  return regels.slice(0, 2).map(r => r.length > perRegel + 4 ? r.slice(0, perRegel + 1) + "..." : r);
}

export function bouwBadgeSvg({ naam, niveau, datum, verificatiecode, basis = "https://www.teamkrachtindex.nl" }){
  const label = NIVEAU_LABEL[niveau] || niveau;
  const jaar = jaarVan(datum);
  const regels = naamRegels(naam);
  const url = `${basis}/verificatie/${verificatiecode}`;
  // Het adres en de code op twee regels. Op een regel is de code bij een
  // leesbare lettergrootte breder dan de cirkel, en dan loopt de badge uit zijn
  // eigen rand.
  const adres = `${basis.replace(/^https?:\/\//, "")}/verificatie`;

  // De binnencirkel wordt naar onderen smal. Alles wat tekst is staat daarom
  // boven y = 480; daaronder past geen regel meer tussen de randen.
  const naamY = regels.length === 2 ? 306 : 326;
  const jaarY = naamY + (regels.length - 1) * 42 + 44;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BREEDTE} ${HOOGTE}" width="${BREEDTE}" height="${HOOGTE}" role="img" aria-label="Badge ${ontsnap(label)} Teamkracht Index, ${ontsnap(naam)}, ${jaar}">
  <rect width="${BREEDTE}" height="${HOOGTE}" rx="36" fill="${PAARS}"/>
  <circle cx="300" cy="300" r="250" fill="none" stroke="${MAGENTA}" stroke-width="2" opacity=".45"/>
  <circle cx="300" cy="300" r="232" fill="none" stroke="${MAGENTA}" stroke-width="6"/>

  <text x="300" y="150" text-anchor="middle" font-family="DM Sans, Helvetica, Arial, sans-serif"
        font-size="19" letter-spacing="7" fill="${MAGENTA}">TEAMKRACHT INDEX</text>

  <text x="300" y="232" text-anchor="middle" font-family="DM Serif Display, Georgia, serif"
        font-size="76" fill="${ROOM}">${ontsnap(label)}</text>

  <line x1="220" y1="266" x2="380" y2="266" stroke="${MAGENTA}" stroke-width="3"/>

  ${regels.map((regel, i) => `<text x="300" y="${naamY + i * 42}" text-anchor="middle"
        font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="32" fill="${ROOM}">${ontsnap(regel)}</text>`).join("")}

  <text x="300" y="${jaarY}" text-anchor="middle"
        font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="24" letter-spacing="4" fill="${LAVENDEL}">${jaar}</text>

  <a href="${ontsnap(url)}" target="_blank">
    <text x="300" y="424" text-anchor="middle" font-family="DM Sans, Helvetica, Arial, sans-serif"
          font-size="14" fill="${LAVENDEL}">Te controleren op</text>
    <text x="300" y="446" text-anchor="middle" font-family="DM Sans, Helvetica, Arial, sans-serif"
          font-size="15" fill="${MAGENTA}">${ontsnap(adres)}</text>
    <text x="300" y="467" text-anchor="middle" font-family="DM Sans, Helvetica, Arial, sans-serif"
          font-size="12" letter-spacing="0.4" fill="${LAVENDEL}">${ontsnap(verificatiecode)}</text>
  </a>

  <text x="300" y="568" text-anchor="middle" font-family="DM Sans, Helvetica, Arial, sans-serif"
        font-size="14" letter-spacing="3" fill="${LAVENDEL}">HAPPLY</text>
</svg>`;
}

export function badgeBestandsnaam({ naam, niveau }){
  const kaal = String(naam || "badge").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `teamkracht-${niveau || "certificaat"}-${kaal || "badge"}`;
}
