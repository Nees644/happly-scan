// volhoudkracht-pagina.js — de uitslagpagina van de Volhoudkracht Scan op
// /volhoudkracht/:token, server-getekend zodat de link uit de mail werkt
// zonder javascript. Pure functie: rij in, html uit.
//
// Wat er nooit op staat: een ranglijst, een vergelijking met een andere
// aanbieder bij naam, en het gemiddelde zolang er minder dan dertig scans
// zijn (briefing, paragraaf 4).

import { DIMENSIES, MINIMUM_VOOR_GEMIDDELDE, vulWoord } from "./volhoudkracht-items.js";
import { duiding } from "./volhoudkracht-duiding.js";
import { CAL_URL } from "./volhoudkracht-mail.js";

function esc(s){
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
}

const KOLOM = { R: "dim_reden", P: "dim_plan", T: "dim_ritme", W: "dim_weerstand", C: "dim_contact", M: "dim_meting" };

export function bouwUitslagPagina(rij, { aantalScans = 0, gemiddelde = null } = {}){
  const d = duiding({ woord: rij.woord, band: rij.band, zwakste: rij.zwakste });
  const toonGemiddelde = aantalScans >= MINIMUM_VOOR_GEMIDDELDE && Number.isFinite(gemiddelde);

  const balken = DIMENSIES.map(dim => {
    const waarde = rij[KOLOM[dim.code]] ?? 0;
    const zwak = dim.code === rij.zwakste;
    return `<div class="dim${zwak ? " zwak" : ""}">
      <div class="dim-kop"><span>${esc(dim.naam)}</span><b>${waarde}</b></div>
      <div class="balk"><i style="width:${waarde}%"></i></div>
      <p class="dim-vraag">${esc(vulWoord(dim.vraag, rij.woord))}</p>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Uw volhoudkrachtscore: ${rij.score} · Happly</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
:root{--paars:#1A0B2E;--magenta:#D6026F;--room:#F7F3F0;--wit:#fff;--grijs:#6B6472;--lijn:#E6DFE9;--serif:'DM Serif Display',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--sans);color:var(--paars);background:var(--room);line-height:1.6;font-size:17px;-webkit-font-smoothing:antialiased}
h1,h2{font-family:var(--serif);font-weight:400;line-height:1.15}
h1{font-size:clamp(1.9rem,4.4vw,2.8rem);margin-bottom:.4em}
h2{font-size:clamp(1.3rem,3vw,1.7rem);margin-bottom:.5em}
a{color:var(--magenta)}
.wrap{max-width:720px;margin:0 auto;padding:0 22px}
header{border-bottom:1px solid var(--lijn);background:var(--wit)}
header .wrap{display:flex;align-items:center;height:64px}
header img{height:28px;display:block}
main{padding:44px 0 80px}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--magenta);margin-bottom:10px}
.kaart{background:var(--wit);border:1px solid var(--lijn);border-radius:14px;padding:26px;margin-bottom:22px}
.score{display:flex;align-items:baseline;gap:14px;margin:6px 0 10px}
.score b{font-family:var(--serif);font-weight:400;font-size:4.2rem;line-height:1;color:var(--magenta)}
.score span{color:var(--grijs)}
.dim{padding:14px 0;border-top:1px solid var(--lijn)}
.dim:first-child{border-top:0}
.dim-kop{display:flex;justify-content:space-between;font-weight:600}
.dim-kop b{font-variant-numeric:tabular-nums}
.balk{height:8px;background:var(--lijn);border-radius:99px;overflow:hidden;margin:8px 0}
.balk i{display:block;height:100%;background:var(--paars);border-radius:99px}
.zwak .balk i{background:var(--magenta)}
.zwak .dim-kop{color:var(--magenta)}
.dim-vraag{font-size:14px;color:var(--grijs)}
.donker{background:var(--paars);color:var(--wit)}
.donker .eyebrow{color:#FF5FA8}
.donker p{color:#E6CCDA}
.donker p b{color:#fff}
.knop{display:inline-block;font:inherit;font-weight:600;font-size:16px;background:var(--magenta);color:#fff;border:0;border-radius:999px;padding:13px 28px;text-decoration:none;margin-top:18px}
.klein{font-size:14px;color:var(--grijs);margin-top:14px}
footer{border-top:1px solid var(--lijn);padding:26px 0;font-size:13.5px;color:var(--grijs)}
</style>
</head>
<body>
<header><div class="wrap"><a href="https://happly.nl"><img src="/happly-logo.svg" alt="Happly"></a></div></header>
<main class="wrap">
  <p class="eyebrow">Volhoudkracht Scan · ${esc(rij.programma_naam)}</p>
  <h1>${esc(d.bandKop)}</h1>
  <div class="score"><b>${rij.score}</b><span>volhoudkrachtscore, van 0 tot 100${toonGemiddelde ? ` · gemiddelde van alle scans: ${Math.round(gemiddelde)}` : ""}</span></div>
  <p>${esc(d.bandTekst)}</p>

  <section class="kaart" style="margin-top:26px">
    <p class="eyebrow">Zes dimensies</p>
    ${balken}
  </section>

  <section class="kaart">
    <p class="eyebrow">Uw zwakste schakel</p>
    <h2>${esc(d.zwaksteNaam)}</h2>
    <p>${esc(d.zwaksteTekst)}</p>
    <p style="margin-top:12px"><b>Wat daar te doen is.</b> ${esc(d.aanbod)}</p>
  </section>

  <section class="kaart">
    <p class="eyebrow">De rekensom</p>
    <p>Wat levert één deelnemer op die uw ${esc(rij.woord)} afmaakt, en hoeveel stoppen er nu? Vul uw eigen getallen in de rekenhulp in; voor leefstijlprogramma's staan de landelijke cijfers vooraf ingevuld.</p>
    <a class="knop" href="https://happly.nl/rekenhulp-gli.html">Open de rekenhulp</a>
  </section>

  <section class="kaart donker">
    <p class="eyebrow">Wat dit getal is</p>
    <p>${esc(d.slot)}</p>
    <a class="knop" href="${CAL_URL}">Plan een gesprek met Maarten</a>
    <p class="klein" style="color:#E6CCDA">Of antwoord op de mail met uw uitslag.</p>
  </section>
</main>
<footer><div class="wrap">Happly · maarten@happly.nl · 085 878 59 61 · <a href="/privacy">Privacy</a></div></footer>
</body>
</html>`;
}
