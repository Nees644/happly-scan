// zelfstarters-mail.js
// De drie mails van het Zelfstartregister, als pure functies.
//
// 1. welkom: direct na betaling, met de link naar de nulmeting
// 2. herinnering: na een dag zonder meting, zelfde link
// 3. badge: zodra de meting binnen is, met nummer, badge en controlelink
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

/* De link waarmee een Plus Class-deelnemer zijn dag kiest of wijzigt. */
export function dagLink(registratieId){
  return `${SCAN_URL}/zelfstarters/dag?z=${encodeURIComponent(registratieId)}`;
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

export function badgeMail({ naam, nummer, verificatiecode, meetjaren, plus }){
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
      p(`Over twaalf maanden krijg je een uitnodiging voor je hermeting. Daarmee blijft je badge geldig en wordt je groei zichtbaar.`, `color:${MUT};font-size:14px`)
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
