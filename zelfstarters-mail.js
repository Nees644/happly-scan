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

/* De link waarmee een deelnemer zijn Zelfstarters Dag kiest of wijzigt, en zich aanmeldt voor de Zelfstarters Alumni Dag. */
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
        ? p(`Je hebt gekozen voor de Zelfstarters Dag. Kies hier je dag, elke maand één, in Zaltbommel: <a href="${dagLink(registratieId)}" style="color:${NAVY};font-weight:700">kies je dag</a>.`, `color:${MUT};font-size:14px`)
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
  const check = `${CHECK_URL}${encodeURIComponent(nummer)}`;
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
        ? p(`Na je Zelfstarters Dag komt de plus op je badge.`, `color:${MUT};font-size:14px`)
        : "") +
      p(`Over twaalf maanden krijg je een uitnodiging voor je hermeting. Daarmee blijft je badge geldig en wordt je groei zichtbaar.`, `color:${MUT};font-size:14px`) +
      (registratieId ? knop("Naar je uitslag en je plan", uitslagLink(registratieId)) : "")
    )
  };
}

export function uitslagMail({ naam, registratieId, nummer, score, sterkste, ruimte, jaar, prijs }){
  const vn = esc(voornaam(naam));
  const uitslag = uitslagLink(registratieId);
  const std = prijs?.standaard || { ex: "79", maand: "6,60" };
  const plus = prijs?.plus || { ex: "299", maand: "24,90" };
  const stamp = (tekst, kleur) => `<span style="background:${kleur};color:#fff;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700">${tekst}</span>`;
  const controle = inhoud => `<div style="border:1px solid #e3dfd6;border-radius:12px;padding:10px 14px;font-family:${FONT};font-size:14px;color:${TX};background:#fff;margin:8px 0 0">${inhoud}</div>`;
  const kop = (nr, titel, prijsTekst, kleur) => `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="font-family:${FONT};font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:${kleur}">${nr}</td></tr><tr>
      <td style="font-family:${FONT};font-size:19px;font-weight:800;color:${NAVY};line-height:1.2;padding:2px 0 ${prijsTekst ? "2px" : "10px"}">${titel}</td></tr>
      ${prijsTekst ? `<tr><td style="font-family:${FONT};font-size:13px;color:${MUT};padding-bottom:10px">${prijsTekst}</td></tr>` : ""}</table>`;
  const blok = (inhoud, stijl) => `<div style="border-radius:16px;padding:18px 20px;margin:0 0 14px;${stijl}">${inhoud}</div>`;
  const lijst = items => `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items.map(t => `<tr><td style="width:18px;font-family:${FONT};font-size:15px;color:${ORANJE};font-weight:800;vertical-align:top;padding:3px 0">&#10003;</td><td style="font-family:${FONT};font-size:14px;color:${TX};line-height:1.5;padding:3px 0">${t}</td></tr>`).join("")}</table>`;
  const punt = (p, i) => `<tr><td style="width:22px;font-family:${FONT};font-size:20px;font-weight:800;color:${ORANJE};vertical-align:top;padding:4px 0">${i + 1}</td><td style="font-family:${FONT};font-size:14px;color:${TX};line-height:1.5;padding:4px 0"><b>${esc(p.naam)}.</b> ${esc(p.zin.replace(/^[^.]*\.\s*/, ""))}</td></tr>`;
  return {
    subject: `Je staat in het Zelfstartregister: ${nummer}`,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je eerste meting is binnen. Je staat in het Zelfstartregister met nummer <b>${esc(nummer)}</b>. Hieronder wat je nu hebt, en wat je kunt kiezen.`) +

      blok(
        kop("Dit heb je nu &middot; gratis", "Geregistreerd", "", MUT) +
        (score != null ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px"><tr>
          <td style="font-family:${FONT};font-size:46px;font-weight:800;color:${NAVY};line-height:1;padding-right:16px">${esc(String(score))}</td>
          <td style="font-family:${FONT};font-size:13px;color:${MUT};line-height:1.45"><b style="color:${TX}">Je zelfkrachtscore</b><br>eigenaarschap, initiatief en daadkracht, langs Zien, Sturen en Doen. Van jou, nergens openbaar.</td>
        </tr></table>` : "") +
        p(`<b>${esc(sterkste.zin)}</b>`, "font-size:14px;margin-bottom:8px") +
        p(`<b>Waar je aan kunt werken</b>`, "font-size:14px;margin-bottom:2px") +
        `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px">${punt(ruimte[0], 0)}${punt(ruimte[1], 1)}</table>` +
        p(`Wat een opdrachtgever ziet als hij je nummer controleert op <a href="${CHECK_URL}${esc(nummer)}" style="color:${NAVY};font-weight:700">zelfstarters.nl/check</a>:`, `color:${MUT};font-size:13px;margin:0`) +
        controle(`<b>${esc(nummer)}</b> &middot; ${stamp("Geregistreerd", MUT)} <span style="color:${MUT};font-size:13px">zonder jaartal</span>`) +
        p(`Dit blijft zo, ook als je niets kiest. Wat je uitslag betekent in een opdracht en wat je ermee doet, zit in de volgende stap.`, `color:${MUT};font-size:13px;margin:12px 0 0`),
        `background:${PAPIER}`
      ) +

      blok(
        kop("Optie 2 &middot; de stap die je kiest", "Verificatie &amp; Voorkeur", `<b style="color:${TX}">€ ${esc(std.maand)} per maand</b>, betaald per jaar: € ${esc(std.ex)} excl. btw`, ORANJE) +
        lijst([
          `<b>De volledige duiding</b> van je meting: wat het is en wat het betekent in een opdracht`,
          `<b>Je als-dan plan</b> voor de momenten die ertoe doen, met herinneringen`,
          `<b>Geverifieerd in het register</b>, met jaartal ${esc(jaar)}: controleerbaar door elke opdrachtgever`,
          `<b>Je badge</b> met jaartal, voor cv, LinkedIn en voorstel`,
          `<b>Je hermeting over een jaar</b>, met je groei in het register`
        ]) +
        p(`Wat een opdrachtgever dan ziet:`, `color:${MUT};font-size:13px;margin:12px 0 0`) +
        controle(`<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="font-family:${FONT};font-size:14px;color:${TX}"><b>${esc(nummer)}</b> &middot; ${stamp("Geverifieerd", NAVY)} &middot; ${esc(jaar)}</td><td align="right" style="width:70px"><img src="${SCAN_URL}/beeld/badge-geverifieerd-${esc(jaar)}.png" width="60" alt="Je badge na verificatie" style="display:block"></td></tr></table>`) +
        p(`Een badge kun je kopiëren. Het register niet.`, `color:${MUT};font-size:13px;margin:10px 0 0`) +
        knop("Kies Verificatie & Voorkeur", `${uitslag}?keuze=jaar#verifieer`),
        `border:2px solid ${ORANJE};background:#fff7f3`
      ) +

      blok(
        kop("Optie 3 &middot; de uitbreiding", "De Zelfstarters Dag", `<b style="color:${TX}">€ ${esc(plus.ex)} ineens</b>, excl. btw, alles inbegrepen`, NAVY) +
        lijst([
          `<b>Je scan, je registratie en je geverifieerde badge</b> met nummer`,
          `<b>Dag 1, de Zelfstarters Dag</b>: in één dag werk je aan de punten uit je scan en maak je je groeiplan, met een practitioner en vakgenoten. Elke maand één, vanaf tien deelnemers`,
          `<b>Dag 2, de Alumni Dag</b> na zes maanden: je hermeting, ervaringen uitwisselen, sprekers en een werkgeversmarkt`,
          `<b>De plus op je badge</b>`
        ]) +
        p(`Wat een opdrachtgever dan ziet:`, `color:${MUT};font-size:13px;margin:12px 0 0`) +
        controle(`<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="font-family:${FONT};font-size:14px;color:${TX}"><b>${esc(nummer)}</b> &middot; ${stamp("Geverifieerd &middot; Plus", NAVY)} &middot; ${esc(jaar)}</td><td align="right" style="width:70px"><img src="${SCAN_URL}/beeld/badge-plus-${esc(jaar)}.png" width="60" alt="Je badge met plus" style="display:block"></td></tr></table>`) +
        p(`Vijftien plekken per dag. <a href="${uitslag}?keuze=plus#verifieer" style="color:${NAVY};font-weight:700">Kies de Zelfstarters Dag</a>`, `font-size:14px;margin:12px 0 0`),
        `border:1px solid #e3dfd6;background:#fff`
      ) +

      p(`Of bekijk eerst <a href="${uitslag}" style="color:${NAVY};font-weight:700">je uitslag</a>. Wie dit jaar verifieert, draagt ${esc(jaar)} als eerste jaartal; dat jaartal is er volgend jaar niet meer. Founding-tarief tot 31 december.`, `color:${MUT};font-size:13px;margin-top:6px`)
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

export function planMail({ naam, registratieId, regels, datums }){
  const vn = esc(voornaam(naam));
  const metDatum = (datums || []).filter(Boolean);
  return {
    subject: "Je als-dan plan",
    html: shell(
      p(`Dag ${vn},`) +
      p(`Dit is wat je jezelf hebt voorgenomen voor de momenten die ertoe doen:`) +
      (regels || []).map(r => p(`<b>${esc(r)}</b>`, `padding-left:14px;border-left:3px solid ${ORANJE}`)).join("") +
      p(`<b>Zo werken de herinneringen.</b> ${metDatum.length ? `Je hebt ${metDatum.length === 1 ? "een datum" : "datums"} ingevuld: de dag ervoor krijg je een mail met je eigen zin. ` : "Je hebt nog geen datum ingevuld; weet je ongeveer wanneer een moment komt, zet hem dan op je uitslagpagina en je krijgt de dag ervoor een mail. "}Daarnaast krijg je drie keer een korte check: na een week, na drie maanden en na vijf maanden. Is het moment geweest, wat deed je, en wil je de regel bijstellen.`, `color:${MUT};font-size:14px`) +
      p(`Bewaar deze mail, of zet de zinnen ergens waar je ze ziet.`, `color:${MUT};font-size:14px`) +
      knop("Naar je plan", `${uitslagLink(registratieId)}#plan`)
    )
  };
}

/* De dag voor een verwacht moment: de eigen zin, meer niet. */
export function planHerinneringMail({ naam, registratieId, regel }){
  const vn = esc(voornaam(naam));
  return {
    subject: `Morgen: ${regel.momentLabel}`,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je gaf aan dat dit moment eraan komt: <b>${esc(regel.momentLabel)}</b>. Dit is wat je jezelf had voorgenomen:`) +
      p(`<b>${esc(regel.tekst)}</b>`, `padding-left:14px;border-left:3px solid ${ORANJE};font-size:17px`) +
      p(`Meer is het niet. Doe het klein en doe het morgen.`, `color:${MUT};font-size:14px`) +
      knop("Naar je plan", `${uitslagLink(registratieId)}#plan`)
    )
  };
}

/* De check na een week, drie maanden en vijf maanden. */
export function planCheckMail({ naam, registratieId, regels, stap }){
  const vn = esc(voornaam(naam));
  const kop = { week: "Een week met je plan", m3: "Drie maanden met je plan", m5: "Vijf maanden met je plan" }[stap];
  const slot = {
    week: "Staan de zinnen nog ergens waar je ze ziet? Is een moment al voorbijgekomen, dan is de vraag: deed je het, en hoe ging dat.",
    m3: "Drie maanden is lang genoeg om te weten of een regel werkt. Werkt hij niet, maak hem kleiner. Is het moment nog niet gekomen, laat hem staan.",
    m5: "Nog een paar weken, dan komt je hermeting in zicht. Wat je nu nog doet, telt daarin mee. Kijk je plan nog één keer na."
  }[stap];
  return {
    subject: kop,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Dit had je jezelf voorgenomen:`) +
      (regels || []).map(r => p(`<b>${esc(r)}</b>`, `padding-left:14px;border-left:3px solid ${ORANJE}`)).join("") +
      p(slot, `color:${MUT};font-size:14px`) +
      knop("Bekijk of pas je plan aan", `${uitslagLink(registratieId)}#plan`)
    )
  };
}

export function dagMail({ naam, dag, registratieId }){
  const vn = esc(voornaam(naam));
  return {
    subject: `Je Zelfstarters Dag: ${dag.label}`,
    html: shell(
      p(`Dag ${vn},`) +
      p(`Je Zelfstarters Dag staat op <b>${esc(dag.label)}</b> in ${esc(dag.plaats)}. De dag gaat door vanaf tien deelnemers; is dat niet gehaald, dan schuift de groep een maand en hoor je dat uiterlijk twee weken vooraf. Een week vooraf krijg je het adres, de tijden en wat je meeneemt.`) +
      p(`Lukt de dag toch niet, dan kies je hier een andere, zolang er plek is:`) +
      knop("Wijzig je dag", dagLink(registratieId)) +
      p(`Na die dag komt de plus op je badge en je certificaat.`, `color:${MUT};font-size:14px`)
    )
  };
}
