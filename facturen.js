// facturen.js
// Het rekenwerk van de maandelijkse verrekening, los van Mollie en los van de
// database zodat het te testen is zonder allebei.
//
// Sectie 2 van briefing_code_tarieven_v4.md: wie een licentie heeft betaalt
// achteraf. Elke afname wordt gelogd; op de eerste werkdag van de maand gaat er
// één factuur en één incasso per licentiehouder de deur uit.
//
// Mollie factureert niet. Nummer, btw en regels maken wij.

/* De eerste werkdag van een maand. De run draait dagelijks en doet alleen iets
   als vandaag die dag is; zo hoeft er geen cron te worden bijgesteld als een
   maand met een weekend begint. */
export function isEersteWerkdag(datum = new Date()){
  if (datum.getDate() > 3) return false;            // nooit later dan de derde
  const eerste = new Date(datum.getFullYear(), datum.getMonth(), 1);
  while (eerste.getDay() === 0 || eerste.getDay() === 6) eerste.setDate(eerste.getDate() + 1);
  return eerste.getDate() === datum.getDate();
}

/* Een datum als jjjj-mm-dd, in de tijdzone waarin de server denkt.

   Niet via toISOString: die rekent naar UTC, en dan wordt 31 oktober 00:00
   Nederlandse tijd ineens 30 oktober. Op een factuur is dat het verschil tussen
   de goede en de verkeerde maand. */
export function alsDatum(d){
  const maand = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${maand}-${dag}`;
}

/* De periode waarover wordt gefactureerd: de hele vorige maand. Een afname van
   gisteren valt daar dus nog buiten als de run op de eerste draait, en dat is
   goed: de factuur gaat over een afgesloten maand. */
export function periodeVan(datum = new Date()){
  const eind = new Date(datum.getFullYear(), datum.getMonth(), 0);       // laatste dag vorige maand
  const start = new Date(eind.getFullYear(), eind.getMonth(), 1);
  return { van: alsDatum(start), tot: alsDatum(eind) };
}

/* Afnames groeperen naar wie de rekening krijgt. Een seat van een organisatie
   of een bureau factureert niet zelf; de rekening gaat naar het abonnement.
   Sleutel is daarom de organisatie of het bureau, en anders de gebruiker. */
export function groepeer(afnames = []){
  const uit = new Map();
  for (const a of afnames){
    if (a.geannuleerd_op || a.gefactureerd) continue;
    const sleutel = a.bureau_id ? `bureau:${a.bureau_id}`
                  : a.organisatie_id ? `organisatie:${a.organisatie_id}`
                  : `gebruiker:${a.gebruiker_id}`;
    if (!uit.has(sleutel)) uit.set(sleutel, []);
    uit.get(sleutel).push(a);
  }
  return uit;
}

/* Van een stapel afnames naar de bedragen op één factuur.

   De btw wordt over het totaal per tarief berekend en niet per regel opgeteld:
   bij twintig regels van 145 euro scheelt dat centen, en de Belastingdienst
   rekent over het totaal. Verlegd naar een buitenlandse zakelijke klant met een
   btw-nummer betekent nul btw en een regel op de factuur. */
export function telOp(afnames, { btw_verlegd = false } = {}){
  if (!afnames.length) return null;

  const regels = [];
  for (const a of afnames){
    const bestaand = regels.find(r => r.product_code === a.product_code && r.stuksprijs === a.prijs_ex_btw);
    if (bestaand){ bestaand.aantal += 1; bestaand.bedrag += a.prijs_ex_btw; }
    else regels.push({
      product_code: a.product_code,
      omschrijving: a.omschrijving || a.product_code,
      aantal: 1,
      stuksprijs: a.prijs_ex_btw,
      bedrag: a.prijs_ex_btw
    });
  }
  regels.sort((x, y) => x.product_code.localeCompare(y.product_code));

  const ex = regels.reduce((n, r) => n + r.bedrag, 0);
  const promille = afnames[0].btw_promille ?? 210;
  const btw = btw_verlegd ? 0 : Math.round((ex * promille) / 1000);

  return { regels, bedrag_ex_btw: ex, btw_cent: btw, bedrag_totaal: ex + btw, btw_verlegd };
}

/* Wat er op het afschrift van de klant komt te staan. Het factuurnummer moet
   erin: daarmee kan hij de incasso terugvinden in zijn administratie. */
export function incassoOmschrijving(nummer, periode){
  return `Happly Teamkracht Index ${nummer} (${periode.van} tot ${periode.tot})`.slice(0, 100);
}

/* Wat er moet gebeuren als een incasso mislukt.

   Eén herpoging na vijf dagen, en pas daarna gaat de kraan dicht. Een mislukte
   incasso is meestal een saldo dat net te laag was of een pas die is vervangen,
   en dan is meteen blokkeren een zware maatregel voor een klein ongemak. */
export const HERPOGING_NA_DAGEN = 5;

export function naMislukteIncasso(factuur, vandaag = new Date()){
  if (factuur.status === "herpoging"){
    return { status: "oninbaar", blokkeren: true, herpoging_op: null,
             reden: "De incasso is twee keer mislukt." };
  }
  const datum = new Date(vandaag);
  datum.setDate(datum.getDate() + HERPOGING_NA_DAGEN);
  return { status: "herpoging", blokkeren: false,
           herpoging_op: alsDatum(datum),
           reden: `De incasso is mislukt. We proberen het opnieuw op ${alsDatum(datum)}.` };
}

/* De creditnota bij een annulering. Een factuur wordt nooit aangepast of
   verwijderd; er komt een tegenboeking met een eigen nummer uit dezelfde reeks. */
export function creditnotaVoor(factuur, nummer){
  return {
    nummer,
    soort: "creditnota",
    crediteert_id: factuur.id,
    gebruiker_id: factuur.gebruiker_id,
    organisatie_id: factuur.organisatie_id,
    bureau_id: factuur.bureau_id,
    periode_van: factuur.periode_van,
    periode_tot: factuur.periode_tot,
    bedrag_ex_btw: -factuur.bedrag_ex_btw,
    btw_cent: -factuur.btw_cent,
    bedrag_totaal: -factuur.bedrag_totaal,
    btw_verlegd: factuur.btw_verlegd,
    status: "betaald",
    regels: (factuur.regels || []).map(r => ({ ...r, bedrag: -r.bedrag, stuksprijs: -r.stuksprijs }))
  };
}
