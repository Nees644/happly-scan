// zelfstarters-dagen.js
// De Zelfstarters Dag (één dag live, elke maand één) en de Zelfstarters Alumni Dag (twee
// keer per jaar). Een dag erbij of eraf is een regel in deze lijst; pagina's
// en routes lezen hem hier. Een Dag gaat door vanaf tien deelnemers en heeft
// plek voor vijftien; onder de tien schuift de groep naar de volgende maand.
// Besluit 6 november 2026.

export const MIN_PER_DAG = 10;
export const MAX_PER_DAG = 15;

export const DAGEN = [
  { datum: "2027-01-15", label: "vrijdag 15 januari 2027", plaats: "Zaltbommel" },
  { datum: "2027-02-12", label: "vrijdag 12 februari 2027", plaats: "Zaltbommel" },
  { datum: "2027-03-12", label: "vrijdag 12 maart 2027", plaats: "Zaltbommel" },
  { datum: "2027-04-16", label: "vrijdag 16 april 2027", plaats: "Zaltbommel" },
  { datum: "2027-05-21", label: "vrijdag 21 mei 2027", plaats: "Zaltbommel" },
  { datum: "2027-06-18", label: "vrijdag 18 juni 2027", plaats: "Zaltbommel" }
];

/* De Zelfstarters Alumni Dag, zes maanden na de Zelfstarters Dag: de hermeting, ervaringen uitwisselen, sprekers, een werkgeversmarkt en de uitreiking van de plus. Geen
   maximum; wie geverifieerd is mag komen. */
export const TERUGKOMDAGEN = [
  { datum: "2027-06-25", label: "vrijdag 25 juni 2027", plaats: "centraal in Nederland" },
  { datum: "2027-12-10", label: "vrijdag 10 december 2027", plaats: "centraal in Nederland" }
];

export function dagBestaat(datum){
  return DAGEN.some(d => d.datum === datum);
}
export function terugkomdagBestaat(datum){
  return TERUGKOMDAGEN.some(d => d.datum === datum);
}

/* Per Dag: bezet, vrij, of hij doorgaat (minimaal tien) en of hij nog te
   kiezen is. Uit een telling per datum. */
export function beschikbaarheid(telling, nu = new Date()){
  const vandaag = nu.toISOString().slice(0, 10);
  return DAGEN.map(d => {
    const bezet = telling[d.datum] || 0;
    const vrij = Math.max(0, MAX_PER_DAG - bezet);
    return { ...d, bezet, vrij, min: MIN_PER_DAG, gaat_door: bezet >= MIN_PER_DAG, open: vrij > 0 && d.datum > vandaag };
  });
}

export function terugkomdagen(telling, nu = new Date()){
  const vandaag = nu.toISOString().slice(0, 10);
  return TERUGKOMDAGEN.map(d => ({ ...d, bezet: telling[d.datum] || 0, open: d.datum > vandaag }));
}
