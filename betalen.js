// betalen.js
// Het rekenwerk rond een bestelling, los van Mollie en los van de database,
// zodat het te testen is zonder allebei.

/* Btw erbij. Wij bewaren de prijs exclusief in hele centen en het percentage in
   promille, zodat 21 procent als 210 in de database staat en er nergens met
   kommagetallen hoeft te worden gerekend. Afronden op hele centen gebeurt hier
   en nergens anders. */
export function bedragMetBtw(product){
  const ex = Number(product.prijs_ex_btw);
  const promille = Number(product.btw_promille ?? 210);
  if (!Number.isInteger(ex) || ex < 0) throw new Error("prijs_ex_btw moet een heel aantal centen zijn");
  const btw = Math.round((ex * promille) / 1000);
  return { ex, btw, totaal: ex + btw };
}

/* Welke producten in fase A gekocht kunnen worden, en of het een eenmalige
   betaling is of een abonnement. */
export const EENMALIG = ["TF", "HM", "LEZ-1"];
export const ABONNEMENT = ["LIC-M", "LIC-J"];
export const EENMALIG_MET_ABONNEMENT = ["LEZ-2"];

export function soortBetaling(code){
  if (EENMALIG.includes(code)) return "eenmalig";
  if (ABONNEMENT.includes(code)) return "abonnement";
  if (EENMALIG_MET_ABONNEMENT.includes(code)) return "eenmalig_met_abonnement";
  return null;
}

/* Wat er moet kloppen voordat er een betaling wordt aangemaakt. Geeft null
   terug als het mag, anders de reden in gewone taal. */
export function magKopen({ product, gebruiker, teamId, heeftLeesdrempel, heeftStartbeeld }){
  if (!product) return "Dit product bestaat niet.";
  if (!product.actief) return "Dit product is niet meer te koop.";
  if (product.fase === "later") return "Dit product is nog niet beschikbaar.";
  if (!soortBetaling(product.code)) return "Dit product kan nog niet online worden afgerekend.";

  if (product.code === "TF" || product.code === "HM"){
    if (!teamId) return "Kies eerst het team waar dit voor is.";
    if (!heeftLeesdrempel) return "Rond eerst hoofdstuk 1 en 2 van de Lezer-module af.";
    if (product.code === "HM" && !heeftStartbeeld) return "Voor een hermeting is eerst een Teamfoto van dit team nodig.";
    if (gebruiker?.licentie_actief) return "Met een actieve licentie is dit inbegrepen; je hoeft niets af te rekenen.";
  }

  if (ABONNEMENT.includes(product.code) && gebruiker?.licentie_actief){
    return "Je hebt al een actieve licentie.";
  }
  return null;
}

/* De omschrijving die de klant op zijn afschrift ziet. Kort, herkenbaar, en
   zonder gegevens die daar niet horen. */
export function omschrijving(product, teamnaam){
  const kern = `Happly ${product.naam}`;
  return teamnaam ? `${kern} (${teamnaam})`.slice(0, 100) : kern.slice(0, 100);
}
