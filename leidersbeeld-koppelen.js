// leidersbeeld-koppelen.js — de weg van lead naar team, zonder database.
//
// Een Leidersbeeld begint los van alles. Het wordt aan een team gekoppeld op
// twee manieren: de leider koopt zelf een Teamfoto, of een partner maakt een
// team aan voor iemand van wie een Leidersbeeld openstaat. Dat tweede gaat
// nooit vanzelf; er wordt altijd eerst gevraagd.
//
// Hoort bij stap 3 van briefings/leidersbeeld.md.

import { STATUSSEN } from "./leidersbeeld.js";

// De volgorde is de kern: een status gaat alleen vooruit. Een tweede melding
// van Mollie mag 'betaald' niet terugzetten naar 'gekoppeld', en een kaart die
// is vrijgegeven gaat nooit meer open.
export function verderDan(huidig, nieuw){
  const a = STATUSSEN.indexOf(huidig), b = STATUSSEN.indexOf(nieuw);
  if (b < 0) return huidig;
  if (a < 0) return nieuw;
  return b > a ? nieuw : huidig;
}

// Mag deze ingelogde gebruiker dit Leidersbeeld aan een team hangen. Het token
// uit de mail is het bewijs dat je de leider bent, maar een account koppelen
// vraagt meer: het adres moet kloppen, of je bent de partner van deze lead, of
// je beheert de omgeving.
export function magKoppelen(rij, { email = "", userId = null, beheerder = false } = {}){
  if (!rij) return "Dit Leidersbeeld bestaat niet.";
  if (rij.status === "gesloten") return "De kaart van dit team is al gemaakt. Dit Leidersbeeld is gesloten.";
  if (rij.team_id) return "Aan dit Leidersbeeld hangt al een team.";
  if (beheerder) return null;
  if (userId && rij.partner_id === userId) return null;
  const zelfde = String(email || "").trim().toLowerCase() === String(rij.leider_email || "").trim().toLowerCase();
  if (!zelfde) return "Log in met het adres waarop je je Leidersbeeld hebt ontvangen.";
  return null;
}

// De koppelvraag aan de partner. Alleen stellen als er iets te koppelen valt:
// een openstaand Leidersbeeld op dit adres, zonder team.
export function koppelvraag(rij){
  if (!rij) return null;
  if (rij.team_id) return null;
  if (rij.status !== "ingevuld") return null;
  return {
    leidersbeeld_id: rij.id,
    naam: rij.leider_naam,
    organisatie: rij.organisatie,
    tekst: `Er staat een Leidersbeeld klaar van ${rij.leider_naam}, ${rij.organisatie}. Koppelen?`
  };
}

// Hoe het team gaat heten als de leider zelf koopt. Hij heeft geen teamnaam
// opgegeven, alleen zijn organisatie.
export function teamnaamVoor(rij){
  const org = String(rij?.organisatie || "").trim();
  return org ? `Team ${org}`.slice(0, 120) : "Mijn team";
}
