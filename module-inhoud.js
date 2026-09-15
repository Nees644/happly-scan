// module-inhoud.js
// De zes hoofdstukken van de Lezer-module.
//
// Eerste versie geschreven op 15 september 2026, op basis van de profielteksten
// en de regels uit supabase.sql, de briefings en taalregels.md. Maarten
// redigeert. Dit bestand is de enige plek waar de inhoud staat, zodat hij er
// niet voor in de code hoeft.
//
// Hoofdstuk 1 en 2 zijn gratis. Wie een Teamfoto wil maken hoeft ze niet te
// hebben gelezen; ze worden aanbevolen en niet vereist (besluit 09-09-2026).
// De naam LEESDREMPEL is van voor dat besluit blijven staan omdat de twee
// hoofdstukken nog steeds de twee zijn die iedereen mag lezen.

export const LEESDREMPEL = [1, 2];

export const HOOFDSTUKKEN = [
  {
    nummer: 1,
    titel: "Wat de Zelfkracht Index meet",
    lead: "Drie vaardigheden, een schaal van nul tot honderd, en waarom dat geen persoonlijkheidstest is.",
    tekst: [
      "De Zelfkracht Index meet drie dingen: Zien, Sturen en Doen. Zien is opmerken wat er speelt, bij jezelf en om je heen. Sturen is kiezen wat van jou is en die keuze ook maken. Doen is in beweging komen en afmaken wat je begint. Ze staan in die volgorde omdat ze in die volgorde werken: je kunt niet kiezen over iets wat je niet hebt gezien, en je komt niet in beweging voor een keuze die je niet hebt gemaakt.",
      "Elke vaardigheid wordt gemeten met vier stellingen, twaalf in totaal. Je geeft per stelling aan hoe goed die bij je past, van klopt niet tot klopt helemaal. Vier van de twaalf zijn omgekeerd geformuleerd; het antwoord daarop wordt gespiegeld voordat het meetelt. Dat is geen truc maar een controle: wie overal hetzelfde invult zonder te lezen, valt daarmee op.",
      "De vier antwoorden per vaardigheid vormen samen een getal van nul tot honderd. De Index is het gemiddelde van de drie. Dat getal is een samenvatting en nooit meer dan dat; de drie losse waarden zeggen altijd meer dan het gemiddelde, want twee lage en een hoge geven hetzelfde gemiddelde als drie middelmatige, terwijl er iets heel anders aan de hand is.",
      "De schaal kent vijf niveaus: laag tot dertig, beperkt tot vijftig, redelijk tot zeventig, sterk tot negentig, en zeer sterk daarboven. Die namen zijn beschrijvingen van waar iemand nu staat, geen rapportcijfers. Naast de score staat een Advies: het aantal punten tot het volgende niveau. Dat is met opzet een kleine stap. Een advies dat iemand op tweeentwintig vertelt dat hij naar tachtig moet, is geen stap maar een berg, en daar komt niemand van in beweging.",
      "Het belangrijkste om te onthouden: dit is geen persoonlijkheidstest. Een persoonlijkheidstest zegt iets over wie je bent en gaat ervan uit dat dat tamelijk vast ligt. De Zelfkracht Index zegt iets over wat je doet, in deze context, in deze periode. Verander de context en de uitkomst kan meebewegen. Iemand die op zijn werk alles ziet en niets claimt, kan in zijn voetbalteam de eerste zijn die iets oppakt. Dat is geen tegenstrijdigheid; dat is precies wat het instrument meet.",
      "Daarom staat er ook nergens dat iemand iets is. Er staat wat er gebeurt en wat de eerstvolgende stap zou kunnen zijn. Wie het gesprek over de uitslag voert, doet er goed aan dat onderscheid vast te houden. Zodra een score een etiket wordt, stopt de beweging: een etiket verklaar je, een gedraging verander je.",
      "Een eerste meting heet een startpunt. Niemand begint bij nul. Wat de meting doet is een lijn zetten waar je later vanaf kunt meten, zodat de tweede meting laat zien wat er is bewogen. Dat is ook de reden dat de vergelijking met jezelf altijd zwaarder weegt dan de vergelijking met een gemiddelde. Het gemiddelde is context; je eigen vorige meting is bewijs.",
      "Tot slot de duiding. Naast de scores staat een tekst die beschrijft wat dit patroon in de praktijk betekent. Die tekst is een hypothese en geen uitspraak. Hij is bedoeld om een gesprek te beginnen, niet om het te beeindigen. Herkent iemand zich er niet in, dan is dat informatie en geen fout van de deelnemer."
    ]
  },

  {
    nummer: 2,
    titel: "Wat je wel en niet met een Teamfoto doet",
    lead: "De grenzen van het instrument, en waarom die grenzen het bruikbaar maken.",
    tekst: [
      "Een Teamfoto is de optelsom van individuele metingen binnen een team, en wat je terugkrijgt is een kaart: de teamlijn op Zien, Sturen en Doen, de verdeling van profielen, waar de keten zakt, en de dynamieken die daarbij horen. Wat je niet terugkrijgt is wie wat heeft ingevuld. Dat is geen technische beperking maar de kern van de afspraak.",
      "De eerste harde regel: individuele scores blijven bij de deelnemer. Hij krijgt zijn eigen uitslag via zijn eigen link, en niemand anders ziet die. Ook de coach niet, ook de opdrachtgever niet. Op de kaart staan wel de individuele lijnen, maar naamloos en op volgorde van Zien, en alleen vanaf tien deelnemers. Onder de tien zou een lijn herleidbaar worden; dan toont de kaart alleen de teamlijn en de verdeling.",
      "De tweede: een Teamfoto vraagt minimaal vijf deelnemers. Onder de vijf is er geen team maar een groepje, en elke uitspraak over een gemiddelde zegt dan meer over de toevallige samenstelling dan over hoe het werkt.",
      "De derde: de Teamfoto is nooit een beoordelingsinstrument. Niet voor functioneringsgesprekken, niet voor selectie, niet voor de vraag wie er weg moet. Zodra een team vermoedt dat de uitkomst daarvoor wordt gebruikt, verandert het invulgedrag en meet je niets meer. Dat is niet alleen ethisch onhandig, het is meettechnisch fataal: de waarde van het instrument hangt volledig af van eerlijk antwoorden.",
      "De vierde: teams worden nooit naast elkaar op score gezet. Geen ranglijst, geen gemiddelde over teams heen, geen sortering die van een score is afgeleid, ook niet in een dashboard en ook niet in een export. Een team wordt vergeleken met het gemiddelde van alle metingen en met zijn eigen vorige meting. Dat zijn de enige twee vergelijkingen die iets betekenen, en de enige twee die geen schade doen.",
      "De vijfde: alles op de kaart is waarschijnlijk. De dynamieken zijn afgeleid uit de verdeling van profielen en zijn hypotheses voor de nabespreking, geen diagnose. De kaart schrijft daarom nooit dat een team iets is. Dat is geen slag om de arm uit voorzichtigheid; het is wat er feitelijk staat. Uit twaalf stellingen per persoon volgt een waarschijnlijkheid, geen waarheid.",
      "Hoe leg je zo'n kaart neer in een sessie? Als vraag. Je laat de teamlijn zien, je wijst aan waar de keten zakt, en je vraagt of het team dat herkent. Vervolgens laat je het team de dynamieken lezen en vraag je welke van de drie het meest klopt. Het team is de deskundige over zijn eigen situatie; de kaart is alleen de aanleiding om erover te praten.",
      "Wat er gebeurt als je hem als conclusie neerlegt, is voorspelbaar. Het team gaat de kaart bestrijden in plaats van zichzelf te onderzoeken, de discussie verschuift naar de methode, en de rest van de sessie gaat over de vraag of twaalf stellingen wel genoeg zijn. Dan heb je gelijk gekregen en niets bereikt.",
      "Is er een Leidersbeeld ingevuld, dan staat het beeld van de leider naast de teamlijn. Ook daar geldt de regel: een verschil is geen fout. Het is de plek waar twee waarnemingen uiteenlopen, en dat is meestal het interessantste onderwerp van de hele sessie. De leider zit bewust niet in de teamlijn; zijn eigen meting telt nooit mee in het gemiddelde van zijn team."
    ]
  },

  {
    nummer: 3,
    titel: "De keten: zien, sturen, doen",
    lead: "Waar eigenaarschap ontstaat en waar het uitblijft.",
    tekst: [
      "Zien, Sturen en Doen zijn geen drie losse eigenschappen maar drie schakels. Er gebeurt iets, iemand merkt het op, iemand maakt er een keuze van, en iemand komt in beweging. Loopt die keten door, dan ontstaat eigenaarschap. Breekt hij ergens, dan blijft er werk liggen, en dan is de vraag niet wie er lui is maar waar de keten het begeeft.",
      "In een individuele uitslag zie je de keten als drie getallen. In een Teamfoto zie je hem als een lijn over drie kolommen, en daar wordt hij pas echt leesbaar: de vorm van die lijn vertelt waar dit team energie verliest.",
      "De kaart kent vier vormen. Bij een breuk tussen Zien en Sturen ziet het team meer dan gemiddeld en claimt het niet. De signalen zijn er, ze worden alleen van iemand anders gevonden. Bij een breuk tussen Sturen en Doen worden er keuzes gemaakt die niet in beweging komen: de besluitenlijst groeit, de actielijst niet. Is er geen daling, dan loopt de keten door en zit de winst in het niveau, niet in de vorm. En staat alles onder het gemiddelde zonder duidelijke daling, dan heet dat het begin: er is nog geen keten om te repareren, en dan begin je bij Zien.",
      "Een breuk wordt niet bepaald op de ruwe scores maar op het verschil met het gemiddelde. Dat is belangrijker dan het lijkt. Een team dat op Zien zestig scoort en op Sturen vijfenvijftig lijkt te dalen, maar als het gemiddelde op Zien tweeenzestig ligt en op Sturen vijfenvijftig, dan is er niets aan de hand: dit team staat op beide even ver van het gemiddelde af. Pas als de afstand tot het gemiddelde tussen twee schakels met minstens drie punten terugloopt, spreekt de kaart van een breuk.",
      "De breuk tussen Zien en Sturen is de meest voorkomende, en de goedkoopste om te herstellen. Alles wat nodig is, is er al: het team ziet het. Wat ontbreekt is de stap waarin een signaal een eigenaar krijgt. Daar past een kleine ingreep, bijvoorbeeld een vaste vraag aan het begin van elk overleg naar wat iemand heeft gezien en nog niet heeft gezegd, met de afspraak dat elk signaal een naam krijgt. Niet meteen een oplossing; eerst een eigenaar.",
      "De breuk tussen Sturen en Doen is taaier. Daar is de keuze al gemaakt en blijft de beweging uit, en dat heeft zelden met onwil te maken. Meestal zijn de besluiten te groot, te vaag of van niemand. De ingreep zit in de omvang: elk besluit koppelen aan een eerste stap die binnen een week zichtbaar is, door een met naam genoemde persoon. Als die stap niet te bedenken is, was het besluit nog geen besluit.",
      "Let bij het lezen op de volgorde van de gesprekken. Een team met een breuk tussen Zien en Sturen dat je gaat helpen met beter uitvoeren, gaat harder werken aan de verkeerde dingen. Een team met een breuk tussen Sturen en Doen dat je gaat helpen met beter waarnemen, krijgt nog meer signalen op een stapel die al niet in beweging komt. De plek van de breuk bepaalt waar je begint.",
      "En let op wat de keten niet is: geen rangorde. Doen is niet beter dan Zien. Een team dat hoog op Doen staat en laag op Zien is niet verder; het rent alleen sneller, en de vraag is waarheen."
    ]
  },

  {
    nummer: 4,
    titel: "De negen patronen",
    lead: "Wat elk profiel toevoegt, wat het kost, en waar de keten breekt.",
    tekst: [
      "Elke deelnemer krijgt een profiel: een patroon van hoog, laag of midden op Zien, Sturen en Doen. Midden betekent binnen een smalle band rond het gemiddelde; daarbuiten is het hoog of laag. Zo ontstaan acht uitgesproken patronen plus de middenband, negen in totaal.",
      "Lees ze in deze volgorde: wat voegt dit patroon toe, wat kost het het team, en waar breekt de keten. Die drie vragen horen bij elkaar. Een profiel zonder bijdrage bestaat niet, en een profiel zonder prijs ook niet.",
      "De Trekker ziet, kiest en handelt. Hij geeft tempo, voorbeeldgedrag en het gevoel dat er iemand is als het misgaat. Hij kost het team het eigenaarschap van de rest: hoe meer de Trekker doet, hoe minder de anderen hoeven te kiezen, en dat gaat vanzelf en ongemerkt. De keten breekt bij het Sturen van de anderen, want dat heeft hij overgenomen. De ontwikkelrichting is niet minder doen maar overdragen, en het ongemak van een gat verdragen tot een ander het vult.",
      "De Ziener ziet scherp, ook onder tafel, en zegt het na afloop of op de gang. Hij levert vroege signalen. Zolang het team ernaar vraagt kost hij niets; vraagt niemand ernaar, dan wordt zijn scherpte cynisme, en cynisme is besmettelijk. De keten breekt tussen Zien en Sturen: hij beschouwt wat hij ziet als van een ander. De kleinste stap is een signaal per week in het overleg zeggen, met de vraag erbij wat we ermee doen.",
      "De Beslisser ziet en kiest, en de uitvoering blijft uit of gaat naar een ander. Hij geeft richting, kaders en overzicht, en is vaak de informele leider in het denken. Hij kost het team een kloof tussen praten en doen. De keten breekt tussen Sturen en Doen. De richting: elk besluit koppelen aan een eerste stap die hij binnen een week zelf zet, hoe klein ook.",
      "De Meewerker ziet alles en doet alles wat gevraagd wordt, maar bepaalt zelden zelf wat hij oppakt. Hij is betrouwbaar en snel, de collega die iedereen wil. Hij kost het team het eigenaarschap van het geheel: hij lost op wat een ander had moeten voorkomen, en daardoor verandert er niets aan de oorzaak. De keten breekt bij Sturen. Sturen leren begint hier met nee leren zeggen.",
      "De Aanpakker kiest snel en gaat, ook als niemand erom vroeg. Hij doorbreekt stilstand. Hij kost het team richting zonder zicht: hij rent, soms de verkeerde kant op, en anderen repareren wat een Ziener had zien aankomen. De keten breekt helemaal aan het begin, bij Zien. Afremmen is de verkeerde ingreep; koppel hem aan een Ziener.",
      "De Uitvoerder doet wat is afgesproken, goed en op tijd, en wacht op de opdracht. Hij geeft stabiliteit en afronding. Hij kost het team niets zichtbaars, en juist daarom veel: signalen die hij had kunnen geven komen niet, en niemand mist ze. De keten begint bij hem niet. Oefen het zien, niet het doen: een observatie per overleg. Dit is vaak een contextprofiel, want de omgeving heeft nooit om meer gevraagd.",
      "De Afbakener is helder over wat wel en niet van hem is, meestal niet. Hij geeft duidelijkheid over rollen en bescherming tegen een team dat alles bij iedereen legt. Hij kost het team een hek: wat aan de andere kant valt, blijft liggen. Zijn sturen staat aan maar richt zich op afhouden. De richting is dat sturen omdraaien, van wat is niet van mij naar wat kies ik erbij. Zie hem niet als onwillig; vaak is het een reactie op eerdere overvraging, en dat verhaal moet eerst.",
      "De Afwachter volgt, meldt niets en valt niet op. Hij geeft loyaliteit en rust. Hij kost het team stilte: problemen blijven onder de radar tot het te laat is. De keten begint niet. Een team met meerdere Afwachters is bijna altijd een team waar initiatief ooit is afgestraft. Begin bij de context en niet bij de persoon, en activeer hem nooit in de sessie zelf: dat maakt de sessie onveilig voor precies degene die veiligheid nodig heeft.",
      "De Middenband doet mee, zonder uitschieters en zonder wrijving. Dat geeft balans. Het kost niets, tenzij de middenband de meerderheid is. Dan heb je een team dat tevreden is en een opdrachtgever die dat niet is: teamgeluk uit gemak.",
      "Bij alle negen geldt dezelfde regel als bij de individuele uitslag: dit beschrijft gedrag in deze context, niet de persoon. Iemand die hier Afwachter heet, is dat in dit team, in deze periode, bij deze leiding. Verandert de context, dan kan het patroon meebewegen, en dat is precies waar een traject op mikt."
    ]
  },

  {
    nummer: 5,
    titel: "De dynamieken lezen",
    lead: "Hoe een verdeling van profielen een gesprek wordt.",
    tekst: [
      "Losse profielen zeggen iets over personen. Een verdeling zegt iets over hoe een team werkt. Dat tweede is waar een Teamfoto voor bedoeld is, en dat is wat de dynamieken doen: ze vertalen een combinatie van profielen naar een patroon dat in de praktijk te herkennen is.",
      "Er zijn twaalf regels. Elke regel heeft een voorwaarde over de verdeling, bijvoorbeeld minstens twee Zieners en een Aanpakker, of een meerderheid Afwachters zonder Trekker. Klopt de voorwaarde, dan komt de regel in aanmerking. Van alle regels die passen komen er drie op de kaart, gekozen op hoe sterk ze aanwezig zijn in dit specifieke team. Drie, omdat een team met zeven dynamieken niets meer kan aanpakken.",
      "Elke regel heeft een richting: remt de teamkracht, versterkt de teamkracht, of neutraal. Die richting is geen oordeel over het team maar een aanwijzing over waar de aandacht heen moet. Een versterkende dynamiek is minstens zo bruikbaar als een remmende, want die vertelt waar je op kunt bouwen.",
      "Neem de meest voorkomende. Ziet alles, rent de andere kant op: twee of meer Zieners en minstens een Aanpakker. Het team ziet alles en rent een andere kant op, omdat de Aanpakker start zonder de waarneming van de Zieners en de Zieners achteraf zeggen dat ze het hadden zien aankomen. Diezelfde combinatie versterkt de teamkracht zodra die twee elkaar spreken; hij remt alleen zolang dat gesprek uitblijft.",
      "Of: het werkt zolang de Trekker er is. Een Trekker met twee of meer Zieners. De Trekker claimt en doet wat de Zieners zien, en zolang dat werkt hoeven de Zieners niet te kiezen. Het gaat goed tot de Trekker op vakantie gaat, en dan staat er niets. En: wat tussen de rollen valt, blijft liggen, bij twee of meer Afbakeners. Elk hek is verdedigbaar, en samen vormen ze een landschap waarin niemand het tussenstuk heeft.",
      "Bij elke dynamiek staan twee dingen die de kaart bruikbaar maken in een sessie: een interventie en een gespreksvraag. De interventie is de kleinst denkbare ingreep die het patroon doorbreekt, meestal een afspraak over hoe een overleg begint of eindigt. De gespreksvraag is wat je aan het team vraagt voordat je de interventie voorstelt.",
      "Gebruik ze in die volgorde. Eerst de vraag, dan het antwoord van het team, dan pas de interventie. Een interventie die je voorstelt voordat het team het patroon herkent, is een oplossing voor een probleem dat nog niemand heeft. Die wordt beleefd aangenomen en niet uitgevoerd.",
      "Het woord waarschijnlijk staat er niet voor de vorm. Een dynamiek is afgeleid uit een verdeling van getallen; hij zegt wat er vaak gebeurt bij zo'n verdeling, niet wat er in dit team gebeurt. Het team beslist of het klopt. Herkent het team geen van de drie, dan is dat een uitkomst en geen mislukking, en meestal het begin van een beter gesprek dan de kaart had kunnen leveren.",
      "Praktisch: laat het team de drie dynamieken zelf lezen en vraag welke het meest klopt. Laat ze rangschikken. De discussie die dan ontstaat over welke van de drie het meest speelt, levert vrijwel altijd meer op dan jouw duiding, en het team heeft zijn eigen conclusie getrokken."
    ]
  },

  {
    nummer: 6,
    titel: "Van doelbeeld naar gedrag",
    lead: "Ambitie, ritme en tellen: waarom een traject zonder telling een gesprek blijft.",
    tekst: [
      "Het startbeeld laat zien waar een team staat. Het doelbeeld legt vast waar het heen wil. Het eindbeeld laat zien wat er is gebeurd. Die drie samen zijn het verschil tussen een traject waar je iets van kunt laten zien en een reeks goede sessies.",
      "Het doelbeeld wordt gekozen door het team, niet voor het team. Op de doelpagina staan drie schuifjes, een per vaardigheid, met de huidige stand en het gemiddelde erin. Het team schuift waar het heen wil, en de pagina beoordeelt meteen of die ambitie realistisch is voor de gekozen looptijd.",
      "Die looptijd is niet vrijblijvend. Een verschuiving van tien punten in twee jaar is iets anders dan tien punten in drie maanden, dus de beoordeling rekent alles om naar punten per jaar. Zonder horizon is een doel niet te beoordelen, en dan wordt elke ambitie goedgekeurd.",
      "Er is een vaste regel van de opdrachtgever: bij het doelbeeld en het eindbeeld moeten Sturen en Doen boven het gemiddelde uitkomen. Dat is een keuze en geen natuurwet, en hij is te verdedigen: een team dat alles ziet maar niet kiest en niet levert, is geen team waar iemand voor betaalt.",
      "Let bij het kiezen op de breuk. De dimensie waar de keten zakt is meestal het startpunt, niet de laagste score. Een team dat laag staat op Doen maar zijn breuk tussen Zien en Sturen heeft, moet niet beginnen met harder werken. Is er een Leidersbeeld, dan wijst de dimensie met het grootste verschil tussen leider en team het startpunt aan; op de doelpagina staat daar het label aanbevolen startpunt.",
      "Een doel zonder gedrag is een voornemen. Daarom hangt onder het doelbeeld een plan: per gekozen interventie een eigenaar, een ritme en een telling. De eigenaar is een persoon en niet het team. Het ritme is hoe vaak het gebeurt, meestal wekelijks, want maandelijks is te weinig om een gewoonte te worden. En de telling is het getal dat je elke week kunt opschrijven.",
      "Die telling is het onderdeel dat het vaakst wordt overgeslagen en dat het meeste doet. Niet omdat het getal zo belangrijk is, maar omdat tellen aandacht vasthoudt. Een team dat vier weken bijhoudt hoeveel signalen een eigenaar kregen, doet iets anders dan een team dat heeft afgesproken beter te gaan signaleren. Zonder telling blijft een interventie een voornemen en blijft het traject een gesprek.",
      "Na een aantal maanden volgt de hermeting. Dezelfde twaalf stellingen, dezelfde deelnemers voor zover mogelijk, en dezelfde meetlat: het eindbeeld erft de norm van het startbeeld. Dat is met opzet. Zou het eindbeeld tegen een nieuw gemiddelde worden gelegd, dan zou een team vooruit kunnen gaan en toch lager scoren omdat de rest van Nederland ook is bewogen. Met een bevroren norm meet je het team en niet de wereld.",
      "Het eindbeeld komt over het startbeeld te liggen: dezelfde kolommen, de vorige lijn lichter eronder. Wat je dan laat zien is geen score maar een verschuiving, en dat is het enige wat een opdrachtgever echt wil weten. Is er een tweede Leidersbeeld, dan staat er ook wat er met het verschil in beeld is gebeurd: nu gedeeld, of nog steeds verschillend.",
      "Tot slot een verwachting om te managen. Verschuivingen zijn meestal bescheiden, en dat hoort zo. Een team dat in zes maanden acht punten op Sturen wint, heeft iets echts gedaan. Beloof geen dertig, ook niet als het doelbeeld het toelaat. Het instrument is nauwkeurig genoeg om beweging te laten zien en te grof om wonderen te registreren, en dat is precies de reden dat een kleine verschuiving iets betekent."
    ]
  }
];

export function isGratis(nummer){
  return LEESDREMPEL.includes(Number(nummer));
}
