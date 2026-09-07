// teamkracht-kaart.js
// De Teamkrachtkaart als SVG en als HTML-pagina. Bron: briefing paragraaf 6.
//
// De tekening is vector, ook op de poster, zodat A1 scherp blijft. Er staat
// geen naam, geen e-mailadres en geen id in de SVG; de lijnen komen al
// gesorteerd en geanonimiseerd uit teamkracht-logica.js.
//
// PDF-generatie is geparkeerd (besluit 07-09-2026). De pagina draagt print-CSS
// voor A4, A3 en A1, zodat afdrukken naar PDF via de browser gaat.

import { vulPlaceholders, telwoord } from "./teamkracht-logica.js";

/* Huisstijl, gelijk aan de Teamfoto en de site. */
export const KLEUR = {
  inkt: "#1A0B2E", magenta: "#D6026F", papier: "#F7F3F0",
  lavendel: "#B9AECB", lijn: "#E2D8D2", gedempt: "#6B6472"
};

/* Tekening: 800 bij 600, drie kolommen, score 25 onder en 100 boven. */
const KOLOM = { zien: 150, sturen: 400, doen: 650 };
const TOP = 60, BODEM = 540, LAAG = 25, HOOG = 100;

const PAGINA = {
  a4: { breedte: 297, hoogte: 210, schaal: 1 },
  a3: { breedte: 420, hoogte: 297, schaal: 1.41 },
  a1: { breedte: 841, hoogte: 594, schaal: 2.83 }
};

/* Scores onder 25 komen op de onderrand te liggen. */
export function yVoorScore(score){
  const deel = Math.min(1, Math.max(0, (score - LAAG) / (HOOG - LAAG)));
  return Math.round((BODEM - deel * (BODEM - TOP)) * 10) / 10;
}

const esc = t => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/* De vier breukvarianten. De tekst voor zien_sturen staat letterlijk in de
   briefing; de andere drie zijn in dezelfde vorm geschreven en wachten op de
   definitieve formulering van de opdrachtgever. */
export const BREUKBLOK = {
  zien_sturen: {
    kop: "De keten zakt tussen Zien en Sturen",
    tekst: "Dit team ziet meer dan gemiddeld en claimt het niet. De teamlijn zakt tussen Zien en Sturen. De ontwikkelruimte zit in kiezen: van signaal naar eigenaar."
  },
  sturen_doen: {
    kop: "De keten zakt tussen Sturen en Doen",
    tekst: "Dit team kiest wel en komt niet in beweging. De teamlijn zakt tussen Sturen en Doen. De ontwikkelruimte zit in de eerste stap: van besluit naar handeling binnen een week."
  },
  geen: {
    kop: "De keten houdt gelijke tred",
    tekst: "De drie stappen liggen bij dit team dicht bij elkaar. Er is geen duidelijke breuk. De ontwikkelruimte zit waarschijnlijk in het niveau als geheel, niet in één overgang."
  },
  begin: {
    kop: "De keten begint laag",
    tekst: "Dit team ligt op alle drie de stappen onder het landelijke beeld, zonder duidelijke breuk. De ontwikkelruimte begint waarschijnlijk bij zien: eerst waarnemen wat er speelt, daarna pas kiezen."
  }
};

export const VOETNOOT = "Waarschijnlijke dynamieken, afgeleid uit de verdeling van ketenprofielen. Hypotheses voor de nabespreking, geen diagnose. Een profiel beschrijft gedrag in deze context, niet de persoon. Individuele scores zijn alleen zichtbaar voor de deelnemer zelf; onder tien deelnemers toont deze kaart alleen de teamlijn en de verdeling. Bij de hermeting wordt het eindbeeld over dit startbeeld gelegd. Ook leverbaar als poster A3 en A1.";

const RICHTING_LABEL = {
  remt: "REMT DE TEAMKRACHT",
  versterkt: "VERSTERKT DE TEAMKRACHT",
  neutraal: "NEUTRAAL VOOR DE TEAMKRACHT"
};

/* ------------------------------------------------------------------ svg */

export function tekenKaartSvg(teambeeld){
  const team = { zien: teambeeld.team_zien, sturen: teambeeld.team_sturen, doen: teambeeld.team_doen };
  const norm = { zien: teambeeld.norm_zien, sturen: teambeeld.norm_sturen, doen: teambeeld.norm_doen };
  const punt = bron => Object.entries(KOLOM).map(([v, x]) => [x, yVoorScore(bron[v])]);
  const d = [];

  // Kolommen met hun label en de landelijke streep.
  for (const [v, x] of Object.entries(KOLOM)){
    d.push(`<line x1="${x}" y1="${TOP}" x2="${x}" y2="${BODEM}" stroke="${KLEUR.lijn}" stroke-width="2"/>`);
    d.push(`<text x="${x}" y="570" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="15" font-weight="600" letter-spacing="2" fill="${KLEUR.gedempt}">${v.toUpperCase()}</text>`);
    const yn = yVoorScore(norm[v]);
    d.push(`<line x1="${x - 60}" y1="${yn}" x2="${x + 60}" y2="${yn}" stroke="${KLEUR.magenta}" stroke-width="3" opacity=".8"/>`);
  }
  d.push(`<text x="${KOLOM.doen + 68}" y="${yVoorScore(norm.doen) + 4}" font-family="DM Sans, sans-serif" font-size="11" letter-spacing="1" fill="${KLEUR.magenta}">LANDELIJK</text>`);

  // Individuele lijnen, alleen als er genoeg deelnemers zijn. Geen id, geen
  // titel, geen tooltip: er valt niets uit terug te leiden.
  for (const lijn of teambeeld.lijnen || []){
    const p = [[KOLOM.zien, yVoorScore(lijn[0])], [KOLOM.sturen, yVoorScore(lijn[1])], [KOLOM.doen, yVoorScore(lijn[2])]];
    d.push(`<polyline points="${p.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${KLEUR.inkt}" stroke-width="1.5" opacity=".2" stroke-linejoin="round"/>`);
    for (const [x, y] of p) d.push(`<circle cx="${x}" cy="${y}" r="4" fill="${KLEUR.inkt}" opacity=".28"/>`);
  }

  // Teamlijn.
  const pt = punt(team);
  d.push(`<polyline points="${pt.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${KLEUR.inkt}" stroke-width="5" stroke-linejoin="round"/>`);
  for (const [x, y] of pt) d.push(`<circle cx="${x}" cy="${y}" r="9" fill="${KLEUR.inkt}" stroke="#fff" stroke-width="3"/>`);
  d.push(`<text x="${KOLOM.zien - 20}" y="${pt[0][1] + 5}" text-anchor="end" font-family="DM Sans, sans-serif" font-size="13" font-weight="600" fill="${KLEUR.inkt}">team</text>`);

  // Waar de keten zakt.
  if (teambeeld.breuk === "zien_sturen" || teambeeld.breuk === "sturen_doen"){
    const [a, b] = teambeeld.breuk === "zien_sturen" ? [pt[0], pt[1]] : [pt[1], pt[2]];
    const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2 - 26;
    d.push(`<text x="${x}" y="${y}" text-anchor="middle" font-family="DM Serif Display, serif" font-style="italic" font-size="16" fill="${KLEUR.magenta}">hier zakt de keten</text>`);
  }

  return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Teamkrachtkaart: de keten zien, sturen en doen van dit team naast het landelijke beeld">${d.join("")}</svg>`;
}

/* ----------------------------------------------------------------- html */

/* Meervoud van een profielnaam. Alle namen krijgen een s; middenband blijft
   enkelvoud en met kleine letter, zoals in de briefing. */
function profielnaam(code, aantal, profielen){
  if (code === "MMM") return "middenband";
  const naam = (profielen.find(p => p.code === code) || {}).naam || code;
  return aantal > 1 ? `${naam}s` : naam;
}

/* De verdeling als één regel: 4 Zieners, 2 Aanpakkers, 1 Trekker, en zo verder.
   Alleen codes die voorkomen; middenband achteraan. */
function verdelingZin(verdeling, profielen){
  return Object.entries(verdeling)
    .filter(([, aantal]) => aantal > 0)
    .sort((a, b) => (a[0] === "MMM") - (b[0] === "MMM") || b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, aantal]) => `<span><b>${aantal}</b> ${esc(profielnaam(code, aantal, profielen))}</span>`)
    .join('<i class="punt">&middot;</i>');
}

function verschilZin(teambeeld){
  const teken = x => (x > 0 ? "+" : "") + Math.round(x);
  return `Zien ${teken(teambeeld.team_zien - teambeeld.norm_zien)}, `
       + `Sturen ${teken(teambeeld.team_sturen - teambeeld.norm_sturen)}, `
       + `Doen ${teken(teambeeld.team_doen - teambeeld.norm_doen)} ten opzichte van het landelijke beeld.`;
}

/* Eén dynamiek: streep, tag, kop, en daaronder de tekst als doorlopend
   verhaal met de getelde kop als aanloop, precies zoals in het voorbeeld
   teamkrachtkaart_1_startbeeld.png. */
function dynamiekHtml(regel, teambeeld){
  const aanloop = regel.titel_geteld
    ? `${esc(vulPlaceholders(regel.titel_geteld, teambeeld.verdeling, teambeeld.n))}: `
    : "";
  const lopend = aanloop
    ? aanloop + esc(regel.dynamiek).replace(/^([A-Z])/, (m) => m.toLowerCase())
    : esc(regel.dynamiek);
  return `<article class="dyn">
    <p class="tag ${regel.richting}">${RICHTING_LABEL[regel.richting] || ""} &middot; ${esc(regel.code)}</p>
    <h4>${esc(regel.titel)}</h4>
    <p>${lopend} <strong>Interventie:</strong> ${esc(regel.interventie)} <strong>Gespreksvraag:</strong> ${esc(regel.gespreksvraag)}</p>
  </article>`;
}

/* De volledige kaart. teambeeld komt uit bouwTeambeeld, regels en profielen
   zijn de rijen uit teamkracht_regels en teamkracht_profielen. */
export function bouwKaartHtml({ teambeeld, regels, profielen, teamnaam = "", formaat = "a4", poster = false }){
  const blad = PAGINA[formaat] || PAGINA.a4;
  const breuk = BREUKBLOK[teambeeld.breuk] || BREUKBLOK.geen;
  const hermeting = teambeeld.soort === "hermeting";
  const beeldnaam = hermeting ? "eindbeeld" : "startbeeld";
  const heeftLijnen = Array.isArray(teambeeld.lijnen) && teambeeld.lijnen.length > 0;

  const kruimel = ["TEAMFOTO", teamnaam ? `TEAM ${teamnaam.toUpperCase()}` : null,
                   hermeting ? "HERMETING" : "NULMETING", "TEAMKRACHTKAART"]
    .filter(Boolean).map(esc).join(" &middot; ");

  const inleiding = heeftLijnen
    ? `De keten van dit team: waar zien overgaat in kiezen, en kiezen in doen. De dikke lijn is het team, de dunne lijnen zijn de ${telwoord(teambeeld.n)} deelnemers, naamloos en op volgorde van Zien. Magenta is het landelijke beeld.`
    : `De keten van dit team: waar zien overgaat in kiezen, en kiezen in doen. De dikke lijn is het team. Onder tien deelnemers toont de kaart geen individuele lijnen. Magenta is het landelijke beeld.`;

  const dynamieken = teambeeld.dynamieken
    .map(({ code }) => regels.find(r => r.code === code))
    .filter(Boolean)
    .map(r => dynamiekHtml(r, teambeeld))
    .join("");

  const verdelingBlok = `<div class="vak verdeling">${verdelingZin(teambeeld.verdeling, profielen)}</div>`;

  const rechts = poster
    ? `<section class="breuk"><p class="tag-licht">DE BREUK IN DE KETEN</p><h2>${esc(breuk.kop)}</h2></section>
       <section><h3>Profielverdeling</h3>${verdelingBlok}</section>`
    : `<section class="breuk">
         <p class="tag-licht">DE BREUK IN DE KETEN</p>
         <h2>${esc(breuk.kop)}</h2>
         <p>${esc(breuk.tekst)}</p>
         <p class="cijfers">${esc(verschilZin(teambeeld))}</p>
       </section>
       <section><h3>Profielverdeling</h3>${verdelingBlok}</section>
       <section class="dynamieken"><h3>Waarschijnlijke dynamieken</h3>${dynamieken}</section>`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Teamkrachtkaart${teamnaam ? " " + esc(teamnaam) : ""}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<style>
  :root{
    --inkt:${KLEUR.inkt}; --magenta:${KLEUR.magenta}; --papier:${KLEUR.papier};
    --lavendel:${KLEUR.lavendel}; --lijn:${KLEUR.lijn}; --gedempt:${KLEUR.gedempt};
    --schaal:${blad.schaal};
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#E9E2DC;font-family:"DM Sans",system-ui,sans-serif;color:var(--inkt)}
  .kaart{
    width:${blad.breedte}mm;height:${blad.hoogte}mm;margin:0 auto;background:var(--papier);
    font-size:calc(var(--schaal) * 7.4pt);
    display:flex;flex-direction:column;padding:2.1em 2.4em 1.2em;
  }
  .kop{margin-bottom:1.4em}
  .kruimel{font-size:.85em;font-weight:600;letter-spacing:.22em;color:var(--magenta);margin-bottom:.7em}
  h1{font-family:"DM Serif Display",serif;font-weight:400;font-size:4.1em;line-height:1.05;margin-bottom:.28em}
  h1 .punt{color:var(--magenta)}
  .inleiding{font-size:1.1em;font-weight:300;line-height:1.5;max-width:52em;color:var(--gedempt)}
  .romp{flex:1;display:grid;grid-template-columns:52% 1fr;column-gap:2.4em;min-height:0}
  .romp.poster{grid-template-columns:1fr;grid-template-rows:1fr auto;row-gap:1.6em}
  .romp.poster .tekening{align-self:stretch;display:flex;align-items:center;justify-content:center;min-height:0}
  .romp.poster .tekening svg{width:auto;height:100%;max-width:100%}
  .romp.poster .rechts{flex-direction:row;gap:1.8em;align-items:stretch}
  .romp.poster .rechts>section{flex:1;display:flex;flex-direction:column;justify-content:center}
  .tekening{background:#fff;border:1px solid var(--lijn);border-radius:.4em;padding:.9em;align-self:start}
  .tekening svg{width:100%;height:auto;display:block}
  .rechts{display:flex;flex-direction:column;gap:.95em;min-width:0}
  h2{font-family:"DM Serif Display",serif;font-weight:400;font-size:2.1em;line-height:1.2}
  h3{font-family:"DM Serif Display",serif;font-weight:400;font-size:2em;line-height:1.2;margin-bottom:.4em}
  h4{font-family:"DM Serif Display",serif;font-weight:400;font-size:1.75em;line-height:1.2;margin-bottom:.3em}
  p{font-size:1.1em;font-weight:300;line-height:1.5}
  .breuk{background:var(--inkt);color:var(--papier);padding:1.1em 1.2em;border-radius:.4em}
  .breuk h2{margin-bottom:.35em}
  .breuk .cijfers{margin-top:.5em;font-size:.95em;color:var(--lavendel)}
  .tag-licht{font-size:.82em;font-weight:600;letter-spacing:.2em;color:var(--magenta);margin-bottom:.5em}
  .vak{border:1px solid var(--lijn);border-radius:.4em;padding:.75em .9em;background:#fff}
  .verdeling{font-size:1.1em;font-weight:300;display:flex;flex-wrap:wrap;align-items:baseline}
  .verdeling b{font-weight:600}
  .verdeling .punt{color:var(--lavendel);font-style:normal;margin:0 .5em}
  .dynamieken{display:flex;flex-direction:column;gap:.7em}
  .dyn{border-top:1.5px solid var(--magenta);padding-top:.5em}
  .dyn.heeft-grijze-streep{border-top-color:var(--lijn)}
  .dyn p{font-size:1.05em;line-height:1.45}
  .dyn strong{font-weight:700}
  .tag{font-size:.82em;font-weight:600;letter-spacing:.16em;margin-bottom:.25em}
  .tag.remt{color:var(--magenta)}
  .tag.versterkt,.tag.neutraal{color:var(--gedempt)}
  .voet{border-top:1px solid var(--lijn);margin-top:1em;padding-top:.6em;
    font-size:.82em;font-weight:300;line-height:1.45;color:var(--gedempt)}
  .logo{align-self:flex-end;margin-top:auto}
  .logo img{width:9em;height:auto;display:block}
  @page{size:${blad.breedte}mm ${blad.hoogte}mm;margin:0}
  @media print{body{background:none}.kaart{margin:0}}
</style>
</head>
<body>
  <div class="kaart">
    <header class="kop">
      <p class="kruimel">${kruimel}</p>
      <h1>Teamkracht <span class="punt">&middot;</span> ${beeldnaam}</h1>
      ${poster ? "" : `<p class="inleiding">${esc(inleiding)}</p>`}
    </header>
    <div class="romp${poster ? " poster" : ""}">
      <div class="tekening">${tekenKaartSvg(teambeeld)}</div>
      <div class="rechts">${rechts}</div>
    </div>
    ${poster
      ? `<div class="logo"><img src="/happly-logo.svg" alt="Happly"></div>`
      : `<p class="voet">${esc(VOETNOOT)}</p>`}
  </div>
</body>
</html>`;
}
