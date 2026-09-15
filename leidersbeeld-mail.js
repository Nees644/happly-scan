// leidersbeeld-mail.js — de twee mails van het Leidersbeeld, als pure functies.
//
// De resultaatmail gaat direct na versturen; de herinnering gaat een keer, na
// zeven dagen, als er nog geen team is. De teksten staan letterlijk in
// briefings/leidersbeeld.md, paragraaf 4.
//
// De mail bevat wel het indexgetal en niet de drie dimensies. Die staan achter
// de knop, zodat de klik laat zien dat de mail is aangekomen en gelezen.

import { voornaam, mailOnderwerp, herinneringOnderwerp } from "./leidersbeeld.js";

export const BASIS_URL = "https://www.teamkrachtindex.nl";

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

function shell(inhoud, afmeldUrl){
  const voet = afmeldUrl
    ? `<p style="font-family:${FONT};font-size:11.5px;color:${MUT};text-align:center;margin:18px 0 0">Geen mail meer hierover? <a href="${afmeldUrl}" style="color:${MUT}">Afmelden</a>.</p>`
    : "";
  return `<div style="background:${RT};padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:${DP};padding:22px 32px;color:#fff;font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase">Teamkracht Index</div>
      <div style="padding:30px 32px 36px">${inhoud}</div>
    </div>
    <p style="font-family:${FONT};font-size:11.5px;color:${MUT};text-align:center;margin:18px 0 0">Happly &middot; Teamkracht Index</p>
    ${voet}
  </div>`;
}

export function leiderUrl(token, basis = BASIS_URL){
  return `${basis}/leider/${token}`;
}

export function resultaatMail({ naam, index, token, basis = BASIS_URL }){
  const naamregel = voornaam(naam) ? `${voornaam(naam)},` : "Hallo,";
  const inhoud =
    p(naamregel) +
    p(`Jij hebt gemeten hoe jouw team het doet op Zien, Sturen en Doen. Het Leidersbeeld van de Teamkracht Index van jouw team is <b style="color:${PK}">${index}</b>.`) +
    p("Wat is de gemeten Teamkracht Index van jouw team?") +
    p("Dat weet je als je team het zelf invult. Drie minuten per persoon, en je ziet op een kaart waar jouw beeld en het beeld van het team gelijk lopen en waar niet.") +
    knop("Bekijk je Leidersbeeld", leiderUrl(token, basis));
  return { subject: mailOnderwerp(index), html: shell(inhoud) };
}

export function herinneringMail({ naam, index, token, afmeldUrl, basis = BASIS_URL }){
  const naamregel = voornaam(naam) ? `${voornaam(naam)},` : "Hallo,";
  const inhoud =
    p(naamregel) +
    p(`Jouw Leidersbeeld van de Teamkracht Index is <b style="color:${PK}">${index}</b>. Wat de gemeten Teamkracht Index van jouw team is, weet je als het team het zelf invult.`) +
    knop("Bekijk je Leidersbeeld", leiderUrl(token, basis));
  return { subject: herinneringOnderwerp(index), html: shell(inhoud, afmeldUrl) };
}
