// zelfstarters-mail.js
// De mails van het Zelfstartregister, als pure functies.
//
// De gratis weg (sinds 3 november 2026):
// 1. uitslag: direct na de gratis meting, met nummer, sterkste kant en de
//    plekken met ruimte, en de uitnodiging om te verifiëren
// 2. vervolg: na drie dagen zonder verificatie, met het jaartal als reden
// 3. badge: zodra is geverifieerd, met badge en controlelink
// 4. plan: zodra het als-dan plan is ingevuld
//
// De oude weg (eerst betalen, dan meten), voor partners:
// 5. welkom: direct na betaling, met de link naar de nulmeting
// 6. herinnering: na een dag zonder meting, zelfde link
//
// Je en jouw, nooit u. Geen gedachtestreepjes, geen uitroeptekens.

import { CHECK_URL } from "./zelfstarters-badge.js";

export const SCAN_URL = "https://scan.happly.nl";
export const AFZENDER = "Zelfstarters <hallo@happly.nl>";
export const ANTWOORD = "info@zelfstarters.nl";

const FONT = "Nunito, 'DM Sans', Helvetica, Arial, sans-serif";
const NAVY = "#0f1f3d", ORANJE = "#ff6a2b", PAPIER = "#f6f4ef", MUT = "#5b6478", TX = "#121826";

function esc(s){
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
}

function p(tekst, extra){
  return `<p style="font-family:${FONT};font-size:15px;color:${TX};line-height:1.65;margin:0 0 14px;${extra || ""}">${tekst}</p>`;
}

function knop(tekst, url){
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px">
    <tr><td style="background:${ORANJE};border-radius:14px">
      <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:#fff;text-decoration:none">${tekst}</a>
    </td></tr></table>`;
}

function shell(inhoud){
  return `<div style="background:${PAPIER};padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden">
      <div style="background:${NAVY};padding:22px 32px;color:#fff;font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700">Zelfstarters &middot; Zelfstartregister</div>
      <div style="padding:30px 32px 36px">${inhoud}</div>
    </div>
    <p style="font-family:${FONT};font-size:11.5px;color:${MUT};text-align:center;margin:18px 0 0">Zelfstarters is een initiatief van Happly &middot; vragen: ${ANTWOORD}</p>
  </div>`;
}

export function voornaam(naam){
  return String(naam || "").trim().split(/\s+/)[0] || "";
}

/* De link waarmee de meting aan deze registratie wordt gekoppeld. */
export function scanLink(registratieId){
  return `${SCAN_URL}/scan?zs=${encodeURIComponent(registratieId)}`;
}

/* De uitslagpagina van een registratie, gratis en geverifieerd dezelfde. */
export function uitslagLink(registratieId){
  return `${SCAN_URL}/zelfstarters-uitslag?z=${encodeURIComponent(registratieId)}`;
}

/* De link waarmee een Plus Class-deelnemer zijn dag kiest of wijzigt. */
export function dagLink(registratieId){
  return `${SCAN_URL}/zelfstarters-dag?z=${encodeURIComponent(registratieId)}`;
}

export function welkomMail({ naam, registratieId, type }){
  const vn = esc(voornaam(naam));
  const plus = type === "plus";
  return {
    subject: "Je registratie is gelukt. Doe nu je nulmeting",
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je staat vanaf nu in het Zelfstartregister. Eén ding nog: je nulmeting. Tien minuten, en morgen heb je je registratienummer en badge in je mail.`) +
      knop("Doe je nulmeting", scanLink(registratieId)) +
      p(`Doe de meting in één keer af en vul je eigen antwoorden in. Het is geen test die je kunt halen of zakken; het is het startpunt waar je groei vanaf volgend jaar aan wordt afgemeten.`, `color:${MUT};font-size:14px`) +
      (plus
        ? p(`Je hebt gekozen voor de Plus Class. Kies hier je dag in januari, in Zaltbommel: <a href="${dagLink(registratieId)}" style="color:${NAVY};font-weight:700">kies je dag</a>.`, `color:${MUT};font-size:14px`)
        : "")
    )
  };
}

export function herinneringMail({ naam, registratieId }){
  const vn = esc(voornaam(naam));
  return {
    subject: "Je nulmeting staat nog open",
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je registratie in het Zelfstartregister is binnen, maar je nulmeting nog niet. Zonder meting geen nummer en geen badge.`) +
      knop("Doe je nulmeting", scanLink(registratieId)) +
      p(`Tien minuten, in één keer af.`, `color:${MUT};font-size:14px`)
    )
  };
}

export function badgeMail({ naam, nummer, verificatiecode, meetjaren, plus, registratieId }){
  const vn = esc(voornaam(naam));
  const check = `${CHECK_URL}/${encodeURIComponent(nummer)}`;
  const badgeUrl = `${SCAN_URL}/api/zelfstarters-badge?code=${encodeURIComponent(verificatiecode)}`;
  const jaren = (meetjaren || []).join(" · ");
  return {
    subject: `Je registratienummer: ${nummer}`,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je staat in het Zelfstartregister met nummer <b>${esc(nummer)}</b>. Je badge is er, met ${esc(jaren)} als ${(meetjaren || []).length > 1 ? "jaartallen" : "eerste jaartal"}.`) +
      `<div style="text-align:center;margin:20px 0"><img src="${badgeUrl}" width="120" alt="Zelfstarter-badge" style="display:inline-block"></div>` +
      p(`Zet de badge op LinkedIn, in je cv en in je e-mailhandtekening, met deze link erachter. Elke opdrachtgever ziet dan in één klik dat je registratie geldig is:`) +
      p(`<a href="${check}" style="color:${NAVY};font-weight:700">${esc(check)}</a>`) +
      p(`Openbaar is alleen dat je registratie geldig is, Standaard of Plus, sinds wanneer en wanneer je laatste meting was. Je score en je groei deel je zelf.`, `color:${MUT};font-size:14px`) +
      (plus
        ? p(`Na je Plus Class komt de plus op je badge.`, `color:${MUT};font-size:14px`)
        : "") +
      p(`Over twaalf maanden krijg je een uitnodiging voor je hermeting. Daarmee blijft je badge geldig en wordt je groei zichtbaar.`, `color:${MUT};font-size:14px`) +
      (registratieId ? knop("Naar je uitslag en je plan", uitslagLink(registratieId)) : "")
    )
  };
}

export function uitslagMail({ naam, registratieId, nummer, sterkste, ruimte, jaar, prijs }){
  const vn = esc(voornaam(naam));
  const uitslag = uitslagLink(registratieId);
  const cel = (inhoud, extra) => `<td style="padding:10px 12px;border-bottom:1px solid #eee8dc;font-family:${FONT};font-size:14px;color:${TX};vertical-align:top;${extra || ""}">${inhoud}</td>`;
  const rij = (wat, nu, straks) => `<tr>${cel(`<b>${wat}</b>`, `color:${MUT};width:26%`)}${cel(nu, `color:${MUT};width:34%`)}${cel(straks, `font-weight:700;background:#fff7f3`)}</tr>`;
  const maand = prijs ? `€ ${prijs.maand} per maand, betaald per jaar: € ${prijs.ex} excl. btw` : "€ 6,60 per maand, betaald per jaar: € 79 excl. btw";
  return {
    subject: `Je staat in het Zelfstartregister: ${nummer}`,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je eerste meting is binnen. Je staat in het Zelfstartregister met nummer <b>${esc(nummer)}</b>.`) +
      p(`<b>${esc(sterkste.zin)}</b>`) +
      p(`${esc(ruimte[0].zin)} ${esc(ruimte[1].zin)}`) +
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:22px 0 6px;border-collapse:collapse">
        <tr>
          <td align="center" style="width:50%;padding:14px;background:${PAPIER};border-radius:14px 0 0 14px">
            <img src="${SCAN_URL}/beeld/badge-geregistreerd.png" width="96" alt="Je badge nu" style="display:block;margin:0 auto 6px">
            <div style="font-family:${FONT};font-size:12px;color:${MUT};font-weight:700">NU: GEREGISTREERD</div>
            <div style="font-family:${FONT};font-size:12px;color:${MUT}">zonder jaartal</div>
          </td>
          <td align="center" style="width:50%;padding:14px;background:#fff7f3;border-radius:0 14px 14px 0;border:2px solid ${ORANJE}">
            <img src="${SCAN_URL}/beeld/badge-geverifieerd-${esc(jaar)}.png" width="96" alt="Je badge na verificatie" style="display:block;margin:0 auto 6px">
            <div style="font-family:${FONT};font-size:12px;color:${NAVY};font-weight:700">MET VERIFICATIE &amp; VOORKEUR</div>
            <div style="font-family:${FONT};font-size:12px;color:${NAVY}">geverifieerd, jaartal ${esc(jaar)}</div>
          </td>
        </tr>
      </table>` +
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:14px 0 8px;border-collapse:collapse">
        <tr>${cel("", `color:${MUT}`)}${cel("<b>Nu</b>", `color:${MUT}`)}${cel("<b>Met Verificatie &amp; Voorkeur</b>", `color:${NAVY};background:#fff7f3`)}</tr>
        ${rij("Je uitslag", "Score, sterkste kant, twee plekken met ruimte", "De volledige duiding: wat het is en wat het betekent in een opdracht")}
        ${rij("Je plan", "Geen", "Een als-dan plan voor de momenten die ertoe doen, met herinneringen")}
        ${rij("Je badge", "Grijs, zonder jaartal", `Geverifieerd, met jaartal ${esc(jaar)}, controleerbaar door elke opdrachtgever`)}
        ${rij("Over een jaar", "Niets", "Je hermeting, met je groei op de badge")}
      </table>` +
      p(`Zo ziet een opdrachtgever het straks als hij je nummer controleert:`, `color:${MUT};font-size:14px;margin-top:16px`) +
      `<div style="border:1px solid #e3dfd6;border-radius:14px;padding:12px 16px;font-family:${FONT};font-size:14px;color:${TX};margin:0 0 18px"><b style="color:${NAVY}">${esc(nummer)}</b> &middot; <span style="background:${NAVY};color:#fff;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700">Geverifieerd</span> &middot; ${esc(jaar)} &middot; ${esc(voornaam(naam))} ${esc(String(naam || "").split(/\s+/).slice(1).join(" "))}</div>` +
      p(`<b>${maand}.</b> Eén uur eerder aan de slag op je volgende opdracht, en het is terugverdiend.`) +
      knop("Kies Verificatie & Voorkeur", `${uitslag}#verifieer`) +
      p(`Of bekijk eerst <a href="${uitslag}" style="color:${NAVY};font-weight:700">je uitslag</a>.`, `color:${MUT};font-size:14px`) +
      p(`Wie dit jaar verifieert, draagt ${esc(jaar)} als eerste jaartal op zijn badge. Dat jaartal is er volgend jaar niet meer. Founding-tarief tot 31 december.`, `color:${MUT};font-size:14px`)
    )
  };
}

export function vervolgMail({ naam, registratieId, nummer, ruimte, jaar }){
  const vn = esc(voornaam(naam));
  return {
    subject: `${nummer}: je jaartal ${jaar} staat nog open`,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je staat in het Zelfstartregister als geregistreerd. ${esc(ruimte[0].zin)}`) +
      p(`Wat je daar aan doet op het eerste gesprek, in de eerste honderd dagen en bij de verlenging, is precies waar Verificatie &amp; Voorkeur, je jaar in de ontwikkelstructuur, over gaat. En het maakt je registratie controleerbaar voor elke opdrachtgever, met ${jaar} als eerste jaartal op je badge.`) +
      knop("Maak je registratie geverifieerd", uitslagLink(registratieId)) +
      p(`Dit is de enige herinnering die je hierover krijgt. Over een jaar nodigen we je uit voor je hermeting.`, `color:${MUT};font-size:14px`)
    )
  };
}

export function planMail({ naam, registratieId, regels }){
  const vn = esc(voornaam(naam));
  return {
    subject: "Je als-dan plan",
    html: shell(
      p(`Dag ${vn},`) +
      p(`Dit is wat je jezelf hebt voorgenomen voor de momenten die ertoe doen:`) +
      (regels || []).map(r => p(`<b>${esc(r)}</b>`, `padding-left:14px;border-left:3px solid ${ORANJE}`)).join("") +
      p(`Je krijgt op die momenten een herinnering. Wil je het plan aanpassen, dan kan dat op je uitslagpagina.`, `color:${MUT};font-size:14px`) +
      knop("Naar je uitslag", uitslagLink(registratieId))
    )
  };
}

export function dagMail({ naam, dag, registratieId }){
  const vn = esc(voornaam(naam));
  return {
    subject: `Je Plus Class: ${dag.label}`,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je Plus Class staat vast op <b>${esc(dag.label)}</b> in ${esc(dag.plaats)}. Een week vooraf krijg je het adres, de tijden en wat je meeneemt.`) +
      p(`Lukt de dag toch niet, dan kies je hier een andere, zolang er plek is:`) +
      knop("Wijzig je dag", dagLink(registratieId)) +
      p(`Na die dag komt de plus op je badge en je certificaat.`, `color:${MUT};font-size:14px`)
    )
  };
}
