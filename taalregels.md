# Taalregels

Geldt voor alles wat een deelnemer, een coach of een bezoeker te lezen krijgt: pagina's,
mails, de teksten in de database en de instructies aan de AI. De Happly designstandaard in
Drive blijft de bron voor beeld en opbouw; dit bestand gaat alleen over de woorden.

## Het uitgangspunt

Happly is een gedragsclub. De taal laat **positiviteit, gemak en vooruitgang** zien.

Wie gedrag wil veranderen, moet de eerste stap klein en aantrekkelijk maken. Taal die
achteruitkijkt, weegt of een gebrek benoemt werkt daartegenin, ook als ze feitelijk klopt.
Toets elke nieuwe zin op drie dingen: is hij positief, maakt hij het makkelijk, wijst hij
vooruit.

Vastgesteld 7 september 2026.

## Wat dat concreet betekent

**Startpunt, geen nulpunt.** Een eerste meting is een startpunt. Het woord nulpunt is
overal vervangen; het suggereert dat iemand bij nul begint, en dat is nooit waar.

De slotzin "Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je
nulpunt." is uit de uitslag, de mails en de AI-prompt gehaald. Hij staat nog als constante
in `zelfkracht-uitslag.js` en `scan.html` onder de naam `OUDE_SLOTZIN`, uitsluitend om hem
weg te knippen uit duidingen die eerder zijn gegenereerd en in de database staan. Die
tekst blijft letterlijk staan, anders herkent hij zichzelf niet meer.

**Advies, geen tekort.** De kolom naast de score heet Advies en toont de eerstvolgende
stap: het aantal punten tot het volgende niveau. Klein en haalbaar, en het is dezelfde maat
waarin de coach in de sessie naar het ambitieniveau vraagt. Tot 7 september 2026 mikte die
kolom op een vast doel van 80, wat iemand op 22 een advies van +58 gaf; dat is geen stap
maar een berg.

**Beweging boven stand.** Een verschuiving vanaf de eigen startlijn zegt meer dan een
plek op een schaal. Vergelijk iemand met zichzelf van een half jaar geleden, niet met een
gemiddelde.

**Geen vergelijking met anderen in de individuele uitslag.** Geen landelijk gemiddelde,
geen percentiel, geen ranglijst. Zie ook `verantwoording.html` en het verbod in de prompt
van `api/duiding.js`.

## Harde regels

Deze worden bij het opslaan in de beheerpagina gecontroleerd
(`teamkracht-beheer-schema.js`) en zitten in de tests.

- Geen gedachtestreep. Gebruik een komma, een dubbele punt of een puntkomma.
- Geen uitroeptekens.
- Nederlands.
- Over een team: altijd "waarschijnlijk", nooit "dit team is".
- Een profiel beschrijft gedrag in deze context, niet de persoon.
- Publieke dimensienamen zijn Zien, Sturen en Doen.
- Nooit "test" of "quiz" voor de meting.

## Woorden die niet meer gebruikt worden

| Niet | Wel |
|---|---|
| nulpunt | startpunt |
| nameting | hermeting |
| rondje | alleen in het boek en binnen de Sprint, met uitleg |
| je getal verzetten | eraan werken, in beweging komen, aan de slag |
| garantie, risicoloos, geld terug | "Na de eerste week beslis je definitief. Past het niet, dan krijg je je inleg terug." |
| Samenspel | Teamkracht |
