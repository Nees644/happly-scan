-- ===========================================================================
-- SEED · De veertig toetsvragen van de Lezer-module (15 september 2026)
--
-- Uit deze pool trekt de toets er twintig; de lat ligt op zestien goed en er
-- zijn hoogstens drie pogingen per dertig dagen (briefings/certificering.md).
-- Veertig en geen twintig, zodat een tweede poging niet dezelfde toets is.
--
-- Eerste versie geschreven door Claude op basis van module-inhoud.js; Maarten
-- redigeert. Wijzigt een hoofdstuk, dan horen de vragen erbij na te lopen:
-- een toets die iets anders vraagt dan de tekst zegt, leert mensen de tekst
-- wantrouwen in plaats van lezen.
--
-- juist is de plek in opties, nul-gebaseerd. Elke vraag heeft vier opties en
-- precies een goed antwoord. De afleiders zijn met opzet plausibel: een vraag
-- die je zonder de module goed raadt, meet niets.
--
-- De opties zijn een keer door elkaar gehusseld met een vaste reeks. Anders
-- staat het juiste antwoord overal op dezelfde plek, en dan meet de toets of
-- iemand dat doorheeft in plaats van of hij de module heeft gelezen. Een test
-- bewaakt dat de verdeling over de vier plekken redelijk blijft.
--
-- Herhaalbaar: de vraagtekst is de sleutel. Opnieuw draaien werkt de opties en
-- het juiste antwoord bij en maakt geen dubbele rijen.
-- ===========================================================================

create unique index if not exists toets_vragen_vraag_idx on public.toets_vragen (vraag);

insert into public.toets_vragen (vraag, opties, juist, hoofdstuk) values

-- ------------------------------------------------- hoofdstuk 1 (zeven vragen)
('Wat meet de Zelfkracht Index?',
 '["Vijf persoonlijkheidsfactoren","Drie vaardigheden: Zien, Sturen en Doen","Competenties ten opzichte van een functieprofiel","Werkgeluk en betrokkenheid"]', 1, 1),

('Hoeveel stellingen telt de meting, en hoe zijn die verdeeld?',
 '["Twaalf, vier per vaardigheid","Negen, drie per vaardigheid","Vijftien, vijf per vaardigheid","Twintig, verdeeld over drie vaardigheden"]', 0, 1),

('Waarom zijn sommige stellingen omgekeerd geformuleerd?',
 '["Om de scores gelijkmatiger te verdelen","Om te merken wie invult zonder te lezen","Om de meting langer te maken","Om de deelnemer op het verkeerde been te zetten"]', 1, 1),

('Hoe komt het indexgetal tot stand?',
 '["Het is het gemiddelde van Zien, Sturen en Doen","Het is de hoogste van de drie waarden","Het is de som van de twaalf antwoorden","Het is de laagste van de drie waarden"]', 0, 1),

('Waarom zegt het indexgetal minder dan de drie losse waarden?',
 '["Twee lage en een hoge geven hetzelfde gemiddelde als drie middelmatige","Het gemiddelde wordt afgerond en verliest daardoor nauwkeurigheid","Het gemiddelde is alleen bedoeld voor de teamlijn","Het gemiddelde telt Doen zwaarder mee dan Zien"]', 0, 1),

('Wat staat er in de kolom Advies naast de score?',
 '["De score die over een jaar wordt verwacht","Het advies van de coach","Het verschil met het gemiddelde van alle metingen","Het aantal punten tot het volgende niveau"]', 3, 1),

('Waarom is de Zelfkracht Index geen persoonlijkheidstest?',
 '["Hij is niet wetenschappelijk gevalideerd","Hij beschrijft gedrag in een context, dat kan meebewegen","Hij is te kort om een persoonlijkheid te meten","Hij meet alleen wat iemand van zichzelf vindt"]', 1, 1),

-- ------------------------------------------------- hoofdstuk 2 (zeven vragen)
('Wie ziet de individuele score van een deelnemer?',
 '["Het hele team","Alleen de deelnemer zelf","De deelnemer en zijn coach","De coach en de opdrachtgever"]', 1, 2),

('Vanaf welk aantal deelnemers toont de kaart individuele lijnen?',
 '["Tien","Acht","Twaalf","Vijf"]', 0, 2),

('Wat is het minimum aantal deelnemers voor een Teamfoto?',
 '["Tien","Drie","Acht","Vijf"]', 3, 2),

('Waarom mag een Teamfoto niet voor beoordeling of selectie worden gebruikt?',
 '["Dan duurt de meting te lang","Dan is de kaart juridisch niet houdbaar","Dan verandert het invulgedrag en meet je niets meer","Dan moet er toestemming van de ondernemingsraad komen"]', 2, 2),

('Met welke twee dingen mag een team worden vergeleken?',
 '["Het doelbeeld en het gemiddelde van de organisatie","Andere teams in dezelfde organisatie en de branche","Het gemiddelde van alle metingen en zijn eigen vorige meting","Het gemiddelde van de sector en het landelijk beeld"]', 2, 2),

('Wat is de juiste manier om de kaart in een sessie neer te leggen?',
 '["Als vraag: herkent het team dit","Als opdracht voor het komende kwartaal","Als conclusie, met de onderbouwing erbij","Als vertrouwelijk stuk voor de leidinggevende"]', 0, 2),

('Telt de eigen meting van de teamleider mee in de teamlijn?',
 '["Ja, hij is onderdeel van het team","Alleen bij teams van meer dan tien deelnemers","Alleen als het team dat afspreekt","Nee, die telt nooit mee"]', 3, 2),

-- ------------------------------------------------- hoofdstuk 3 (zeven vragen)
('Waarom staan Zien, Sturen en Doen in die volgorde?',
 '["Doen is het moeilijkst en staat daarom achteraan","Het is de volgorde waarin de vragen zijn gesteld","Zien is de belangrijkste van de drie","Je kunt niet kiezen over iets wat je niet hebt gezien"]', 3, 3),

('Waarop wordt een breuk in de keten bepaald?',
 '["Op het verschil met het gemiddelde, niet op de ruwe scores","Op de ruwe scores van het team","Op het verschil met de vorige meting","Op het verschil tussen de hoogste en de laagste deelnemer"]', 0, 3),

('Hoe groot moet de terugloop minstens zijn voordat de kaart van een breuk spreekt?',
 '["Een halve standaarddeviatie","Een punt","Drie punten","Vijf punten"]', 2, 3),

('Wat betekent een breuk tussen Zien en Sturen?',
 '["Het team ziet weinig en kiest veel","Het team maakt keuzes die niet worden uitgevoerd","Het team ziet meer dan gemiddeld en claimt het niet","Het team staat overal onder het gemiddelde"]', 2, 3),

('Wat betekent een breuk tussen Sturen en Doen?',
 '["Er worden keuzes gemaakt die niet in beweging komen","Er wordt veel gedaan zonder dat iemand kiest","Het team ziet niet wat er speelt","Signalen krijgen geen eigenaar"]', 0, 3),

('Wat betekent de uitkomst begin?',
 '["Alles staat onder het gemiddelde zonder duidelijke daling","De meting is nog niet afgerond","Het team is korter dan een jaar samen","Het team heeft nog niet eerder gemeten"]', 0, 3),

('Wat is de fout die je maakt bij een team met een breuk tussen Zien en Sturen?',
 '["Helpen met beter waarnemen","Helpen met beter uitvoeren","Eerst een hermeting inplannen","Beginnen bij het doelbeeld"]', 1, 3),

-- ------------------------------------------------- hoofdstuk 4 (zeven vragen)
('Hoeveel profielen kent de Teamkracht Index?',
 '["Twaalf","Acht","Negen","Zes"]', 2, 4),

('Wat kost een Trekker het team?',
 '["Het eigenaarschap van de rest","Rust in het overleg","Duidelijkheid over rollen","Tempo en daadkracht"]', 0, 4),

('Waar breekt de keten bij een Ziener?',
 '["Tussen Zien en Sturen","Nergens","Aan het begin, bij Zien","Tussen Sturen en Doen"]', 0, 4),

('Wat is de eerste stap voor een Meewerker die wil leren sturen?',
 '["Nee leren zeggen","Een groter project oppakken","Meer signalen delen","Sneller opleveren"]', 0, 4),

('Wat is de verkeerde ingreep bij een Aanpakker?',
 '["Hem een eerste stap laten benoemen","Hem afremmen","Hem koppelen aan een Ziener","Hem om een observatie vragen"]', 1, 4),

('Waarom heet een Uitvoerder vaak een contextprofiel?',
 '["Hij scoort precies in de middenband","Hij wisselt per project van profiel","Hij vult de meting in vanuit zijn functie","De omgeving heeft nooit om meer gevraagd"]', 3, 4),

('Wanneer kost een meerderheid Middenband het team wel iets?',
 '["Als het team kleiner is dan acht","Nooit, de middenband kost nooit iets","Als het team tevreden is en de opdrachtgever niet","Als er geen Trekker in het team zit"]', 2, 4),

-- ------------------------------------------------- hoofdstuk 5 (zes vragen)
('Hoeveel dynamieken komen er op een kaart?',
 '["Alle regels die passen","Vijf","Drie","Een, de sterkste"]', 2, 5),

('Waarom staan er niet meer dynamieken op de kaart?',
 '["De regels sluiten elkaar uit","Een team met zeven dynamieken kan niets meer aanpakken","De kaart heeft niet meer ruimte","Meer dan drie is statistisch niet houdbaar"]', 1, 5),

('Welke drie richtingen kan een dynamiek hebben?',
 '["Positief, negatief, onbekend","Remt, versterkt, neutraal","Zien, Sturen, Doen","Hoog, midden, laag"]', 1, 5),

('In welke volgorde gebruik je de gespreksvraag en de interventie?',
 '["Eerst de interventie, dan de vraag ter controle","Allebei tegelijk, zodat het tempo blijft","Eerst de vraag, dan het antwoord van het team, dan de interventie","De interventie alleen als het team er zelf om vraagt"]', 2, 5),

('Wat doe je als een team geen van de drie dynamieken herkent?',
 '["De kaart opnieuw laten berekenen","Dat is een uitkomst; het gesprek daarover levert meestal meer op","Een vierde dynamiek erbij pakken","De sessie afbreken en opnieuw meten"]', 1, 5),

('Waarom staat er bij elke dynamiek het woord waarschijnlijk?',
 '["Omdat het team de kaart nog moet goedkeuren","Een dynamiek is afgeleid uit een verdeling en zegt wat er vaak gebeurt","Om aansprakelijkheid te beperken","Omdat de meting anoniem is"]', 1, 5),

-- ------------------------------------------------- hoofdstuk 6 (zes vragen)
('Wie kiest het doelbeeld?',
 '["De opdrachtgever","Het systeem, op basis van de breuk","Het team zelf","De coach"]', 2, 6),

('Waarom hoort er een looptijd bij een doelbeeld?',
 '["Anders verloopt het abonnement","Zonder horizon is een ambitie niet te beoordelen","Om de prijs te kunnen bepalen","Om de hermeting te kunnen inplannen"]', 1, 6),

('Wat is de vaste regel bij het doelbeeld en het eindbeeld?',
 '["Alle drie de vaardigheden stijgen","Het doel ligt minstens tien punten hoger","Sturen en Doen komen boven het gemiddelde uit","Zien blijft gelijk"]', 2, 6),

('Uit welke drie delen bestaat een interventie in het plan?',
 '["Een naam, een beschrijving en een risico","Een eigenaar, een ritme en een telling","Een vraag, een antwoord en een besluit","Een doel, een datum en een budget"]', 1, 6),

('Waarom is de telling het onderdeel dat het meeste doet?',
 '["Het getal gaat naar de opdrachtgever","Tellen houdt de aandacht vast","Het bepaalt de score van het eindbeeld","Zonder telling werkt de hermeting niet"]', 1, 6),

('Welke meetlat gebruikt het eindbeeld?',
 '["Het gemiddelde van de organisatie","Het doelbeeld dat het team heeft gekozen","Het nieuwste gemiddelde van alle metingen","Dezelfde bevroren norm als het startbeeld"]', 3, 6)

on conflict (vraag) do update set
  opties = excluded.opties,
  juist = excluded.juist,
  hoofdstuk = excluded.hoofdstuk,
  actief = true,
  updated_at = now();
