// toegang.js
// Wie is deze koper, en wat mag hij. Vier lijnen (los, organisatie,
// professional, bureau) met elk een eigen prijs en een eigen set rechten.
// Briefing: briefing_code_tarieven_v3.md, secties 1 tot en met 7.
//
// Los van de database en los van Mollie, zodat de regels te testen zijn zonder
// allebei. De server leest de drie brokjes op (gebruiker, organisatie, bureau)
// en laat deze functie zeggen wat er geldt. De frontend rekent nooit zelf.

/* Een datum die nog loopt. null is onbeperkt, niet verlopen. */
const loopt = (tot, vandaag) =>
  !tot || new Date(tot) >= new Date(vandaag.toDateString());

const STAFFELNIVEAU = { klein: "org1", midden: "org2", groot: "org3" };

export const LIJNEN = ["los", "organisatie", "professional", "bureau"];
export const PRIJSNIVEAUS = ["beta", "bur", "bur_extra", "pro", "org1", "org2", "org3", "los"];

/* Uit een productcode volgt de groep. Staat hier en niet alleen in de database,
   omdat een bestelling van vorige week een oude code kan dragen en die hoort
   te blijven werken. TF en HM zijn de codes van voor 09-09-2026. */
export function groepVanCode(code){
  const c = String(code || "");
  if (c === "TF" || c.startsWith("PAK")) return "PAK";
  if (c === "HM" || c.startsWith("HM-")) return "HM";
  if (c.startsWith("ORG-")) return "ORG";
  if (c.startsWith("PRO-")) return "PRO";
  if (c.startsWith("BUR-")) return "BUR";
  if (c.startsWith("LEZ-")) return "LEZ";
  if (c.startsWith("BEG-")) return "BEG";
  return null;
}

/* Wie is deze koper.

   De volgorde is die van sectie 1: bèta gaat voor alles, daarna bureau,
   professional en organisatie, en wie geen van vieren is valt op los. Een
   abonnement dat is afgelopen telt niet mee; daar is geen vlag voor nodig, de
   datum is genoeg.

   Twee regels die makkelijk over het hoofd worden gezien en hier hard staan:
   een Professional zonder certificaat Begeleider is geen Professional, en een
   bureauseat zonder certificaat koopt wel uit het tegoed maar staat niet in het
   register (sectie 5). */
export function koper({ gebruiker = {}, organisatie = null, bureau = null, vandaag = new Date() } = {}){
  const begeleider = gebruiker.niveau === "begeleider" || gebruiker.niveau === "opleider";

  const basis = {
    lijn: "los",
    prijsniveau: "los",
    reden: "Zonder abonnement",
    begeleider,
    register: begeleider ? "niet actief" : null,
    leadknop: false,
    naam_op_kaart: false,
    doelbeeld: false,
    organisatiedashboard: false,
    bureaudashboard: false,
    seats_max: null,
    tegoed_over: null
  };

  // Bèta, september en oktober 2026. Pakket en hermeting kosten niets, de lijn
  // is professional zonder abonnement, en het certificaat is voorlopig.
  if (gebruiker.beta && loopt(gebruiker.beta_tot, vandaag)){
    return { ...basis,
      lijn: "professional", prijsniveau: "beta", reden: "Bètadeelnemer",
      begeleider: true, register: "beta", leadknop: true,
      naam_op_kaart: true, doelbeeld: true };
  }

  // Bureau. Het tegoed bepaalt of het pakket uit de bundel komt of erboven.
  if (bureau && bureau.actief !== false && loopt(bureau.abonnement_tot, vandaag)){
    const over = Math.max(0, (bureau.pak_tegoed || 0) - (bureau.pak_verbruikt || 0));
    return { ...basis,
      lijn: "bureau",
      prijsniveau: over > 0 ? "bur" : "bur_extra",
      reden: over > 0 ? `Bureaubundel, ${over} pakketten over` : "Bureaubundel, tegoed verbruikt",
      register: begeleider ? "actief" : null,
      leadknop: begeleider,
      naam_op_kaart: begeleider,
      doelbeeld: true,
      bureaudashboard: true,
      seats_max: bureau.seats_max ?? null,
      tegoed_over: over };
  }

  // Professional. Zonder certificaat Begeleider is de licentie niet geldig, ook
  // niet als er is betaald; dan valt hij terug op los en hoort de licentie te
  // worden terugbetaald of het certificaat te worden gehaald.
  if (gebruiker.licentie_actief && begeleider && loopt(gebruiker.licentie_tot, vandaag)){
    return { ...basis,
      lijn: "professional", prijsniveau: "pro", reden: "Professional-licentie",
      register: "actief", leadknop: true, naam_op_kaart: true, doelbeeld: true };
  }

  // Organisatie.
  if (organisatie && organisatie.actief !== false && loopt(organisatie.abonnement_tot, vandaag)){
    const niveau = STAFFELNIVEAU[organisatie.staffel] || "org1";
    return { ...basis,
      lijn: "organisatie", prijsniveau: niveau,
      reden: `Organisatie ${organisatie.staffel}`,
      doelbeeld: true, organisatiedashboard: true,
      seats_max: organisatie.seats_max ?? null };
  }

  return basis;
}

/* Wat een lijn mag kopen. Een organisatie koopt geen tweede abonnement, en een
   bureau koopt zijn pakketten uit de bundel en niet als los product. */
const KOOPBAAR = {
  los:          ["PAK", "HM", "ORG", "LEZ", "BEG", "PRO"],
  organisatie:  ["PAK", "HM", "LEZ", "BEG"],
  professional: ["PAK", "HM", "LEZ", "BEG"],
  bureau:       ["PAK", "HM", "LEZ", "BEG"]
};

export function magGroepKopen(lijn, groep){
  return (KOOPBAAR[lijn] || KOOPBAAR.los).includes(groep);
}

/* Het aantal seats dat nog vrij is. null betekent onbeperkt. */
export function seatsOver({ seats_max, bezet = 0 }){
  return seats_max === null || seats_max === undefined ? null : Math.max(0, seats_max - bezet);
}

/* Mag deze gebruiker als seat worden toegevoegd. Bij een bureau hoort er een
   certificaat bij; zonder telt hij mee voor de seats maar niet voor het
   register (sectie 5). Dat is geen weigering maar een mededeling. */
export function magSeatToevoegen({ soort, over, gebruiker = {} }){
  if (over !== null && over <= 0){
    return { mag: false, melding: "Alle seats zijn bezet. Kies een grotere staffel of maak een seat vrij." };
  }
  const begeleider = gebruiker.niveau === "begeleider" || gebruiker.niveau === "opleider";
  if (soort === "bureau" && !begeleider){
    return { mag: true, melding: "Deze seat werkt met het bundeltegoed en komt niet in het register. Daarvoor is het certificaat Begeleider nodig." };
  }
  return { mag: true, melding: null };
}
