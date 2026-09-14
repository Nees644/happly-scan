# Rapport · Tarieven v3

Antwoord op de vijf vragen uit `briefing_code_tarieven_v3.md`, 9 september 2026.

Bijgewerkt 10 september 2026, na de bouw van de koperslijnen en de organisatielijn en na de prijsbesluiten van die dag.

Geleverd:

- `migratie-tarieven-2026-09-09.sql`, het migratieblok ter review
- `toegang.js`, de vier koperslijnen en wat elke lijn mag
- `koper-db.js`, de brug tussen de database en die regels
- `api/prijs.js`, het prijsendpoint uit sectie 8.4
- `betalen.js`, `betaling-verwerken.js`, `api/betaling-start.js`,
  `api/teamkracht-team.js`, `api/teamkracht-bereken.js`, `teamkracht.html`,
  `module.html` en `betaald.html` omgezet naar groepen en lijnen
- `api/organisatie.js` en `organisatie.html`, het organisatiedashboard met seatbeheer
- 41 nieuwe tests, de suite staat op 92 en is groen

Niets is naar Supabase gestuurd. De migratie moet nog draaien; tot die tijd
kent de database de nieuwe codes niet.

## Wat er is beslist

**LEZ-2 is vervallen** (10 september 2026). Hij was met 395 goedkoper dan ORG-1
alleen met 490, terwijl hij het Lezer-certificaat er nog bij gaf; wie alleen
Organisatie klein wilde, kocht LEZ-2. In plaats van de prijs te repareren is het
product weg: een Organisatie-abonnement geeft de beheerder nu zelf toegang tot
de module en de toets, via `lezer_module_toegang`. De rij is nooit verkocht en is
daarom verwijderd in plaats van op inactief gezet.

**Pakket buiten het bureautegoed van 95 naar 125** (10 september 2026). Bij 95
kostte veertig pakketten via BUR-1 plus bijkopen 4.865 tegen 4.900 voor BUR-2, en
dan verdient de middelste staffel zichzelf niet terug. Met 125 is dat 5.615 en
klopt de trap. De vier bureaucontroles staan nu als test in de suite.

**LIC-M en LIC-J zijn uitgezet.** Ze beloofden onbeperkt gratis metingen voor 29
euro per maand terwijl een Professional 145 per pakket betaalt. Er was niets van
verkocht, dus er is geen klant die er recht aan ontleent.

**De leesdrempel is eruit**, zoals sectie 1 voorschrijft. Hij zat in `magKopen()`,
in `api/betaling-start.js` en in de knop op het dashboard. De module wordt nu
aanbevolen en niet vereist. Dat wijkt af van acceptatiecriterium 1 van de
certificeringsbriefing; die is op dit punt bijgewerkt in `briefings/`.

## Wat nog een besluit vraagt

**LEZ-10 staat op fase `later`.** Hij blijft bestaan met tien maal
module-toegang plus twaalf maanden ORG-2 voor 1.990, maar hij is niet te koop en
de tien uitnodigingscodes zijn niet gebouwd. Bij aankoop krijgt nu alleen de
koper toegang. Wil je hem verkopen, dan is dat één woord in de migratie plus het
codemechanisme.

## Wat er is gebouwd

De vier lijnen staan in `toegang.js`, in één functie `koper()`. Die geeft terug
welke lijn geldt, welk prijsniveau daarbij hoort, en wat er verder open staat:
register, leadknop, naam op de kaart, doelbeeld-tool, dashboards, seats en het
resterende bundeltegoed. Elke route stelt die vraag via `haalKoper()` en niemand
rekent zelf iets uit.

Vier regels die makkelijk werden overgeslagen en nu hard staan, elk met een test:

1. Een Professional zonder certificaat Begeleider is geen Professional, ook niet
   als er is betaald.
2. Een verlopen Professional valt terug op los, met registerstatus "niet actief"
   en de leadknop uit. Het certificaat blijft, dus reactivatie kan zonder nieuwe
   toets.
3. Een bureauseat zonder certificaat koopt wel uit het bundeltegoed maar komt
   niet in het register.
4. De client vraagt om een groep (PAK of HM) en nooit om een productcode. Zou hij
   de code mogen kiezen, dan koos hij de goedkoopste rij.

Het hermetingtegoed hangt aan het team. Een betaald pakket zet er één hermeting
op met een geldigheid van zes maanden, langs beide wegen waarop een pakket
betaald kan raken: uit het bundeltegoed (nul euro, geen Mollie) en via Mollie.
De hermeting boekt het tegoed af nadat het beeld is opgeslagen, zodat een
mislukte berekening niets opsoupeert. Het bundeltegoed gaat er in één stap af
via `verbruik_bureau_tegoed()`, anders kosten twee aankopen op hetzelfde moment
samen één pakket.

### De organisatielijn, gebouwd op 10 september

De lijn is rond: kopen, aanmaken, beheren, zien.

- **Kopen.** Wie twee of meer teams heeft en nog geen abonnement, ziet op het
  dashboard de drie staffels met wat een pakket dan gaat kosten. Onder de twee
  teams is het geen aanbod maar ruis, dus dan staat het er niet.
- **Aanmaken.** De organisatie ontstaat pas als de betaling binnen is, in
  `betaling-verwerken.js`. Wie afhaakt op de betaalpagina laat geen half
  aangemaakte organisatie achter. De koper wordt beheerder en eerste lid.
- **Verlengen.** De eerste betaling is meteen de machtiging
  (`sequenceType: "first"`), en daarna zet `startVervolg()` het Mollie-abonnement
  klaar dat een jaar later gaat lopen. Dat is dezelfde constructie die vraag 3
  voor LEZ-2 en PRO-START beschrijft, en LEZ-2 loopt er nu ook langs: die maakt
  een organisatie klein aan en verlengt na een jaar op ORG-1.
- **Beheren.** De beheerder wijst seats toe op e-mailadres. Heeft die persoon al
  een account, dan is hij meteen lid. Zo niet, dan blijft de uitnodiging staan in
  `seat_uitnodigingen` en gaat de seat in bij zijn eerste inlog. Zonder dat zou
  je alleen mensen kunnen toevoegen die toevallig al waren ingelogd.
- **Zien.** Het dashboard toont per team de naam, de coach, het aantal metingen,
  welke beelden er zijn met hun datum, en of er nog een hermeting uit het pakket
  klaarstaat. Geen score, geen breuk, geen sortering die daarop lijkt. Twee tests
  bewaken dat: een op de query en een op het scherm.

Een seat vrijmaken haalt de teams van die persoon uit het overzicht, maar niet
bij hem weg. Een team hoort bij zijn coach en niet bij een abonnement.

## Wat er nog niet is gebouwd

- Het bureaudashboard. De regels staan in `toegang.js` en het tegoed wordt al
  goed afgeboekt; het scherm is er nog niet. Fase B.
- De Professional-lijn afrekenen: PRO-M, PRO-J en PRO-START. De prijsbepaling
  kent ze, de betaalroute kan ze aan, maar ze staan op fase B en dus niet in de
  winkel.
- De drie aanbiedingen na het eindbeeld en de leadknop. Zie vraag 4.
- Een uitnodigingsmail. De seat gaat nu in bij de eerste inlog, maar er gaat geen
  bericht uit dat iemand is uitgenodigd; dat moet de beheerder zelf zeggen.

## Vraag 1 · Zijn de klantlogica-checks als test opgenomen

Ja, alle elf uit sectie 3 tot en met 6, plus acht controles die eruit volgden.
Ze draaien op de bedragen die uit de migratiebestanden worden gelezen, niet op
getallen die in de test zijn overgetypt: verandert een prijs in de migratie, dan
verandert de test mee of valt hij om.

| Sectie | Controle | Uitkomst |
|---|---|---|
| 3 | pakketprijs daalt per staffel, 195 > 175 > 145 | klopt |
| 3 | bij vier teams is ORG-1 goedkoper dan vier keer Los | klopt, 1.270 tegen 1.380 |
| 3 | omslagpunt tegenover Los bij 4, 6 en 10 teams | klopt alle drie |
| 4 | PRO-START goedkoper dan de onderdelen los | klopt, 1.250 tegen 2.210 |
| 4 | PRO-J goedkoper dan twaalf maal PRO-M | klopt, 590 tegen 708 |
| 5 | prijs per pakket daalt per staffel | klopt, 166 en 122,50 en 99 |
| 5 | BUR-1 per pakket duurder dan PAK-pro | klopt, 166 tegen 145 |
| 5 | PAK buiten tegoed goedkoper dan PAK-pro | klopt, 125 tegen 145 |
| 6 | ORG-1 goedkoper dan ORG-1 plus LEZ-1 erbij | klopt, 490 tegen 639 |
| 6 | LEZ-10 per plek goedkoper dan ORG-1 | klopt, 199 tegen 490 |
| 6 | OPL-2 goedkoper dan OPL-1 plus tien credits | klopt, 3.250 tegen 3.950 |

Twee kanttekeningen bij de cijfers. Bureau midden komt op 122,50 per pakket, niet
op 122; de test rekent met de cent. En de bèta-korting klopt: 1.250 min 895 is
355.

Drie dingen die de controles zelf niet vragen maar er wel uit komen, elk met een
test die begint met "bekend":

**De organisatiestaffels lopen op seats, niet op prijs.** ORG-1 blijft de
goedkoopste rekening tot 25 teams; pas vanaf 26 teams is ORG-2 goedkoper, en
ORG-3 pas vanaf 34. Maar ORG-1 heeft drie seats en ORG-2 tien. Iemand met tien
teams en twee gebruikers hoort dus bij klein te blijven, en betaalt daar minder
dan bij groot. Dat is te verdedigen zolang je het verhaal op seats en het
dashboard voert en niet op de pakketprijs. Voer je het op de pakketprijs, dan
klopt het niet.

**Bureau midden verdiende zichzelf niet terug op pakketten.** Bij 95 euro buiten
tegoed kostte veertig pakketten via BUR-1 plus bijkopen 4.865 tegen 4.900 voor de
bundel. Opgelost op 10 september door het pakket buiten tegoed op 125 te zetten:
diezelfde veertig kosten nu 5.615.

**De instap ligt hoger dan de tabel suggereert.** PRO-START van 1.250 vereist een
geldig Lezer-certificaat, dus in de praktijk 1.399. Een BUR-1 met drie seats
vraagt drie keer BEG-1, dus 2.685 bovenop de 2.490. Dat is geen fout, maar het
hoort in de verkooptekst te staan, anders is het een verrassing bij de tweede
factuur.

## Vraag 2 · Migratieblok en productlijst

`migratie-tarieven-2026-09-09.sql`, in twee delen. Blok A tot en met H voegt toe
en verandert niets aan wat vandaag verkocht wordt; dat kan meteen draaien. Blok Z
zet de oude codes uit en hoort pas te draaien op het moment dat de nieuwe codes
in de code staan, anders werkt de koopknop op het dashboard niet meer.

Vier ontwerpbesluiten die je in de review moet wegen.

**Een rij per prijsniveau, met de code erin.** `producten.code` is de primaire
sleutel en `bestellingen.product_code` wijst ernaar, dus zeven prijzen voor het
pakket zijn zeven rijen: `PAK-LOS` tot en met `PAK-BUR-EXTRA`. Er zijn twee
kolommen bij, `groep` en `prijsniveau`, en de frontend vraagt nooit om een code
maar om een groep. Dat levert er iets bij op: in de bestelling staat achteraf
niet alleen wat er is gekocht maar ook tegen welke lijn, en dat is precies wat je
bij een vraag over een factuur wilt weten.

**Het prijsniveau is een view, geen kolom.** `gebruiker_prijsniveau` rekent de
volgorde uit sectie 1 letterlijk uit: bèta gaat voor lijn en staffel, en wie geen
van beide heeft valt op los. Een kolom zou moeten worden bijgewerkt op de dag dat
een abonnement afloopt, en dat gebeurt een keer niet. `lijn` blijft wel als kolom
bestaan zoals sectie 8.3 vraagt, maar als handmatige stand.

**Het hermetingtegoed hangt aan het team, niet aan de koper.** Het pakket is voor
een team gekocht. Wisselt de coach, dan hoort de hermeting bij het team te
blijven. `teamkracht_teams` krijgt `hermeting_tegoed`, `hermeting_tot` en
`pakket_bestelling_id`.

**Geen tabel `betalingen`.** Die rol vervult `bestellingen` sinds 8 september, er
staan rijen in, en `mollie_meldingen` doet het idempotente deel. Een tweede tabel
ernaast zou betekenen dat een omzetvraag op twee plekken moet worden gesteld.

Er is geen aparte productlijst voor een betaalprovider. Mollie kent geen
catalogus, dus de tabel `producten` is de catalogus en er valt niets te
synchroniseren. De eerdere aanmaaklijst is verwijderd; die beschreef een
systeem dat hier niet bestaat.

## Vraag 3 · LEZ-2 en PRO-START als een checkout

Gekozen variant: het eerste jaar is inbegrepen en de verlenging loopt daarna
automatisch door op ORG-1 respectievelijk PRO-J. Dat staat ook in de data, in de
kolom `verlengt_als`, zodat de checkout het uit de tabel leest en het nergens in
de code hoeft te staan.

Mollie kent geen sessie met twee regels, dus het zijn twee stappen die wij zelf
zetten en die allebei al in `mollie.js` staan:

1. `maakKlant()` voor een `customerId`, en `maakBetaling()` voor het volle
   eenmalige bedrag met `sequenceType: "first"`. Dat is meteen de machtiging.
2. Op de melding `paid`, in `pasToe()` in `betaling-verwerken.js`:
   `maakAbonnement(customerId, { centen: <verlengprijs>, interval: "12 months", startDate: vandaag + 12 maanden })`.
   De `startDate` is wat het eerste jaar overslaat.

Twee dingen om goed te zetten. Het abonnement wordt pas aangemaakt nadat de
eerste betaling binnen is, dus het aanmaken hoort in de verwerking en niet in
`betaling-start.js`; blijft de betaling uit, dan is er ook geen abonnement.
En de verwerking moet idempotent blijven: eerst kijken of er al een
`mollie_subscription_id` op de gebruiker staat, anders staat er na een dubbel
bezorgde melding twee keer hetzelfde abonnement. Beide passen in de bestaande
opzet; `betaling-verwerken.js` is er al op gebouwd.

Bij opzeggen binnen het eerste jaar: het abonnement is er dan al, dus
`zegAbonnementOp()` volstaat en het betaalde jaar loopt gewoon uit.

## Vraag 4 · Welke kaartlogica aangepast moet worden

Het eerste onderwerp is inmiddels gebouwd; de twee andere staan nog open en zijn
alleen gerapporteerd, zoals gevraagd.

### Het hermetingtegoed, gebouwd

De kaart zelf verandert niet. `teamkracht-kaart.js` kent `hermeting` al als
beeldsoort, `BEELDNAAM` zet hem op "eindbeeld", en de voetnoot zegt al dat het
eindbeeld over het startbeeld komt. Wat eromheen zat is omgezet:

- `betalen.js`, `rechtOpKaart()`. Kent nu vier wegen: bèta, het tegoed van het
  team, een betaalde bestelling, of niets. Tegoed verlopen geeft een andere zin
  dan tegoed op, want dat is voor de coach iets anders.
- `betalen.js`, `magKopen()`. Een extra hermeting wordt niet verkocht zolang het
  tegoed er nog ligt; anders zou iemand twee keer betalen.
- `betaling-verwerken.js`, `pasToe()`. Een betaald pakket zet op het team
  `hermeting_tegoed = 1`, `hermeting_tot` op zes maanden later en
  `pakket_bestelling_id`. Dat gebeurt in `zetHermetingTegoed()` in `koper-db.js`,
  omdat een pakket langs twee wegen betaald kan raken.
- `api/teamkracht-bereken.js` boekt het tegoed af nadat het beeld is opgeslagen,
  op dezelfde plek waar `verbruikt_op` op de bestelling wordt gezet. Pas na het
  opslaan, zodat een mislukte berekening niets opsoupeert.
- `api/betaling-start.js`. Vraagt nu om een groep en bepaalt de rij server-side
  uit de lijn van de koper. Een pakket uit het bundeltegoed kost nul en gaat niet
  langs Mollie; de bestelling wordt wel vastgelegd, anders is achteraf niet te
  zien welk team een pakket uit de bundel had.
- `api/teamkracht-team.js`. Haalt de tegoedvelden mee en geeft per team het recht
  terug, plus de lijn en de prijzen van deze koper.
- `teamkracht.html`. De knop vraagt om een groep, de regel eronder noemt de lijn
  en wat het zonder abonnement zou kosten, en er is een derde stand bij: de
  hermeting zit in het pakket.

### De drie aanbiedingen na het eindbeeld, nog te bouwen

Ze horen niet op de kaart. Die kaart gaat mee naar de muur en is het bewijs van
wat een team heeft afgesproken; er hoort geen aanbieding op. Ze horen op het
scherm eromheen.

- `teamkracht.html`, in het blok van een team dat een eindbeeld heeft. Drie
  knoppen: extra hermeting, Organisatie klein, of een Professional uit het
  register. De eerste twee kunnen vandaag, de derde is fase B.
- `api/teamkracht-team.js` moet erbij leveren wat die knoppen nodig hebben: heeft
  dit team een eindbeeld, wat kost een extra hermeting op dit niveau, en wat kost
  ORG-1.
- Wil je ze toch op de kaart, dan alleen op de schermversie, in een blok met
  `@media print { display: none }` in `bouwKaartHtml()`. Dan blijft de PDF schoon.
- Toon: `taalregels.md` geldt ook hier. Niet "je hermeting is verlopen" maar
  "hier zet je de volgende stap".

### De leadknop, nog te bouwen

Fase B, en het meeste werk zit niet in de kaart.

- `bouwKaartHtml()` krijgt een parameter `begeleider` met naam, logo en slug. Die
  hoort onder de voetnoot, klein, in dezelfde stijl als het logo op de poster.
  Dat deel is een uur werk.
- De knop zelf mag alleen op de schermversie, niet op de print. Een knop op
  papier is een dode knop.
- `api/teamkracht-kaart.js` moet weten wie de Professional is. Het team heeft
  `coach_user_id`, dus via `teamkracht_gebruikers` op `niveau` en
  `licentie_actief`. Staat de licentie uit, dan verdwijnen naam, logo en knop; de
  eerder gemaakte kaart in `kaart_archief` blijft ongemoeid, en dat is goed.
- Er is een tabel nodig voor de aanvragen. `api/lead.js` bestaat al maar is de
  lead van de scan; dit is iets anders en hoort een eigen route en een eigen
  tabel te krijgen.
- Privacy: wie op de knop drukt geeft zijn adres aan een derde partij. Dat hoort
  in `privacy.html` te staan voordat de eerste knop live gaat, net als bij de
  startkaart uit `vervolg.md`.

## Vraag 5 · Staan teams ooit naast elkaar op score

Nee, en dat blijft zo.

**Vandaag.** De teamlijst in `api/teamkracht-team.js` haalt per beeld alleen
`id, team_id, soort, n, breuk, created_at` op. Er komt geen score mee, dus er is
niets om op te sorteren. `teamkracht.html` toont per team een naam, een aantal
metingen en een stand. Scores staan alleen op de kaart van een team zelf, altijd
tegen het gemiddelde en tegen de eigen vorige meting.

**Bewaakt.** Er staat nu een test op met de naam "de teamlijst haalt geen scores
op". Die leest de route en valt om zodra er een scorekolom bij komt. Dat dwingt
de regel niet af, maar het maakt hem zichtbaar op het moment dat iemand hem zou
breken.

**De ontwerpregel voor het organisatie- en bureaudashboard**, zodat er later niet
over te discussiëren valt:

1. Per team alleen naam, aantal deelnemers, en welke beelden er zijn met hun
   datum. Geen score, geen breuk, geen kleur die een score voorstelt.
2. Geen sortering en geen filter op iets wat van een score is afgeleid.
3. Geen gemiddelde, geen totaal en geen spreiding over teams van dezelfde
   organisatie. Ook niet als samenvatting bovenaan.
4. Een export met meerdere teams bevat dezelfde velden als het scherm. Geen
   ruimere export voor de beheerder.
5. De score van een team is alleen te zien in de kaart van dat team, en daar
   altijd tegen het gemiddelde van alle metingen en tegen de eigen vorige meting.
6. Het kwartaalbeeld gaat over de eigen ontwikkeling van elk team apart, niet
   over de organisatie als optelsom.

**Nog te besluiten voor het organisatiedashboard**: waaraan een team hangt.
`teamkracht_teams` heeft een vrij tekstveld `organisatie` en geen verwijzing naar
de nieuwe tabel. Mijn voorstel is dat zo te laten en het dashboard de teams te
laten tonen van de leden in `organisatie_leden`. Dan blijft een team van zijn
coach, verdwijnt het uit het dashboard zodra iemand geen seat meer heeft, en is
er geen tweede plek waar staat bij wie een team hoort.
