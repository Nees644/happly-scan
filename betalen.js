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

/* Mag er een kaart worden gemaakt, en waarmee wordt hij betaald.

   Drie wegen. Een actieve licentie dekt alles voor eigen teams. Anders moet er
   een betaalde en nog niet verbruikte bestelling liggen voor dit team. En wie
   geen van beide heeft, krijgt te horen wat het kost in plaats van een
   foutmelding.

   Geeft terug: {mag, reden, bestelling_id}. Het bestelling-id is wat er wordt
   afgeboekt zodra de kaart er is. */
export function rechtOpKaart({ gebruiker, bestellingen = [], teamId, soort = "start", vandaag = new Date() }){
  const licentieGeldig = !!gebruiker?.licentie_actief &&
    (!gebruiker.licentie_tot || new Date(gebruiker.licentie_tot) >= new Date(vandaag.toDateString()));
  if (licentieGeldig) return { mag: true, reden: "licentie", bestelling_id: null };

  const code = soort === "hermeting" ? "HM" : "TF";
  const bruikbaar = bestellingen.find(b =>
    b.product_code === code &&
    b.status === "betaald" &&
    !b.verbruikt_op &&
    b.team_id === teamId &&
    (!b.geldig_tot || new Date(b.geldig_tot) >= new Date(vandaag.toDateString()))
  );
  if (bruikbaar) return { mag: true, reden: "bestelling", bestelling_id: bruikbaar.id };

  const verlopen = bestellingen.some(b =>
    b.product_code === code && b.status === "betaald" && !b.verbruikt_op &&
    b.team_id === teamId && b.geldig_tot && new Date(b.geldig_tot) < new Date(vandaag.toDateString()));

  return {
    mag: false,
    reden: verlopen
      ? "Je aankoop voor dit team is verlopen. Met een licentie is hij inbegrepen."
      : soort === "hermeting"
        ? "Voor een hermeting van dit team is een licentie nodig, of een losse hermeting."
        : "Voor een Teamfoto van dit team is een licentie nodig, of een losse Teamfoto.",
    bestelling_id: null
  };
}
