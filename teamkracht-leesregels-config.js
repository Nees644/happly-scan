// teamkracht-leesregels-config.js
// De drempels van de leesregels L1 tot en met L6 (briefing/teamkracht/
// briefing_code_doel_ruimte_v1.md, paragraaf 5). Eén plek, geen getallen in
// de logica. Maarten ijkt deze waarden op de eerste tien founderteams.
//
// Schaal: de dimensiescores staan in de database als hele punten van 0 tot
// 100 (index_scan_results.zien, sturen, doen zijn int) en de teamlijn is het
// gemiddelde daarvan met één decimaal (teamkracht_teambeeld.team_zien enz.).
// Dat is dezelfde schaal als in de briefing, dus er wordt niets omgerekend.
//
// Elke berekende rij in teamkracht_ruimte bewaart deze waarden in
// config_snapshot, zodat een uitslag van vandaag niet verschuift als de
// drempels morgen worden bijgesteld.

export const REGELVERSIE = "L-v1";

// L2: een eerdere dimensie in de keten die minstens zoveel punten lager
// scoort dan de leidende dimensie wordt de eerste stap.
export const KETEN_DREMPEL = 10;

// L3: onder dit aantal punten ruimte staat een dimensie op orde.
export const OP_ORDE_DREMPEL = 5;

// Harde regel 6 en paragraaf 6.1: de anonieme verdeling van individuele
// ruimte staat pas op de kaart vanaf dit aantal deelnemers. Zelfde drempel
// als teamkracht_config.min_deelnemers_lijnen.
export const MIN_DEELNEMERS_INDIVIDUELE_VERDELING = 10;

// L3: "de grens van de bovenste helft van het landelijk beeld". Het landelijk
// beeld is bevroren als gemiddelde en standaarddeviatie per dimensie
// (teamkracht_config, config_snapshot van het teambeeld); een mediaan of een
// verdeling is er niet. De grens wordt daarom berekend als
// gemiddelde + LANDELIJK_BOVENSTE_HELFT_SD × sd. Bij een normale verdeling
// ligt het gemiddelde van de bovenste helft op 0,8 standaarddeviatie boven
// het gemiddelde; dat is de streng gekozen grens (besluit Maarten,
// 17 september 2026). Op 0 zou de grens het gemiddelde zelf zijn.
export const LANDELIJK_BOVENSTE_HELFT_SD = 0.8;

export const LEESREGELS_CONFIG = Object.freeze({
  regelversie: REGELVERSIE,
  keten_drempel: KETEN_DREMPEL,
  op_orde_drempel: OP_ORDE_DREMPEL,
  min_deelnemers_individuele_verdeling: MIN_DEELNEMERS_INDIVIDUELE_VERDELING,
  landelijk_bovenste_helft_sd: LANDELIJK_BOVENSTE_HELFT_SD
});
