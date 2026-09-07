// uitslag-pagina.js
// De eigen uitslagpagina van een deelnemer, bereikbaar via /uitslag/:token.
// Alleen wie de link heeft komt erbij; het token staat uitsluitend in de mail
// aan de deelnemer zelf. Deze pagina toont wat scan.html direct na de meting
// liet zien, plus het blok met het Teamkracht-patroon.
//
// De coach ziet deze pagina nooit, en er staat geen teamgegeven op: het gaat
// hier alleen over deze persoon.

import { niveau, ontwikkelruimte, PATROON, PATROON_VOORBEHOUD, splitDuiding } from "./zelfkracht-uitslag.js";

const esc = t => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Zelfde splitsing als de uitslagpagina en de mail: de duiding komt binnen als
   tekst met koppen, en die zetten we om naar leesbare blokken. */
function duidingHtml(tekst){
  if (!tekst) return "";
  return tekst.split(/\n{2,}/).map(deel => {
    const r = deel.trim();
    if (!r) return "";
    if (r.length < 70 && !/[.!?]$/.test(r)) return `<h3>${esc(r)}</h3>`;
    return `<p>${esc(r).replace(/\n/g, " ")}</p>`;
  }).join("");
}

function niveauRij(naam, score){
  const or = ontwikkelruimte(score);
  const plus = or.onderhoud
    ? '<span class="onderhoud">onderhouden</span>'
    : `<span class="plus">+${or.plus}</span> <span class="naar">naar ${or.niveau}</span>`;
  return `<tr><td class="nm">${naam}</td><td class="sc">${score}</td><td>${niveau(score)}</td><td class="r">${plus}</td></tr>`;
}

/* meting: rij uit index_scan_results. profiel: rij uit teamkracht_profielen,
   of null als deze deelnemer nog geen teamberekening heeft gehad. */
export function bouwUitslagPagina({ meting, profiel }){
  const delen = meting.duiding ? splitDuiding(meting.duiding) : { duiding: null, route: null };
  const routeTekst = delen.route || null;

  const datum = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" })
    .format(new Date(meting.created_at));

  const patroonBlok = profiel ? `
    <section class="sec patroon">
      <div class="sec-h">Jouw patroon op dit moment</div>
      <h2>${esc(profiel.code === "MMM" ? "De middenband" : profiel.naam)}</h2>
      <p>${esc(profiel.tekst_deelnemer || "")}</p>
      <p class="voorbehoud">${esc(PATROON_VOORBEHOUD)}</p>
    </section>` : "";

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Jouw Zelfkracht Index</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<style>
  :root{--dp:#1A0B2E;--pk:#D6026F;--rt:#FBEFF5;--pap:#F7F3F0;--bd:#E7DCEC;--mut:#6A5A78;--tx:#3A2E46;--lav:#B9AECB}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"DM Sans",system-ui,sans-serif;background:var(--pap);color:var(--tx);line-height:1.6}
  .blad{max-width:640px;margin:0 auto;background:#fff;min-height:100vh}
  .kop{background:var(--dp);color:#fff;padding:20px 32px;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
  .body{padding:30px 32px 60px}
  .datum{font-size:12.5px;color:var(--mut);margin-bottom:24px}
  .getal{text-align:center;margin:10px 0 4px}
  .getal .n{font-family:"DM Serif Display",serif;font-size:72px;color:var(--dp);line-height:1}
  .getal .cap{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin-top:6px}
  .subs{display:flex;border-top:1px solid var(--bd);margin:18px 0 30px}
  .sub{flex:1;text-align:center;padding:14px 4px 0}
  .sub+.sub{border-left:1px solid var(--bd)}
  .sub .n{font-family:"DM Serif Display",serif;font-size:26px;color:var(--dp)}
  .sub .l{font-size:11px;font-weight:600;color:var(--dp);margin-top:3px}
  .sec{margin-bottom:34px}
  .sec-h{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);
         padding-bottom:8px;border-bottom:1px solid var(--bd);margin-bottom:16px}
  h2{font-family:"DM Serif Display",serif;font-weight:400;font-size:1.6rem;color:var(--dp);margin-bottom:10px}
  h3{font-family:"DM Serif Display",serif;font-weight:400;font-size:1.15rem;color:var(--dp);margin:20px 0 10px}
  h3:first-child{margin-top:0}
  p{font-size:14.5px;font-weight:300;margin-bottom:12px}
  p:last-child{margin-bottom:0}
  table{width:100%;border-collapse:collapse}
  td{padding:10px 6px;border-bottom:1px solid var(--bd);font-size:13.5px;font-weight:300}
  td.nm{font-weight:600;color:var(--dp)}
  td.sc{font-family:"DM Serif Display",serif;font-size:18px;color:var(--dp)}
  td.r{text-align:right}
  .plus{color:var(--pk);font-weight:700}
  .naar{color:var(--mut);font-weight:300;font-size:12.5px}
  .onderhoud{color:var(--mut);font-weight:500}
  .legend{font-size:12.5px;color:var(--mut);margin-top:10px}
  .patroon{background:var(--rt);border-radius:10px;padding:22px 24px}
  .patroon .sec-h{border-color:#F0D9E6}
  .patroon .voorbehoud{font-size:12.5px;color:var(--mut);margin-top:14px}
  .venster{background:var(--pap);border-left:3px solid var(--lav);padding:16px 20px;font-style:italic}
  .voet{border-top:1px solid var(--bd);padding-top:16px;font-size:12px;color:var(--mut)}
  @media(max-width:600px){.body{padding:24px 20px 50px}.kop{padding:18px 20px}}
</style>
</head>
<body>
<div class="blad">
  <div class="kop">Zelfkracht Index</div>
  <div class="body">
    <p class="datum">Jouw meting van ${esc(datum)}. Deze pagina is alleen van jou.</p>

    <div class="getal">
      <div class="n">${meting.index_score}</div>
      <div class="cap">Zelfkracht Index</div>
    </div>
    <div class="subs">
      <div class="sub"><div class="n">${meting.zien}</div><div class="l">Zien</div></div>
      <div class="sub"><div class="n">${meting.sturen}</div><div class="l">Sturen</div></div>
      <div class="sub"><div class="n">${meting.doen}</div><div class="l">Doen</div></div>
    </div>

    <section class="sec">
      <div class="sec-h">Waar je nu staat</div>
      <table>
        ${niveauRij("Totaal", meting.index_score)}
        ${niveauRij("Zien", meting.zien)}
        ${niveauRij("Sturen", meting.sturen)}
        ${niveauRij("Doen", meting.doen)}
      </table>
      <p class="legend">Het advies is je eerstvolgende stap: het aantal punten tot het volgende niveau. Klein genoeg om te zetten, en het is dezelfde maat waarin een coach naar je ambitie vraagt.</p>
    </section>

    ${delen.duiding ? `<section class="sec">
      <div class="sec-h">Wat jouw meting laat zien</div>
      ${duidingHtml(delen.duiding)}
    </section>` : ""}

    ${routeTekst ? `<section class="sec">
      <div class="sec-h">De route</div>
      ${duidingHtml(routeTekst)}
    </section>` : ""}

    ${patroonBlok}

    <section class="sec" style="margin-top:34px">
      <div class="venster"><p>${esc(PATROON)}</p></div>
    </section>

    <p class="voet">Deze link is persoonlijk. Wie hem heeft, ziet jouw uitslag; deel hem dus niet. Je coach en je werkgever krijgen deze pagina niet te zien.</p>
  </div>
</div>
</body>
</html>`;
}
