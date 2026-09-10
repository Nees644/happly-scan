> **Bron van waarheid.** Dit bestand in de repo is leidend. Een kopie in
> Downloads of Drive is een werkversie; wijk je daarvan af, werk dan dit bestand
> bij. Zie CLAUDE.md.
>
> **Gecorrigeerd ten opzichte van de aangeleverde versie:** waar de briefing
> Stripe noemt staat hier Mollie, want dat is wat er is gebouwd. Waar de briefing
> acht deelnemers noemt staat hier vijf, het besluit van 7, 8 en 9 september 2026.

# Briefing Claude Code · Tarieven en producten v3

Datum: 9 september 2026, bijgewerkt 10 september 2026. Vervangt v1 en v2 van `briefing_code_tarieven.md` volledig. Hoort bij `briefing_code_certificering.md` en `briefing_code_teamkracht.md`. Bij tegenstrijdigheid geldt dit document voor prijzen en productlogica.

## 0. Het model in één alinea

Er is één kernproduct: het **pakket** (Teamfoto plus één hermeting binnen zes maanden, één team, minimaal vijf deelnemers). Er zijn vier koperslijnen die het pakket tegen een eigen prijs afnemen: **Los**, **Organisatie**, **Professional**, **Bureau**. Elke lijn hoger is goedkoper per pakket en geeft meer. De prijs van een pakket wordt server-side bepaald door de lijn van de koper. De Zelfkracht Index is altijd gratis.

Wat vervalt uit v1 en v2: productcodes TF, HM (v1), TK, LIC-LEZ, LIC-BEG, LEZ-10 oude prijs, BEG-2, BEG-8, LIC-ORG. Bestaande rijen in `producten` met die codes: `actief = false`, niet verwijderen. LIC-M en LIC-J vervallen ook: ze beloven onbeperkt gratis metingen en er is niets van verkocht (bevestigd 10 september 2026).

Gewijzigd op 10 september 2026, vier punten:

1. **LEZ-2 vervalt volledig**, ook uit fase A en uit de checkout-lijst. De rij is nooit verkocht en wordt verwijderd in plaats van op `actief = false` gezet.
2. **ORG-1, ORG-2 en ORG-3 geven de beheerder toegang tot de Lezer-module en de toets.** Nieuw veld `lezer_module_toegang` (boolean) op de gebruiker.
3. **LEZ-10 blijft**: tien maal module-toegang plus twaalf maanden ORG-2, € 1.990.
4. **Bureau buiten tegoed: PAK van € 95 naar € 125.** HM blijft € 75.

## Uitgangspunten

- Alle bedragen exclusief btw, in euro's. Btw 21% bij checkout.
- Prijzen staan in één configuratietabel `producten`, nooit hardcoded in de frontend.
- Een gebruiker heeft precies één lijn: `lijn` in (`los`, `organisatie`, `professional`, `bureau`). Standaard `los`.
- Organisatie en Bureau zijn accounts met seats; Professional is persoonlijk; Los is zonder account-abonnement.
- Teams worden nooit vergeleken met andere teams in dezelfde organisatie. Alleen tegen het landelijk beeld en de eigen vorige meting. Ook niet in het organisatiedashboard.

## 1. Het pakket en de hermeting, prijs per lijn

| Productcode | Product | Los | Organisatie klein | Organisatie midden | Organisatie groot | Professional | Bureau (binnen tegoed) | Bureau (buiten tegoed) |
|---|---|---|---|---|---|---|---|---|
| PAK | Pakket: Teamfoto + 1 hermeting binnen 6 maanden | € 345 | € 195 | € 175 | € 145 | € 145 | € 0 (tegoed) | € 125 |
| HM | Extra hermeting | € 145 | € 95 | € 95 | € 75 | € 95 | € 75 | € 75 |

Regels voor code:
- Bij aankoop PAK: `hermeting_tegoed = 1` op het team, `hermeting_tot = aankoopdatum + 6 maanden`. De eerste hermeting binnen die termijn verbruikt het tegoed; daarna geldt HM.
- Prijsbepaling server-side, in deze volgorde: `beta` > `lijn` en staffel > `los`. De frontend haalt de geldende prijs op via een endpoint en toont daarbij "zonder abonnement € 345".
- In `producten` staat PAK als productgroep met één rij per prijsniveau (`prijsniveau` in: los, org1, org2, org3, pro, bur_extra). Idem voor HM.
- Geen leesdrempel vóór de eerste Teamfoto. De Lezer-module wordt na aankoop aanbevolen, niet vereist.

## 2. Lijn Los

Koper: teamleider of manager met één team. Geen abonnement, geen account-lijn. Koopt PAK à € 345 via de checkout. Na het eindbeeld krijgt hij drie aanbiedingen in de kaart: extra hermeting, Organisatie klein, of een Professional uit het register (leadknop).

Status: fase A.

## 3. Lijn Organisatie (jaarabonnement per organisatie)

Koper: HR, directeur, afdelingshoofd, interne coach. Meet eigen teams. Geen register, geen leads.

| Productcode | Staffel | Prijs per jaar | Seats | PAK | HM | Status |
|---|---|---|---|---|---|---|
| ORG-1 | Klein | € 490 | 3 | € 195 | € 95 | fase A |
| ORG-2 | Midden | € 990 | 10 | € 175 | € 95 | fase A |
| ORG-3 | Groot | € 1.990 | onbeperkt | € 145 | € 75 | fase A |

Inbegrepen op alle staffels: organisatiedashboard met alle teams (elk team alleen tegen landelijk beeld en eigen vorige meting), kwartaalbeelden, modelupdates, seatbeheer door één beheerder, en toegang tot de Lezer-module en de toets voor de beheerder.

Die laatste is nieuw op 10 september 2026 en vervangt LEZ-2. De regel is nauw: alleen de beheerder (`rol = beheerder` in `organisatie_leden`), niet elke seat. Een seat is een gebruiker, geen cursist.

Database: `organisaties` (id, naam, staffel, seats_max, abonnement_tot, beheerder_user_id); `organisatie_leden` (organisatie_id, user_id, rol in: beheerder, gebruiker). Een gebruiker in `organisatie_leden` krijgt `lijn = organisatie` zolang `abonnement_tot` in de toekomst ligt.

Nieuw veld op de gebruiker: `lezer_module_toegang` (boolean, standaard false). Gaat op true bij:

- aankoop LEZ-1;
- aankoop LEZ-10, voor elk van de tien plekken;
- aanmaak van een organisatie, voor de beheerder.

Wat het veld niet doet is een niveau zetten. `niveau = lezer` komt uitsluitend na een geslaagde toets, nooit bij een aankoop. Toegang tot de module is iets anders dan het certificaat, en dat verschil is de waarde van het register.

Loopt het abonnement af, dan blijft `lezer_module_toegang` staan. Wie halverwege hoofdstuk 4 zit hoort niet buiten te staan omdat een factuur bleef liggen; het abonnement gaat over de metingen en het dashboard, niet over het lezen.

Klantlogica als test: PAK-prijs daalt per staffel (195 > 175 > 145); break-even ten opzichte van Los ligt bij 4, 6 en 10 teams. Test: bij 4 teams is ORG-1 goedkoper dan 4 × Los (1.270 < 1.380).

## 4. Lijn Professional (persoonlijk abonnement)

Koper: interim- of changemanager, coach, zelfstandig HR-adviseur. Begeleidt teams van anderen. Vereist `niveau = begeleider`.

| Productcode | Staffel | Prijs | Interval | Bevat | Status |
|---|---|---|---|---|---|
| PRO-M | Maand | € 59 | maandelijks | licentie | fase B |
| PRO-J | Jaar | € 590 | jaarlijks | licentie | fase B |
| PRO-START | Start | € 1.250 | eenmalig, daarna PRO-J | certificering Begeleider (BEG-1) + 12 maanden licentie + 5 PAK-tegoed | fase B |

Licentie bevat: PAK à € 145, HM à € 95, actieve vermelding in register, leadknop op de Teamkrachtkaart, naam en logo op de kaart, doelbeeld-tool, online intervisie, kwartaalbeelden.

Database: `licentie_actief`, `licentie_tot`, `lijn = professional`, `begeleider_zichtbaar = true`, `pak_tegoed` (bij PRO-START = 5, geen vervaldatum binnen de licentieperiode).

Verloop: zonder betaling `licentie_actief = false`, registerstatus "niet actief", leadknop uit, `lijn = los`. Certificaat blijft. Reactivatie herstelt alles zonder nieuwe toets.

Klantlogica als test: PRO-START (1.250) < BEG-1 + PRO-J + 5 × PAK-pro (895 + 590 + 725 = 2.210). PRO-J (590) < 12 × PRO-M (708).

## 5. Lijn Bureau (jaarbundel)

Koper: bureau of opleidingsinstituut met meerdere professionals.

| Productcode | Staffel | Prijs per jaar | PAK-tegoed | Professional-seats | Per pakket | Extra's | Status |
|---|---|---|---|---|---|---|---|
| BUR-1 | Klein | € 2.490 | 15 | 3 | € 166 | | fase B |
| BUR-2 | Midden | € 4.900 | 40 | 10 | € 122 | bureaulogo op de kaart | fase B |
| BUR-3 | Groot | € 9.900 | 100 | onbeperkt | € 99 | bureaulogo, eigen registerpagina | fase B |

Buiten tegoed: PAK € 125, HM € 75. Tegoed vervalt aan het einde van het bundeljaar, niet overdraagbaar. Een seat vereist `niveau = begeleider`; zonder certificaat telt de seat als Organisatie-gebruiker (PAK uit tegoed, geen register).

Database: `bureaus` (id, naam, staffel, pak_tegoed, pak_verbruikt, seats_max, abonnement_tot, beheerder_user_id, logo_url); `bureau_leden` (bureau_id, user_id, rol). Leden krijgen `lijn = bureau`.

Klantlogica als test (herzien 10 september 2026):

- BUR-1 plus 25 × PAK buiten tegoed (2.490 + 3.125 = 5.615) > BUR-2 (4.900), zodat bijkopen boven een kleine bundel niet loont waar de volgende staffel klaarligt;
- (BUR-3 min BUR-2) gedeeld door 60 = € 83 < € 125, zodat doorgroeien naar groot goedkoper is dan bijkopen;
- PAK buiten tegoed (125) < PAK-pro (145), zodat een bureau altijd voordeliger uit is dan een losse Professional;
- BUR-1 per pakket (166) > PAK-pro (145), zodat een eenling niet naar Bureau vlucht.

Bij € 95 buiten tegoed klopte de eerste regel niet: veertig pakketten via BUR-1 plus bijkopen kostte 4.865 tegen 4.900 voor BUR-2, en dan verdient de middelste staffel zichzelf niet terug. Met € 125 klopt de trap.

## 6. Certificering (eenmalig, staat los van de lijnen)

| Productcode | Product | Prijs | Bevat | Zet in database | Status |
|---|---|---|---|---|---|
| LEZ-1 | Lezer, instap | € 149 | module, toets, certificaat, badge, register | `lezer_module_toegang = true`; `niveau = lezer` pas na geslaagde toets | fase A |
| LEZ-10 | Lezer, tien plekken | € 1.990 | 10 × module-toegang + 12 maanden ORG-2 | tien uitnodigingscodes, elk `lezer_module_toegang = true`; organisatie staffel midden | later |
| BEG-1 | Begeleider, alleen certificering | € 895 | opleidingsdag, drie intervisies, certificaat, badge, register | `niveau = begeleider` na afronding | fase B |
| OPL-1 | Opleider, instap | € 2.500 | train-de-trainer, opleiderslicentie jaar 1 | `niveau = opleider`, `opleider_tot = +12 maanden` | later |
| OPL-2 | Opleider, met startpakket (gewenst midden) | € 3.250 | OPL-1 + 10 certificaatcredits + marketingpakket | als OPL-1, `certificaat_credits = 10` | later |
| OPL-P | Opleider, partner | op maat | instituten met meer dan 100 deelnemers per jaar | handmatig | later |
| LIC-OPL | Opleiderslicentie, verlenging | € 990 per jaar | | `opleider_tot` +12 maanden | later |
| CERT-AFD | Certificaatcredit | € 145 per uitgereikt certificaat | Opleider koopt per 10 vooraf; cursusgeld int de Opleider zelf | `certificaat_credits` +10 | later |

Voorwaarden: Begeleider vereist geldig Lezer-certificaat; Opleider vereist geldig Begeleider-certificaat. De gecertificeerde koopt zijn licentie altijd rechtstreeks bij Happly; een Opleider verkoopt geen licenties en geen pakketten.

Klantlogica als test (herzien 10 september 2026):

- ORG-1 (490) < LEZ-1 + ORG-1 (639), want de beheerder krijgt de module bij het abonnement en hoeft LEZ-1 er niet los bij te kopen;
- LEZ-10 per plek (199) < ORG-1 (490);
- OPL-2 (3.250) < OPL-1 + 10 × CERT-AFD (3.950).

## 7. Bèta (september en oktober 2026)

Tien interim- en changemanagers krijgen `beta = true`, `beta_tot = +6 maanden`. Voor hen: PAK en HM € 0, `lijn = professional` zonder abonnement, `niveau = begeleider` voorlopig, registerstatus "bèta". Na zes maanden automatisch aanbod PRO-START-B à € 895 (bètakorting € 355). De prijsbepaling kijkt eerst naar `beta`.

## 8. Fase A (september en oktober 2026)

1. Gratis: ZKI.
2. Checkout: PAK (los, org1, org2, org3), HM (idem), ORG-1, ORG-2, ORG-3, LEZ-1.
3. Tabellen: `producten`, `organisaties`, `organisatie_leden`, `betalingen`; velden `hermeting_tegoed` en `hermeting_tot` op team, `beta`, `beta_tot`, `lijn` en `lezer_module_toegang` op user.
4. Prijsendpoint: geeft voor een ingelogde gebruiker en een team de geldende PAK- en HM-prijs terug plus de reden (lijn en staffel).
5. Mollie-meldingen: de betaalmelding van Mollie (een id, waarna wij de stand zelf ophalen). Idempotent, gelogd in `betalingen`.
6. Organisatiedashboard: lijst van teams met startbeeld, doelbeeld, eindbeeld per team. Geen onderlinge vergelijking, geen ranglijst, geen gemiddelde over teams.
7. Prijswijziging: nieuwe rij met nieuwe de productcode, oude rij `actief = false`. Bestaande abonnementen behouden hun prijs.

## 9. Fase B (november 2026)

PRO-M, PRO-J, PRO-START, BEG-1, BUR-1, BUR-2, BUR-3; tabellen `bureaus`, `bureau_leden`; leadknop in de Teamkrachtkaart; doelbeeld-tool; naam en logo op de kaart; register met filter op actief.

## Vragen aan Claude Code

1. Bevestig dat alle klantlogica-checks uit sectie 3 tot en met 6 als tests worden opgenomen.
2. Lever het SQL-migratieblok (nieuwe tabellen, nieuwe velden, deactiveren van oude productcodes) en de productlijst voor de tabel producten. Mollie kent geen catalogus, dus die tabel is de catalogus.
3. Geef aan hoe PRO-START als één checkout werkt (eenmalig bedrag plus abonnement met eerste jaar inbegrepen). Kies de variant waarbij de verlenging na jaar 1 automatisch op PRO-J loopt.
4. Meld welke bestaande kaartlogica (`briefing_code_teamkracht.md`) aangepast moet worden voor hermeting-tegoed, de drie aanbiedingen na het eindbeeld (sectie 2) en de leadknop. Nog niet bouwen; alleen rapporteren.
5. Bevestig dat het organisatiedashboard en het bureaudashboard geen enkele weergave bevatten waarin teams van dezelfde organisatie naast elkaar op score staan.
