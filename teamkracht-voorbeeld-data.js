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
    "norm_bron": "vast",
    "norm_n": null,
    "norm_gemeten_op": null,
    "norm_versie": null
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
    "naam": "Trekker",
    "actief": true,
    "zo_ziet_het_eruit": "Ziet wat er speelt, kiest wat van hem is en handelt. Is overal bij, wordt overal bij gehaald.",
    "zin": "Laat maar, ik pak het wel op.",
    "voegt_toe": "Voorbeeldgedrag, tempo, veiligheid: als het misgaat is er iemand.",
    "kost_team": "Eigenaarschap van de rest. Hoe meer de Trekker doet, hoe minder de anderen hoeven te kiezen. Het team leunt achterover zonder het te merken.",
    "kost_persoon": "Overbelasting, en uiteindelijk ergernis over collega's die niets zelf doen.",
    "breuk": "Bij Sturen van de anderen; de Trekker heeft dat overgenomen.",
    "ontwikkelrichting": "Niet minder doen, maar overdragen: vragen stellen in plaats van oppakken, en het ongemak van een gat verdragen tot een ander het vult.",
    "valkuil_coach": "De Trekker als voorbeeld neerzetten. Dat bevestigt precies het patroon dat het team klein houdt.",
    "tekst_deelnemer": "Ik zie wat er speelt, ik kies wat van mij is en ik kom in beweging. Vaak ben ik degene die het oppakt. Mijn ruimte zit niet in minder doen, maar in overdragen: vaker een vraag stellen waar ik nu al aanpak, en verdragen dat er even een gat blijft liggen tot een ander het vult."
  },
  {
    "code": "HLL",
    "naam": "Ziener",
    "actief": true,
    "zo_ziet_het_eruit": "Ziet scherp wat er speelt, ook onder tafel. Zegt het na afloop, op de gang, of tegen de coach. In het overleg zwijgt hij.",
    "zin": "Dat zag ik allang aankomen.",
    "voegt_toe": "Signalen, vroege waarschuwing, scherpte over wat er echt aan de hand is.",
    "kost_team": "Niets zolang het team ernaar vraagt; anders vervalt de Ziener tot commentaar. Onopgehaalde signalen worden cynisme, en cynisme is besmettelijk.",
    "kost_persoon": "Het gevoel dat niemand luistert, terwijl hij het niet heeft gezegd waar het telt.",
    "breuk": "Tussen zien en sturen. De Ziener beschouwt wat hij ziet als van een ander.",
    "ontwikkelrichting": "De kleinste stap naar sturen: één signaal per week in het overleg zeggen, met de vraag erbij wat we ermee doen. Niet meteen doen; eerst claimen.",
    "valkuil_coach": "De Ziener veel spreektijd geven in de sessie en denken dat het probleem daarmee is opgelost. De verandering zit in het overleg van volgende week, niet in de sessie.",
    "tekst_deelnemer": "Ik zie scherp wat er speelt, ook wat niemand hardop zegt. Vaak zeg ik het pas na afloop, of tegen iemand anders dan degene die het aangaat. Mijn ruimte zit in de kleinste stap naar kiezen: één signaal per week uitspreken op de plek waar het telt, met de vraag erbij wat we ermee doen."
  },
  {
    "code": "HHL",
    "naam": "Beslisser",
    "actief": true,
    "zo_ziet_het_eruit": "Ziet en kiest. Heeft het plan, de analyse, de prioriteiten. De uitvoering blijft uit of wordt uitbesteed.",
    "zin": "We moeten eigenlijk...",
    "voegt_toe": "Richting, kaders, overzicht. Vaak de informele leider in het denken.",
    "kost_team": "Een kloof tussen praten en doen. Besluiten stapelen zich op, de actielijst niet.",
    "kost_persoon": "Frustratie dat het niet gebeurt, en het niet zien dat hij zelf de eerste stap niet zet.",
    "breuk": "Tussen sturen en doen. De keuze is gemaakt; de beweging niet.",
    "ontwikkelrichting": "Elk besluit koppelen aan een eerste stap die de Beslisser zelf zet binnen een week, hoe klein ook. Het gaat om de ervaring dat doen hem niet degradeert.",
    "valkuil_coach": "De Beslisser als de strateeg complimenteren en de uitvoering bij anderen leggen. Dat is de kloof in stand houden.",
    "tekst_deelnemer": "Ik zie wat er speelt en ik kies richting. Ik heb het overzicht, het plan en de prioriteiten helder. Mijn ruimte zit in de eerste stap: aan elk besluit dat ik neem zelf een kleine handeling koppelen die ik binnen een week doe."
  },
  {
    "code": "HLH",
    "naam": "Meewerker",
    "actief": true,
    "zo_ziet_het_eruit": "Ziet alles en doet alles wat gevraagd wordt. Blust branden, vult gaten, is de eerste die bijspringt. Bepaalt zelden zelf wat hij oppakt.",
    "zin": "Zeg maar wat je wilt dat ik doe.",
    "voegt_toe": "Betrouwbaarheid, snelheid, oog voor wat er misgaat. De collega die iedereen wil.",
    "kost_team": "Eigenaarschap van het geheel ontbreekt; de Meewerker lost op wat een ander had moeten voorkomen, en daardoor verandert er niets aan de oorzaak.",
    "kost_persoon": "Uitputting zonder erkenning, want wat hij doet was niet zijn werk.",
    "breuk": "Bij sturen. De Meewerker ziet en doet, maar de keuze ligt bij een ander.",
    "ontwikkelrichting": "Eén ding per week weigeren of teruggeven met de vraag van wie dit eigenlijk is. Sturen leren is voor de Meewerker eerst nee leren zeggen.",
    "valkuil_coach": "Dit profiel over het hoofd zien, omdat er geen probleem is. Het probleem is dat het team op deze persoon leunt zonder dat iemand het ziet.",
    "tekst_deelnemer": "Ik zie veel en ik doe veel. Ik spring bij, ik vul gaten en ik ben er als het nodig is. Wat ik oppak, bepaal ik zelden zelf. Mijn ruimte zit in kiezen: één keer per week iets teruggeven met de vraag van wie het eigenlijk is."
  },
  {
    "code": "LHH",
    "naam": "Aanpakker",
    "actief": true,
    "zo_ziet_het_eruit": "Kiest snel en gaat. Neemt initiatief, ook als niemand erom vroeg. Kijkt niet altijd of het klopt met wat er speelt.",
    "zin": "Gewoon doen, dan zien we het wel.",
    "voegt_toe": "Beweging, energie, doorbreken van stilstand.",
    "kost_team": "Richting zonder zicht. De Aanpakker rent, soms de verkeerde kant op, en het team moet achteraf repareren wat een Ziener had zien aankomen.",
    "kost_persoon": "Herhaalde teleurstelling dat anderen niet meegaan, zonder te zien dat ze iets anders zagen.",
    "breuk": "Aan het begin, bij zien. De Aanpakker slaat de waarneming over.",
    "ontwikkelrichting": "Voor het kiezen één vraag stellen aan iemand die anders kijkt. Niet langzamer worden; beter geïnformeerd starten.",
    "valkuil_coach": "De Aanpakker afremmen. Dan verlies je de energie van het team. Koppel hem aan een Ziener.",
    "tekst_deelnemer": "Ik kies snel en ik ga. Ik breng beweging, ook als niemand erom vroeg. Mijn ruimte zit aan het begin: voordat ik kies één vraag stellen aan iemand die er anders naar kijkt. Niet langzamer, wel beter geïnformeerd starten."
  },
  {
    "code": "LLH",
    "naam": "Uitvoerder",
    "actief": true,
    "zo_ziet_het_eruit": "Doet wat is afgesproken, goed en op tijd. Wacht op de opdracht. Ziet niet wat er om het werk heen gebeurt en kiest niet zelf.",
    "zin": "Dat is niet aan mij.",
    "voegt_toe": "Stabiliteit, productie, afronding.",
    "kost_team": "Niets zichtbaars, en juist daarom veel: signalen die de Uitvoerder had kunnen geven komen niet, en niemand mist ze.",
    "kost_persoon": "Weinig, tot het werk verandert. Dan blijkt hoe afhankelijk hij is van de opdracht.",
    "breuk": "Voor het begin. Er is geen eigen waarneming en geen eigen keuze; alleen de opdracht.",
    "ontwikkelrichting": "Zien oefenen, niet doen: één observatie per overleg over wat hem opviel in het werk. Vaak is dit een contextprofiel: de omgeving heeft nooit om meer gevraagd.",
    "valkuil_coach": "De Uitvoerder als gebrek aan initiatief labelen. Vraag eerst wat er gebeurde de laatste keer dat hij iets opmerkte.",
    "tekst_deelnemer": "Ik doe wat is afgesproken, goed en op tijd. Ik wacht op de opdracht en houd me bij mijn eigen werk. Mijn ruimte zit in waarnemen: één ding per overleg benoemen dat me is opgevallen in het werk, nog zonder dat er iets mee hoeft te gebeuren."
  },
  {
    "code": "LHL",
    "naam": "Afbakener",
    "actief": true,
    "zo_ziet_het_eruit": "Is helder over wat wel en niet van hem is, meestal niet. Bewaakt zijn grenzen, neemt weinig waar en komt weinig in beweging.",
    "zin": "Daar ga ik niet over.",
    "voegt_toe": "Duidelijkheid over rollen, en bescherming tegen een team dat alles bij iedereen legt.",
    "kost_team": "Een hek. Wat aan de andere kant valt, blijft liggen. In teams met veel Afbakeners valt alles tussen wal en schip.",
    "kost_persoon": "Isolatie, en op termijn irrelevantie.",
    "breuk": "Sturen staat aan, maar richt zich op afhouden; zien en doen zijn uitgeschakeld.",
    "ontwikkelrichting": "Sturen omdraaien: van wat is niet van mij naar wat kies ik erbij. Eén onderwerp buiten de eigen rol, met eigen keuze.",
    "valkuil_coach": "De Afbakener zien als onwillig. Vaak is het een reactie op eerdere overvraging; dat verhaal moet eerst.",
    "tekst_deelnemer": "Ik ben helder over wat wel en niet van mij is, en ik bewaak dat. Mijn ruimte zit in het omdraaien van die keuze: van wat is niet van mij naar wat kies ik erbij. Eén onderwerp buiten mijn eigen rol, met een eigen keuze erin."
  },
  {
    "code": "LLL",
    "naam": "Afwachter",
    "actief": true,
    "zo_ziet_het_eruit": "Volgt, meldt niets, valt niet op. Is er wel, maar niet in de keten.",
    "zin": "Weinig. Dat is het signaal.",
    "voegt_toe": "Loyaliteit, rust.",
    "kost_team": "Stilte. Problemen blijven onder de radar tot het te laat is.",
    "kost_persoon": "Onzichtbaarheid; wordt overgeslagen bij kansen en bij zorgen.",
    "breuk": "Nergens, want hij begint niet.",
    "ontwikkelrichting": "Eerst veiligheid, dan zien. Een team met meerdere Afwachters is bijna altijd een team waar initiatief ooit is afgestraft; begin bij de context, niet bij de persoon.",
    "valkuil_coach": "De Afwachter in de sessie activeren. Dat maakt de sessie onveilig voor precies degene die veiligheid nodig heeft.",
    "tekst_deelnemer": "Ik doe mee, ik volg en ik val niet op. Ik meld weinig, ook als ik iets merk. Mijn ruimte begint bij veiligheid en bij zien: één ding per overleg noemen dat me opviel, zonder dat er meteen een besluit aan hangt."
  },
  {
    "code": "MMM",
    "naam": "Middenband",
    "actief": true,
    "zo_ziet_het_eruit": "Doet mee, geen uitschieters, geen wrijving.",
    "zin": null,
    "voegt_toe": "Balans, stabiliteit.",
    "kost_team": "Niets, tenzij de middenband de meerderheid is. Dan is er een team dat tevreden is en een opdrachtgever die dat niet is: teamgeluk uit gemak.",
    "kost_persoon": null,
    "breuk": null,
    "ontwikkelrichting": "Doelgedrag kiezen: één concreet gedrag dat het team de komende maand oefent en telt.",
    "valkuil_coach": "Denken dat er niets te doen is.",
    "tekst_deelnemer": "Ik doe mee zonder uitschieters: ik zie, ik kies en ik doe, alle drie rond het landelijke beeld. Mijn ruimte zit in het kiezen van één concreet gedrag dat ik de komende maand oefen en bijhoud, bijvoorbeeld het voorstel bij het probleem, of het zinnetje dit pak ik op."
  }
];

export const VOORBEELD_DOELREGELS = [
  {
    "code": "D1",
    "titel": "Lage ambitie",
    "voorwaarde": {
      "max_stijging": 5
    },
    "oordeel": "haalbaar",
    "melding": "Minder dan vijf punten per jaar. Bescheiden, en goed als dit team eerst ritme moet opbouwen. Houd er rekening mee dat een verschuiving van deze omvang bij de hermeting nauwelijks te onderscheiden is van toeval.",
    "volgorde": 1,
    "actief": true
  },
  {
    "code": "D2",
    "titel": "Normale ambitie",
    "voorwaarde": {
      "min_stijging": 5,
      "max_stijging": 10
    },
    "oordeel": "haalbaar",
    "melding": "Vijf tot tien punten per jaar. Dit is wat een team met een serieus traject werkelijk kan verschuiven.",
    "volgorde": 2,
    "actief": true
  },
  {
    "code": "D3",
    "titel": "Hoge ambitie",
    "voorwaarde": {
      "min_stijging": 10,
      "max_stijging": 15
    },
    "oordeel": "ambitieus",
    "melding": "Tien tot vijftien punten per jaar. Ambitieus. Haalbaar als het team wekelijks oefent en de telling ook echt bijhoudt.",
    "volgorde": 3,
    "actief": true
  },
  {
    "code": "D4",
    "titel": "Waarschijnlijk niet haalbaar",
    "voorwaarde": {
      "min_stijging": 15
    },
    "oordeel": "onwaarschijnlijk",
    "melding": "Meer dan vijftien punten per jaar. Een verschuiving van deze omvang komt zelden voor. Kies een kleiner doel, of geef het traject een langere looptijd.",
    "volgorde": 4,
    "actief": true
  }
];

export const VOORBEELD_REGELS = [
  {
    "code": "R1",
    "titel": "Ziet alles, rent de andere kant op",
    "titel_geteld": "{n_HLL} Zieners en {n_LHH} Aanpakkers",
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "HLL": 2,
        "LHH": 1
      }
    },
    "dynamiek": "Het team ziet alles en rent een andere kant op. De Aanpakker start zonder de waarneming van de Zieners; de Zieners zeggen achteraf dat ze het zagen. Deze dynamiek versterkt de teamkracht zodra Zieners en Aanpakkers elkaar spreken, en remt zolang dat gesprek uitblijft.",
    "signaal": "Dat zag ik aankomen, gezegd na afloop.",
    "interventie": "Vaste vraag voor elke start: wie ziet iets wat we nog niet hebben besproken? De Aanpakker stelt hem, de Zieners beantwoorden hem.",
    "gespreksvraag": "Waar hebben jullie de afgelopen maand iets gezien en besloten het nog niet te zeggen?",
    "gewicht_opslag": 0.15,
    "volgorde": 1,
    "actief": true
  },
  {
    "code": "R2",
    "titel": "Eén stuurt, de rest wacht",
    "titel_geteld": "Eén Trekker, {n_LLH} Uitvoerders en {n_LLL} Afwachters",
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "HHH": 1
      },
      "meerderheid": [
        "LLH",
        "LLL"
      ]
    },
    "dynamiek": "Het team werkt zolang de Trekker er is. Sturen is uitbesteed aan één persoon.",
    "signaal": "Stilte tot de Trekker spreekt; alles wacht op zijn terugkomst.",
    "interventie": "Regie verdelen: elk onderwerp een eigenaar die niet de Trekker is; de Trekker wordt vragensteller.",
    "gespreksvraag": "Wat gebeurt er in dit team in de week dat de trekker er niet is?",
    "gewicht_opslag": 0.15,
    "volgorde": 2,
    "actief": true
  },
  {
    "code": "R3",
    "titel": "Het levert, en niemand groeit",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "HHL": 1,
        "LLH": 2
      }
    },
    "dynamiek": "Het klassieke team: één denkt, de rest doet. Het levert op korte termijn, en niemand behalve de Beslisser groeit. Bij vertrek van de Beslisser valt het stil.",
    "signaal": "De Uitvoerders wachten met beginnen tot het plan er is.",
    "interventie": "De Beslisser levert per besluit de waarom, niet de wat; de Uitvoerders bepalen zelf de eerste stap.",
    "gespreksvraag": "Welk besluit van de afgelopen maand had het team ook zonder de beslisser kunnen nemen?",
    "gewicht_opslag": 0.1,
    "volgorde": 3,
    "actief": true
  },
  {
    "code": "R4a",
    "titel": "Veel richting, weinig beweging",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "HHL": 2
      },
      "max_n": 10
    },
    "dynamiek": "Veel richting, weinig beweging. Plannen concurreren, besluiten worden overgedaan, niemand zet de eerste stap.",
    "signaal": "Dezelfde discussie in drie overleggen; lange overleggen, korte actielijsten.",
    "interventie": "Beslisdomeinen afspreken, en per besluit een eerste stap die de Beslisser zelf zet binnen een week.",
    "gespreksvraag": "Welk besluit is dit jaar meer dan één keer genomen, en wat is er sindsdien gedaan?",
    "gewicht_opslag": 0.15,
    "volgorde": 4,
    "actief": true
  },
  {
    "code": "R4b",
    "titel": "Veel richting, weinig beweging",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "HHL": 3
      },
      "min_n": 11
    },
    "dynamiek": "Veel richting, weinig beweging. Plannen concurreren, besluiten worden overgedaan, niemand zet de eerste stap.",
    "signaal": "Dezelfde discussie in drie overleggen; lange overleggen, korte actielijsten.",
    "interventie": "Beslisdomeinen afspreken, en per besluit een eerste stap die de Beslisser zelf zet binnen een week.",
    "gespreksvraag": "Welk besluit is dit jaar meer dan één keer genomen, en wat is er sindsdien gedaan?",
    "gewicht_opslag": 0.15,
    "volgorde": 5,
    "actief": true
  },
  {
    "code": "R5",
    "titel": "Iemand vangt het op, niemand ziet het",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "HLH": 1
      },
      "min_een_van": {
        "HHH": 1,
        "HHL": 1
      }
    },
    "dynamiek": "De Meewerker vangt op wat de Trekker of Beslisser laat vallen. Het team ziet geen probleem; de Meewerker draagt het. Deze dynamiek remt onzichtbaar.",
    "signaal": "Gelukkig hebben we deze collega, steeds over dezelfde persoon; de Meewerker werkt over.",
    "interventie": "Alles wat de Meewerker opvangt een week lang zichtbaar maken op een lijstje, en per punt de vraag stellen van wie het was.",
    "gespreksvraag": "Wat is er de afgelopen maand opgelost zonder dat de eigenaar het merkte?",
    "gewicht_opslag": 0.1,
    "volgorde": 6,
    "actief": true
  },
  {
    "code": "R6",
    "titel": "Iedereen rent, niemand kijkt",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "meerderheid": [
        "LHH"
      ]
    },
    "dynamiek": "Beweging zonder zicht. Ieder kiest zijn eigen richting; fouten herhalen zich omdat niemand kijkt.",
    "signaal": "Dat hebben we al eens geprobeerd, gezegd als verrassing.",
    "interventie": "Korte terugblik bij de start van elk overleg: wat zagen we niet aankomen sinds vorige keer?",
    "gespreksvraag": "Welke fout heeft dit team dit jaar twee keer gemaakt?",
    "gewicht_opslag": 0.15,
    "volgorde": 7,
    "actief": true
  },
  {
    "code": "R7",
    "titel": "Het is stil, en dat is het signaal",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "meerderheid": [
        "LLL"
      ],
      "geen": [
        "HHH"
      ]
    },
    "dynamiek": "Stilte; niets komt boven tot het te laat is. Waarschijnlijk een context die initiatief heeft afgestraft.",
    "signaal": "De leidinggevende hoort problemen als eerste van buiten het team.",
    "interventie": "Eerst veiligheid, dan zien: één ronde per overleg waarin iedereen één ding meldt zonder dat het een besluit wordt.",
    "gespreksvraag": "Wanneer is voor het laatst iemand hier beloond voor het melden van slecht nieuws?",
    "gewicht_opslag": 0.2,
    "volgorde": 8,
    "actief": true
  },
  {
    "code": "R8",
    "titel": "Signaal en besluit zitten aan één tafel",
    "titel_geteld": "{n_HLL} Zieners naast {n_HHL} Beslissers",
    "richting": "versterkt",
    "voorwaarde": {
      "min": {
        "HLL": 1,
        "HHL": 1
      }
    },
    "dynamiek": "De waarneming van de Ziener kan de keuze van de Beslisser voeden. Dit is de combinatie waar de meeste verbetering vandaan komt, en de combinatie die het vaakst niet wordt benut omdat de Ziener zwijgt en de Beslisser niet vraagt.",
    "signaal": "De Beslisser beslist op basis van wat de Ziener aandroeg, of juist nooit.",
    "interventie": "Vaste route: signalen gaan naar de Beslisser, de Beslisser koppelt terug wat ermee is gebeurd.",
    "gespreksvraag": "Welk signaal uit dit team is de afgelopen maand een besluit geworden, en hoe wist de melder dat?",
    "gewicht_opslag": 0,
    "volgorde": 9,
    "actief": true
  },
  {
    "code": "R9",
    "titel": "Wat tussen de rollen valt, blijft liggen",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "LHL": 2
      }
    },
    "dynamiek": "Alles wat tussen de rollen valt, blijft liggen. Het team is helder over wie waar niet over gaat.",
    "signaal": "Dat is niet van ons als vast antwoord; klachten van buiten over wat niemand oppakt.",
    "interventie": "De tussenruimte in kaart: welke onderwerpen hebben geen eigenaar, en wie kiest er één erbij.",
    "gespreksvraag": "Wat is er de afgelopen maand blijven liggen omdat het van niemand was?",
    "gewicht_opslag": 0.1,
    "volgorde": 10,
    "actief": true
  },
  {
    "code": "R10",
    "titel": "Teamgeluk uit gemak",
    "titel_geteld": "{n_MMM} van de {n} in de middenband",
    "richting": "neutraal",
    "voorwaarde": {
      "meerderheid": [
        "MMM"
      ],
      "geen": [
        "HHH",
        "HHL"
      ]
    },
    "dynamiek": "Geen uitschieters, geen wrijving, geen beweging. Teamgeluk uit gemak, met afvlakken als risico.",
    "signaal": "Goede sfeer, geen initiatief dat niemand had gevraagd.",
    "interventie": "Doelgedrag kiezen: één concreet gedrag, bijvoorbeeld het voorstel bij het probleem of het zinnetje dit pak ik op, dat het team de komende maand oefent en telt.",
    "gespreksvraag": "Wat heeft dit team de afgelopen maand gedaan dat niemand had gevraagd?",
    "gewicht_opslag": 0.05,
    "volgorde": 11,
    "actief": true
  },
  {
    "code": "R11",
    "titel": "Het werkt zolang de Trekker er is",
    "titel_geteld": null,
    "richting": "remt",
    "voorwaarde": {
      "min": {
        "HHH": 1,
        "HLL": 2
      }
    },
    "dynamiek": "De Trekker claimt en doet wat de Zieners zien; zolang dat werkt hoeven de Zieners niet te kiezen.",
    "signaal": null,
    "interventie": "Regie verdelen, elk signaal een eigenaar die niet de Trekker is; de Trekker wordt vragensteller.",
    "gespreksvraag": "Wat gebeurt er in dit team in de week dat de trekker er niet is?",
    "gewicht_opslag": 0.15,
    "volgorde": 12,
    "actief": true
  },
  {
    "code": "R12",
    "titel": "De waarneming is er al",
    "titel_geteld": null,
    "richting": "versterkt",
    "voorwaarde": {
      "breuk": "zien_sturen",
      "team_boven_norm": [
        "zien"
      ]
    },
    "dynamiek": "Dit team ziet meer dan gemiddeld; de verbetering zit niet in beter kijken maar in een route van signaal naar keuze.",
    "signaal": null,
    "interventie": "Signalen gaan naar één eigenaar per onderwerp, die terugkoppelt wat ermee is gebeurd.",
    "gespreksvraag": "Welk signaal is de afgelopen maand een besluit geworden, en hoe wist de melder dat?",
    "gewicht_opslag": 0,
    "volgorde": 13,
    "actief": true
  }
];

export const VOORBEELD_DEELNEMERS = [{"zien":84,"sturen":42,"doen":34},{"zien":88,"sturen":44,"doen":32},{"zien":80,"sturen":40,"doen":38},{"zien":86,"sturen":43,"doen":31},{"zien":52,"sturen":70,"doen":80},{"zien":48,"sturen":68,"doen":84},{"zien":90,"sturen":84,"doen":86},{"zien":38,"sturen":32,"doen":30},{"zien":40,"sturen":34,"doen":32},{"zien":60,"sturen":52,"doen":48},{"zien":63,"sturen":54,"doen":49}];

export const VOORBEELD_NORM = {"zien":62,"sturen":55,"doen":50,"sd_zien":12,"sd_sturen":12,"sd_doen":12};

export const VOORBEELD_CONFIG = {"middenband_sd":0.25,"min_deelnemers_lijnen":10,"norm_bron":"vast"};
