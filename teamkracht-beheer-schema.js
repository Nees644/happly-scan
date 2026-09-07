// teamkracht-beheer-schema.js
// Welke tabellen en welke kolommen de beheerpagina mag bewerken. Eén bron voor
// de pagina en de route: de pagina bouwt er zijn formulieren mee, de route
// gebruikt hem als witte lijst. Wat hier niet staat, is niet te wijzigen.

export const SCHEMA = {
  config: {
    tabel: "teamkracht_config", sleutel: "id", enkel: true, updated: true,
    naam: "Instellingen",
    uitleg: "De breedte van de middenband en de referentie waar profielen tegen worden afgezet. Wijzigingen werken door bij de volgende berekening; bestaande teambeelden blijven bevroren.",
    velden: [
      { kolom: "middenband_sd", label: "Breedte middenband in standaarddeviaties", type: "getal" },
      { kolom: "min_deelnemers_kaart", label: "Minimum deelnemers voor een kaart", type: "getal" },
      { kolom: "min_deelnemers_lijnen", label: "Minimum deelnemers voor individuele lijnen", type: "getal" },
      { kolom: "norm_bron", label: "Bron van de referentie", type: "keuze", opties: ["vast", "landelijk"] },
      { kolom: "norm_zien", label: "Referentie Zien", type: "getal" },
      { kolom: "norm_sturen", label: "Referentie Sturen", type: "getal" },
      { kolom: "norm_doen", label: "Referentie Doen", type: "getal" },
      { kolom: "sd_zien", label: "Standaarddeviatie Zien", type: "getal" },
      { kolom: "sd_sturen", label: "Standaarddeviatie Sturen", type: "getal" },
      { kolom: "sd_doen", label: "Standaarddeviatie Doen", type: "getal" },
      { kolom: "norm_n", label: "Aantal metingen onder de referentie", type: "getal" },
      { kolom: "norm_gemeten_op", label: "Gemeten op (jjjj-mm-dd)", type: "tekst" },
      { kolom: "norm_versie", label: "Versie van de referentie", type: "tekst" }
    ]
  },
  regels: {
    tabel: "teamkracht_regels", sleutel: "code", updated: true,
    naam: "Regels", titelveld: "titel",
    uitleg: "De dynamieken die op de kaart kunnen komen. De voorwaarde staat als JSON en wordt gecontroleerd voordat hij wordt opgeslagen.",
    velden: [
      { kolom: "titel", label: "Kop op de kaart", type: "tekst" },
      { kolom: "titel_geteld", label: "Aanloop met aantallen, met {n_HLL} als plaatshouder", type: "tekst" },
      { kolom: "richting", label: "Richting", type: "keuze", opties: ["versterkt", "remt", "neutraal"] },
      { kolom: "voorwaarde", label: "Voorwaarde", type: "json" },
      { kolom: "dynamiek", label: "Dynamiek", type: "tekstvak" },
      { kolom: "signaal", label: "Signaal om te toetsen", type: "tekstvak" },
      { kolom: "interventie", label: "Interventie", type: "tekstvak" },
      { kolom: "gespreksvraag", label: "Gespreksvraag", type: "tekstvak" },
      { kolom: "gewicht_opslag", label: "Gewichtsopslag", type: "getal" },
      { kolom: "volgorde", label: "Volgorde", type: "getal" },
      { kolom: "actief", label: "Actief", type: "vinkje" }
    ]
  },
  profielen: {
    tabel: "teamkracht_profielen", sleutel: "code", updated: true,
    naam: "Profielen", titelveld: "naam",
    uitleg: "De negen patronen. De tekst voor de deelnemer is de enige die zij zelf te zien krijgen, op hun eigen resultaatpagina.",
    velden: [
      { kolom: "naam", label: "Naam", type: "tekst" },
      { kolom: "zo_ziet_het_eruit", label: "Zo ziet het eruit", type: "tekstvak" },
      { kolom: "zin", label: "Zin die je hoort", type: "tekst" },
      { kolom: "voegt_toe", label: "Voegt toe", type: "tekstvak" },
      { kolom: "kost_team", label: "Kost het team", type: "tekstvak" },
      { kolom: "kost_persoon", label: "Kost de persoon", type: "tekstvak" },
      { kolom: "breuk", label: "Waar de keten breekt", type: "tekstvak" },
      { kolom: "ontwikkelrichting", label: "Ontwikkelrichting", type: "tekstvak" },
      { kolom: "valkuil_coach", label: "Valkuil voor de coach", type: "tekstvak" },
      { kolom: "tekst_deelnemer", label: "Tekst voor de deelnemer, ik-vorm", type: "tekstvak" },
      { kolom: "actief", label: "Actief", type: "vinkje" }
    ]
  },
  interventies: {
    tabel: "teamkracht_interventies", sleutel: "code",
    naam: "Interventies", titelveld: "titel",
    uitleg: "Wat een team gaat doen. Ritme en telling maken het meetbaar; zonder telling is een interventie een voornemen.",
    velden: [
      { kolom: "titel", label: "Titel", type: "tekst" },
      { kolom: "breuk", label: "Hoort bij welke breuk", type: "tekst" },
      { kolom: "profielen", label: "Hoort bij welke profielen, als JSON-lijst", type: "json" },
      { kolom: "tekst", label: "Wat het team doet", type: "tekstvak" },
      { kolom: "eigenaar_suggestie", label: "Wie het oppakt", type: "tekstvak" },
      { kolom: "ritme", label: "Ritme", type: "tekst" },
      { kolom: "telling", label: "Wat er geteld wordt", type: "tekstvak" },
      { kolom: "gespreksvraag", label: "Gespreksvraag", type: "tekstvak" },
      { kolom: "volgorde", label: "Volgorde", type: "getal" },
      { kolom: "actief", label: "Actief", type: "vinkje" }
    ]
  },
  doelregels: {
    tabel: "teamkracht_doelregels", sleutel: "code", updated: true,
    naam: "Ambitiebanden", titelveld: "titel",
    uitleg: "Wat een gevraagde verschuiving betekent, in punten per jaar. Werkhypothese tot er genoeg hermetingen zijn om de werkelijke verdeling te kennen.",
    velden: [
      { kolom: "titel", label: "Naam van de band", type: "tekst" },
      { kolom: "voorwaarde", label: "Voorwaarde, min_stijging en max_stijging", type: "json" },
      { kolom: "oordeel", label: "Oordeel", type: "keuze", opties: ["haalbaar", "ambitieus", "onwaarschijnlijk"] },
      { kolom: "melding", label: "Wat de coach te zien krijgt", type: "tekstvak" },
      { kolom: "volgorde", label: "Volgorde", type: "getal" },
      { kolom: "actief", label: "Actief", type: "vinkje" }
    ]
  }
};

/* Taalregel uit de briefing: geen gedachtestreep en geen uitroepteken. Hier
   afgedwongen bij het opslaan, zodat de regel niet alleen voor de seed geldt. */
export const VERBODEN = [
  { teken: "—", naam: "een lange gedachtestreep" },
  { teken: "–", naam: "een half lange gedachtestreep" },
  { teken: "!", naam: "een uitroepteken" }
];

export function taalcontrole(tekst){
  if (typeof tekst !== "string") return null;
  const gevonden = VERBODEN.find(v => tekst.includes(v.teken));
  return gevonden ? `Deze tekst bevat ${gevonden.naam}. Gebruik een komma, een dubbele punt of een puntkomma.` : null;
}
