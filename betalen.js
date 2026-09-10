// betalen.js
// Het rekenwerk rond een bestelling, los van Mollie en los van de database,
// zodat het te testen is zonder allebei.
//
// Wie de koper is en wat hij mag staat in toegang.js. Hier staat wat het kost
// en wanneer er recht is op een kaart.

import { koper, groepVanCode } from "./toegang.js";

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

/* Eenmalig, abonnement, of allebei tegelijk. Volgt uit het product zelf en niet
   uit een lijst met codes: verlengt_als is gevuld bij LEZ-2 en PRO-START, en
   dat zijn precies de twee die vandaag eenmalig betalen en over een jaar een
   abonnement worden. */
export function soortBetaling(product){
  if (!product) return null;
  if (product.verlengt_als) return "eenmalig_met_abonnement";
  if (product.interval === "maand" || product.interval === "jaar") return "abonnement";
  if (product.interval === "eenmalig") return "eenmalig";
  return null;
}

/* Wat er moet kloppen voordat er een betaling wordt aangemaakt. Geeft null
   terug als het mag, anders de reden in gewone taal.

   De leesdrempel staat hier niet meer in. Sectie 1 van de tarievenbriefing v3:
   geen leesdrempel voor de eerste Teamfoto, de module wordt na aankoop
   aanbevolen en niet vereist. */
export function magKopen({ product, wie, teamId = null, team = null, heeftStartbeeld = false }){
  if (!product) return "Dit product bestaat niet.";
  if (product.actief === false) return "Dit product is niet meer te koop.";
  if (product.fase === "later") return "Dit product is nog niet beschikbaar.";
  if (!soortBetaling(product)) return "Dit product kan nog niet online worden afgerekend.";

  const groep = product.groep || groepVanCode(product.code);
  if (!wie) return "We konden niet vaststellen welk tarief voor jou geldt.";

  // De client mag geen prijs kiezen. Vraagt hij om een rij die niet bij zijn
  // lijn hoort, dan is dat geen vergissing om stilletjes recht te zetten.
  if (product.prijsniveau && product.prijsniveau !== wie.prijsniveau){
    return "Dit tarief hoort niet bij je abonnement.";
  }

  if (groep === "PAK" || groep === "HM"){
    if (!teamId) return "Kies eerst het team waar dit voor is.";
    if (groep === "HM"){
      if (!heeftStartbeeld) return "Voor een hermeting is eerst een Teamfoto van dit team nodig.";
      if (tegoedGeldig(team)) return "De hermeting van dit team zit al in het pakket; je hoeft niets af te rekenen.";
    }
    if (wie.prijsniveau === "beta") return "Als bètadeelnemer reken je niets af.";
    if (groep === "PAK" && wie.prijsniveau === "bur"){
      return "Dit pakket komt uit het bundeltegoed; je hoeft niets af te rekenen.";
    }
  }

  if (groep === "ORG" && wie.lijn === "organisatie") return "Je organisatie heeft al een abonnement.";
  if (groep === "PRO" && wie.lijn === "professional") return "Je hebt al een actieve licentie.";
  if (groep === "BUR" && wie.lijn === "bureau") return "Je bureau heeft al een bundel.";

  return null;
}

/* De omschrijving die de klant op zijn afschrift ziet. Kort, herkenbaar, en
   zonder gegevens die daar niet horen. */
export function omschrijving(product, teamnaam){
  const kern = `Happly ${product.naam}`;
  return teamnaam ? `${kern} (${teamnaam})`.slice(0, 100) : kern.slice(0, 100);
}

/* Heeft dit team nog een hermeting uit zijn pakket tegoed. Het tegoed hangt aan
   het team en niet aan de koper: het pakket is voor dit team gekocht, en als de
   coach wisselt hoort de hermeting bij het team te blijven. */
export function tegoedGeldig(team, vandaag = new Date()){
  if (!team || !(team.hermeting_tegoed > 0)) return false;
  return !team.hermeting_tot || new Date(team.hermeting_tot) >= new Date(vandaag.toDateString());
}

/* Mag er een kaart worden gemaakt, en waarmee wordt hij betaald.

   Vier wegen, in deze volgorde. Een bètadeelnemer betaalt niets. Een hermeting
   komt uit het pakkettegoed van het team. Anders moet er een betaalde en nog
   niet verbruikte bestelling liggen voor dit team. En wie geen van drieën heeft,
   krijgt te horen wat het kost in plaats van een foutmelding.

   Geeft terug: {mag, reden, bestelling_id, tegoed}. Het bestelling-id is wat er
   wordt afgeboekt zodra de kaart er is; tegoed zegt dat het team er een
   hermeting voor inlevert. */
export function rechtOpKaart({ wie, team = null, bestellingen = [], teamId, soort = "start", vandaag = new Date() }){
  const leeg = { bestelling_id: null, tegoed: false };

  if (wie?.prijsniveau === "beta") return { mag: true, reden: "beta", ...leeg };

  if (soort === "hermeting" && tegoedGeldig(team, vandaag)){
    return { mag: true, reden: "tegoed", bestelling_id: null, tegoed: true };
  }

  const wil = soort === "hermeting" ? "HM" : "PAK";
  const bruikbaar = bestellingen.find(b =>
    (b.groep || groepVanCode(b.product_code)) === wil &&
    b.status === "betaald" &&
    !b.verbruikt_op &&
    b.team_id === teamId &&
    (!b.geldig_tot || new Date(b.geldig_tot) >= new Date(vandaag.toDateString()))
  );
  if (bruikbaar) return { mag: true, reden: "bestelling", bestelling_id: bruikbaar.id, tegoed: false };

  const verlopen = bestellingen.some(b =>
    (b.groep || groepVanCode(b.product_code)) === wil && b.status === "betaald" && !b.verbruikt_op &&
    b.team_id === teamId && b.geldig_tot && new Date(b.geldig_tot) < new Date(vandaag.toDateString()));

  const tegoedOp = soort === "hermeting" && team?.hermeting_tot &&
    new Date(team.hermeting_tot) < new Date(vandaag.toDateString());

  return {
    mag: false,
    reden: verlopen
      ? "Je aankoop voor dit team is verlopen. Een nieuw pakket zet het team weer op weg."
      : tegoedOp
        ? "De hermeting uit het pakket liep tot " +
          new Date(team.hermeting_tot).toLocaleDateString("nl-NL") +
          ". Een extra hermeting kan altijd."
        : soort === "hermeting"
          ? "Voor een hermeting van dit team is een extra hermeting nodig."
          : "Voor een Teamfoto van dit team is een pakket nodig.",
    ...leeg
  };
}

/* De rij uit producten die bij een groep en een niveau hoort. Een bèta betaalt
   niets: dat is geen productrij maar een uitzondering op de prijs, dus die
   wordt hier afgehandeld en niet in de tabel. Zo blijft in de bestelling staan
   welk pakket er is geleverd, ook als het nul kostte. */
export function prijsVoor(producten, groep, niveau){
  const rijen = (producten || []).filter(p => p.groep === groep && p.actief !== false);
  if (niveau === "beta"){
    const basis = rijen.find(p => p.prijsniveau === "los") || rijen[0];
    return basis ? { ...basis, prijs_ex_btw: 0, reden: "beta" } : null;
  }
  const rij = rijen.find(p => p.prijsniveau === niveau)
    // Het tegoed gaat alleen over pakketten. Een hermeting kost een bureau
    // hetzelfde bedrag of het tegoed nu vol is of op, dus er is één HM-rij voor
    // bureaus en die geldt voor allebei de standen.
    || (niveau === "bur_extra" ? rijen.find(p => p.prijsniveau === "bur") : null);
  return rij ? { ...rij, reden: niveau } : null;
}

/* Wat er na de eerste betaling als abonnement moet gaan lopen.

   Eén patroon voor alle drie de gevallen. De koper betaalt vandaag de prijs van
   wat hij koopt, en het abonnement begint precies één periode later. Bij ORG-1
   is dat hetzelfde bedrag over een jaar. Bij LEZ-2 en PRO-START is het een
   ander bedrag over een jaar, want daar is het eerste jaar inbegrepen in een
   lagere instapprijs; welk abonnement dat is staat in verlengt_als.

   Dat is de variant uit vraag 3 van de briefing: de verlenging loopt vanzelf
   door op ORG-1 respectievelijk PRO-J. Zonder dit zou er na een jaar niemand
   zijn die de verlenging aanmaakt.

   Geeft null als er niets hoeft te lopen. */
const MOLLIE_INTERVAL = { maand: "1 month", jaar: "12 months" };

export function vervolgAbonnement({ product, verlengProduct = null, vanaf = new Date() }){
  const soort = soortBetaling(product);
  if (soort !== "abonnement" && soort !== "eenmalig_met_abonnement") return null;

  const doel = product.verlengt_als ? verlengProduct : product;
  if (!doel) return null;

  const interval = MOLLIE_INTERVAL[doel.interval];
  if (!interval) return null;

  const start = new Date(vanaf);
  if (doel.interval === "maand") start.setMonth(start.getMonth() + 1);
  else start.setFullYear(start.getFullYear() + 1);

  return {
    code: doel.code,
    centen: bedragMetBtw(doel).totaal,
    interval,
    startDate: start.toISOString().slice(0, 10),
    tot: start.toISOString().slice(0, 10),
    omschrijving: `Happly ${doel.naam}`.slice(0, 100)
  };
}

/* Wat het pakket en de hermeting deze koper kosten, met de reden erbij. Dit is
   het antwoord dat het prijsendpoint teruggeeft en dat op elke knop staat. */
export function prijskaart({ producten, wie, team = null, vandaag = new Date() }){
  const uit = {};
  for (const groep of ["PAK", "HM"]){
    const p = prijsVoor(producten, groep, wie.prijsniveau);
    if (!p) continue;
    uit[groep] = { code: p.code, naam: p.naam, ...bedragMetBtw(p), reden: wie.reden, prijsniveau: wie.prijsniveau };
  }
  if (uit.HM && tegoedGeldig(team, vandaag)){
    uit.HM.inbegrepen = true;
    uit.HM.reden = "Zit in het pakket, tot " + new Date(team.hermeting_tot).toLocaleDateString("nl-NL");
  }
  // Wat het zonder abonnement zou kosten, zodat de winst van een lijn zichtbaar
  // is. Sectie 1: de frontend toont daarbij "zonder abonnement 345 euro".
  const los = prijsVoor(producten, "PAK", "los");
  if (los) uit.zonder_abonnement = bedragMetBtw(los);
  return uit;
}

export { koper, groepVanCode };
