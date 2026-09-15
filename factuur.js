// factuur.js — het rekenwerk en de controles van een factuur bij een aankoop
// vooraf, zonder database en zonder netwerk.
//
// De maandfactuur van een licentiehouder staat in facturen.js; die telt afnames
// van een maand op. Dit gaat over de andere kant: een klant die eenmalig
// afrekent en daar een factuur voor hoort te krijgen.

export const KLANTVELDEN = ["naam", "adres", "postcode", "plaats"];

// Een factuur boven de honderd euro vraagt naam en adres van de klant. Zonder
// die gegevens is het geen factuur maar een bonnetje.
export function klantCompleet(klant = {}){
  return KLANTVELDEN.every(veld => String(klant[veld] || "").trim().length > 1);
}

export function ontbrekendeKlantvelden(klant = {}){
  return KLANTVELDEN.filter(veld => String(klant[veld] || "").trim().length <= 1);
}

// De klantgegevens zoals ze op de factuur komen te staan, uit wat er op de
// gebruiker is vastgelegd. De naam van het bedrijf gaat voor de eigen naam:
// een zakelijke factuur staat op de organisatie.
export function klantUit(gebruiker = {}){
  return {
    naam:       tekst(gebruiker.factuur_naam) || tekst(gebruiker.organisatie) || tekst(gebruiker.naam),
    adres:      tekst(gebruiker.factuur_adres),
    postcode:   tekst(gebruiker.factuur_postcode),
    plaats:     tekst(gebruiker.factuur_plaats),
    land:       tekst(gebruiker.factuur_land) || "NL",
    btw_nummer: tekst(gebruiker.btw_nummer),
    email:      tekst(gebruiker.email)
  };
}

function tekst(v){
  const t = String(v ?? "").trim();
  return t ? t : null;
}

// Btw verlegd geldt bij een zakelijke klant met een geldig btw-nummer buiten
// Nederland. Binnen Nederland rekenen we gewoon btw.
export function btwVerlegd(klant = {}){
  const nr = String(klant.btw_nummer || "").trim().toUpperCase();
  if (!nr) return false;
  return !nr.startsWith("NL");
}

// De regels van de factuur. Een aankoop vooraf is altijd een regel: een
// product, aantal een, het bedrag zoals het bij de bestelling is bevroren.
export function regelsVoor({ product, bestelling }){
  const ex = Number(bestelling.bedrag_cent) - Number(bestelling.btw_cent || 0);
  return [{
    code: product?.code || bestelling.product_code,
    omschrijving: product?.naam || bestelling.product_code,
    aantal: 1,
    stuk_ex_btw: ex,
    bedrag_ex_btw: ex,
    btw_promille: Number(product?.btw_promille ?? 210)
  }];
}

export function totalen(regels = [], { verlegd = false } = {}){
  const ex = regels.reduce((t, r) => t + Number(r.bedrag_ex_btw || 0), 0);
  const btw = verlegd ? 0 : regels.reduce((t, r) =>
    t + Math.round(Number(r.bedrag_ex_btw || 0) * Number(r.btw_promille ?? 210) / 1000), 0);
  return { ex, btw, totaal: ex + btw };
}

export function euro(centen){
  return (Number(centen || 0) / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
}

export function nederlandseDatum(d = new Date()){
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
