// volhoudkracht-mail.js — de resultaatmail van de Volhoudkracht Scan, als
// pure functie. De tekst staat in briefings/volhoudkracht-scan.md, paragraaf
// 9. De mail bevat het getal, de band en de zwakste schakel; de volledige
// uitslag staat achter de knop, zodat de klik laat zien dat de mail is
// aangekomen en gelezen.

import { voornaam, mailOnderwerp } from "./volhoudkracht-items.js";
import { duiding } from "./volhoudkracht-duiding.js";

export const BASIS_URL = "https://scan.happly.nl";
export const CAL_URL = "https://cal.com/maarten-neeskens-aoijqe?src=volhoudkracht";

const FONT = "'DM Sans',Helvetica,Arial,sans-serif";
const DP = "#1A0B2E", PK = "#D6026F", RT = "#FBEFF5", MUT = "#6A5A78", TX = "#3A2E46";

function p(tekst, extra){
  return `<p style="font-family:${FONT};font-size:14px;color:${TX};line-height:1.7;margin:0 0 13px;${extra || ""}">${tekst}</p>`;
}

function knop(tekst, url){
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px">
    <tr><td style="background:${PK};border-radius:999px">
      <a href="${url}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:14px;font-weight:600;color:#fff;text-decoration:none">${tekst}</a>
    </td></tr></table>`;
}

function shell(inhoud){
  return `<div style="background:${RT};padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:${DP};padding:22px 32px;color:#fff;font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase">Volhoudkracht Scan</div>
      <div style="padding:30px 32px 36px">${inhoud}</div>
    </div>
    <p style="font-family:${FONT};font-size:11.5px;color:${MUT};text-align:center;margin:18px 0 0">Happly &middot; Wij meten, ontwerpen, organiseren en rapporteren volhouden</p>
  </div>`;
}

function esc(s){
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
}

export function uitslagUrl(token, basis = BASIS_URL){
  return `${basis}/volhoudkracht/${token}`;
}

export function resultaatMail({ naam, score, band, zwakste, woord, programma_naam, token, basis = BASIS_URL }){
  const d = duiding({ woord, band, zwakste });
  const naamregel = voornaam(naam) ? `Beste ${esc(voornaam(naam))},` : "Beste lezer,";
  const inhoud =
    p(naamregel) +
    p(`Uw ${esc(woord)} <b>${esc(programma_naam)}</b> scoort <b style="color:${PK}">${score}</b> op volhoudkracht. ${esc(d.bandKop)}.`) +
    p(`Uw zwakste schakel is <b>${esc(d.zwaksteNaam)}</b>. ${esc(d.zwaksteTekst)}`) +
    knop("Bekijk de volledige uitslag", uitslagUrl(token, basis)) +
    p(`Wilt u weten wat het kost om die schakel te organiseren? Antwoord op deze mail of <a href="${CAL_URL}" style="color:${PK}">plan een gesprek</a>.`, "margin-top:18px") +
    p("Maarten Neeskens, Happly");
  return { subject: mailOnderwerp(score), html: shell(inhoud) };
}
