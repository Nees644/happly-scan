// items.js — de vragenset van de Zelfkracht Index, op één plek.
//
// De set stond tot nu toe alleen in scan.html. Het Leidersbeeld gebruikt
// dezelfde twaalf items met dezelfde scoring, want anders is het beeld van de
// leider niet naast de teamlijn te leggen. Daarom staat hij hier, en bewaakt
// een test dat deze lijst en die in scan.html gelijk blijven.
//
// tekst      is de vraag zoals de deelnemer hem over zichzelf beantwoordt.
// tekst_team is dezelfde vraag over het team, voor de leider. Alleen het
//            onderwerp van de zin verschilt; het item meet hetzelfde. Een
//            instructie boven de vragen is niet genoeg: "wat een gevoel bij
//            mij veroorzaakt" is over een team niet te beantwoorden.
// rev        is een omgekeerd item: het antwoord wordt gespiegeld.

export const SCHAAL = [
  "Klopt niet",
  "Klopt een beetje",
  "Klopt deels",
  "Klopt grotendeels",
  "Klopt helemaal"
];

export const ITEMS = [
  { code:"Z1", dim:"Zien", rev:false,
    tekst:      "Ik heb meestal snel door wat een gevoel bij mij veroorzaakt.",
    tekst_team: "Mijn team heeft meestal snel door wat een gevoel bij hen veroorzaakt." },
  { code:"Z2", dim:"Zien", rev:false,
    tekst:      "Ik herken de vaste patronen in hoe ik reageer, ook als ze me niet helpen.",
    tekst_team: "Mijn team herkent de vaste patronen in hoe het reageert, ook als die niet helpen." },
  { code:"Z3", dim:"Zien", rev:true,
    tekst:      "Mijn eigen reacties overvallen me regelmatig; ik begrijp ze pas later, of niet.",
    tekst_team: "De eigen reacties overvallen mijn team regelmatig; ze begrijpen ze pas later, of niet." },
  { code:"Z4", dim:"Zien", rev:false,
    tekst:      "Ik weet welke situaties of mensen mij uit balans brengen.",
    tekst_team: "Mijn team weet welke situaties of mensen hen uit balans brengen." },
  { code:"S1", dim:"Sturen", rev:false,
    tekst:      "Hoe mijn leven loopt, hangt vooral af van wat ik zelf doe.",
    tekst_team: "Hoe het werk loopt, hangt vooral af van wat mijn team zelf doet." },
  { code:"S2", dim:"Sturen", rev:true,
    tekst:      "Bij belangrijke keuzes beslis ik pas echt als anderen het ermee eens zijn.",
    tekst_team: "Bij belangrijke keuzes beslist mijn team pas echt als anderen het ermee eens zijn." },
  { code:"S3", dim:"Sturen", rev:false,
    tekst:      "Ik bepaal zelf mijn richting, ook als mijn omgeving iets anders verwacht.",
    tekst_team: "Mijn team bepaalt zelf de richting, ook als de omgeving iets anders verwacht." },
  { code:"S4", dim:"Sturen", rev:true,
    tekst:      "Wat ik bereik, is vooral een kwestie van omstandigheden en geluk.",
    tekst_team: "Wat mijn team bereikt, is vooral een kwestie van omstandigheden en geluk." },
  { code:"D1", dim:"Doen", rev:false,
    tekst:      "Als ik iets besloten heb, begin ik snel, ook als het ongemakkelijk is.",
    tekst_team: "Als mijn team iets besloten heeft, begint het snel, ook als het ongemakkelijk is." },
  { code:"D2", dim:"Doen", rev:false,
    tekst:      "Ook bij onverwachte problemen vertrouw ik erop dat ik het kan oplossen.",
    tekst_team: "Ook bij onverwachte problemen vertrouwt mijn team erop dat het die oplost." },
  { code:"D3", dim:"Doen", rev:true,
    tekst:      "Dingen die ik belangrijk vind, stel ik vaak uit tot het moment goed voelt.",
    tekst_team: "Dingen die het belangrijk vindt, stelt mijn team vaak uit tot het moment goed voelt." },
  { code:"D4", dim:"Doen", rev:false,
    tekst:      "Wat ik begin, maak ik af, ook als de motivatie wegzakt.",
    tekst_team: "Wat mijn team begint, maakt het af, ook als de motivatie wegzakt." }
];

export const DIMENSIES = ["Zien", "Sturen", "Doen"];

// Vier items per dimensie, elk nul tot vier punten. Zestien punten maal 6,25
// geeft honderd. Zelfde rekenregel als computeScores() in scan.html.
export const PUNT_NAAR_SCHAAL = 6.25;

export function spiegel(item, antwoord){
  return item.rev ? (4 - antwoord) : antwoord;
}

// antwoorden is een lijst van twaalf getallen nul tot vier, in de volgorde van
// ITEMS. Geeft null terug als de lijst niet compleet of niet geldig is, zodat
// de aanroeper niet op een halve invulling hoeft te vertrouwen.
export function scores(antwoorden){
  if (!Array.isArray(antwoorden) || antwoorden.length !== ITEMS.length) return null;
  const gespiegeld = {};
  for (let i = 0; i < ITEMS.length; i++){
    const a = antwoorden[i];
    if (!Number.isInteger(a) || a < 0 || a > 4) return null;
    gespiegeld[ITEMS[i].code] = spiegel(ITEMS[i], a);
  }
  const som = codes => codes.reduce((t, c) => t + gespiegeld[c], 0);
  const zien   = Math.round(som(["Z1","Z2","Z3","Z4"]) * PUNT_NAAR_SCHAAL);
  const sturen = Math.round(som(["S1","S2","S3","S4"]) * PUNT_NAAR_SCHAAL);
  const doen   = Math.round(som(["D1","D2","D3","D4"]) * PUNT_NAAR_SCHAAL);
  return { index: index({ zien, sturen, doen }), zien, sturen, doen, items: gespiegeld };
}

// Het indexgetal. Dezelfde formule voor een deelnemer en voor een Leidersbeeld,
// zodat de twee later naast elkaar kunnen staan.
export function index({ zien, sturen, doen }){
  return Math.round((zien + sturen + doen) / 3);
}
