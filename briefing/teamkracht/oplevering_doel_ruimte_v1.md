# Oplevering · Doel-intake en Ruimteblok (v1), fase A

Bijgehouden tijdens het bouwen, branch `doel-ruimte-v1`. Paragraaf 10 van de
briefing vraagt om een lijst van alles waar een placeholder of een aanname is
blijven staan; dat is dit bestand. Elke regel hieronder wacht op een woord van
Maarten, of is al beslist en staat er dan met datum bij.

## Tussenpunt 1 · 17 september 2026: koppeltabel en schema

Gebouwd, nog geen scherm:

| Bestand | Wat |
|---|---|
| `teamkracht-leesregels-config.js` | de drempels van L1 tot en met L6, één plek |
| `teamkracht-ruimte.js` | L1 tot en met L7 als rekenwerk, zonder database of taalmodel |
| `migratie-doel-ruimte-2026-09-17.sql` | paragraaf 4: doelvelden, `teamkracht_ruimte`, `teamkracht_maatregelen`, hermetingsvelden |
| `controle/staat-doel-ruimte-erin.sql` | zeven regels die na de migratie op `klopt = true` horen te staan |
| `test/doel-ruimte.test.js` | criteria 2 tot en met 9 en 12 op het rekenwerk; drukt de L4-tabel af |

De migratie is niet gedraaid. Niets is gedeployd.

### De L4-koppeltabel, afgeleid uit `teamkracht_profielen`

Uit de profielcode (Zien, Sturen, Doen; H hoog, L laag, MMM middenband):
dragen is een H op die plek, beweging is een L op die plek plus de middenband.

| Dimensie | Dragen nu al | Geven de meeste beweging |
|---|---|---|
| Zien | Trekker, Ziener, Beslisser, Meewerker | Aanpakker, Uitvoerder, Afbakener, Afwachter, Middenband |
| Sturen | Trekker, Beslisser, Aanpakker, Afbakener | Ziener, Meewerker, Uitvoerder, Afwachter, Middenband |
| Doen | Trekker, Meewerker, Aanpakker, Uitvoerder | Ziener, Beslisser, Afbakener, Afwachter, Middenband |

Tegen de controlelijst in L4: geen afwijking. Ziener heeft Zien hoog en Doen
laag, Aanpakker Doen hoog en Zien laag, Meewerker Zien en Doen hoog en Sturen
laag, Beslisser Sturen hoog, Trekker alles hoog, Afwachter alles laag.

Twee dingen die de controlelijst niet noemt en die uit het model volgen:

1. Uitvoerder (LLH) en Afbakener (LHL) staan niet in de controlelijst; ze
   zitten wel in het model en dus in de tabel.
2. Afbakener draagt Sturen. Het model codeert hem LHL, dus Sturen hoog, terwijl
   de tekst zegt dat zijn sturen "zich richt op afhouden". Op de kaart telt een
   Afbakener straks mee in "Dragen Sturen nu al". Als dat niet de bedoeling
   is, is dat een wijziging in het model, niet in deze code.

## Aannames en placeholders

A1. **De grens van de bovenste helft van het landelijk beeld.** Het landelijk
beeld is bevroren als gemiddelde en standaarddeviatie; een mediaan is er niet.
De grens is berekend als gemiddelde plus `LANDELIJK_BOVENSTE_HELFT_SD` maal de
standaarddeviatie. BESLIST 17 september 2026: streng, dus 0,8 sd, het
gemiddelde van de bovenste helft bij een normale verdeling. Met de vaste norm
van nu (74, 69, 65; sd 12, 16, 16) ligt de grens op 83,6, 81,8 en 77,8.

A2. **Zin 1 zonder doel.** L6 geeft alleen een zin 1 met `[doel_tekst]`. Voor
een meting zonder doel (keten-fallback) staat er nu: "De kaart leest via de
keten: Doen is bepalend." Dat is geen zin uit de briefing en dus een
placeholder (harde regel 9).

A3. **Doel_tekst in zin 1 wordt niet verkort.** "verkort tot kern" is
woordkeus; de software zet de tekst van de klant letterlijk in de zin (zonder
hoofdletter aan het begin en zonder punt aan het eind). Verkorten is aan de
verwoording binnen het frame, of aan Maarten.

A4. **Op orde schuift door met een sprong terug naar het begin van de keten.**
L3 zegt "de volgende dimensie in de keten die niet op orde is". Staat Doen op
orde, dan is er niets na Doen; de lezing gaat dan verder bij Zien. Na zo'n
sprong staat de eerste stap niet meer voor de leidende dimensie, en dan wordt
de ketencheck-zin niet gebruikt (die zegt "gaat eraan vooraf").

A5. **Criterium 3 en de kolom status.** Bij "status = op_orde voor Zien,
lezing schuift naar Sturen" krijgt de rij `eerste_stap_dimensie = sturen` en
`status = ruimte`; dat Zien op orde staat, staat in `op_orde_dimensies`. Eén
rij heeft één status, en die hoort bij de eerste stap.

A6. **Punten in de zinnen zijn hele punten.** De teamlijn heeft één decimaal;
in "15 punten tot" staat het afgeronde getal. De rij bewaart het decimaal.

A7. **`config_snapshot` op `teamkracht_ruimte`** staat niet in paragraaf 4.2
en is toegevoegd, zoals bij `teamkracht_teambeeld`: de drempels worden geijkt,
en een uitslag die op tafel ligt hoort niet mee te bewegen.

A8. **Hermetingsvelden op twee tabellen.** "Op de hermeting" is bij een team
`teamkracht_teambeeld` (soort hermeting) en bij een persoon
`index_scan_results` (is_hermeting). Beide hebben `doelbereik` en
`anders_gedaan_tekst` gekregen.

A9. **`meting_id` zonder foreign key.** Eén kolom wijst naar twee tabellen,
zoals de briefing hem beschrijft. Het patroon van `opvolging` (twee echte
verwijzingen plus een check) is het alternatief en bewaakt de verwijzing wel.
Aanbeveling: het opvolging-patroon.

A10. **Wel of geen landelijk beeld** wordt bij het berekenen bepaald uit de
koper van de coach van het team (`toegang.js`, zelfde bron als de kaart), en
bevroren in de rij. Nu staat `landelijk_beeld_zonder_licentie` op false en is
er nog geen besluit (taken.md), dus in de praktijk krijgt iedereen het.

## Waar de briefing afwijkt van wat er is gebouwd

Volgens CLAUDE.md: melden, niet meebouwen tot het is beslist.

B1. **Twee soorten doel.** Sinds 7 september bestaat `teamkracht_doel`: een
doelbeeld in punten per dimensie met een horizon, gekozen door de coach, met
`teamkracht_plan` als interventieplan. De briefing voegt een tweede doel toe:
`doel_tekst` en `doeltype` van de klant, op het team. Beide blijven bestaan;
in de code heten ze doelbeeld en doel. Het scherm `teamkracht-doel.html` en de
route `api/teamkracht-doel.js` gaan over het doelbeeld en raken deze briefing
niet.

B2. **`teamkracht_maatregelen` naast `teamkracht_plan`.** Beide zijn een lijst
van wat het team gaat doen. De briefing vraagt velden die `teamkracht_plan`
niet heeft (eigenaar met mailadres, streefdatum, status). De tabel staat er
zoals gevraagd, leeg. Fase B kiest.

B3. **Print en Playwright.** Paragraaf 6.1 en criterium 10 noemen "SVG met
print-CSS" en "Playwright-screenshot, bestaande check". Er is geen Playwright;
de kaart wordt sinds 15 september als vector getekend in `kaart-pdf.js`
(pdfkit). BESLIST 17 september 2026: pdf blijft. Blok 1, 3, 4 en 5 komen in
de pdf-tekening en criterium 10 wordt getoetst met de bestaande pdf-tests.

B4. **"Landelijk beeld" in de zinnen tegenover `taalregels.md`.** De taalregels
zeggen: op de kaart heet de lijn "het gemiddelde", niet landelijk, en in de
individuele uitslag geen vergelijking met anderen. L6 zegt letterlijk "de
bovenste helft van het landelijk beeld", ook in de individuele variant.
BESLIST 17 september 2026: in de individuele uitslag is de referentie altijd
`eigen_sterkste` (`bepaalRuimte` met `niveau: "individu"` zet het landelijk
beeld uit), en op de kaart staat "de bovenste helft van het gemiddelde". Die
laatste formulering is van mij, niet uit de briefing; een test bewaakt dat het
woord landelijk in geen enkele zin voorkomt.

B5. **Het profiel van een deelnemer zonder team.** Paragraaf 6.2 toont in blok
3 het eigen profiel. `profiel_code` wordt alleen gezet als een team is
doorgerekend; een losse Zelfkracht Index heeft geen profiel. Voor die groep is
er dus geen profielzin, tenzij het profiel bij de ruimteberekening alsnog
wordt bepaald met de vaste norm uit `teamkracht_config`.

B6. **`teamkracht_leesregels_config` is een bestand**, zoals de briefing zegt
("één configuratiebestand"), en geen kolom in `teamkracht_config`. Bijstellen
vraagt dus een commit en niet de beheerpagina. Andersom is een halve dag werk.

B7. **De acht deelnemers uit het Leidersbeeld** raken deze briefing niet; wel
staat in paragraaf 6.1 "pas vanaf tien deelnemers" en dat klopt met
`min_deelnemers_lijnen`.

## Tussenpunt 2 · 17 september 2026: fase A gebouwd

Akkoord van Maarten op tussenpunt 1 ("ok bouw rest fase a"). Gebouwd, op de
branch, niet gedeployd, migratie niet gedraaid:

| Bestand | Wat |
|---|---|
| `teamkracht-ruimte-blokken.js` | de vijf blokken: teksten, gegevens voor blok 1 en 3, balkenvisual als svg, html |
| `teamkracht-ruimte-db.js` | berekenen en opslaan in `teamkracht_ruimte`, nieuwste rij lezen, doel van de leider overnemen (L5) |
| `api/teamkracht-teamdoel.js` | nieuw: doel zetten of wijzigen (coach), doeltekst bij token (uitnodigingspagina) |
| `api/teamkracht-bereken.js` | berekent na het beeld ook de ruimte |
| `api/teamkracht-kaart.js` | leest de ruimterij (of berekent hem voor een oud beeld) en geeft hem aan html en pdf |
| `api/teamkracht-team.js` | doel verplicht bij een nieuw team; koppeling neemt het leiderdoel over |
| `api/leidersbeeld-kopen.js` | koop via het Leidersbeeld neemt het leiderdoel over |
| `api/scan.js` | slaat het eigen doel op, berekent de ruimte, geeft blok 1 en 3 terug |
| `api/lead.js` | de regel "Je doel: ... Waar de winst zit: ..." boven de indexwaarde |
| `api/uitslag.js` | leest de ruimterij (of berekent hem voor een oude meting) |
| `api/leidersbeeld.js`, `leidersbeeld.js` | doel verplicht bij het Leidersbeeld; gaat mee naar het tweede Leidersbeeld |
| `api/leider.js`, `leider-pagina.js` | het label van L5 onder het blok gedeeld beeld / verschil in beeld |
| `leidersbeeld-mail.js` | "En zit de ruimte waar jij hem verwacht?" achter de hook |
| `teamkracht-kaart.js`, `kaart-pdf.js` | blok 1 bovenaan, blok 3 rechts na de breuk en de verdeling, dynamieken in L7-volgorde, blok 4 en 5 onderaan |
| `uitslag-pagina.js` | de vijf blokken in de jij-vorm op /uitslag/:token |
| `scan.html` | het doelscherm na de mailstap, de teamdoelregel op de uitnodiging, de vijf blokken op de uitslag, de herkenningszin met doel, de events `doel_ingevuld` en `doel_overgeslagen` |
| `leidersbeeld.html` | het doelscherm met bevestiging en Aanpassen |
| `teamkracht.html` | doel bij een nieuw team, Doel toevoegen en Aanpassen per team, de knop op de kaart |
| `scripts/serveer.mjs` | statische server voor de preview (de python-server werkte niet meer op deze Mac) |
| `test/doel-ruimte.test.js`, `test/snapshot-teambeelden.json` | 43 tests: criteria 1 tot en met 12 voor zover zonder database te toetsen |

Acceptatiecriteria: 1 (momentopname van drie beelden voor en na, en de oude
kaart blijft de oude kaart), 2, 3, 4, 5, 6, 7, 8 (op de gerenderde html, svg
en mails van de testset), 9, 10 (pdf A4 en A1 met de blokken, één vel), 11
(geen route schrijft in `teamkracht_maatregelen` of de hermetingsvelden) en
12 zijn getest. Wat alleen met Supabase te toetsen is (de rij staat er echt,
de migratie is gedraaid) staat bij Maarten.

## Aannames en placeholders, aangevuld bij tussenpunt 2

A11. **Het doelscherm van het Leidersbeeld staat na de twaalf vragen**, niet
"na de registratie en voor de items" zoals 7.3 zegt. De bestaande flow doet
bewust de vragen eerst en de gegevens daarna (wie twaalf vragen heeft
beantwoord geeft zijn adres eerder). Het doel zit ertussen: vragen, doel,
gegevens. Verplicht, met bevestiging en Aanpassen.

A12. **Twee koppen in de individuele uitslag zijn placeholders**: "Waar jij
naartoe werkt" (blok 1) en "Wat jij gaat doen" (blok 4). Paragraaf 6.2 geeft
voor de individuele variant alleen de leeg-teksten, geen koppen.

A13. **De eyebrow boven het L5-label** op /leider/:token heet "Leidersbeeld en
teamdoel", naar het bestaande "Leidersbeeld en teamlijn". Niet uit de
briefing.

A14. **Het profiel voor wie zonder team meet** wordt nu bepaald bij de
ruimteberekening, met de vaste norm uit `teamkracht_config`, en in
`profiel_code` gezet als dat leeg was. Daardoor toont blok 3 ook voor een
losse Zelfkracht Index het eigen profiel met één zin (de eerste zin van
`tekst_deelnemer`). Dit was B5.

A15. **Het taalmodel verwoordt de drie zinnen niet.** De zinnen uit L6 staan
letterlijk op het scherm, uit de software. De briefing staat toe dat het
model woordkeus en ritme aanpast; dat is niet gedaan, want de duiding wordt
al gegenereerd voordat het doel bekend is (de duiding start op de mailstap,
het doel komt erna). De 320-woordenlimiet van de duiding verandert dus niet.

A16. **De html-kaart groeit voorbij een A4.** De kaart op het scherm heeft een
minimumhoogte van een A4 en loopt door als de blokken meer ruimte vragen. De
pdf is de drager voor papier (besluit 17 september): daar krimpt de
rechterkolom tot alles op één vel past, en blok 4 en 5 staan onderaan.

A17. **De deelbare herkenningszin met doel** gaat als één tekst in `deel_zin`;
de grens in `api/scan.js` is daarvoor van 140 naar 360 tekens gegaan. De
deelpagina /deel/:id toont die tekst ongewijzigd.

A18. **De knop Doel toevoegen op de kaart** werkt via het kaartvenster in het
dashboard (een bericht aan de bovenliggende pagina). Buiten het dashboard
doet de knop niets; in de pdf staat hij niet.

A19. **Het L5-label in de resultaatmail** van het Leidersbeeld staat er alleen
als er op dat moment al een team met doel aan hangt. Bij de gratis voordeur
is dat nooit zo, dus in de praktijk staat in de mail alleen de nieuwe zin
achter de hook.

A20. **doel_ingevuld_door** is "begeleider" voor wie via het dashboard een
team aanmaakt of een doel zet, "leider" bij het Leidersbeeld en bij het
overnemen van het leiderdoel, "deelnemer" bij de Zelfkracht Index. De waarde
"teamleider" wordt alleen gezet als de client dat meegeeft; er is nog geen
scherm waar een teamleider zelf inlogt.

## Wat Maarten nu doet

1. `migratie-doel-ruimte-2026-09-17.sql` draaien in de SQL-editor, daarna
   `controle/staat-doel-ruimte-erin.sql`: zeven regels op `klopt = true`.
2. Op een preview-deploy van de branch: een team aanmaken met doel, laten
   invullen, de kaart maken, de pdf openen; een losse scan doen met en zonder
   doel; een Leidersbeeld invullen.
3. De placeholders A2, A12 en A13 van een formulering voorzien, of ze laten
   staan.
4. Besluit over B2 (maatregelen of plan) voor fase B, en over A9 (foreign key
   op meting_id).
5. Pas daarna: mergen en deployen.
