// GEGENEREERD BESTAND, niet met de hand bewerken.
// Gemaakt door scripts/bouw-voorbeeldkaart.js uit het seedblok van supabase.sql
// en de testdata uit de briefing. Alleen bedoeld als terugval voor
// teamkracht-doel.html zolang er geen echt teambeeld is; er staan geen echte
// deelnemers in.

export const VOORBEELD_TEAMBEELD = {
  "soort": "start",
  "n": 11,
  "team_zien": 66.3,
  "team_sturen": 51.2,
  "team_doen": 49.5,
  "norm_zien": 62,
  "norm_sturen": 55,
  "norm_doen": 50,
  "verdeling": {
    "HLL": 4,
    "LHH": 2,
    "HHH": 1,
    "LLL": 2,
    "MMM": 2
  },
  "breuk": "zien_sturen",
  "dynamieken": [
    {
      "code": "R1",
      "score": 0.7
    },
    {
      "code": "R11",
      "score": 0.6
    },
    {
      "code": "R12",
      "score": 0.5
    }
  ],
  "lijnen": [
    [
      38,
      32,
      30,
      0
    ],
    [
      40,
      34,
      32,
      0
    ],
    [
      48,
      68,
      84,
      0
    ],
    [
      52,
      70,
      80,
      0
    ],
    [
      60,
      52,
      48,
      0
    ],
    [
      63,
      54,
      49,
      0
    ],
    [
      80,
      40,
      38,
      0
    ],
    [
      84,
      42,
      34,
      0
    ],
    [
      86,
      43,
      31,
      0
    ],
    [
      88,
      44,
      32,
      0
    ],
    [
      90,
      84,
      86,
      0
    ]
  ],
  "config_snapshot": {
    "middenband_sd": 0.25,
    "min_deelnemers_lijnen": 10,
    "norm_bron": "vast"
  }
};

export const VOORBEELD_INTERVENTIES = [
  {
    "code": "B1",
    "titel": "Van signaal naar eigenaar",
    "breuk": "zien_sturen",
    "profielen": null,
    "tekst": "Elk signaal dat in het overleg wordt genoemd krijgt ter plekke een eigenaar, en die koppelt de volgende keer terug wat ermee is gebeurd.",
    "eigenaar_suggestie": "Niet de leidinggevende; degene die het signaal inbrengt kiest of hij het zelf houdt.",
    "ritme": "Elk teamoverleg",
    "telling": "Aantal signalen dat een eigenaar kreeg, en hoeveel daarvan zijn teruggekoppeld.",
    "gespreksvraag": "Welk signaal uit dit team is de afgelopen maand een besluit geworden, en hoe wist de melder dat?",
    "actief": true,
    "volgorde": 1
  },
  {
    "code": "B2",
    "titel": "Elk besluit een eerste stap",
    "breuk": "sturen_doen",
    "profielen": null,
    "tekst": "Bij elk besluit wordt genoteerd wie binnen een week de eerste stap zet, hoe klein ook.",
    "eigenaar_suggestie": "Degene die het besluit nam, niet degene die het uitvoert.",
    "ritme": "Elk overleg waarin een besluit valt",
    "telling": "Aantal besluiten met een eerste stap die ook is gezet.",
    "gespreksvraag": "Welk besluit staat hier langer dan twee weken zonder eerste stap?",
    "actief": true,
    "volgorde": 2
  },
  {
    "code": "B3",
    "titel": "Eén gedrag oefenen en tellen",
    "breuk": "geen",
    "profielen": null,
    "tekst": "Het team kiest één concreet gedrag en houdt een maand bij hoe vaak het voorkomt.",
    "eigenaar_suggestie": "Het team kiest, iemand anders dan de leidinggevende telt.",
    "ritme": "Maandelijks kiezen, wekelijks tellen",
    "telling": "Aantal keren dat het gekozen gedrag is vertoond.",
    "gespreksvraag": "Wat heeft dit team de afgelopen maand gedaan dat niemand had gevraagd?",
    "actief": true,
    "volgorde": 3
  },
  {
    "code": "B4",
    "titel": "Eerst zien, nog niet kiezen",
    "breuk": "begin",
    "profielen": null,
    "tekst": "Aan het begin van elk overleg meldt iedereen één ding dat hem opviel, zonder dat er een besluit aan hangt.",
    "eigenaar_suggestie": "De voorzitter opent de ronde en laat hem leeg als er niets is.",
    "ritme": "Elk overleg",
    "telling": "Aantal mensen dat iets meldde.",
    "gespreksvraag": "Wanneer is voor het laatst iemand hier beloond voor het melden van slecht nieuws?",
    "actief": true,
    "volgorde": 4
  },
  {
    "code": "P1",
    "titel": "Overdragen in plaats van oppakken",
    "breuk": null,
    "profielen": [
      "HHH"
    ],
    "tekst": "Niet minder doen, maar overdragen: vragen stellen in plaats van oppakken, en het ongemak van een gat verdragen tot een ander het vult.",
    "eigenaar_suggestie": "De Trekker zelf, met iemand die hem eraan herinnert.",
    "ritme": "Wekelijks",
    "telling": "Aantal onderwerpen met een eigenaar die niet de Trekker is.",
    "gespreksvraag": "Wat gebeurt er in dit team in de week dat jij er niet bent?",
    "actief": true,
    "volgorde": 5
  },
  {
    "code": "P2",
    "titel": "Eén signaal per week uitspreken",
    "breuk": null,
    "profielen": [
      "HLL"
    ],
    "tekst": "De kleinste stap naar sturen: één signaal per week in het overleg zeggen, met de vraag erbij wat we ermee doen. Niet meteen doen; eerst claimen.",
    "eigenaar_suggestie": "De Ziener zelf; de voorzitter maakt er ruimte voor.",
    "ritme": "Wekelijks",
    "telling": "Aantal signalen dat in het overleg is uitgesproken.",
    "gespreksvraag": "Wat hield je tegen om het te zeggen op de plek waar het telde?",
    "actief": true,
    "volgorde": 6
  },
  {
    "code": "P3",
    "titel": "Elk besluit een eigen eerste stap",
    "breuk": null,
    "profielen": [
      "HHL"
    ],
    "tekst": "Elk besluit koppelen aan een eerste stap die de Beslisser zelf zet binnen een week, hoe klein ook.",
    "eigenaar_suggestie": "De Beslisser zelf.",
    "ritme": "Per besluit",
    "telling": "Aantal besluiten waarbij de Beslisser zelf de eerste stap zette.",
    "gespreksvraag": "Welk besluit van jou wacht nog op jouw eerste stap?",
    "actief": true,
    "volgorde": 7
  },
  {
    "code": "P4",
    "titel": "Eén ding per week teruggeven",
    "breuk": null,
    "profielen": [
      "HLH"
    ],
    "tekst": "Eén ding per week weigeren of teruggeven met de vraag van wie dit eigenlijk is. Sturen leren is hier eerst nee leren zeggen.",
    "eigenaar_suggestie": "De Meewerker zelf; de leidinggevende dekt hem.",
    "ritme": "Wekelijks",
    "telling": "Aantal keren teruggegeven, en wat er daarna mee gebeurde.",
    "gespreksvraag": "Wat heb je deze week opgelost dat eigenlijk van iemand anders was?",
    "actief": true,
    "volgorde": 8
  },
  {
    "code": "P5",
    "titel": "Eén vraag voordat je begint",
    "breuk": null,
    "profielen": [
      "LHH"
    ],
    "tekst": "Voor het kiezen één vraag stellen aan iemand die anders kijkt. Niet langzamer worden; beter geïnformeerd starten.",
    "eigenaar_suggestie": "De Aanpakker zelf, gekoppeld aan een Ziener.",
    "ritme": "Voor elke start",
    "telling": "Aantal starts met een vraag vooraf.",
    "gespreksvraag": "Wie kijkt hier anders naar dan jij, en heb je het gevraagd?",
    "actief": true,
    "volgorde": 9
  },
  {
    "code": "P6",
    "titel": "Eén observatie per overleg",
    "breuk": null,
    "profielen": [
      "LLH"
    ],
    "tekst": "Zien oefenen, niet doen: één observatie per overleg over wat hem opviel in het werk.",
    "eigenaar_suggestie": "De Uitvoerder zelf; de voorzitter vraagt het uit.",
    "ritme": "Elk overleg",
    "telling": "Aantal observaties.",
    "gespreksvraag": "Wat viel je deze week op in het werk dat je niet hebt gemeld?",
    "actief": true,
    "volgorde": 10
  },
  {
    "code": "P7",
    "titel": "Eén onderwerp erbij kiezen",
    "breuk": null,
    "profielen": [
      "LHL"
    ],
    "tekst": "Sturen omdraaien: van wat is niet van mij naar wat kies ik erbij. Eén onderwerp buiten de eigen rol, met eigen keuze.",
    "eigenaar_suggestie": "De Afbakener zelf, na het gesprek over eerdere overvraging.",
    "ritme": "Maandelijks",
    "telling": "Aantal onderwerpen dat erbij is gekozen.",
    "gespreksvraag": "Wat zou je erbij pakken als niemand het je kwalijk nam?",
    "actief": true,
    "volgorde": 11
  },
  {
    "code": "P8",
    "titel": "Eerst veiligheid, dan zien",
    "breuk": null,
    "profielen": [
      "LLL"
    ],
    "tekst": "Eerst veiligheid, dan zien. Begin bij de context, niet bij de persoon: één ronde per overleg waarin iedereen één ding meldt zonder dat het een besluit wordt.",
    "eigenaar_suggestie": "De leidinggevende, want dit gaat over de context.",
    "ritme": "Elk overleg",
    "telling": "Aantal keren dat er iets is gemeld zonder dat het gevolgen had.",
    "gespreksvraag": "Wat gebeurde er de laatste keer dat je hier iets meldde?",
    "actief": true,
    "volgorde": 12
  },
  {
    "code": "P9",
    "titel": "Doelgedrag kiezen en tellen",
    "breuk": null,
    "profielen": [
      "MMM"
    ],
    "tekst": "Doelgedrag kiezen: één concreet gedrag dat het team de komende maand oefent en telt.",
    "eigenaar_suggestie": "Het team kiest samen.",
    "ritme": "Maandelijks",
    "telling": "Aantal keren dat het gekozen gedrag is vertoond.",
    "gespreksvraag": "Wat zou je gedaan hebben als niemand het had gevraagd?",
    "actief": true,
    "volgorde": 13
  }
];

export const VOORBEELD_PROFIELEN = [
  {
    "code": "HHH",
    "naam": "Trekker"
  },
  {
    "code": "HLL",
    "naam": "Ziener"
  },
  {
    "code": "HHL",
    "naam": "Beslisser"
  },
  {
    "code": "HLH",
    "naam": "Meewerker"
  },
  {
    "code": "LHH",
    "naam": "Aanpakker"
  },
  {
    "code": "LLH",
    "naam": "Uitvoerder"
  },
  {
    "code": "LHL",
    "naam": "Afbakener"
  },
  {
    "code": "LLL",
    "naam": "Afwachter"
  },
  {
    "code": "MMM",
    "naam": "Middenband"
  }
];
