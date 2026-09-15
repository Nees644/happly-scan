// register.js — de regels van het openbare register, zonder database.
//
// Het register is de reden dat een certificaat iets waard is: het is na te
// gaan. Daarom staat een pagina er ook als een licentie is verlopen of
// ingetrokken; hij zegt dan eerlijk dat het niet actief is. Een badge die
// iemand vorig jaar op LinkedIn zette moet blijven werken.
//
// Alleen wie uitdrukkelijk toestemming heeft gegeven staat erin. Zonder
// toestemming bestaat het certificaat wel en de pagina niet.

export const NIVEAUS = ["lezer", "begeleider", "opleider"];

export const NIVEAU_LABEL = {
  lezer: "Lezer",
  begeleider: "Begeleider",
  opleider: "Opleider"
};

/* Een slug uit een naam. Alleen kleine letters, cijfers en streepjes, en
   accenten worden teruggebracht tot hun basisletter. */
export function slugVan(naam){
  const kaal = String(naam || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return kaal || null;
}

/* Twee mensen kunnen dezelfde naam hebben. De tweede krijgt er een cijfer bij;
   de eerste houdt zijn schone adres, want dat staat al ergens op een badge. */
export function uniekeSlug(naam, bezet = []){
  const basis = slugVan(naam);
  if (!basis) return null;
  const inGebruik = new Set(bezet);
  if (!inGebruik.has(basis)) return basis;
  for (let n = 2; n < 100; n++){
    const kandidaat = `${basis}-${n}`;
    if (!inGebruik.has(kandidaat)) return kandidaat;
  }
  return null;
}

/* Wat er op de pagina staat: actief of niet actief, en waarom. Een certificaat
   met status actief is nog niet genoeg; de licentie moet lopen. */
export function statusVan(certificaat = {}, gebruiker = {}, vandaag = new Date()){
  if (certificaat.status === "ingetrokken" || certificaat.status === "ingetrokken_op_verzoek"){
    return { actief: false, tekst: "Niet actief", uitleg: "Dit certificaat is ingetrokken." };
  }
  if (certificaat.status === "verlopen"){
    return { actief: false, tekst: "Niet actief", uitleg: "Dit certificaat is verlopen." };
  }
  const tot = gebruiker.licentie_tot ? new Date(gebruiker.licentie_tot) : null;
  if (gebruiker.licentie_actief === false || (tot && tot < vandaag)){
    return { actief: false, tekst: "Niet actief", uitleg: "De licentie bij dit certificaat loopt op dit moment niet." };
  }
  return { actief: true, tekst: "Actief", uitleg: null };
}

/* De rij zoals hij in het register hoort te staan. Geeft null terug als er
   niets te tonen valt; dan bestaat de pagina niet. */
export function registerRij({ certificaat, gebruiker, vandaag = new Date() }){
  if (!certificaat || !gebruiker) return null;
  if (gebruiker.register_toestemming !== true) return null;
  if (!gebruiker.register_slug) return null;

  const naam = certificaat.naam_op_certificaat || gebruiker.naam;
  if (!naam) return null;

  const status = statusVan(certificaat, gebruiker, vandaag);
  return {
    slug: gebruiker.register_slug,
    naam,
    niveau: certificaat.niveau,
    niveau_label: NIVEAU_LABEL[certificaat.niveau] || certificaat.niveau,
    sinds: certificaat.uitgegeven_op,
    verificatiecode: certificaat.verificatiecode,
    organisatie: gebruiker.organisatie || null,
    website: veiligeWebsite(gebruiker.website),
    actief: status.actief,
    status: status.tekst,
    uitleg: status.uitleg
  };
}

/* Een website van een gebruiker komt van buiten en komt op een openbare
   pagina. Alleen http en https, en nooit iets wat in een link iets anders doet
   dan naar een site gaan. */
export function veiligeWebsite(waarde){
  const t = String(waarde || "").trim();
  if (!t) return null;
  const heel = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try{
    const url = new URL(heel);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  }catch(e){ return null; }
}

export function jaarVan(datum){
  const d = datum instanceof Date ? datum : new Date(datum);
  return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
}

export function nederlandseDatum(datum){
  const d = datum instanceof Date ? datum : new Date(datum);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
