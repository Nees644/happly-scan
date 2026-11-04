# Werken aan happly-scan

Dit bestand wordt bij elke sessie in deze map automatisch geladen. Het staat er
omdat een aantal dingen telkens opnieuw fout ging: ze staan verkeerd in de
briefings, en wie de briefing leest en niet de code, neemt de fout over.

## De vier dingen die steeds misgaan

**1. De betaalprovider is Mollie. Stripe bestaat hier niet.**
Er is geen Stripe-account, geen price-id, geen `checkout.session.completed`.
Waar een briefing Stripe noemt, is dat een restant uit een eerdere opzet. De
implementatie staat in `mollie.js`, `api/betaling-start.js`,
`api/betaling-webhook.js` en `betaling-verwerken.js`.

Mollie kent geen productcatalogus. De tabel `producten` **is** de catalogus, en
er is dus niets om mee te synchroniseren: geen externe id-kolom, geen
aanmaaklijst. Een bedrag gaat per betaling mee.

De melding van Mollie bevat alleen een id; wij halen de stand er zelf bij op.
Dat is met opzet en het is precies goed: de melding is een seintje, nooit de
waarheid.

**2. Het minimum voor een Teamfoto is vijf deelnemers, niet acht.**
Bevestigd op 7, 8 en 9 september 2026. De regel staat in
`teamkracht_config.min_deelnemers_kaart` en nergens anders. Onder de tien
deelnemers verdwijnen de individuele lijnen van de kaart; dat is een aparte
regel en die staat los van het minimum.

**3. Er is geen leesdrempel voor de eerste Teamfoto.**
Vervallen op 9 september 2026 (tarieven v3). De Lezer-module wordt aanbevolen,
niet vereist. Toegang tot hoofdstuk 3 tot en met 6 staat in
`lezer_module_toegang` op de gebruiker.

**4. Teams van dezelfde organisatie staan nooit naast elkaar op score.**
Geen ranglijst, geen gemiddelde over teams, geen sortering die van een score is
afgeleid, ook niet in het organisatie- of bureaudashboard en ook niet in een
export. Een team wordt alleen vergeleken met het gemiddelde van alle metingen en
met zijn eigen vorige meting. Twee tests bewaken dit; ze vallen om zodra er een
scorekolom bij komt.

## Waar de waarheid staat

| Vraag | Bron |
|---|---|
| Wat is er afgesproken | `briefings/` in deze repo |
| Wat kost het | de tabel `producten`, aangemaakt in de migraties |
| Wie mag wat | `toegang.js`, functie `koper()` |
| Hoe schrijven we | `taalregels.md` |
| Wat ligt er nog | `vervolg.md` en `rapport-tarieven-v3.md` |

`briefings/` is de bijgewerkte versie. Kopieën in Downloads of Drive zijn
werkversies: wijkt er een af, dan is de repo leidend en werk je de repo bij.

**Wijkt een briefing af van wat er is gebouwd, bouw dan niet mee.** Meld het
verschil, en verwerk het in `briefings/` zodra het is beslist. Een artefact
bouwen voor iets wat niet bestaat, omdat een document erom vraagt, kost twee
keer werk: eenmaal om het te maken en eenmaal om het weer weg te halen.

## Stand van zaken

- Teamkracht fase 1 is live sinds 8 september 2026.
- De tarieven v3 met vier koperslijnen (los, organisatie, professional, bureau)
  zijn gebouwd, inclusief het organisatiedashboard met seatbeheer.
- **De tarieven v3 staan live sinds 10 september 2026.** Alle drie de migraties
  zijn gedraaid en de code staat op productie. De openbare prijslijst geeft
  dertien rijen: ZKI, vier maal PAK, vier maal HM, LEZ-1 en de drie
  ORG-staffels. De codes TF, HM, LIC-M, LIC-J en LEZ-2 bestaan niet meer of
  staan op inactief.
- Wat in de tabel `producten` op fase B staat (PAK-PRO, PAK-BUR, PAK-BUR-EXTRA,
  HM-PRO, HM-BUR, PRO-M, PRO-J, PRO-START, BUR-1 tot en met BUR-3, BEG-1) is
  aangemaakt maar niet te koop; de prijslijst toont alleen fase A en bestaand.

- **De tabellen van het Leidersbeeld staan er sinds 15 september 2026.**
  `teamkracht_leidersbeeld` en `opvolging` zijn aangelegd; er is nog geen route
  die ze gebruikt. De opvolging is bewust niet van het Leidersbeeld alleen: hij
  heeft twee bronnen, zodat hetzelfde scherm later ook de leads van de
  Zelfkracht Index toont. `opvolgreeks` is geen opvolglijst maar de
  administratie van de automatische mailreeks.
- **Het Leidersbeeld staat live sinds 15 september 2026**, stap 1 en 2:
  `/leidersbeeld` (gratis, zonder account), de resultaatmail met het indexgetal,
  `/leider/:token` in toestand a en b, `/leads` voor de opvolging, en sinds
  stap 3 de koopknop met `/leidersbeeld-kopen`. Er is geen tweede betaalweg:
  die pagina maakt een team en gebruikt daarna `/api/betaling-start`. Stap 4
  en 5 staan er ook: regel R13 in `leidersbeeld-regel.js`, de open cirkel op
  de kaart, toestand c en d, het tweede Leidersbeeld bij de hermeting en het
  label aanbevolen startpunt op de doelpagina. De hele briefing is gebouwd.
- **Een eindkaart tekent nu ook het startbeeld**, lichter. De voetnoot beloofde
  dat al sinds fase 1; de tekening deed het niet. Vier punten per kolom is het
  maximum: teamlijn en Leidersbeeld van toen en nu.
- **Een aankoop vooraf levert een factuur op**, met een nummer uit dezelfde
  reeks als de maandfactuur. De gegevens van Happly staan in `bedrijf.js`;
  zolang die onvolledig zijn gaat er niets uit en komt er een bericht op
  hallo@happly.nl. Het adres van de klant wordt bevroren op de factuur.
- **De vragenset staat in `items.js`**, met per item een versie over het team.
  Hij stond alleen in `scan.html`; een test bewaakt dat beide gelijk blijven.
  Wijzig er nooit een zonder de ander.
- Het minimum van vijf deelnemers is op 15 september opnieuw bevestigd. Wie een
  briefing schrijft, krijgt `briefings/feiten.md` vooraf; daar staan de
  getallen die steeds verkeerd terugkomen.

- **Pdf's worden getekend, niet afgedrukt.** `kaart-pdf.js` en
  `factuur-pdf.js` zetten met pdfkit rechtstreeks vectoren op papier. Er komt
  geen headless browser aan te pas en er is geen Playwright: een A1 is dezelfde
  tekening op een groter vel en dus even scherp als een A4. De huisletters en
  het beeldmerk staan in `assets/`; routes die een pdf maken hebben
  `includeFiles: "assets/**"` in `vercel.json` nodig, anders valt het op
  productie om.

- **De Lezer-module heeft inhoud sinds 15 september 2026.** De zes
  hoofdstukken staan in `module-inhoud.js` en de veertig toetsvragen in
  `seed-toetsvragen-2026-09-15.sql`, gedraaid in `toets_vragen`. Het is een
  eerste versie die Maarten redigeert. Wijzigt een hoofdstuk, loop dan de
  vragen erbij na: een toets die iets anders vraagt dan de tekst zegt, leert
  mensen de tekst wantrouwen. Tests bewaken het aantal, de taalregels en een
  paar harde feiten uit de code.

- **De toets staat er sinds 15 september 2026.** `toets.js` heeft de regels,
  `api/toets.js` de route en `toets.html` het scherm. Het juiste antwoord gaat
  nooit mee naar de browser en nakijken gebeurt op de server; twee tests
  bewaken dat. Het niveau `lezer` komt uit een geslaagde toets en nergens
  anders vandaan.
- **Rol `lezer` is de rol die iedereen bij registratie krijgt.** Een route die
  `eisGebruiker(req, res)` zonder rollen aanroept, sluit die groep buiten. Dat
  blokkeerde tot 15 september de module en de prijsopvraag voor elke nieuwe
  gebruiker.

- **Het register is openbaar en staat op teamkrachtindex.nl**: `/register`,
  `/register/:slug` en `/verificatie/:code`, server-getekend zodat een
  verificatielink werkt zonder javascript. Er staat alleen in wat met
  uitdrukkelijke toestemming is gegeven; zonder toestemming bestaat het
  certificaat wel en de pagina niet. Een pagina wordt nooit verwijderd omdat
  een certificaat verloopt: hij zegt dan niet actief.

- **Doel en ruimte, fase A, staat live sinds 17 september 2026** (pull
  request #3, briefing in `briefing/teamkracht/`). Elke meting krijgt een
  doel van de klant en de uitslag leest de scores in het licht daarvan:
  leesregels L1 tot en met L7 in `teamkracht-ruimte.js`, drempels in
  `teamkracht-leesregels-config.js`, opslag in `teamkracht_ruimte` via
  `teamkracht-ruimte-db.js`, de vijf blokken in `teamkracht-ruimte-blokken.js`.
  De ruimte is een lezing, nooit een score: index, dimensies, profielen,
  teamlijn, breuk en R1 tot en met R13 zijn niet aangeraakt en een
  momentopname in de tests bewaakt dat. In de individuele uitslag is de
  referentie altijd de eigen sterkste dimensie; op de kaart heet de lijn het
  gemiddelde, nooit landelijk. Beide migraties
  (`migratie-doel-ruimte-2026-09-17.sql` en `migratie-doel-datum-2026-09-17.sql`)
  zijn op 17 september 2026 gedraaid. Het doel wordt in de sessie benoemd,
  bij de schuifjes van het doelbeeld; vooraf is het optioneel. Alle aannames
  staan in `briefing/teamkracht/oplevering_doel_ruimte_v1.md`.

- **Naamgeving sinds 5 oktober 2026.** Het meetinstrument heet Zelfkracht Scan
  en Teamkracht Scan, de persoonlijke uitslag zelfkrachtscore en
  teamkrachtscore, en Zelfkracht Index en Teamkracht Index zijn het merk en het
  landelijke getal. Het niveau lezer heet naar buiten Gecertificeerde
  Practitioner en de module Practitioner-module. Codes en kolommen (lezer,
  LEZ-1, index_score) blijven: daar hangen betalingen en rechten aan.
  Productnamen in de database worden bijgewerkt met
  `migratie-practitioner-2026-10-05.sql`.

- **Er zijn drie sites in deze repo.** `index.html` is de Zelfkracht Index op
  scan.happly.nl, `teamkrachtindex.html` is teamkrachtindex.nl, en
  `happly.html` is de voorpagina van happly.nl. Die laatste draait niet op
  Vercel maar bij TransIP en wordt met de hand geupload, daar als `index.html`.
  Sinds 5 oktober 2026 is het de Happly-merksite (pay-off Klein zetje. Grote
  beweging.), met de knop naar het gratis Leidersbeeld in het werkgeversblok.
  Verwar de twee voorpagina's niet.

- **Eén formule sinds 6 oktober 2026: Inzicht + Impuls + Volhouden = Succes.**
  De oude succeskrachtformule (Zelfkracht + Volhouden = Succes) is vervallen;
  zelfkracht is wat de stap Inzicht meet. Op happly.nl staat het
  succeskrachtschema (de golflijn met Zetjes) inline als svg, zonder extern
  bestand. De hoofdknop van happly.nl is het gratis Leidersbeeld, want de
  verkoopweg loopt Leidersbeeld, Teamkracht Scan, teambeeld. De Zelfkracht Scan
  blijft bereikbaar, niet als hoofdknop. Volgorde in menu en blokken:
  werkgevers, trainers en coaches, zorg en vitaliteit.

- **Happly.nl draait sinds 13 oktober 2026 om één stelling: Volhouden kun je
  organiseren.** De kop is de stelling, de pay-off (Klein zetje. Grote
  beweging.) staat erboven. Volgorde in menu en blokken: aanbieders in health
  en vitality (anker `#zorg` blijft), werkgevers, ondernemers; trainers en
  coaches staan onder Samenwerken. Dit vervangt de volgorde van 6 oktober. De
  impuls is het begin en heeft twee bronnen: van een ander (programma,
  training) of van jezelf (eigen doel). Zien, sturen en doen beschrijft de
  volhouder, de formule beschrijft wat Happly organiseert; er komt geen derde
  drieslag bij. Gewoonte en ritueel zijn de bestemming van volhouden, niet de
  kop. De site spreekt als wij; alleen het blok Waarom ik dit doe is ik. De
  hoofdknop blijft het gratis Leidersbeeld.

## Werkregels

- Nederlands, in code en in commentaar. Geen gedachtestreepjes, geen
  uitroeptekens; een test controleert dat op de seedteksten.
- Bedragen: exclusief btw, in hele centen, in de tabel `producten`. Nooit
  hardcoded in de frontend. De btw komt erbij in `bedragMetBtw()` en nergens
  anders.
- Prijs en recht worden server-side bepaald. De client vraagt om een groep
  (`PAK`, `HM`), nooit om een productcode: anders kiest hij de goedkoopste rij.
- Testen met `npm test` (node:test, geen framework). Prijstests lezen de bedragen
  uit de migratiebestanden, dus een prijswijziging daar laat de test meebewegen
  of omvallen.
- Sinds 30 oktober 2026 geeft Supabase nieuwe tabellen in `public` geen Data
  API-toegang meer vanzelf. Elke migratie die een tabel aanmaakt, geeft in
  dezelfde migratie `grant select, insert, update, delete on public.<tabel> to
  service_role;`. Niets aan `anon` of `authenticated`. Bestaande tabellen en
  nieuwe kolommen zijn niet geraakt.
- Prijswijziging: nieuwe rij, oude op `actief = false`. Bestaande abonnementen
  houden hun bedrag. Een rij waar een bestelling aan hangt gaat nooit weg.

- **Het Zelfstartregister staat in deze repo sinds 2 november 2026.** Eigen
  lichte koopweg naast de bestaande: `/zelfstarters` (registratie zonder
  account), `api/zelfstarters-start.js` (rij eerst, dan Mollie),
  `api/zelfstarters-webhook.js` en `api/zelfstarters-status.js` (beide via
  `zelfstarters-verwerken.js`, idempotent), `/zs/:nummer` en
  `api/zelfstarters-check.js` (openbare controle, nooit een score),
  `api/zelfstarters-badge.js` (svg). Nummer bij betaling
  (`zelfstarters_nieuw_nummer`), badge pas bij de eerste meting: de scan
  krijgt `?zs=<registratie_id>` mee en `api/scan.js` roept `koppelMeting`.
  Producten ZS-STD en ZS-PLUS, excl. btw, founding-tarief tot 31 december
  2026. Migratie: `migratie-zelfstarters-2026-11-02.sql`. De site
  zelfstarters.nl staat in de repo Nees644/zelfstarters en linkt hierheen.

- **De gratis trede van het Zelfstartregister staat in de code sinds 3 november
  2026** (migratie `migratie-zelfstarters-gratis-2026-11-03.sql`). Registreren
  is gratis en vraagt alleen een eerste meting: `/zelfstarters` (naam, e-mail,
  vakgebied, toestemming naam) maakt een rij met status `open` en stuurt door
  naar `/zelfstarters-naar-scan?z=<id>` en dan `/scan?zs=<id>`; de scan slaat
  mailstap en doelscherm over en stuurt na de opslag door naar
  `/zelfstarters-uitslag?z=<id>`. Let op: herschrijfregels met twee delen
  (`/zelfstarters/uitslag`) geven op Vercel een 404 naast `cleanUrls`; alle
  Zelfstarters-pagina's worden daarom op hun bestandsnaam aangesproken
  (`/zelfstarters-uitslag`, `/zelfstarters-dag`, `/zelfstarters-naar-scan`). Bij de eerste meting
  geeft `koppelMeting` het nummer uit en zet de status op `geregistreerd`.
  Verifiëren is de betaalde stap (`api/zelfstarters-verifieer.js`, Mollie op
  de bestaande rij, terug op de uitslagpagina) en zet de status op `betaald`;
  een mislukte betaling raakt de registratie niet (`betaling_status`). De
  oude weg (eerst betalen, dan meten, `betaal: true`) blijft voor partners.
  Wat de uitslagpagina toont staat in `zelfstarters-uitslag.js`: gratis de
  score, de sterkste kant en twee plekken met ruimte in één zin; geverifieerd
  ook de duiding en het als-dan plan. Openbaar is nooit een score, en een
  geregistreerde heeft geen jaartallen: die horen bij de verificatie
  (reglement op zelfstarters.nl/reglement). Teksten op de site spreken over
  de ontwikkelstructuur; het register is het bewijs. Een mail opnieuw sturen
  kan met `api/zelfstarters-mail-opnieuw.js` (nummer, soort, ZS_BEHEER_SLEUTEL of CRON_SECRET);
  een badge is er alleen voor status betaald, geregistreerd heeft een nummer
  en geen badge.
- **Het als-dan plan heeft herinneringen sinds 4 november 2026** (migratie
  `migratie-zelfstarters-plan-2026-11-04.sql`). Per regel een optionele datum:
  de dag ervoor gaat de eigen zin per mail (`herinnerd_op` in de regel in
  `plan`). Daarnaast drie checks na het vastleggen: week, drie maanden, vijf
  maanden (`mail_plan_week_op`, `mail_plan_m3_op`, `mail_plan_m5_op`); een
  nieuw plan zet ze terug. Uitleg en voorbeelden per ruimtepunt en moment
  staan in `zelfstarters-uitslag.js` (`PLAN_UITLEG`, `VOORBEELDEN`), de cron
  loopt mee in `stuurHerinneringen` via `api/opvolg.js`.

