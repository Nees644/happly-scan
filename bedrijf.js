// bedrijf.js — wie de factuur stuurt.
//
// Deze gegevens staan op elke factuur en zijn wettelijk verplicht. Ze staan
// hier en niet in de database, omdat ze zelden wijzigen en omdat een factuur
// zonder kloppend btw-nummer geen factuur is: dat hoort in de code te staan
// waar het gezien en nagekeken wordt.
//
// Zolang compleet() onwaar is gaat er geen factuur de deur uit. Dat is met
// opzet streng: een onvolledige factuur is erger dan geen factuur, want de
// klant kan hem niet boeken en jij kunt hem niet terugnemen.

export const BEDRIJF = {
  naam:       "Happly",
  toevoeging: "an Infinidea Venture",
  adres:      "Wielkamp 8a",
  postcode:   "5301 DB",
  plaats:     "Zaltbommel",
  land:       "NL",
  kvk:        "30141625",
  btw_nummer: "NL806215239B01",
  // Niet verplicht op de factuur: er is al betaald voordat hij wordt verstuurd.
  // Staat er wel op zodra hij is ingevuld, voor wie hem wil natrekken.
  iban:       "",
  telefoon:   "+31 85 878 5961",
  email:      "hallo@happly.nl",
  website:    "happly.nl"
};

// Wat er minimaal moet staan voordat er iets verstuurd kan worden.
export const VERPLICHT = ["naam", "adres", "postcode", "plaats", "kvk", "btw_nummer"];

export function ontbreekt(bedrijf = BEDRIJF){
  return VERPLICHT.filter(veld => !String(bedrijf[veld] || "").trim());
}

export function compleet(bedrijf = BEDRIJF){
  return ontbreekt(bedrijf).length === 0;
}
