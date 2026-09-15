// leidersbeeld.js — de regels rond het Leidersbeeld, zonder database en zonder
// netwerk, zodat ze te testen zijn.
//
// Het Leidersbeeld is het beeld van de teamleider over zijn eigen team, op
// dezelfde twaalf items als de meting. Het is gratis, staat los van een
// aankoop, en is tegelijk de lead: wie zijn beeld heeft gegeven, wil weten hoe
// het team het zelf doet.
//
// Hoort bij briefings/leidersbeeld.md.

import { ITEMS, scores } from "./items.js";

// Het minimum voor een Teamkrachtkaart. Staat in
// teamkracht_config.min_deelnemers_kaart; hier alleen om de band te kiezen.
export const MINIMUM_DEELNEMERS = 5;

// De banden lopen langs het minimum, zodat van elke band te zeggen is of een
// Teamfoto mogelijk is. Een band die de grens overspant kan dat niet.
export const TEAMOMVANG = ["2-4", "5-9", "10-20", "21+"];

export const MEETMOMENTEN = ["start", "eind"];
export const STATUSSEN = ["ingevuld", "gekoppeld", "betaald", "gesloten"];

// Na hoeveel dagen de enige herinnering gaat.
export const HERINNERING_NA_DAGEN = 7;

export function kanKaartKrijgen(band){
  return TEAMOMVANG.includes(band) && band !== "2-4";
}

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// De eerste stap van het formulier. Geeft de fouten terug in de volgorde van
// het scherm, zodat de bovenste fout ook de bovenste vraag is.
export function controleerGegevens(g = {}){
  const fouten = [];
  const tekst = v => String(v ?? "").trim();
  if (tekst(g.leider_naam).length < 2) fouten.push({ veld: "leider_naam", tekst: "Vul je naam in." });
  if (!MAIL.test(tekst(g.leider_email))) fouten.push({ veld: "leider_email", tekst: "Vul een e-mailadres in waar je bij kunt." });
  if (tekst(g.organisatie).length < 2) fouten.push({ veld: "organisatie", tekst: "Vul de naam van je organisatie in." });
  if (!TEAMOMVANG.includes(g.teamomvang)) fouten.push({ veld: "teamomvang", tekst: "Kies hoe groot je team is." });
  if (g.privacy !== true) fouten.push({ veld: "privacy", tekst: "Zonder akkoord op de privacyverklaring kunnen we je het resultaat niet mailen." });
  return { ok: fouten.length === 0, fouten };
}

// De volledige inzending: gegevens plus antwoorden. Geeft bij goedkeuring de
// rij terug die de database in kan, zodat de route zelf niets meer uitrekent.
export function maakInzending(inzending = {}, nu = new Date()){
  const g = controleerGegevens(inzending);
  if (!g.ok) return { ok: false, fouten: g.fouten };

  const gemeten = scores(inzending.antwoorden);
  if (!gemeten) return { ok: false, fouten: [{ veld: "antwoorden", tekst: `Beantwoord alle ${ITEMS.length} vragen.` }] };

  const moment = MEETMOMENTEN.includes(inzending.meetmoment) ? inzending.meetmoment : "start";
  const tijd = nu.toISOString();
  return {
    ok: true,
    rij: {
      meetmoment:        moment,
      leider_naam:       String(inzending.leider_naam).trim(),
      leider_email:      String(inzending.leider_email).trim().toLowerCase(),
      organisatie:       String(inzending.organisatie).trim(),
      teamomvang:        inzending.teamomvang,
      zien:              gemeten.zien,
      sturen:            gemeten.sturen,
      doen:              gemeten.doen,
      index_score:       gemeten.index,
      antwoorden:        gemeten.items,
      herkomst_src:      schoonHerkomst(inzending.src),
      partner_id:        uuidOfNull(inzending.partner),
      opt_in_kwartaal:   inzending.kwartaal === true,
      privacy_akkoord_op: tijd,
      ingevuld_op:       tijd,
      status:            "ingevuld"
    },
    index: gemeten.index
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOfNull(waarde){
  const t = String(waarde ?? "").trim();
  return UUID.test(t) ? t.toLowerCase() : null;
}

// De src uit de URL komt van buiten. Alleen letters, cijfers, streepje en
// liggend streepje, hoogstens veertig tekens; de rest valt weg.
export function schoonHerkomst(waarde){
  const t = String(waarde ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return t ? t.slice(0, 40) : null;
}

export function voornaam(naam){
  const eerste = String(naam ?? "").trim().split(/\s+/)[0] || "";
  return eerste.charAt(0).toUpperCase() + eerste.slice(1);
}

export function mailOnderwerp(index){
  return `Het Leidersbeeld van jouw team is ${index}`;
}

export function herinneringOnderwerp(index){
  return `Jouw Leidersbeeld is ${index}. En het team?`;
}

// Welke rijen vandaag een herinnering krijgen. Alleen wie nog op 'ingevuld'
// staat, zich niet heeft afgemeld, er nog geen heeft gehad, en zeven dagen
// geleden heeft ingevuld. Precies een keer, want herinnering_op wordt gezet.
export function magHerinneren(rij = {}, nu = new Date()){
  if (rij.status !== "ingevuld") return false;
  if (rij.afgemeld === true) return false;
  if (rij.herinnering_op) return false;
  if (!rij.created_at) return false;
  const dagen = (nu.getTime() - new Date(rij.created_at).getTime()) / 86400000;
  return dagen >= HERINNERING_NA_DAGEN;
}

// De vier toestanden van /leider/:token uit paragraaf 6 van de briefing.
//   a  ingevuld, nog geen team
//   b  gekoppeld of betaald, kaart nog niet vrij
//   c  kaart vrijgegeven
//   d  hermeting klaargezet, nog geen eindbeeld
export function toestand(rij = {}, { kaartVrij = false, hermetingOpen = false } = {}){
  if (kaartVrij) return "c";
  if (hermetingOpen) return "d";
  if (rij.team_id) return "b";
  return "a";
}
