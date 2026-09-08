# Teamkracht, wat er nog ligt

Bijgehouden lijst. Bovenaan wat het meest oplevert.

## 1. De startkaart voor teamleden

Idee van Maarten, 8 september 2026.

Na de sessie krijgt elk teamlid een persoonlijke kaart met een positieve
boodschap: wat het team heeft afgesproken, en wat dat voor hem betekent. Niet
een herinnering aan wat er ontbreekt, maar één ding dat hij deze weken gaat
oefenen. Dat is precies waar een gedragsclub het verschil maakt: de sessie duurt
twee uur, het gedrag moet het de rest van het jaar doen.

**Kan dat gegenereerd worden.** Ja, en zonder AI. Alle ingrediënten liggen al
in de database:

| Wat | Waar het vandaan komt |
|---|---|
| Zijn eigen patroon en ontwikkelrichting | `index_scan_results.profiel_code` en `teamkracht_profielen` |
| Het doel dat het team koos | `teamkracht_doel`, met de ambitieband erbij |
| De interventie die bij zijn patroon hoort | `teamkracht_plan`, gefilterd op zijn profielcode |
| Ritme, eigenaar en wat er geteld wordt | dezelfde planregel |
| Zijn eigen adres en resultaatlink | `index_scan_results` |

Een sjabloon is genoeg: één kaart, opgebouwd uit vaste zinnen met die velden
erin. De briefing schrijft trouwens voor dat er geen AI in dit onderdeel zit,
dus dat komt goed uit. Zelfde rendering als de Teamkrachtkaart, dus het kan
zowel als mail als als afdrukbare kaart.

**Vorm.** Eén A5 of een mail met een beeld. Bovenaan het teamdoel in één zin,
daaronder "wat jij deze weken oefent" met de interventie, het ritme en wat je
telt, en onderaan de gespreksvraag als iets om jezelf voor te leggen. In de
toon van taalregels.md: positief, makkelijk, vooruit. Nergens een score.

**Wanneer.** Twee momenten. Direct na de sessie als startkaart, en rond week
vijf een korte herinnering met dezelfde interventie en de vraag hoe het telt.
Dat tweede moment sluit aan op `teamkracht_feedback.moment`, dat al bestaat.

**Wat eerst geregeld moet zijn.** De deelnemer gaf zijn adres voor zijn eigen
uitslag. Een kaart die de coach namens hem laat versturen is een nieuw gebruik
van dat adres. Dat hoort in de uitnodigingstekst te staan en in `privacy.html`,
voordat de eerste kaart de deur uitgaat. De coach verstuurt hem, maar krijgt
hem nooit te zien: er staat een persoonlijk patroon op.

**Waarschijnlijk een dag werk**, inclusief de tekst en de knop in het dashboard.

## 2. De vier tellingen

Vier interventies hebben een telling die niet deugt, en die bepalen of een
traject bewijs oplevert. Te wijzigen in de beheerpagina, zie
`handleiding-beheer.md`.

- Eerst veiligheid, dan zien: "aantal keren dat er iets is gemeld zonder dat het
  gevolgen had" vraagt een oordeel, geen telling.
- Eén ding per week teruggeven: twee dingen in één veld, en het tweede is geen
  getal.
- Wekelijks en elk overleg worden door elkaar gebruikt terwijl ze alleen
  samenvallen bij een team dat wekelijks overlegt.
- Twee interventies delen dezelfde telling.

## 3. Het gemiddelde verversen

Nu 74, 69 en 65 over 73 metingen, versie 2026.1, vast ingesteld. Verversen zodra
er meer metingen zijn; omschakelen naar automatisch pas als `marge_sturen` onder
de 2 zakt, rond 250 metingen. Werkwijze in `handleiding-beheer.md`.

## 4. De ambitiebanden vervangen door metingen

Onder 5, 5 tot 10, 10 tot 15, boven 15 zijn nu een werkhypothese. Zodra er
hermetingen zijn kan de werkelijke verdeling van verschuivingen die grenzen
vervangen: de mediaan wordt normaal, het derde kwartiel wordt hoog.

## 5. De eerste band is dertig punten breed

Laag loopt van 0 tot 30, de andere banden zijn twintig. Iemand op 0 leest
daardoor een advies van +30 in plaats van maximaal +20. Komt in de praktijk niet
voor bij een gemiddelde rond de 70, maar als je die band ooit splitst is dit de
plek.

## 6. Fase 3, de leerlus

De tabellen liggen er: `teamkracht_feedback` voor wat de coach na de sessie
aanvinkt, en `teamkracht_coachvragen.werkte` voor of een eigen vraag werkte.
Er is nog geen scherm voor. Dat hoort bij de nabespreking, samen met het
aanvinken van welke dynamieken werden herkend.
