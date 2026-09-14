> **Bron van waarheid.** Dit bestand in de repo is leidend. Een kopie in
> Downloads of Drive is een werkversie; wijk je daarvan af, werk dan dit bestand
> bij. Zie CLAUDE.md.
>
> **Gecorrigeerd op 14 september 2026, bevestigd door Maarten:** het minimum is
> vijf deelnemers en niet acht, en `stripe_customer_id` is `mollie_customer_id`.
> De betaalprovider is en blijft Mollie.

# Briefing Claude Code · Tarieven en producten v4

Datum: 14 september 2026 (b, Mollie). Vervangt v1, v2 en v3 van `briefing_code_tarieven.md` volledig. Hoort bij `briefing_code_certificering.md` en `briefing_code_teamkracht.md`. Bij tegenstrijdigheid geldt dit document voor prijzen en productlogica.

## 0. Wat er verandert ten opzichte van v3, en waarom

De partner (Professional, Bureau) is geen klant maar een verkoper. Hij factureert de Teamkracht Index aan zijn eigen klant, bovenop zijn uren, en Happly verrekent achteraf de inkoop met hem. Daaruit volgen vier wijzigingen:

1. **Eén adviesprijs voor de eindklant: € 495 per pakket.** Dit is ook de prijs op de site voor wie rechtstreeks koopt. De klant koopt dus nooit goedkoper om de partner heen.
2. **Geen vooraf ingekochte bundels of tegoeden meer.** Bureaubundels met pakkettegoed (BUR uit v3) en het pakkettegoed in PRO-START vervallen. Partners kopen niets vooraf.
3. **Licentiehouders betalen achteraf.** Organisatie, Professional en Bureau krijgen een maandelijkse verrekening van de gebruikte pakketten. Alleen kopers zonder licentie betalen vooraf via een losse Mollie-betaling.
4. **De licentie is het verschil tussen los en partner.** Zonder licentie: inkoop € 249, vooraf, kaart zonder landelijk beeld. Met licentie: inkoop € 145, achteraf, landelijk beeld, jaarlijkse opfrisdag, register en leadknop.

Vervallen productcodes: BUR-1/2/3 (v3), PRO-START met tegoed (v3), en alles uit v1 en v2. Bestaande rijen in `producten`: `actief = false`, niet verwijderen.

## Uitgangspunten

- Alle bedragen exclusief btw, in euro's. Btw 21% op elke factuur.
- Pakket (PAK) = Teamfoto plus één hermeting binnen zes maanden, één team, minimaal vijf deelnemers. Extra hermeting (HM) daarbuiten.
- Prijzen staan in één configuratietabel `producten`, nooit hardcoded in de frontend.
- Een gebruiker heeft precies één lijn: `lijn` in (`los`, `partner_zonder_licentie`, `organisatie`, `professional`, `bureau`). Standaard `los`.
- Betaalwijze volgt de lijn: `los` en `partner_zonder_licentie` betalen vooraf per pakket (losse Mollie-betaling); `organisatie`, `professional` en `bureau` betalen achteraf (maandelijkse verrekening).
- Teams worden nooit vergeleken met andere teams in dezelfde organisatie. Alleen tegen het landelijk beeld (waar de lijn dat toestaat) en de eigen vorige meting.

## 1. Het pakket en de hermeting, prijs per lijn

| Productcode | Product | Los (eindklant) | Partner zonder licentie | Organisatie klein / midden / groot | Professional | Bureau klein / midden / groot |
|---|---|---|---|---|---|---|
| PAK | Pakket | € 495 | € 249 | € 195 / € 175 / € 145 | € 145 | € 125 / € 110 / € 99 |
| HM | Extra hermeting | € 195 | € 145 | € 95 / € 95 / € 75 | € 95 | € 75 |
| | Betaalwijze | vooraf | vooraf | achteraf | achteraf | achteraf |
| | Landelijk beeld op de kaart | nee | nee | ja | ja | ja |

Regels voor code:
- `partner_zonder_licentie` = gebruiker met `niveau` lezer of begeleider zonder actieve licentie. Hij koopt tegen € 249 en factureert zelf aan zijn klant.
- Bij aankoop of afname PAK: `hermeting_tegoed = 1` op het team, `hermeting_tot = datum + 6 maanden`. De eerste hermeting binnen die termijn verbruikt het tegoed; daarna HM.
- Prijsbepaling server-side, in deze volgorde: `founder` > `lijn` en staffel > `los`. Endpoint geeft prijs, betaalwijze en reden terug.
- Kaart zonder landelijk beeld toont het team alleen tegen zijn eigen vorige meting (bij eerste meting: alleen het startbeeld). Dit is het zichtbare verschil tussen los en licentie; toon op de kaart de regel "landelijk beeld beschikbaar met licentie".
- Geen leesdrempel vóór de eerste Teamfoto.

## 2. Verrekening achteraf (nieuw, fase A)

Betaalprovider is Mollie. Nergens Stripe.

- Bij afsluiten van een licentie (Organisatie, Professional, Bureau) doet de klant een eerste betaling via Mollie met `sequenceType: first` (iDEAL of kaart). Daarmee ontstaat een mandaat (`mandateId`) op de Mollie-klant. Geen geldig mandaat, geen licentie.
- Het licentieabonnement zelf loopt als Mollie Subscription op dat mandaat (maand of jaar).
- Elke afname van PAK of HM door een licentiehouder wordt gelogd in `afnames` (user_id, team_id, productcode, prijs, datum, gefactureerd = false).
- Op de eerste werkdag van de maand maakt het systeem per licentiehouder één betaling aan met `sequenceType: recurring` op het mandaat, voor het totaal van alle niet-gefactureerde afnames, met factuurnummer in de `description` en een eigen factuur-pdf uit Supabase. Nul afnames: geen betaling.
- Mollie heeft geen ingebouwde facturatie; factuur (nummer, btw, regels) maken wij zelf en bewaren we in tabel `facturen`.
- Webhook: Mollie stuurt alleen een id; de server haalt de status op via de API en verwerkt `paid`, `failed`, `expired`, `canceled`. Idempotent, gelogd in `betalingen`.
- Bij `failed` op de maandbetaling: één automatische herpoging na 5 dagen; daarna `afname_geblokkeerd = true`, nieuwe teams aanmaken niet mogelijk, bestaande kaarten blijven zichtbaar. Na betaling automatisch vrijgegeven.

## 3. Lijn Los

Koper: eindklant (teamleider, manager) met één team, of een partner zonder licentie. Losse Mollie-betaling per pakket. Na het eindbeeld drie aanbiedingen in de kaart: extra hermeting, Organisatie klein, of een Professional uit het register (leadknop).

Status: fase A.

## 4. Lijn Organisatie (jaarabonnement per organisatie, verrekening achteraf)

Koper: HR, directeur, afdelingshoofd, interne coach. Eigen teams. Geen register, geen leads.

| Productcode | Staffel | Prijs per jaar | Seats | PAK | HM | Status |
|---|---|---|---|---|---|---|
| ORG-1 | Klein | € 490 | 3 | € 195 | € 95 | fase A |
| ORG-2 | Midden | € 990 | 10 | € 175 | € 95 | fase A |
| ORG-3 | Groot | € 1.990 | onbeperkt | € 145 | € 75 | fase A |

Inbegrepen: landelijk beeld, organisatiedashboard (elk team alleen tegen landelijk beeld en eigen vorige meting), kwartaalbeelden, modelupdates, seatbeheer, maandelijkse verrekening.

Database: `organisaties` (id, naam, staffel, seats_max, abonnement_tot, beheerder_user_id, mollie_customer_id); `organisatie_leden` (organisatie_id, user_id, rol). Afnames van leden worden gefactureerd aan de organisatie.

Klantlogica als test: PAK daalt per staffel; bij 2 teams is ORG-1 (490 + 390 = 880) goedkoper dan 2 × Los (990).

## 5. Lijn Professional (persoonlijk abonnement, verrekening achteraf)

Koper: interim- of changemanager, coach, zelfstandig HR-adviseur. Verkoopt de Teamkracht Index aan eigen klanten. Vereist `niveau = begeleider`.

| Productcode | Staffel | Prijs | Interval | Bevat | Status |
|---|---|---|---|---|---|
| PRO-M | Maand | € 59 | maandelijks | licentie | fase B |
| PRO-J | Jaar | € 590 | jaarlijks | licentie | fase B |
| PRO-START | Start | € 1.250 | eenmalig, daarna PRO-J | certificering Begeleider (BEG-1) + 12 maanden licentie | fase B |

Licentie bevat, en dit is de lijst die de site toont als verschil met los kopen:
- inkoop € 145 in plaats van € 249, dus marge € 350 in plaats van € 246 per team bij € 495 adviesprijs
- verrekening achteraf, niets voorschieten
- landelijk beeld op elke kaart
- jaarlijkse opfrisdag (modelupdate, kwartaalbeelden, casuïstiek)
- actieve vermelding in register, leadknop, naam en logo op de kaart, doelbeeld-tool, online intervisie

Verloop: zonder betaling `licentie_actief = false`, `lijn = partner_zonder_licentie`, registerstatus "niet actief", leadknop uit. Openstaande verrekening blijft verschuldigd. Reactivatie herstelt alles.

Klantlogica als test: PRO-START (1.250) < BEG-1 + PRO-J (1.485). PRO-J (590) < 12 × PRO-M (708). Break-even licentie ten opzichte van partner zonder licentie: 590 / (249 - 145) = 5,7, dus vanaf 6 teams per jaar.

## 6. Lijn Bureau (jaarabonnement met seats, verrekening achteraf)

Koper: bureau of opleidingsinstituut met meerdere professionals. Geen pakkettegoed; alleen seats en een lagere inkoop.

| Productcode | Staffel | Prijs per jaar | Professional-seats | PAK | HM | Extra's | Status |
|---|---|---|---|---|---|---|---|
| BUR-1 | Klein | € 1.490 | 3 | € 125 | € 75 | | fase B |
| BUR-2 | Midden | € 3.900 | 10 | € 110 | € 75 | bureaulogo op de kaart | fase B |
| BUR-3 | Groot | € 7.900 | onbeperkt | € 99 | € 75 | bureaulogo, eigen registerpagina | fase B |

Elke seat heeft alles van Professional, inclusief opfrisdag. Seat vereist `niveau = begeleider`; zonder certificaat telt de seat als Organisatie-gebruiker (geen register). Verrekening aan het bureau.

Database: `bureaus` (id, naam, staffel, seats_max, abonnement_tot, beheerder_user_id, logo_url, mollie_customer_id); `bureau_leden`.

Klantlogica als test: BUR-1 (1.490) < 3 × PRO-J (1.770); BUR-2 (3.900) < 10 × PRO-J (5.900); PAK daalt per staffel en is altijd lager dan Professional (145).

## 7. Certificering (eenmalig, los van de lijnen)

| Productcode | Product | Prijs | Bevat | Zet in database | Status |
|---|---|---|---|---|---|
| LEZ-1 | Lezer, instap | € 149 | module, toets, certificaat, badge, register | `niveau = lezer` | fase A |
| LEZ-2 | Lezer, met Organisatie klein | € 395 | LEZ-1 + 12 maanden ORG-1 | `niveau = lezer`, organisatie staffel klein | fase A |
| LEZ-10 | Lezer, tien plekken | € 1.990 | 10 × LEZ-1 + 12 maanden ORG-2 | tien codes, organisatie staffel midden | later |
| BEG-1 | Begeleider, alleen certificering | € 895 | opleidingsdag, drie intervisies, certificaat, badge, register | `niveau = begeleider` | fase B |
| OPL-1 | Opleider, instap | € 2.500 | train-de-trainer, opleiderslicentie jaar 1 | `niveau = opleider`, `opleider_tot` | later |
| OPL-2 | Opleider, met startpakket | € 3.250 | OPL-1 + 10 certificaatcredits + marketingpakket | `certificaat_credits = 10` | later |
| OPL-P | Opleider, partner | op maat | > 100 deelnemers per jaar | handmatig | later |
| LIC-OPL | Opleiderslicentie, verlenging | € 990 per jaar | | `opleider_tot` +12 maanden | later |
| CERT-AFD | Certificaatcredit | € 145 per certificaat | per 10 vooraf; cursusgeld int de Opleider zelf | `certificaat_credits` +10 | later |

Certificaatcredits zijn de enige vooruitbetaling die blijft: het is een afdracht per certificaat, geen pakketinkoop.

Klantlogica als test: LEZ-2 (395) < LEZ-1 + ORG-1 (639); LEZ-10 per plek (199) < LEZ-2; OPL-2 (3.250) < OPL-1 + 10 × CERT-AFD (3.950).

## 8. Foundergroep (september tot en met maart)

Tien founding partners: `founder = true`, `founder_tot = +6 maanden`, `lijn = professional` zonder abonnement, `niveau = begeleider` voorlopig, registerstatus "founding partner" (blijvend label, ook daarna). Inkoop € 0, dus de volledige € 495 is voor de founder. Na zes maanden: PRO-START-F à € 895. Prijsbepaling kijkt eerst naar `founder`.

## 9. Fase A (september en oktober 2026)

1. Gratis: ZKI.
2. Losse Mollie-betalingen: PAK en HM voor `los` en `partner_zonder_licentie`; LEZ-1; LEZ-2; ORG-1, ORG-2, ORG-3 (Mollie Subscription op mandaat).
3. Verrekening achteraf (sectie 2) voor Organisatie; dezelfde code dient in fase B voor Professional en Bureau.
4. Tabellen: `producten`, `organisaties`, `organisatie_leden`, `afnames`, `betalingen`; velden `hermeting_tegoed`, `hermeting_tot`, `founder`, `founder_tot`, `lijn`, `afname_geblokkeerd`.
5. Prijsendpoint met prijs, betaalwijze en reden.
6. Kaart met en zonder landelijk beeld, afhankelijk van lijn.
7. Organisatiedashboard zonder onderlinge vergelijking.
8. Mollie-webhook: één endpoint, status ophalen via API, idempotent verwerken, gelogd in `betalingen`.

## 10. Fase B (november 2026)

PRO-M, PRO-J, PRO-START, BEG-1, BUR-1/2/3; verrekening voor Professional en Bureau; register met filter op actief; leadknop; doelbeeld-tool; naam en logo op de kaart; partnerpagina met founding-partnerlabel.

## Vragen aan Claude Code

1. Bevestig dat alle klantlogica-checks uit sectie 4 tot en met 7 als tests worden opgenomen.
2. Lever het SQL-migratieblok (nieuwe tabellen en velden, inclusief `facturen`, deactiveren van oude codes). Mollie kent geen productcatalogus; prijzen komen uit `producten`. Maarten plaatst zelf de Mollie API-keys (test en live).
3. Werk de maandelijkse verrekening uit op Mollie-mandaten (sectie 2): factuurrun, eigen factuurnummering en btw, creditnota bij annulering, herpoging bij mislukte incasso. Geef aan welke Mollie-betaalmethoden mandaten ondersteunen en welke je aanraadt voor Nederlandse zakelijke klanten.
4. Geef aan hoe LEZ-2 en PRO-START werken als één eerste betaling (`sequenceType: first`, eenmalig bedrag) waarna een Mollie Subscription start met eerste incasso over 12 maanden, op ORG-1 respectievelijk PRO-J.
5. Meld welke kaartlogica (`briefing_code_teamkracht.md`) aangepast moet worden voor: kaart zonder landelijk beeld, hermeting-tegoed, de drie aanbiedingen na het eindbeeld, de leadknop, de uitnodiging aan teamleden uit naam van Teamkracht Index met de privacyregels in de eerste zin. Nog niet bouwen; alleen rapporteren.
6. Bevestig dat geen enkel dashboard teams van dezelfde organisatie naast elkaar op score toont.
