> **Bron van waarheid.** Dit bestand in de repo is leidend. Zie CLAUDE.md.
>
> **Eén wijziging op de aangeleverde versie, besluit Maarten 17 september 2026:**
> de termijn van het doel is geen vaste "tien weken" of "drie maanden" in de
> vraagzin, maar een datum die de klant zelf invult, zoals bij een
> implementatie-intentie. Kolom `doel_datum date` op dezelfde drie tabellen
> (`migratie-doel-datum-2026-09-17.sql`). De vraagzinnen in 7.1, 7.2 en 7.3
> zijn daarop aangepast en gemarkeerd met [17-09]; blok 1 toont "Voor [datum]."
> en de mailregel wordt "Je doel: [doel_tekst], voor [datum]. Waar de winst
> zit: [eerste_stap_dimensie]."
>
> **Tweede wijziging, besluit Maarten 17 september 2026 (na de preview):** het
> teamdoel wordt niet vóór de meting afgedwongen. Een doel vooraf kan de
> deelname remmen, want dan moet er eerst een ei gelegd worden. Het doel wordt
> in de sessie benoemd, bij de schuifjes van het doelbeeld, waar het team erbij
> zit. Daarom: 7.1 optioneel bij het aanmaken (wie het al weet vult alle drie de
> velden), de drie velden erbij op de doelbeeldpagina, en de knop Doel
> toevoegen blijft. Tot het doel er is leest de kaart via de keten (L1). Het
> doel bij het Leidersbeeld (7.3) is om dezelfde reden overslaanbaar. Besluit 2
> in paragraaf 11 ("doel verplicht bij nieuwe teams") is daarmee vervallen.

# Briefing Code · Doel-intake en Ruimteblok (v1)

Voor: Claude Code · Van: Maarten · 17 september 2026
Repo: Nees644/happly-scan · Locatie: briefing/teamkracht/ naast briefing_code_teamkracht.md, teamkracht_model_v4_keten.md en briefing_code_leidersbeeld_v2_2.md.

Bij strijd geldt: dit document bepaalt de lezing en de presentatie; briefing_code_teamkracht.md en teamkracht_model_v4_keten.md blijven leidend voor de berekening van scores, profielen, teamlijn, breuk en de regels R1 tot en met R12. Deze briefing verandert geen enkele score.

## 1. Waarom dit gebouwd wordt

De Zelfkracht Index en de Teamkracht Index meten het mechanisme: in welke mate iemand of een team tot doen komt. Wat nu ontbreekt is de context: waarvoor. Klanten kopen geen meting, ze kopen inzicht in de ruimte om te bereiken wat zij zelf willen. Vanaf nu werkt elke meting daarom met een doel dat de klant zelf benoemt, en leest de uitslag de scores in het licht van dat doel.

Verhaal in vijf lagen, dat de opbouw van elke uitslag wordt:

1. Doel: wat de klant wil bereiken, in eigen woorden
2. Doen: wat er nu gebeurt (de index en de lijn, ongewijzigd)
3. Ruimte: waar voor dat doel de meeste winst zit
4. Route: wat het team of de persoon gaat doen (Sprint, fase B)
5. Resultaat: wat het opleverde na hermeting (fase B)

Deze briefing bouwt laag 1 en laag 3 en maakt de datastructuur voor laag 4 en 5 alvast aan. Laag 4 en 5 worden in een volgende briefing gebouwd.

Vaste zinnen die overal gelden: Zelfkracht is wat iemand zelf doet. Teamkracht is wat het team samen doet. Succes is wat je daarmee bereikt.

## 2. Scope van deze briefing (fase A)

Bouwen:

- Doel-intake bij de Teamkracht Index (teamleider of begeleider vult in bij het aanmaken van een team)
- Doel-intake bij de Zelfkracht Index (individu, ik-vorm, direct na de mailflip en voor de uitslag)
- Doel-intake bij het Leidersbeeld (leider vult hetzelfde in als het team)
- Ruimteblok op de Teamkrachtkaart en op de individuele uitslag
- Leesregels L1 tot en met L6 (paragraaf 5)
- Nieuwe blokopbouw van de uitslagpagina's (paragraaf 6)
- Datavelden voor Route en Resultaat (leeg, alleen schema)

Niet bouwen in deze fase:

- Maatregelenlog en Sprint-flow (L7, fase B)
- Hermeting met doelbereik en effectbeeld (L8, fase B)
- Organisatiedashboard (fase C)
- Enige wijziging aan de berekening van scores, profielen, teamlijn, breuk of regels
- LLM-classificatie van het doel (de klant kiest zelf, zie L1)

## 3. Harde regels

1. Het doel stuurt de lezing, nooit de score. Index, dimensiescores, profielen, teamlijn, breuk, landelijk beeld en norm_bron blijven exact zoals ze zijn.
2. Alles in het Ruimteblok is deterministisch berekend. De LLM (Claude API, bestaand duidingsmechanisme) verwoordt alleen, binnen het vaste frame van L6, en verandert nooit inhoud of volgorde.
3. Ruimte wordt altijd positief geformuleerd. Verboden woorden in duiding, labels en code-comments die in de UI terechtkomen: kloof, gap, tekort, blinde vlek, zwak, achterstand. Gebruik: ruimte, winst, op orde, sterk, eerste stap.
4. Nooit "kan" in de zin van capaciteit. Altijd "doet", "gebeurt", "laat zien".
5. Teams worden alleen vergeleken met het landelijk beeld en de eigen vorige meting, nooit met andere teams in dezelfde organisatie. Het Ruimteblok toont dus nooit een ranglijst.
6. Individuele scores zijn alleen zichtbaar voor de deelnemer zelf. Individuele ruimte wordt in teamweergaven alleen als anonieme verdeling getoond, en pas vanaf tien deelnemers (zelfde drempel als de anonieme individuele lijnen).
7. N wordt nergens in de UI getoond.
8. Betaling en licenties: Mollie. Niets uit deze briefing raakt de betaalflow.
9. Nieuwe woorden in de UI komen letterlijk uit deze briefing. Bij twijfel over formulering: laat een placeholder staan en meld het, verzin geen alternatieven.

## 4. Datamodel

Voeg toe aan de bestaande tabellen; verwijder of hernoem niets. Alle nieuwe velden nullable, zodat bestaande metingen zonder doel blijven werken (die vallen terug op de ketenregel, zie L1).

### 4.1 Doel

Op teamkracht_teams (team) en op de individuele scan-resultaten (deelnemer) en op de leidersbeeld-invulling:

- doel_tekst text, vrije tekst, maximaal 200 tekens
- doel_datum date, de termijn die de klant invult [17-09]
- doeltype text, enum: zien, sturen, doen, onbekend
- doeltype_bron text, enum: klant (zelf gekozen), keten (afgeleid via L1 fallback)
- doel_ingevuld_op timestamptz
- doel_ingevuld_door text, enum: teamleider, begeleider, deelnemer, leider

### 4.2 Ruimte (berekend, opgeslagen per meting zodat de uitslag stabiel blijft)

Nieuwe tabel teamkracht_ruimte (één rij per meting per niveau):

- id uuid
- meting_id uuid (verwijst naar de teammeting of de individuele scan)
- niveau text, enum: individu, team
- leidende_dimensie text, enum: zien, sturen, doen
- eerste_stap_dimensie text, enum: zien, sturen, doen (gelijk aan leidende_dimensie tenzij L2 afgaat)
- ketencheck_actief boolean
- referentie_type text, enum: eigen_sterkste, landelijk_bovenste_helft
- referentie_waarde numeric
- huidige_waarde numeric (score op de eerste_stap_dimensie)
- ruimte_punten numeric (referentie_waarde min huidige_waarde, minimaal 0)
- status text, enum: ruimte, op_orde
- op_orde_dimensies text[] (dimensies die al op of boven de referentie zitten)
- draagprofielen text[] (L4)
- bewegingsprofielen text[] (L4)
- berekend_op timestamptz
- regelversie text, vaste waarde L-v1

### 4.3 Route en Resultaat (alleen schema, fase B vult)

Nieuwe tabel teamkracht_maatregelen: id, team_id, meting_id, interventie_ref (verwijzing naar de regel R1 tot R12 waaruit de interventie komt), omschrijving, eigenaar_naam, eigenaar_email, streefdatum, status (enum gepland, gestart, afgerond, vervallen), aangemaakt_op.

Op de hermeting: doelbereik integer 0 tot 100, anders_gedaan_tekst text, beide nullable.

Bouw de tabellen en velden, maak geen UI ervoor.

## 5. Leesregels L1 tot en met L8

Drempels staan als parameters in één configuratiebestand (teamkracht_leesregels_config), niet hardcoded in de logica. Startwaarden hieronder; Maarten ijkt ze op de eerste tien founderteams.

Parameters:
- KETEN_DREMPEL = 10 (punten op de schaal 0 tot 100; als de dimensiescores een andere schaal hebben, reken om en meld de gebruikte schaal in de code-comment)
- OP_ORDE_DREMPEL = 5
- MIN_DEELNEMERS_INDIVIDUELE_VERDELING = 10

### L1 · Doeltype

De klant typt het doel vrij in (doel_tekst) en kiest daarna zelf één van drie zinnen. Geen AI-classificatie, geen trefwoordherkenning. De keuze bepaalt doeltype.

Keuzezinnen (letterlijk, in deze volgorde):

1. "Dat we hetzelfde beeld hebben van wat er speelt en wat er moet gebeuren" → zien
2. "Dat we knopen doorhakken en verantwoordelijkheid nemen" → sturen
3. "Dat we afmaken wat we afspreken" → doen
4. "Weet ik nog niet" → onbekend

Individuele variant (Zelfkracht Index, ik-vorm):

1. "Dat ik scherp heb wat er speelt en wat er moet gebeuren" → zien
2. "Dat ik knopen doorhak en verantwoordelijkheid neem" → sturen
3. "Dat ik afmaak wat ik me voorneem" → doen
4. "Weet ik nog niet" → onbekend

Fallback bij onbekend of bij metingen zonder doel: de laagste dimensiescore in de volgorde Zien, Sturen, Doen wordt de leidende dimensie (bij gelijke stand wint de vroegste in de keten). doeltype_bron = keten.

Bij een team is het doel van het team leidend voor de kaart. De leider vult bij het Leidersbeeld hetzelfde in (zie L5).

### L2 · Ketencheck

Volgorde in de keten: Zien gaat voor Sturen, Sturen gaat voor Doen.

Als een dimensie eerder in de keten dan de leidende dimensie minimaal KETEN_DREMPEL punten lager scoort dan de leidende dimensie, dan wordt die eerdere dimensie eerste_stap_dimensie en blijft de gekozen dimensie leidende_dimensie. Bij twee eerdere dimensies die beide voldoen: de vroegste in de keten. ketencheck_actief = true.

Voorbeeld: doeltype doen, Doen 62, Sturen 48, Zien 70. Sturen ligt 14 onder Doen, dus eerste_stap_dimensie = sturen. Duiding: "Voor afmaken is Doen bepalend. Sturen gaat eraan vooraf, daar begint de ruimte."

Als geen eerdere dimensie voldoet: eerste_stap_dimensie = leidende_dimensie, ketencheck_actief = false.

### L3 · Ruimte

Referentie = de hoogste van twee waarden:
- de eigen sterkste dimensie van deze meting (eigen_sterkste)
- de grens van de bovenste helft van het landelijk beeld voor de eerste_stap_dimensie (landelijk_bovenste_helft; gebruik de bevroren norm_bron, zelfde bron als de kaart)

Ruimte = referentie min huidige score op de eerste_stap_dimensie, afgekapt op 0.

Als ruimte kleiner is dan OP_ORDE_DREMPEL: status = op_orde, en de lezing schuift naar de volgende dimensie in de keten die niet op orde is (pas L3 daar opnieuw toe). Zijn alle drie op orde: status = op_orde voor de leidende dimensie, ruimte = 0, en de duiding gebruikt de op-orde-variant uit L6.

Formulering altijd vanuit wat al goed gaat: "In Zien laten jullie al zien hoe het eruitziet als het loopt. Diezelfde ruimte is er voor Sturen."

Bij LOS-pakketten zonder landelijk beeld (kaart zonder landelijk beeld, zie prijslijst 14 september) wordt alleen eigen_sterkste als referentie gebruikt.

### L4 · Profielkoppeling

Leid de koppeling af uit de profieldefinities in teamkracht_model_v4_keten.md, niet uit een handmatige lijst:

- Draagprofielen van een dimensie: alle profielen waarvan de definitie die dimensie als hoog aanmerkt.
- Bewegingsprofielen van een dimensie: alle profielen waarvan de definitie die dimensie als laag aanmerkt, plus Middenband.

Bereken beide voor de eerste_stap_dimensie. Toon op de kaart per groep de aantallen in dit team (nooit namen). Leg de afgeleide koppeling als tabel in de code-comment en in de testoutput, zodat Maarten hem kan controleren tegen het model.

Ter controle, verwacht op basis van het model (afwijking melden, niet zelf oplossen): Ziener heeft Zien hoog en Doen laag; Aanpakker heeft Doen hoog en Zien laag; Meewerker heeft Zien en Doen hoog en Sturen laag; Beslisser heeft Sturen hoog; Trekker alles hoog; Afwachter alles laag.

### L5 · Leidersbeeld

De leider kiest bij het Leidersbeeld hetzelfde doeltype (teamvariant van L1). Vergelijk met het doeltype van het team:

- Gelijk: label "Gedeeld beeld over wat nodig is"
- Verschillend: label "Verschil in beeld over wat nodig is", met beide keuzezinnen naast elkaar

Dit label staat op de kaart naast het bestaande gedeeld beeld / verschil in beeld op de scores. Nooit de woorden kloof, gap of blinde vlek. Als het team nog geen doel heeft maar de leider wel: gebruik het leiderdoel als voorlopig teamdoel met doel_ingevuld_door = leider, en laat het team het bij de meting bevestigen of aanpassen.

### L6 · Duidingstemplate

Drie vaste zinnen, in deze volgorde, boven de bestaande drie dynamieken. De software vult de velden; de LLM krijgt de drie gevulde zinnen als frame en mag alleen woordkeus en ritme aanpassen, nooit inhoud, volgorde, cijfers of dimensienamen.

Zin 1, wat bepalend is:
- zonder ketencheck: "Voor [doel_tekst, verkort tot kern] is [leidende_dimensie] bepalend."
- met ketencheck: "Voor [doel_tekst] is [leidende_dimensie] bepalend. [eerste_stap_dimensie] gaat eraan vooraf, daar begint de ruimte."

Zin 2, waar de ruimte zit:
- status ruimte: "De grootste ruimte zit in [eerste_stap_dimensie]: [ruimte_punten] punten tot [referentie omschrijving: 'jullie eigen sterkste dimensie' of 'de bovenste helft van het landelijk beeld']."
- status op_orde (alle drie): "[leidende_dimensie] staat op orde. De ruimte zit nu in het vasthouden en in het doel zelf scherper maken."

Zin 3, wat al op orde is:
- "In [op_orde_dimensies, komma-gescheiden] laten jullie al zien hoe het eruitziet als het loopt."
- als op_orde_dimensies leeg is: "De eerste stap is klein: [eerste_stap_dimensie] een paar punten omhoog, de rest volgt in de keten."

Individuele variant: zelfde drie zinnen in de jij-vorm ("laat je al zien", "je eigen sterkste dimensie").

De bestaande 320-woordenlimiet, het lage-score-protocol en de proportieregel van de individuele duiding blijven gelden; de drie zinnen tellen mee in de 320 woorden.

### L7 · Route (fase B, hier alleen ter context)

Het Sprintdoel is het ingevoerde doel_tekst, geen nieuw doel. Interventies op de kaart worden gesorteerd op eerste_stap_dimensie eerst. Gekozen interventies gaan in teamkracht_maatregelen met eigenaar en streefdatum. De halverwege-check vraagt alleen naar de eerste_stap_dimensie.

Voor deze fase: sorteer de drie dynamieken op de kaart al zo dat een dynamiek die de eerste_stap_dimensie raakt bovenaan staat, zonder de selectie zelf (paragraaf 5 van de teamkracht-briefing) te veranderen.

### L8 · Resultaat (fase B, hier alleen ter context)

Bij hermeting twee extra vragen: doelbereik 0 tot 100, en "wat doet het team nu anders" (vrije tekst). Resultaat toont drie getallen naast elkaar: verschil op de eerste_stap_dimensie, verschil op de index, doelbereik.

Voor deze fase: alleen de velden (4.3).

## 6. Presentatie: vaste blokopbouw van elke uitslag

Individu, team en (later) organisatie krijgen dezelfde vijf blokken in dezelfde volgorde. Blok 4 en 5 worden nu al getoond, met een vaste tekst als ze leeg zijn. Dat is bewust: de lege blokken maken zichtbaar dat de meting een begin is.

### 6.1 Teamkrachtkaart en teamuitslag

Blok 1 · Doel
Kop: "Waar dit team naartoe werkt"
Inhoud: doel_tekst letterlijk, in aanhalingstekens, met eronder "Voor [doel_datum]." [17-09] en de gekozen keuzezin. Bij keten-fallback: "Nog geen doel benoemd. De kaart leest via de keten." plus knop "Doel toevoegen".

Blok 2 · Doen
Bestaande inhoud, ongewijzigd: index, teamlijn, anonieme individuele lijnen, breuk, profielverdeling.

Blok 3 · Ruimte
Kop: "Waar de winst zit"
Inhoud, in deze volgorde:
- de drie zinnen uit L6
- een compacte visual: de drie dimensies als horizontale balken, met de eerste_stap_dimensie gemarkeerd in magenta (#D6026F), de referentie als streepje, en de ruimte als lichter gearceerd segment tussen huidige waarde en referentie. Geen pijlen omlaag, geen rood.
- draagprofielen en bewegingsprofielen als twee regels met aantallen: "Dragen [dimensie] nu al: 3 teamleden (Beslisser, Trekker). Geven de meeste beweging: 5 teamleden (Ziener, Afwachter, Middenband)."
- bij tien of meer deelnemers: anonieme verdeling van individuele ruimte op de eerste_stap_dimensie als kleine strip (hoeveel teamleden zitten al op of boven de referentie, hoeveel eronder). Geen individuele waarden.
- daarna de bestaande drie dynamieken, gesorteerd volgens L7

Blok 4 · Route
Kop: "Wat het team gaat doen"
Leeg-tekst: "Hier komen de afspraken uit de Teamkracht Sprint: welke stap, wie pakt hem op, wanneer." Geen invoer in deze fase.

Blok 5 · Resultaat
Kop: "Wat het opleverde"
Leeg-tekst: "Na de hermeting staat hier wat er anders gebeurt en of het doel is gehaald."

Print (SVG met print-CSS, bestaande aanpak): blok 1 bovenaan de kaart, blok 3 direct onder de teamlijn en breuk, blok 4 en 5 onderaan als twee lege kaders met de leeg-tekst.

### 6.2 Individuele uitslag (Zelfkracht Index, /uitslag/:token)

Zelfde vijf blokken, jij-vorm. Blok 1 toont het eigen doel. Blok 3 toont de drie zinnen plus de balkenvisual, zonder profielaantallen (het gaat om één persoon: toon het eigen profiel met één zin uit het model). Blok 4 leeg-tekst: "Hier komt straks je eigen eerste stap." Blok 5 leeg-tekst: "Bij je volgende meting zie je hier wat er is veranderd."

De bestaande deelbare herkenningszin blijft, en krijgt het doel erbij als het is ingevuld: "[herkenningszin] Mijn doel: [doel_tekst]."

Resultaatmail (Resend, bestaande flow): voeg één regel toe boven de indexwaarde: "Je doel: [doel_tekst], voor [doel_datum]. Waar de winst zit: [eerste_stap_dimensie]." [17-09]

### 6.3 Leidersbeeld

Op de Leidersbeeld-resultaatpagina en in de resultaatmail: het label uit L5 direct onder het bestaande gedeeld beeld / verschil in beeld. De bestaande hook in de mail ("Het Leidersbeeld van jouw team is XX. Wat is de gemeten Teamkracht Index van jouw team?") blijft en krijgt erachter: "En zit de ruimte waar jij hem verwacht?"

## 7. Invoerflows

### 7.1 Team (teamleider of begeleider, bij aanmaken team of voor de eerste uitnodiging)

Stap 1 [17-09]: "Waar moet dit team staan? Eén zin, in jullie eigen woorden." Tekstveld, 200 tekens, en daaronder "Wanneer moet dat staan?" met een datumveld. Optioneel bij het aanmaken [17-09, tweede wijziging]: meestal benoemt het team het doel in de sessie, op de doelbeeldpagina bij de schuifjes, met dezelfde drie velden. Wie het bij het aanmaken invult, vult alle drie de velden. Bestaande teams: dezelfde knop "Doel toevoegen" op de kaart en het dashboard.
Stap 2: "Wat is er vooral nodig om dat te halen?" Vier keuzezinnen uit L1, radio, verplicht.
Bevestiging toont beide terug: "Doel: … Nodig: …" met knop "Aanpassen".

Het doel is zichtbaar voor alle deelnemers op de uitnodigingspagina, boven de vragen: "Dit team werkt naar: [doel_tekst]."

### 7.2 Individu (Zelfkracht Index)

Direct na de mailflip (die blijft skippable) en voor de uitslag: één scherm met de ik-variant van L1. Stap 1 [17-09] tekstveld "Waar wil je staan?" en datumveld "Wanneer?" (optioneel, skip-knop "Sla over"). Stap 2 vier keuzezinnen (optioneel, zelfde skip). Skip = doeltype onbekend, fallback via keten. Log een funnel_event doel_ingevuld of doel_overgeslagen (voeg deze twee toe aan de bestaande zes eventtypes).

### 7.3 Leider (Leidersbeeld)

Na de registratie (naam, e-mail, organisatie, teamomvang) en voor de items: teamvariant van L1, met dezelfde datumvraag als 7.1 [17-09], overslaanbaar met "Sla over" [17-09, tweede wijziging]. Zelfde velden op de leidersbeeld-invulling. (Gebouwd tussen de items en de registratie, omdat de bestaande flow de registratie achteraan zet; zie oplevering A11.)

## 8. Taal en woordenlijst

Gebruiken: doel, ruimte, winst, op orde, eerste stap, bepalend, dragen, beweging, gedeeld beeld, verschil in beeld.
Niet gebruiken: kloof, gap, tekort, blinde vlek, zwak, achterstand, potentieel (in de UI; in code mag het), kan (capaciteit), Samenspel, training, cohort, streak.
Dimensies altijd met hoofdletter in lopende tekst: Zien, Sturen, Doen.
Fonts en kleuren: DM Serif Display voor koppen, DM Sans voor tekst, donkerpaars #1A0B2E, magenta #D6026F. Logo: logo_happly.png.

## 9. Acceptatiecriteria

1. Een bestaande teammeting zonder doel rendert onveranderd in blok 2 en toont in blok 1 de fallback-tekst en in blok 3 een lezing via de keten. Geen enkele score wijkt af van de huidige waarde (vergelijk met een snapshot van drie bestaande metingen voor en na).
2. Testteam Noord (bestaande testdata) met doeltype doen en scores waarbij Sturen minimaal 10 onder Doen ligt: eerste_stap_dimensie = sturen, ketencheck_actief = true, zin 1 in de ketencheck-variant.
3. Zelfde testteam met doeltype zien en Zien als hoogste dimensie boven de landelijke bovenste helft: status = op_orde voor Zien, lezing schuift naar Sturen, zin 2 noemt Sturen.
4. Alle drie dimensies boven referentie: status op_orde, ruimte 0, zin 2 in de op-orde-variant, geen balk gearceerd.
5. LOS-team zonder landelijk beeld: referentie_type = eigen_sterkste, nergens een verwijzing naar het landelijk beeld in blok 3.
6. Team met 9 deelnemers: geen strip met individuele verdeling. Team met 10: wel.
7. Leidersbeeld met ander doeltype dan het team: label "Verschil in beeld over wat nodig is" met beide zinnen; gelijk doeltype: "Gedeeld beeld over wat nodig is".
8. De woorden uit paragraaf 8 "niet gebruiken" komen nergens voor in gerenderde HTML, SVG of mails (grep op de output van de testset).
9. Individuele uitslag met overgeslagen doel: blok 1 toont "Nog geen doel benoemd", blok 3 leest via de keten, herkenningszin zonder doel-toevoeging.
10. Print-SVG van de kaart toont blok 1, 3, 4 en 5 op de juiste plek en blijft op één A4 leesbaar (Playwright-screenshot, bestaande check).
11. teamkracht_maatregelen en de hermetingsvelden bestaan in Supabase; er is geen UI die ernaar schrijft.
12. De afgeleide profielkoppeling (L4) staat als tabel in de testoutput.

## 10. Werkwijze en oplevering

- Serverside: de ruimteberekening draait serverside bij het afronden van een meting en bij het toevoegen of wijzigen van een doel, en wordt opgeslagen in teamkracht_ruimte. De uitslagpagina leest de opgeslagen rij, rekent niet opnieuw.
- Bij wijziging van het doel na de meting: nieuwe rij in teamkracht_ruimte met dezelfde meting_id en nieuwe berekend_op; de uitslag toont de nieuwste. Oude rijen blijven staan.
- Werk in een branch doel-ruimte-v1. Geen deploy naar productie zonder akkoord van Maarten.
- Lever op: samenvatting van de schemawijzigingen, screenshots van teamkaart, individuele uitslag en Leidersbeeld met en zonder doel, de L4-koppeltabel, en de lijst met alles waar je een placeholder of een aanname hebt moeten laten staan.
- Stel geen vragen over prijzen, licenties of betaling; die staan buiten deze briefing.

## 11. Bevestigde beslissingen (Maarten, 17 september)

1. Startwaarden KETEN_DREMPEL 10 en OP_ORDE_DREMPEL 5 op de schaal 0 tot 100. Als de dimensiescores een andere schaal hebben, gelijkwaardig omrekenen en melden.
2. ~~Doel verplicht bij nieuwe teams~~, optioneel en skippable bij individuen. [17-09: vervallen, zie de tweede wijziging bovenaan; het doel wordt in de sessie benoemd.]
3. De keuzezinnen in L1 letterlijk overnemen zoals hier geformuleerd.
4. Referentie bij LOS zonder landelijk beeld alleen op eigen sterkste dimensie.
5. Blok 4 en 5 nu al tonen met leeg-tekst.
