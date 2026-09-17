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

## Nog niet gebouwd (wacht op akkoord op tussenpunt 1)

- de serverside berekening bij afronden van een meting en bij een doelwijziging
- de invoerflows 7.1, 7.2 en 7.3
- blok 1, 3, 4 en 5 op de kaart, de individuele uitslag en het Leidersbeeld
- de balkenvisual, de strip, de profielregels, de mailregels
- de funnel-events `doel_ingevuld` en `doel_overgeslagen`
- criterium 1 (snapshot van drie bestaande metingen voor en na), 10 en 11
