// teamkracht-ruimte-blokken.js
// De vijf blokken van elke uitslag (briefing doel-ruimte v1, paragraaf 6):
// Doel, Doen, Ruimte, Route en Resultaat. Dit bestand levert de teksten, de
// gegevens voor blok 1 en 3, en de html van blok 1, 3, 4 en 5, voor de kaart
// en voor de individuele uitslag. Blok 2 is de bestaande inhoud en blijft waar
// hij was.
//
// Geen database en geen netwerk: de aanroeper geeft de opgeslagen ruimterij
// mee (teamkracht_ruimte) en dit bestand rekent niets opnieuw uit. De pdf en
// de mail lezen uit dezelfde gegevens, zodat scherm, papier en mail niet uit
// elkaar lopen.
//
// Woordenlijst (paragraaf 8): ruimte, winst, op orde, eerste stap, bepalend,
// dragen, beweging. De woorden uit de lijst "niet gebruiken" komen hier niet
// voor; een test bewaakt dat op de gerenderde uitvoer.

import {
  KETEN, LABEL, vulZinnen, keuzezin, profielkoppeling, telProfielen, namenInTeam,
  verdelingIndividueleRuimte, sorteerDynamieken
} from "./teamkracht-ruimte.js";
import { LEESREGELS_CONFIG } from "./teamkracht-leesregels-config.js";

const esc = t => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* De vaste teksten, letterlijk uit paragraaf 6.1 en 6.2. Waar de briefing
   voor de individuele variant geen kop geeft, staat de jij-vorm van de
   teamkop; die staan in de oplevering als placeholder gemeld. */
export const TEKST = {
  team: {
    doel_kop:       "Waar dit team naartoe werkt",
    geen_doel:      "Nog geen doel benoemd. De kaart leest via de keten.",
    doel_knop:      "Doel toevoegen",
    ruimte_kop:     "Waar de winst zit",
    route_kop:      "Wat het team gaat doen",
    route_leeg:     "Hier komen de afspraken uit de Teamkracht Sprint: welke stap, wie pakt hem op, wanneer.",
    resultaat_kop:  "Wat het opleverde",
    resultaat_leeg: "Na de hermeting staat hier wat er anders gebeurt en of het doel is gehaald."
  },
  individu: {
    doel_kop:       "Waar jij naartoe werkt",             // PLACEHOLDER: niet in de briefing
    geen_doel:      "Nog geen doel benoemd.",
    doel_knop:      null,
    ruimte_kop:     "Waar de winst zit",
    route_kop:      "Wat jij gaat doen",                   // PLACEHOLDER: niet in de briefing
    route_leeg:     "Hier komt straks je eigen eerste stap.",
    resultaat_kop:  "Wat het opleverde",
    resultaat_leeg: "Bij je volgende meting zie je hier wat er is veranderd."
  }
};

/* De regel in de uitslagmail, boven de indexwaarde (paragraaf 6.2). Alleen
   als er een doel is; zonder doel is er geen regel. */
export function mailDoelregel({ doel_tekst, ruimte }){
  if (!doel_tekst || !ruimte) return null;
  return `Je doel: ${String(doel_tekst).trim()}. Waar de winst zit: ${LABEL[ruimte.eerste_stap_dimensie]}.`;
}

/* De deelbare herkenningszin met het doel erbij (paragraaf 6.2). */
export function herkenningszinMetDoel(zin, doel_tekst){
  const d = String(doel_tekst || "").trim();
  if (!zin) return null;
  return d ? `${zin} Mijn doel: ${d}.` : zin;
}

/* De eerste zin van een tekst, voor het profiel in de individuele uitslag
   (paragraaf 6.2: het eigen profiel met één zin uit het model). */
export function eersteZin(tekst){
  const t = String(tekst || "").trim();
  if (!t) return null;
  const m = t.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : t).trim();
}

/* ------------------------------------------------------------ gegevens */

/* Alles wat blok 1 en 3 nodig hebben, in één object. De kaart, de pdf en de
   uitslagpagina tekenen hieruit.

   ruimte:     de rij uit teamkracht_ruimte (of het resultaat van bepaalRuimte)
   scores:     {zien, sturen, doen} van deze meting, voor de balken
   doel_tekst, doeltype: het doel van dit team of deze persoon
   vorm:       "team" of "individu"
   verdeling:  {"HLL": 4, ...} van het team (alleen team)
   profielen:  rijen uit teamkracht_profielen, minstens code en naam
   lijnen:     de anonieme lijnen van het teambeeld, alleen vanaf tien
   dynamieken: de gekozen dynamieken van het teambeeld, met regels voor L7
   profiel:    de profielrij van deze persoon (alleen individu) */
export function ruimteGegevens({
  ruimte, scores, doel_tekst = null, doeltype = null, vorm = "team",
  verdeling = null, profielen = [], lijnen = null, dynamieken = null, regels = null,
  profiel = null, config = LEESREGELS_CONFIG
}){
  if (!ruimte) return null;
  const es = ruimte.eerste_stap_dimensie;
  const zinnen = vulZinnen(ruimte, { doel_tekst, vorm });

  const balken = KETEN.map(d => ({
    dimensie: d,
    label: LABEL[d],
    waarde: Math.round(Number(scores[d]) * 10) / 10,
    eerste_stap: d === es,
    op_orde: (ruimte.op_orde_dimensies || []).includes(d),
    // Het gearceerde segment: alleen op de eerste stap, en alleen als er
    // ruimte is. Bij op orde is er niets te arceren (criterium 4).
    ruimte_tot: (d === es && ruimte.status === "ruimte") ? Number(ruimte.referentie_waarde) : null
  }));

  let draag = null, beweging = null;
  if (vorm === "team" && verdeling){
    const k = profielkoppeling(profielen)[es];
    draag = { aantal: telProfielen(verdeling, k.draag_codes), namen: namenInTeam(verdeling, k.draag_codes, k.draag_namen) };
    beweging = { aantal: telProfielen(verdeling, k.beweging_codes), namen: namenInTeam(verdeling, k.beweging_codes, k.beweging_namen) };
  }

  // De anonieme verdeling van individuele ruimte, uit de lijnen van het
  // teambeeld: die bestaan alleen vanaf tien deelnemers en bevatten niets
  // waarmee een lijn aan een persoon te koppelen is.
  let strip = null;
  if (vorm === "team" && Array.isArray(lijnen) && lijnen.length){
    const deelnemers = lijnen.map(l => ({ zien: l[0], sturen: l[1], doen: l[2] }));
    strip = verdelingIndividueleRuimte({ deelnemers, dimensie: es, referentie_waarde: Number(ruimte.referentie_waarde), config });
  }

  const gesorteerd = (dynamieken && regels) ? sorteerDynamieken(dynamieken, regels, es) : dynamieken;

  const profielzin = (vorm === "individu" && profiel)
    ? { naam: profiel.code === "MMM" ? "De middenband" : profiel.naam, zin: eersteZin(profiel.tekst_deelnemer) }
    : null;

  return {
    vorm,
    doel_tekst: doel_tekst ? String(doel_tekst).trim() : null,
    doeltype: doeltype || ruimte.doeltype || "onbekend",
    keuzezin: doel_tekst ? keuzezin(doeltype, vorm) : null,
    via_keten: ruimte.doeltype_bron === "keten" || !doel_tekst,
    leidende_dimensie: ruimte.leidende_dimensie,
    eerste_stap: es,
    eerste_stap_label: LABEL[es],
    status: ruimte.status,
    referentie_waarde: Number(ruimte.referentie_waarde),
    referentie_type: ruimte.referentie_type,
    ruimte_punten: Number(ruimte.ruimte_punten),
    zinnen, balken, draag, beweging, strip,
    dynamieken: gesorteerd,
    profielzin
  };
}

/* De regels met aantallen onder de balken (paragraaf 6.1). Alleen aantallen
   en profielnamen, nooit wie. */
export function profielRegels(g){
  if (!g || !g.draag || !g.beweging) return [];
  const lid = n => `${n} ${n === 1 ? "teamlid" : "teamleden"}`;
  const namen = lijst => lijst.length ? ` (${lijst.join(", ")})` : "";
  return [
    `Dragen ${g.eerste_stap_label} nu al: ${lid(g.draag.aantal)}${namen(g.draag.namen)}.`,
    `Geven de meeste beweging: ${lid(g.beweging.aantal)}${namen(g.beweging.namen)}.`
  ];
}

/* De strip als één regel. */
export function stripRegel(g){
  if (!g || !g.strip) return null;
  const { op_of_boven, eronder } = g.strip;
  return `Op ${g.eerste_stap_label} zitten ${op_of_boven} teamleden al op of boven de referentie en ${eronder} eronder.`;
}

/* ---------------------------------------------------------------- svg */

export const MAGENTA = "#D6026F", INKT = "#1A0B2E", LIJN = "#E2D8D2", GEDEMPT = "#6B6472";

/* De compacte visual: drie horizontale balken van 0 tot 100, de eerste stap
   in magenta, de referentie als streepje, en de ruimte als lichter gearceerd
   segment tussen de huidige waarde en de referentie. Geen pijlen omlaag, geen
   rood. Breedte 420, hoogte 3 maal 30. */
export function tekenRuimteBalken(g, { id = "r" } = {}){
  if (!g) return "";
  const LINKS = 62, BREED = 300, RIJ = 30, DIK = 12, TOP = 6;
  const x = w => LINKS + Math.max(0, Math.min(100, w)) / 100 * BREED;
  const d = [];
  d.push(`<defs><pattern id="arcering-${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${MAGENTA}" stroke-width="2" opacity=".45"/></pattern></defs>`);
  g.balken.forEach((b, i) => {
    const y = TOP + i * RIJ;
    const ym = y + DIK / 2;
    const kleur = b.eerste_stap ? MAGENTA : INKT;
    d.push(`<text x="${LINKS - 10}" y="${ym + 4}" text-anchor="end" font-family="DM Sans, sans-serif" font-size="12" font-weight="600" fill="${kleur}">${b.label}</text>`);
    d.push(`<rect x="${LINKS}" y="${y}" width="${BREED}" height="${DIK}" rx="6" fill="${LIJN}"/>`);
    d.push(`<rect x="${LINKS}" y="${y}" width="${Math.max(0, x(b.waarde) - LINKS)}" height="${DIK}" rx="6" fill="${kleur}" opacity="${b.eerste_stap ? 1 : .55}"/>`);
    if (b.ruimte_tot !== null && b.ruimte_tot > b.waarde){
      d.push(`<rect x="${x(b.waarde)}" y="${y}" width="${x(b.ruimte_tot) - x(b.waarde)}" height="${DIK}" fill="url(#arcering-${id})"/>`);
    }
    d.push(`<text x="${x(b.waarde) + (b.ruimte_tot !== null ? x(b.ruimte_tot) - x(b.waarde) + 8 : 8)}" y="${ym + 4}" font-family="DM Sans, sans-serif" font-size="11" fill="${GEDEMPT}">${Math.round(b.waarde)}</text>`);
  });
  // De referentie: één streepje over de drie balken.
  const xr = x(g.referentie_waarde);
  d.push(`<line x1="${xr}" y1="${TOP - 4}" x2="${xr}" y2="${TOP + 3 * RIJ - RIJ + DIK + 4}" stroke="${INKT}" stroke-width="2" stroke-dasharray="3,3"/>`);
  d.push(`<text x="${xr}" y="${TOP + 3 * RIJ + 6}" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="10" letter-spacing="1" fill="${GEDEMPT}">REFERENTIE ${Math.round(g.referentie_waarde)}</text>`);
  return `<svg viewBox="0 0 420 ${TOP + 3 * RIJ + 14}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Waar de winst zit: de drie dimensies naast de referentie">${d.join("")}</svg>`;
}

/* --------------------------------------------------------------- html */

/* Blok 1. Het doel letterlijk, in aanhalingstekens, met eronder de gekozen
   keuzezin. Zonder doel de vaste zin, en op de kaart de knop. */
export function doelBlokHtml(g, { vorm = "team", knop = false } = {}){
  const t = TEKST[vorm] || TEKST.team;
  const inhoud = (g && g.doel_tekst)
    ? `<p class="doel-tekst">&ldquo;${esc(g.doel_tekst)}&rdquo;</p>${g.keuzezin ? `<p class="doel-zin">${esc(g.keuzezin)}</p>` : ""}`
    : `<p class="doel-leeg">${esc(t.geen_doel)}</p>${knop && t.doel_knop ? `<button type="button" class="doel-knop" data-doel-toevoegen>${esc(t.doel_knop)}</button>` : ""}`;
  return `<section class="blok blok-doel"><h3 class="blok-kop">${esc(t.doel_kop)}</h3>${inhoud}</section>`;
}

/* Blok 3, tot aan de dynamieken: de drie zinnen, de balken, de profielregels
   en de strip. De dynamieken zet de kaart er zelf achter, gesorteerd. */
export function ruimteBlokHtml(g, { vorm = "team", id = "r" } = {}){
  const t = TEKST[vorm] || TEKST.team;
  if (!g) return `<section class="blok blok-ruimte"><h3 class="blok-kop">${esc(t.ruimte_kop)}</h3></section>`;
  const zinnen = g.zinnen.map(z => `<p class="ruimte-zin">${esc(z)}</p>`).join("");
  const regels = profielRegels(g).map(r => `<p class="ruimte-profiel">${esc(r)}</p>`).join("");
  const strip = stripRegel(g);
  const profiel = g.profielzin
    ? `<p class="ruimte-profiel"><b>${esc(g.profielzin.naam)}.</b> ${esc(g.profielzin.zin || "")}</p>`
    : "";
  return `<section class="blok blok-ruimte">
    <h3 class="blok-kop">${esc(t.ruimte_kop)}</h3>
    ${zinnen}
    <div class="ruimte-balken">${tekenRuimteBalken(g, { id })}</div>
    ${regels}${profiel}
    ${strip ? `<p class="ruimte-strip">${esc(strip)}</p>` : ""}
  </section>`;
}

/* Blok 4 en 5, nu nog leeg. Bewust zichtbaar: de meting is een begin. */
export function routeBlokHtml({ vorm = "team" } = {}){
  const t = TEKST[vorm] || TEKST.team;
  return `<section class="blok blok-route blok-leeg"><h3 class="blok-kop">${esc(t.route_kop)}</h3><p class="blok-leegtekst">${esc(t.route_leeg)}</p></section>`;
}

export function resultaatBlokHtml({ vorm = "team" } = {}){
  const t = TEKST[vorm] || TEKST.team;
  return `<section class="blok blok-resultaat blok-leeg"><h3 class="blok-kop">${esc(t.resultaat_kop)}</h3><p class="blok-leegtekst">${esc(t.resultaat_leeg)}</p></section>`;
}

/* De stijl die de blokken op elke pagina delen. Koppen in DM Serif Display,
   tekst in DM Sans, donkerpaars en magenta. */
export const BLOK_CSS = `
  .blok{margin-top:1.1em}
  .blok-kop{font-family:"DM Serif Display",serif;font-weight:400;font-size:1.55em;line-height:1.2;color:${INKT};margin-bottom:.35em}
  .doel-tekst{font-family:"DM Serif Display",serif;font-size:1.35em;line-height:1.3;color:${INKT};margin-bottom:.2em}
  .doel-zin,.doel-leeg{color:${GEDEMPT};font-size:1em;font-weight:300}
  .doel-knop{margin-top:.5em;font:inherit;font-weight:600;font-size:.9em;color:#fff;background:${MAGENTA};border:0;border-radius:999px;padding:.45em 1.1em;cursor:pointer}
  .ruimte-zin{font-size:1.05em;line-height:1.5;margin-bottom:.35em}
  .ruimte-balken{margin:.6em 0 .5em;max-width:30em}
  .ruimte-balken svg{width:100%;height:auto;display:block}
  .ruimte-profiel,.ruimte-strip{font-size:.95em;font-weight:300;line-height:1.45;margin-bottom:.25em;color:${INKT}}
  .blok-leeg{border:1px dashed ${LIJN};border-radius:.4em;padding:.7em .9em}
  .blok-leeg .blok-kop{font-size:1.25em;margin-bottom:.2em}
  .blok-leegtekst{font-size:.95em;font-weight:300;color:${GEDEMPT};line-height:1.45}
`;
