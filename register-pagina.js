// register-pagina.js — de openbare pagina's van het register.
//
// Server-getekend, zodat een verificatielink werkt zonder javascript en zodat
// LinkedIn er een voorbeeld van kan maken. Er staat niets op wat niet met
// toestemming is gegeven: naam, niveau, datum, status, en desgewenst
// organisatie en website.

import { NIVEAU_LABEL, nederlandseDatum } from "./register.js";

const PAARS = "#1A0B2E", MAGENTA = "#D6026F", ROOM = "#F7F3F0", GRIJS = "#6B6472", LIJN = "#E6DFE9";

export function ontsnap(t){
  return String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function schil({ titel, beschrijving, inhoud, canoniek = null, indexeren = true }){
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ontsnap(titel)}</title>
<meta name="description" content="${ontsnap(beschrijving)}">
<meta name="robots" content="${indexeren ? "index,follow" : "noindex,nofollow"}">
${canoniek ? `<link rel="canonical" href="${ontsnap(canoniek)}">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${ontsnap(titel)}">
<meta property="og:description" content="${ontsnap(beschrijving)}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;color:${PAARS};background:${ROOM};line-height:1.6;font-size:17px}
.wrap{max-width:720px;margin:0 auto;padding:46px 22px 90px}
h1{font-family:'DM Serif Display',Georgia,serif;font-weight:400;font-size:clamp(1.9rem,4.4vw,2.7rem);line-height:1.15;margin-bottom:.35em}
h2{font-family:'DM Serif Display',Georgia,serif;font-weight:400;font-size:1.35rem;margin-bottom:.3em}
a{color:${MAGENTA}}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${MAGENTA};margin-bottom:10px}
.lead{color:${GRIJS};margin-bottom:26px}
.kaart{background:#fff;border:1px solid ${LIJN};border-radius:14px;padding:22px;margin-bottom:14px}
.rij{display:flex;gap:14px;align-items:baseline;justify-content:space-between;flex-wrap:wrap}
.stip{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600}
.stip i{width:9px;height:9px;border-radius:50%;background:#1E9E62;display:block}
.stip.uit i{background:${GRIJS}}
.stip.uit{color:${GRIJS}}
.klein{font-size:14px;color:${GRIJS}}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 18px;margin-top:16px;font-size:15.5px}
dt{color:${GRIJS}}
.zoek{width:100%;font:inherit;font-size:16px;padding:11px 14px;border:1.5px solid ${LIJN};border-radius:10px;margin-bottom:18px}
.leeg{color:${GRIJS};padding:8px 0}
footer{margin-top:40px;border-top:1px solid ${LIJN};padding-top:20px;font-size:13.5px;color:${GRIJS}}
</style>
</head>
<body><div class="wrap">${inhoud}
<footer>Happly &middot; Teamkracht Index. Vragen over een vermelding? <a href="mailto:hallo@happly.nl">hallo@happly.nl</a></footer>
</div></body>
</html>`;
}

/* De lijst. Namen staan er alleen in met toestemming, en de volgorde is
   alfabetisch: geen ranglijst en geen nieuwste eerst, want dat zou een
   voorkeur suggereren die er niet is. */
export function bouwRegisterLijst({ rijen = [], basis = "https://www.teamkrachtindex.nl" }){
  const kaarten = rijen.length
    ? rijen.map(r => `
      <a class="kaart" href="/register/${ontsnap(r.slug)}" style="display:block;text-decoration:none;color:inherit">
        <div class="rij">
          <div>
            <h2>${ontsnap(r.naam)}</h2>
            <div class="klein">${ontsnap(r.niveau_label)}${r.organisatie ? ` &middot; ${ontsnap(r.organisatie)}` : ""}</div>
          </div>
          <span class="stip ${r.actief ? "" : "uit"}"><i></i>${ontsnap(r.status)}</span>
        </div>
      </a>`).join("")
    : `<p class="leeg">Er staat nog niemand in het register.</p>`;

  return schil({
    titel: "Register · Teamkracht Index",
    beschrijving: "Wie is gecertificeerd om met de Teamkracht Index te werken.",
    canoniek: `${basis}/register`,
    inhoud: `
      <div class="eyebrow">Register</div>
      <h1>Wie is gecertificeerd</h1>
      <p class="lead">Iedereen die de Lezer-module heeft afgerond, de toets heeft gehaald en er toestemming voor gaf. Een vermelding zegt wat iemand heeft gedaan, niet hoe goed hij is.</p>
      <input class="zoek" id="zoek" type="search" placeholder="Zoek op naam of organisatie" aria-label="Zoeken in het register">
      <div id="lijst">${kaarten}</div>
      <script>
        const zoek = document.getElementById("zoek");
        const kaarten = [...document.querySelectorAll("#lijst .kaart")];
        zoek.addEventListener("input", () => {
          const t = zoek.value.trim().toLowerCase();
          for (const kaart of kaarten){
            kaart.style.display = !t || kaart.textContent.toLowerCase().includes(t) ? "" : "none";
          }
        });
      <\/script>`
  });
}

/* De pagina van een persoon, en tegelijk de verificatiepagina. Bestaat ook als
   het certificaat niet meer actief is: een badge die iemand vorig jaar op
   LinkedIn zette hoort te blijven werken en dan eerlijk te zijn. */
export function bouwRegisterPagina({ rij, basis = "https://www.teamkrachtindex.nl", viaCode = false }){
  const beschrijving = `${rij.naam} is ${rij.niveau_label} van de Teamkracht Index sinds ${nederlandseDatum(rij.sinds)}.`;
  return schil({
    titel: `${rij.naam} · ${rij.niveau_label} · Teamkracht Index`,
    beschrijving,
    canoniek: `${basis}/register/${rij.slug}`,
    // Een verificatielink hoort niet in een zoekmachine; de persoonspagina wel.
    indexeren: !viaCode,
    inhoud: `
      <div class="eyebrow">${viaCode ? "Verificatie" : "Register"}</div>
      <h1>${ontsnap(rij.naam)}</h1>
      <div class="kaart">
        <div class="rij">
          <h2>${ontsnap(rij.niveau_label)} Teamkracht Index</h2>
          <span class="stip ${rij.actief ? "" : "uit"}"><i></i>${ontsnap(rij.status)}</span>
        </div>
        ${rij.uitleg ? `<p class="klein" style="margin-top:6px">${ontsnap(rij.uitleg)}</p>` : ""}
        <dl>
          <dt>Gecertificeerd op</dt><dd>${ontsnap(nederlandseDatum(rij.sinds))}</dd>
          ${rij.organisatie ? `<dt>Organisatie</dt><dd>${ontsnap(rij.organisatie)}</dd>` : ""}
          ${rij.website ? `<dt>Website</dt><dd><a href="${ontsnap(rij.website)}" rel="nofollow noopener" target="_blank">${ontsnap(rij.website.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></dd>` : ""}
          <dt>Verificatiecode</dt><dd class="klein">${ontsnap(rij.verificatiecode)}</dd>
        </dl>
      </div>
      <p class="klein">Een certificaat zegt dat iemand de module heeft doorlopen en de toets heeft gehaald. Het zegt niets over de kwaliteit van een traject; dat blijft een zaak tussen de begeleider en zijn opdrachtgever.</p>
      <p style="margin-top:18px"><a href="/register">Het hele register</a></p>`
  });
}

export function bouwNietGevonden({ viaCode = false } = {}){
  return schil({
    titel: "Niet gevonden · Teamkracht Index",
    beschrijving: "Deze vermelding bestaat niet.",
    indexeren: false,
    inhoud: `
      <div class="eyebrow">${viaCode ? "Verificatie" : "Register"}</div>
      <h1>Deze vermelding bestaat niet</h1>
      <p class="lead">${viaCode
        ? "Deze code hoort bij geen enkel certificaat. Controleer of hij helemaal is overgenomen."
        : "Deze pagina bestaat niet, of iemand heeft zijn vermelding laten verwijderen. Het certificaat zelf blijft in onze administratie staan."}</p>
      <p><a href="/register">Naar het register</a></p>`
  });
}
