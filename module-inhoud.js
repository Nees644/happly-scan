// module-inhoud.js
// De zes hoofdstukken van de Lezer-module.
//
// DE TEKSTEN HIERONDER ZIJN PLAATSHOUDERS. Maarten schrijft de inhoud; dit
// bestand is de enige plek waar die staat, zodat hij er niet voor in de code
// hoeft. Elk hoofdstuk heeft een titel, een lead en een aantal alinea's.
//
// Hoofdstuk 1 en 2 zijn de leesdrempel en zijn gratis. Wie een Teamfoto wil
// maken moet die twee hebben afgerond, ook zonder certificaat.

export const LEESDREMPEL = [1, 2];

export const HOOFDSTUKKEN = [
  {
    nummer: 1,
    titel: "Wat de Zelfkracht Index meet",
    lead: "Drie vaardigheden, een schaal van nul tot honderd, en waarom dat geen persoonlijkheidstest is.",
    tekst: [
      "PLAATSHOUDER. Hier komt de uitleg van de drie vaardigheden: zien wat er speelt, kiezen wat van jou is, en in beweging komen. Met de nadruk op dat het gedrag in een context beschrijft en geen eigenschap van een mens.",
      "PLAATSHOUDER. Hier komt waarom de meting twaalf stellingen heeft, wat de niveaus betekenen, en wat het advies naast de score is."
    ]
  },
  {
    nummer: 2,
    titel: "Wat je wel en niet met een Teamfoto doet",
    lead: "De grenzen van het instrument, en waarom die grenzen het bruikbaar maken.",
    tekst: [
      "PLAATSHOUDER. Hier komen de harde regels: individuele scores blijven bij de deelnemer, onder de tien deelnemers geen individuele lijnen, nooit voor beoordeling of selectie, en alles op de kaart heet waarschijnlijk.",
      "PLAATSHOUDER. Hier komt hoe je de kaart in een sessie neerlegt als hypothese, en wat er gebeurt als je hem als conclusie neerlegt."
    ]
  },
  {
    nummer: 3,
    titel: "De keten: zien, sturen, doen",
    lead: "Waar eigenaarschap ontstaat en waar het uitblijft.",
    tekst: ["PLAATSHOUDER. Hoofdstuk 3 van de module."]
  },
  {
    nummer: 4,
    titel: "De negen patronen",
    lead: "Wat elk profiel toevoegt, wat het kost, en waar de keten breekt.",
    tekst: ["PLAATSHOUDER. Hoofdstuk 4 van de module."]
  },
  {
    nummer: 5,
    titel: "De dynamieken lezen",
    lead: "Hoe een verdeling van profielen een gesprek wordt.",
    tekst: ["PLAATSHOUDER. Hoofdstuk 5 van de module."]
  },
  {
    nummer: 6,
    titel: "Van doelbeeld naar gedrag",
    lead: "Ambitie, ritme en tellen: waarom een traject zonder telling een gesprek blijft.",
    tekst: ["PLAATSHOUDER. Hoofdstuk 6 van de module."]
  }
];

export function isGratis(nummer){
  return LEESDREMPEL.includes(Number(nummer));
}
