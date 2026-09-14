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

export const LIJNEN = ["los", "partner_zonder_licentie", "organisatie", "professional", "bureau"];
export const PRIJSNIVEAUS = ["founder", "bur1", "bur2", "bur3", "pro", "org1", "org2", "org3", "pzl", "los"];

/* De staffel van een bureau bepaalt sinds v4 zijn inkoopprijs; er is geen
   pakkettegoed meer, dus ook geen onderscheid tussen binnen en buiten tegoed. */
const BUREAUNIVEAU = { klein: "bur1", midden: "bur2", groot: "bur3" };

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
export function koper({ gebruiker = {}, organisatie = null, bureau = null, config = {}, vandaag = new Date() } = {}){
  const begeleider = gebruiker.niveau === "begeleider" || gebruiker.niveau === "opleider";
  const gecertificeerd = begeleider || gebruiker.niveau === "lezer";

  // Aanname, achter een vlag: zonder licentie geen landelijk beeld op de kaart.
  // Staat in teamkracht_config zodat het om kan zonder nieuwe versie, want het
  // is de enige plek waar de eindklant die het meest betaalt het minst krijgt.
  const losKrijgtLandelijk = config.landelijk_beeld_zonder_licentie === true;

  const basis = {
    lijn: "los",
    prijsniveau: "los",
    betaalwijze: "vooraf",
    reden: "Zonder licentie",
    begeleider,
    landelijk_beeld: losKrijgtLandelijk,
    register: begeleider ? "niet actief" : null,
    leadknop: false,
    naam_op_kaart: false,
    doelbeeld: false,
    opfrisdag: false,
    organisatiedashboard: false,
    bureaudashboard: false,
    seats_max: null,
    afname_geblokkeerd: !!gebruiker.afname_geblokkeerd
  };

  // Foundergroep, september tot en met maart. Inkoop nul, dus de volledige
  // adviesprijs is voor de founder. Het label blijft ook na de periode staan,
  // maar het tarief niet.
  if (gebruiker.founder && loopt(gebruiker.founder_tot, vandaag)){
    return { ...basis,
      lijn: "professional", prijsniveau: "founder", betaalwijze: "achteraf",
      reden: "Founding partner", begeleider: true,
      landelijk_beeld: true, register: "founding partner", leadknop: true,
      naam_op_kaart: true, doelbeeld: true, opfrisdag: true };
  }

  // Bureau. Elke staffel heeft een eigen inkoopprijs; het pakkettegoed uit v3
  // bestaat niet meer.
  if (bureau && bureau.actief !== false && loopt(bureau.abonnement_tot, vandaag)){
    return { ...basis,
      lijn: "bureau",
      prijsniveau: BUREAUNIVEAU[bureau.staffel] || "bur1",
      betaalwijze: "achteraf",
      reden: `Bureau ${bureau.staffel}`,
      landelijk_beeld: true,
      register: begeleider ? "actief" : null,
      leadknop: begeleider,
      naam_op_kaart: begeleider,
      doelbeeld: true, opfrisdag: begeleider,
      bureaudashboard: true,
      seats_max: bureau.seats_max ?? null };
  }

  // Professional. Zonder certificaat Begeleider geldt de licentie niet.
  if (gebruiker.licentie_actief && begeleider && loopt(gebruiker.licentie_tot, vandaag)){
    return { ...basis,
      lijn: "professional", prijsniveau: "pro", betaalwijze: "achteraf",
      reden: "Professional-licentie", landelijk_beeld: true,
      register: "actief", leadknop: true, naam_op_kaart: true,
      doelbeeld: true, opfrisdag: true };
  }

  // Organisatie.
  if (organisatie && organisatie.actief !== false && loopt(organisatie.abonnement_tot, vandaag)){
    return { ...basis,
      lijn: "organisatie",
      prijsniveau: STAFFELNIVEAU[organisatie.staffel] || "org1",
      betaalwijze: "achteraf",
      reden: `Organisatie ${organisatie.staffel}`,
      landelijk_beeld: true,
      doelbeeld: true, organisatiedashboard: true,
      seats_max: organisatie.seats_max ?? null };
  }

  // Wie een certificaat heeft maar geen licentie is partner zonder licentie: hij
  // koopt vooraf tegen de partnerprijs en factureert zelf aan zijn klant.
  if (gecertificeerd){
    return { ...basis,
      lijn: "partner_zonder_licentie", prijsniveau: "pzl",
      reden: "Partner zonder licentie" };
  }

  return basis;
}

/* Wat een lijn mag kopen. Een organisatie koopt geen tweede abonnement, en een
   bureau koopt zijn pakketten uit de bundel en niet als los product. */
const KOOPBAAR = {
  los:                     ["PAK", "HM", "ORG", "LEZ", "BEG", "PRO"],
  partner_zonder_licentie: ["PAK", "HM", "ORG", "LEZ", "BEG", "PRO", "BUR"],
  organisatie:  ["PAK", "HM", "LEZ", "BEG"],
  professional: ["PAK", "HM", "LEZ", "BEG"],
  bureau:       ["PAK", "HM", "LEZ", "BEG"]
};

export function magGroepKopen(lijn, groep){
  return (KOOPBAAR[lijn] || KOOPBAAR.los).includes(groep);
}

/* Betaalt deze lijn vooraf per pakket, of achteraf op de maandfactuur. Sectie 2
   van v4: alleen wie een licentie heeft, krijgt achteraf een rekening. */
export function betaaltAchteraf(prijsniveau){
  return ["founder", "pro", "org1", "org2", "org3", "bur1", "bur2", "bur3"].includes(prijsniveau);
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
