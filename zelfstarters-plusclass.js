// zelfstarters-plusclass.js
// De dagen van de Plus Class en het aantal plekken per dag. Een dag erbij of
// eraf is een regel in deze lijst; de pagina en de route lezen hem hier.
// Plekken per dag: 15, aanname van 2 november 2026, aan te passen.

export const PLEKKEN_PER_DAG = 15;

export const DAGEN = [
  { datum: "2027-01-15", label: "vrijdag 15 januari", plaats: "Zaltbommel" },
  { datum: "2027-01-16", label: "zaterdag 16 januari", plaats: "Zaltbommel" },
  { datum: "2027-01-22", label: "vrijdag 22 januari", plaats: "Zaltbommel" },
  { datum: "2027-01-23", label: "zaterdag 23 januari", plaats: "Zaltbommel" }
];

export function dagBestaat(datum){
  return DAGEN.some(d => d.datum === datum);
}

/* Per dag het aantal vrije plekken, uit een telling per datum. */
export function beschikbaarheid(telling, nu = new Date()){
  const vandaag = nu.toISOString().slice(0, 10);
  return DAGEN.map(d => {
    const bezet = telling[d.datum] || 0;
    const vrij = Math.max(0, PLEKKEN_PER_DAG - bezet);
    return { ...d, vrij, open: vrij > 0 && d.datum > vandaag };
  });
}
