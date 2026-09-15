# Taken

Stand van 15 september 2026. Dit is de enige afvinklijst; als een taak hier niet
staat, ligt hij niet. Per taak staat waar de afspraak vandaan komt, en dat
document blijft leidend. Rond je iets af, werk dan de bron bij en vink hier af.

Bronnen: `briefings/tarieven.md` (v4), `briefings/leidersbeeld.md` (v2.2),
`briefings/partnerpakket.md`, `briefings/certificering.md`, `vervolg.md`,
`rapport-tarieven-v3.md`.

`briefings/feiten.md` is het blad dat vooraan in een briefinggesprek hoort.
Daarin staan de getallen en keuzes die steeds verkeerd in nieuwe briefings
terechtkomen.

---

# DEEL 1 · Wat Maarten doet

Dit kan niemand anders. Alles hieronder vraagt een wachtwoord, een account of
jouw eigen woorden.

## Nu meteen

- [ ] **Pull request #2 mergen.** github.com/Nees644/happly-scan/pull/2. Eén klik
      op Merge. Vercel deployt daarna vanzelf naar productie. Hierin zit alles:
      de tarieven v4, de kaart zonder landelijk beeld, en de website voor
      teamkrachtindex.nl.
- [ ] **Daarna `migratie-tarieven-v4-2026-09-14-blok-z.sql` draaien** in de
      SQL-editor van Supabase. Dit zet de oude productcodes uit. Pas ná de
      deploy, anders vraagt de site om prijzen die niet meer bestaan. Claude kan
      dit voor je draaien als Chrome openstaat.

Teamkrachtindex.nl staat live sinds 14 september. Domein, DNS en SITE_URL zijn
klaar; de deelafbeelding maakt Claude.

## Inhoud schrijven, hier staat de rest op stil

- [ ] **De zes hoofdstukken van de Lezer-module.** Alle teksten in
      `module-inhoud.js` staan op PLAATSHOUDER. Zonder tekst geen vragenpool,
      zonder pool geen toets, zonder toets geen certificaat en geen register.
      Hoofdstuk 1 en 2 eerst: die zijn gratis en worden het meest gelezen.
- [ ] **De vragen voor de toets.** Twintig worden er getrokken uit veertig, dus
      per hoofdstuk horen er ruim genoeg te staan.
- [ ] **De vier tellingen herschrijven** in de beheerpagina. Geen code nodig,
      zie `handleiding-beheer.md` en punt 2 van `vervolg.md`. Ze bepalen of een
      traject bewijs oplevert, dus dit weegt zwaarder dan de omvang suggereert.

## Besluiten waar het bouwen op wacht

- [ ] **Het landelijk beeld: alleen met licentie, of voor iedereen?** Staat nu
      achter `teamkracht_config.landelijk_beeld_zonder_licentie`, uit, dus in de
      praktijk krijgt iedereen het. Zet je hem aan, dan krijgt de eindklant die
      495 betaalt een kaart zonder landelijk beeld terwijl de partner die 145
      betaalt hem wel krijgt. Het A4 in het partnerpakket belooft de
      opdrachtgever nu "afgezet tegen het landelijk gemiddelde".
- [ ] **LEZ-2 houden op 395?** Hij is goedkoper dan ORG-1 alleen (490) en geeft
      het certificaat er gratis bij, dus wie ORG-1 wil koopt LEZ-2. Daarmee is
      395 in de praktijk de prijs van ORG-1.
- [ ] **Verkoop je LEZ-10?** Staat op fase later, de tien uitnodigingscodes zijn
      niet gebouwd. Ja betekent een woord in de migratie plus het mechanisme,
      ongeveer een halve dag.
- [ ] **Een afnamelimiet voor nieuwe licentiehouders?** Nu kan iemand in zijn
      eerste maand onbeperkt afnemen voordat er ooit is geïncasseerd. Bij tien
      teams staat er 1.450 open bij iemand van wie je nog niets hebt gezien.
      Voorstel: vijf teams in de eerste twee maanden.
- [ ] **Waaraan hangt een team in het organisatiedashboard?** Voorstel staat
      klaar: het vrije tekstveld laten staan en de teams tonen van de leden in
      `organisatie_leden`. Dan blijft een team van zijn coach.
- [ ] **Wat gebeurt er als een jaarabonnement afloopt?** De verrekening stopt,
      maar wat er met openstaande afnames gebeurt is nooit vastgelegd.

---

# DEEL 2 · Wat Claude bouwt

Zeg welke je wilt, dan pak ik hem op. De volgorde hieronder is mijn advies.

## Leidersbeeld, uit `briefings/leidersbeeld.md`

- [x] **Stap 1 is af.** `migratie-leidersbeeld-2026-09-15.sql` is op 15
      september 2026 gedraaid. `teamkracht_leidersbeeld` en `opvolging` staan
      in de database, gecontroleerd met `controle/staat-leidersbeeld-erin.sql`.
      Er is nog geen route die ze gebruikt.
- [x] **Stap 2 is af en staat live.** `/leidersbeeld`, de resultaatmail, de
      herinnering na zeven dagen (meegenomen in de bestaande dagelijkse cron),
      `/leider/:token` in toestand a en b, en `/leads` met de opvolging.
      `privacy.html` vermeldt de nieuwe gegevensstroom. Doorlopen op
      15 september 2026: index 69, mail verstuurd, klik geregistreerd.
- [ ] **Stap 3.** De koopknop met Mollie, de koppeling door een partner en de
      statusovergangen.
- [ ] **Stap 4.** Regel R13, het Leidersbeeld op de kaart, toestand c en de
      printcontrole.
- [ ] **Stap 5.** Hermeting en het Sprint-label.
- [ ] **Opvolgscherm als CRM.** De tabel `opvolging` heeft twee bronnen. Het
      scherm dat bij stap 2 wordt gebouwd voor de Leidersbeeld-leads kan daarna
      ook de leads van de Zelfkracht Index tonen, zodat `opvolgreeks` niet meer
      met de hand in de Supabase-editor hoeft te worden bijgehouden.

## Direct volgend op v4

- [ ] **Afnames wegschrijven.** Als een licentiehouder een kaart maakt, hoort dat
      in `afnames` te landen in plaats van in `bestellingen`. Het rekenwerk in
      `facturen.js` is klaar en getest; wat mist is de koppeling.
- [ ] **De factuurrun.** Een route die op de eerste werkdag van de maand per
      licentiehouder één factuur maakt en één incasso bij Mollie doet, met
      factuurnummer in de omschrijving. Inclusief de herpoging na vijf dagen en
      de blokkade daarna.
- [ ] **De factuur-pdf** in Supabase Storage, met regels, btw en nummer.
- [ ] **Het eerste mandaat.** Bij het afsluiten van een licentie een eerste
      betaling met `sequenceType: first`, zodat er op kan worden geïncasseerd.
      Zonder mandaat geen licentie.

## Certificering fase A

- [ ] Controleren of `migratie-certificering-2026-09-09.sql` echt is gedraaid.
      `controle/staat-v4-erin.sql` kijkt alleen naar de tarieven.
- [ ] De toets bouwen. Twintig uit veertig, lat op zestien, maximaal drie
      pogingen per dertig dagen, geteld op `gestart_op` en serverside.
- [ ] Het certificaat uitgeven na een geslaagde toets, met `niveau = lezer` en
      een verificatiecode. De naam staat vast op het certificaat.
- [ ] Het openbare register op `/register` en `/register/:slug`, met de route in
      `vercel.json`. Alleen na expliciete toestemming, verwijderen op verzoek.
- [ ] De badge als PNG en SVG, met naam, niveau, jaar en verificatie-URL.
- [ ] `licentie_actief` laten zetten vanuit de certificeringsroute.
- [ ] `briefings/certificering.md` bijwerken: scopepunt 6 en
      acceptatiecriterium 1 noemen nog de verplichte leesdrempel, die op
      9 september is vervallen.

## Uit v4, nog niet gebouwd

- [ ] **De uitnodiging aan teamleden uit naam van Teamkracht Index.** Dit is
      nieuwbouw, geen aanpassing: nu deelt de coach een link en verzamelt het
      systeem geen adressen. Zelf mailen betekent adressen invoeren van mensen
      die daar niet om hebben gevraagd, dus dit vraagt eerst een aanvulling in
      `privacy.html` en de privacyregel in de eerste zin van de mail. Reken op
      een dag, inclusief de afmeldlink die er wettelijk bij hoort.
- [ ] **De drie aanbiedingen na het eindbeeld** in `teamkracht.html`: extra
      hermeting, Organisatie klein, of een Professional uit het register. Niet op
      de kaart, die gaat naar de muur.
- [ ] **De leadknop** met filter op regio. Het regioveld bestaat nog niet.
- [ ] **De partnerpagina** op teamkrachtindex.nl met het founding-partnerlabel.
- [ ] **Het bureaudashboard.** Zonder tegoed sinds v4, dus eenvoudiger dan het
      was: seats en verrekening.
- [ ] **PRO-M, PRO-J en PRO-START afrekenen.** Prijsbepaling en betaalroute
      kennen ze al; ze staan op fase B en dus niet in de winkel.
- [ ] **Een uitnodigingsmail bij een seat.** De seat gaat nu in bij de eerste
      inlog, maar er gaat geen bericht uit.

## Uit vervolg.md

- [ ] **De startkaart voor teamleden.** Ongeveer een dag. Alle velden liggen in
      de database en er komt geen AI aan te pas.
- [ ] **Het gemiddelde verversen.** Staat vast op 74, 69 en 65 over
      drieënzeventig metingen. Omschakelen naar automatisch pas als
      `marge_sturen` onder de 2 zakt, rond tweehonderdvijftig metingen.
- [ ] **Fase 3, de leerlus.** De tabellen liggen er, er is nog geen scherm voor
      de nabespreking.
- [ ] **De ambitiebanden vervangen** door de werkelijke verdeling van
      verschuivingen. Wacht op hermetingen.
- [ ] **De eerste band is dertig punten breed** waar de andere twintig zijn.
      Alleen oppakken als je die band ooit splitst.

---

# Af sinds 8 september

- [x] Teamkracht fase 1 live: teams, kaart, doelbeeld, beheerpagina
- [x] Tarieven v3: vier koperslijnen, organisatiedashboard met seatbeheer
- [x] Pakket en hermetingtegoed, getest met een echte aankoop
- [x] De briefings in de repo, met `CLAUDE.md` als vaste plek voor wat telkens
      misging
- [x] De website voor teamkrachtindex.nl
- [x] Tarieven v4: adviesprijs 495, vijf inkoopprijzen, partner zonder licentie,
      kaart zonder landelijk beeld, het rekenwerk van de maandfactuur
- [x] De v4-migratie gedraaid en geverifieerd op 14 september
- [x] Tarieven v4 live: gemerged, gedeployd, blok Z gedraaid
- [x] www.teamkrachtindex.nl live met de Teamkracht-pagina en de prijzen uit de
      database; de kale naam stuurt door naar www. De voordeur wisselt per domein
      via `middleware.js`, want een rewrite in `vercel.json` wordt bij / nooit
      bereikt.
