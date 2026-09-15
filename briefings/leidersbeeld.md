> **Bron van waarheid.** Dit bestand in de repo is leidend. Een kopie in
> Downloads of Drive is een werkversie; wijk je daarvan af, werk dan dit bestand
> bij. Zie CLAUDE.md.

> **Vier correcties op de aangeleverde versie, vastgesteld op 15 september 2026.**
> Ze gaan voor op wat er verderop staat.
>
> 1. Het minimum voor een Teamfoto is **vijf** deelnemers, niet acht. Dat raakt
>    K4, de tekst bij teamomvang en de banden zelf: die lopen `2-4`, `5-9`,
>    `10-20`, `21+`.
> 2. Een Teamkracht Index als getal voor een heel team bestaat nog niet in de
>    code. Voor het Leidersbeeld is de formule gelijk aan die van de
>    individuele meting: `round((zien + sturen + doen) / 3)`.
> 3. Een partnertoken bestaat niet. `partner_id` is de auth-id van de partner.
> 4. De opvolging is niet van het Leidersbeeld alleen. Er is een tabel
>    `opvolging` met twee bronnen, zodat dezelfde lijst later ook de leads van
>    de Zelfkracht Index kan tonen. Paragraaf 5a gaat uit van een bestaande
>    opvolgtabel met statussen en notities; die bestaat niet. `opvolgreeks`
>    houdt alleen bij welke automatische mail is verstuurd.

# Briefing Code · Leidersbeeld · v2.2 (15 september 2026)

Vervangt v1 van dezelfde dag. Aanvulling op `briefing_code_teamkracht.md`, `teamkracht_model_v4_keten.md` en `briefing_code_tarieven_v4.md`. Lees die eerst. Niets in R1 tot en met R12 verandert.

Wat nieuw is in v2 ten opzichte van v1: het Leidersbeeld is een gratis, losse voordeur op teamkrachtindex.nl (paragraaf 4), elke invulling wordt als lead geregistreerd (paragraaf 5), zichtbaarheid per rol is vastgelegd (paragraaf 7), en er is een herkomstveld voor de partnerverrekening.

Terminologie: nooit "gap", "blinde vlek", "kloof" of "cohort". Nooit "Samenspel". Nooit "kan", altijd "doet". Betaling is Mollie.

## 0. Wat het is

De teamleider meet zijn team: hij vult dezelfde Teamkracht-items in over hoe zijn team het nu doet op Zien, Sturen en Doen. Dat is het Leidersbeeld. Het is gratis en staat los van een aankoop. Zodra het team gemeten is, komt het Leidersbeeld naast de teamlijn op de Teamkrachtkaart, per dimensie, met een vaste duiding: gedeeld beeld of verschil in beeld.

## 1. Waarom

Twee redenen. Het Leidersbeeld is een functie van de meting, werkt in elk kanaal en trekt de leider in het systeem. En het is de voordeur: wie zijn beeld heeft gegeven, wil weten hoe het team het zelf doet. De meting is nooit de drempel; het Leidersbeeld is gratis, de Teamfoto kost €495.

## 2. Vaste keuzes

K1. De teamleider zit NIET in de teamlijn. Zijn eigen Zelfkracht Index telt nooit mee in teamlijn, breuk of profielverdeling.

K2. Het Leidersbeeld wordt ingevuld VOORDAT de kaart vrijgegeven is. Na vrijgave is het voor die meting gesloten. Geen herkansing. Bij de gratis voordeur is dit automatisch zo: het beeld bestaat vóór het team.

K3. Het Leidersbeeld gaat over het team, niet over de leider. Instructie boven de items: "Beoordeel hoe je team dit nu doet, niet hoe jij het zelf doet."

K4. Op de kaart alleen als het team de kaart krijgt (minimaal acht deelnemers). Zonder teamlijn ziet de leider alleen zijn eigen drie punten.

K5. Vergelijkingsregel blijft: alleen met de eigen teamlijn, de eigen vorige meting en het landelijk beeld. Nooit met andere teams of andere leiders.

K6. Bij hermeting opnieuw een Leidersbeeld. Beide bewaard. Zelfde regel K2.

K7. Duiding is deterministisch (R13). Geen LLM in de beslislogica.

K8. Gratis, zonder account. Wel verplicht: naam, e-mail, organisatie, teamomvang. Het resultaat gaat per mail (de Teamkracht Index van het Leidersbeeld als getal; de drie dimensies achter de knop); op het scherm staat na versturen alleen een bevestiging. Dit valideert het e-mailadres en registreert elke invulling als lead, ook de niet-converterende.

K9. Het landelijk beeld staat NIET op de gratis kaart. Dat blijft het voordeel van de partner met licentie.

## 3. Datamodel

Nieuwe tabel `teamkracht_leidersbeeld`. Pas aan op conventies van `teamkracht_teams` en `teamkracht_teambeeld`.

```
id                uuid pk
leider_token      uuid unique
team_id           uuid null fk -> teamkracht_teams.id     -- gevuld bij koppeling aan een team
meetmoment        text check in ('start','eind') default 'start'
leider_naam       text not null
leider_email      text not null
organisatie       text not null
teamomvang        text not null check in ('2-7','8-12','13-20','21+')
zien              numeric
sturen            numeric
doen              numeric
antwoorden        jsonb
norm_bron         text
op_kaart          boolean default true
herkomst_src      text                                    -- ?src= van de URL (professionals, linkedin, partnernaam)
partner_id        uuid null                               -- partner uit tarieven v4, voor verrekening
status            text check in ('ingevuld','gekoppeld','betaald','gesloten') default 'ingevuld'
mail_verzonden_op timestamptz
herinnering_op    timestamptz
ingevuld_op       timestamptz
gesloten_op       timestamptz
opt_in_kwartaal   boolean default false
created_at        timestamptz default now()
```

Uniek: (team_id, meetmoment) waar team_id niet null is. Eén Leidersbeeld per team per meetmoment.

RLS: geen leesrechten via anon key. Publieke route schrijft via serverfunctie; `/leider/:token` leest via serverfunctie op token. Partneroverzicht en beheer via bestaande auth uit stap 1.

Lever de migratie als los SQL-blok.

## 4. Gratis voordeur: route `/leidersbeeld` op teamkrachtindex.nl

Stap 1, één scherm: naam, e-mail, organisatie, teamomvang (keuze uit de vier opties), vinkje privacyverklaring (verplicht), vinkje "Stuur mij het kwartaalbeeld" (optioneel, standaard uit). Knop "Naar de vragen".

Stap 2: instructie K3 en de itemset, identiek aan de Teamkracht-meting. Knop "Verstuur mijn Leidersbeeld".

Stap 3, bevestiging: "Je Leidersbeeld staat in je mail." Niets anders op het scherm. Geen scores.

URL-parameters: `?src=` en `?partner=` worden opgeslagen in herkomst_src en partner_id. Elke partner krijgt zijn eigen link (bestaand partnertoken uit tarieven v4 hergebruiken als dat er is; anders het partner-id).

Mail, direct na versturen. Bevat WEL de Teamkracht Index van het Leidersbeeld als één getal (zelfde formule als de gemeten Teamkracht Index van een team, zodat later vergelijkbaar). De drie dimensies staan achter de knop, niet in de mail. Tekst letterlijk:

Onderwerp: Het Leidersbeeld van jouw team is [XX]

[Voornaam],

Jij hebt gemeten hoe jouw team het doet op Zien, Sturen en Doen. Het Leidersbeeld van de Teamkracht Index van jouw team is [XX].

Wat is de gemeten Teamkracht Index van jouw team?

Dat weet je als je team het zelf invult. Drie minuten per persoon, en je ziet op één kaart waar jouw beeld en het beeld van het team gelijk lopen en waar niet.

[knop: Bekijk je Leidersbeeld]  -> /leider/:token

Happly · Teamkracht Index

De klik op de knop registreert dat de mail aankwam en gelezen is.

Herinnering na zeven dagen als status nog 'ingevuld' is: één mail, onderwerp "Jouw Leidersbeeld is [XX]. En het team?", zelfde vraag als in de eerste mail in één zin, knop naar `/leider/:token`. Daarna geen automatische mails meer in v1 van deze functie; de langere mailreeks komt later.

Teamomvang '2-7': alles werkt gelijk, maar op `/leider/:token` staat in plaats van de koopknop: "Een Teamfoto vraagt minimaal acht deelnemers. Groeit je team, dan staat je Leidersbeeld klaar." De lead blijft geregistreerd.

## 5. Leadregistratie en beheer

Elke rij in teamkracht_leidersbeeld is een lead. Beheerscherm voor Maarten (bestaande beheeromgeving, nieuwe tab "Leidersbeelden"): tabel met datum, naam, organisatie, teamomvang, herkomst, partner, status, mail geopend (ja/nee op basis van klik), laatste actie. Filter op status en herkomst. Export CSV.

Partneroverzicht: een partner ziet alleen de leads met zijn partner_id, dezelfde kolommen. Zo weet hij wie hij moet bellen.

Statusovergangen:
- ingevuld: na versturen
- gekoppeld: zodra team_id gevuld is (aankoop op de site, of koppeling door partner)
- betaald: zodra Mollie de betaling bevestigt voor het team
- gesloten: bij vrijgave van de kaart (K2)

### 5a. Opvolgtabel, gelijk aan de Zelfkracht Index

Bij de Zelfkracht Index bestaat in Supabase een lijst van deelnemers met daarnaast een opvolgtabel. Bouw voor het Leidersbeeld exact hetzelfde patroon. Eerste actie van Claude Code in stap 1: zoek de bestaande opvolgtabel van de Zelfkracht Index op (in `supabase.sql` en het dashboard), rapporteer de tabelnaam, de kolommen en hoe het dashboard erop schrijft, en neem die veldnamen letterlijk over. Geen tweede conventie.

Als de bestaande tabel geen andere structuur afdwingt, is dit het uitgangspunt:

```
teamkracht_leidersbeeld_opvolging
id                uuid pk
leidersbeeld_id   uuid fk -> teamkracht_leidersbeeld.id
opvolgstatus      text check in ('nieuw','gebeld','gemaild','afspraak','offerte','gewonnen','verloren','parkeren')
notitie           text
volgende_actie    text
volgende_datum    date
door              uuid                                    -- auth user: Maarten of partner
created_at        timestamptz default now()
```

Eén rij per contactmoment, nooit overschrijven: de geschiedenis blijft leesbaar. De laatste rij bepaalt de getoonde opvolgstatus in de lijst. Dit staat los van het systeemveld `status` in teamkracht_leidersbeeld (ingevuld, gekoppeld, betaald, gesloten); dat veld vult de software, de opvolgtabel vult een mens.

In het beheerscherm: de lijst uit paragraaf 5 krijgt de kolommen opvolgstatus, volgende actie en volgende datum, en een uitklapregel per lead met de volledige geschiedenis en een invulveld voor een nieuw contactmoment. Sorteren op volgende datum, zodat bovenaan staat wie vandaag gebeld moet worden. De partner ziet en schrijft alleen de opvolging van zijn eigen leads.

Koppeling door partner: maakt een partner een team aan voor een leider met een e-mailadres waarvoor een Leidersbeeld met status 'ingevuld' bestaat, dan toont het systeem "Er staat een Leidersbeeld klaar van [naam], [organisatie]. Koppelen?" Bevestigt hij, dan wordt team_id gezet. Nooit automatisch koppelen.

## 6. Route `/leider/:token`

Eigen ingang van de leider. Vier toestanden.

a. Ingevuld, geen team: kolommen Zien, Sturen, Doen met alleen zijn drie punten, geen landelijk beeld (K9). Tekst: "Dit is jouw beeld van [organisatie]. Hoe het team het zelf doet, weet je na de meting." Daaronder de koopknop Teamfoto €495 (Mollie, bestaande Los-flow uit tarieven v4) en één regel voor wie via een partner kwam: "Je werkt met [partnernaam]; hij regelt de meting met je." Bij herkomst zonder partner en Organisatie-context: zelfde koopknop.

b. Gekoppeld of betaald, kaart nog niet vrij: zijn drie punten blijven zichtbaar, plus deelnameteller van het team (aantal ingevuld van aantal uitgenodigd, geen namen) en "Je krijgt bericht zodra de kaart klaar is".

c. Kaart vrijgegeven: statusregel bovenaan ("Gedeeld beeld op Zien, Sturen en Doen" of "Verschil in beeld op Sturen"), daaronder de volledige Teamkrachtkaart met Leidersbeeld en het R13-blok. Vanaf hier is dit de plek waar de leider terugkomt: hermeting, later de wekelijkse sprintvraag.

d. Hermeting aangemaakt: uitnodiging om opnieuw een Leidersbeeld in te vullen (meetmoment 'eind'), zelfde items, vóór vrijgave van de eindkaart. Na vrijgave: statusregel wordt "Beeld op Sturen is nu gedeeld" of "Verschil op Sturen blijft".

Onbekend token: 404 zonder informatie.

Vrijgave kaart (bestaande stap) zet `gesloten_op` en status 'gesloten' op het Leidersbeeld van dat team en meetmoment. Geen Leidersbeeld bij vrijgave: kaart zonder Leidersbeeld met één regel "Leidersbeeld niet ingevuld voor deze meting".

## 7. Zichtbaarheid per rol

Teamleider: alles in paragraaf 6.

Begeleider (partner): in zijn teamoverzicht per team een chip naast de deelnameteller. Vóór vrijgave "Leidersbeeld open" of "ingevuld". Na vrijgave de uitkomst in drie woorden, "Gedeeld beeld" of "Verschil op Sturen". Doorklik geeft dezelfde kaart als de leider; geen aparte begeleidersversie.

Teamleden: nooit. Zij zien in `/uitslag/:token` alleen hun eigen score. Het Leidersbeeld bereikt hen alleen als de leider of Begeleider de kaart in het teamgesprek laat zien.

Opdrachtgever of HR (Organisatie): per team de kaart zoals de leider hem ziet, mits op_kaart. Nooit een overzicht van Leidersbeeld-uitkomsten over teams heen (K5); dat zou een ranglijst van leidinggevenden zijn. Organisatieniveau alleen later via het landelijk beeld, geanonimiseerd en zonder teamnaam.

Maarten (beheer): het leadoverzicht uit paragraaf 5.

## 8. Weergave op de Teamkrachtkaart

Per kolom een tweede markering: het Leidersbeeld als open cirkel met korte streeplijn in magenta `#D6026F`, label "Leidersbeeld". Teamlijn houdt de bestaande stijl. Legenda krijgt een regel bij.

Tekstblok "Leidersbeeld en teamlijn" direct onder de kolommen, vóór het breukblok. Leesvolgorde van de kaart: wat doet het team (kolommen), kijken leider en team hetzelfde (Leidersbeeld), waar breekt de keten (breuk), wie zit waar (profielen), wat speelt er (dynamieken).

Bij op_kaart = false: geen markering, geen blok.

Bij hermeting: Leidersbeeld start en eind (lichter en voller magenta), naast teamlijn start en eind. Vier punten per kolom maximaal.

SVG met print-CSS, A4 en A1. Test met de bestaande Playwright-check.

## 9. Regel R13 · Leidersbeeld

Toevoegen na R12.

```
verschil_d = leidersbeeld_d - teamlijn_d          voor d in {zien, sturen, doen}
drempel    = 0,5 × SD_d uit norm_bron (bevroren)
```

Uitkomst per dimensie: `gedeeld` als |verschil_d| < drempel; `leider_hoger` als verschil_d ≥ drempel; `leider_lager` als verschil_d ≤ -drempel.

Volgorde in het blok: dimensie met het grootste |verschil_d| boven de drempel eerst. Alle drie gedeeld: één zin voor het geheel. Nooit een totaalscore van het verschil. Nooit een oordeel over de leider als persoon.

## 10. Teksten R13 (v1, definitief tenzij Maarten anders zegt)

Alle drie gedeeld: "Jouw beeld en het beeld van het team lopen gelijk op Zien, Sturen en Doen. Een goede basis om samen één doel te kiezen."

Zien, leider hoger: "Jij ziet het team scherper kijken dan het team zichzelf ziet. Gespreksvraag: welke signalen pik jij op die het team nog niet benoemt?"

Zien, leider lager: "Het team ziet zichzelf scherper kijken dan jij het ziet. Gespreksvraag: wat ziet het team al, dat jou nog niet bereikt?"

Sturen, leider hoger: "Jij ziet het team vaker zelf kiezen dan het team dat zelf ervaart. Gespreksvraag: waar wacht het team op jou terwijl jij denkt dat het al kiest?"

Sturen, leider lager: "Het team ervaart meer eigen sturing dan jij ziet. Gespreksvraag: welke keuzes maakt het team al zonder dat jij ze ziet?"

Doen, leider hoger: "Jij ziet het team meer afmaken dan het team zelf vindt. Gespreksvraag: wat blijft er liggen dat jij niet ziet?"

Doen, leider lager: "Het team vindt dat het meer afmaakt dan jij ziet. Gespreksvraag: wat wordt er opgeleverd dat bij jou niet zichtbaar wordt?"

Slotzin bij minstens één verschil: "Een verschil in beeld is geen fout. Het is de plek waar het gesprek begint en het eerste Sprint-doel meestal ligt."

## 11. Sprint-koppeling (licht)

Bij het kiezen van het Sprint-doel krijgt de dimensie met het grootste verschil boven de drempel het label "aanbevolen startpunt". Niets meer in v1.

## 12. Wat NIET in deze versie

Geen meerdere leiders per team. Geen vergelijking over teams heen. Geen LLM-teksten. Geen PDF. Geen leider-login. Geen mailreeks langer dan resultaatmail plus één herinnering. Geen landelijk beeld op de gratis kaart.

## 13. Acceptatiecriteria

A1. `/leidersbeeld` weigert versturen zonder naam, e-mail, organisatie, teamomvang of privacyvinkje; toont geen scores op het scherm.
A2. Na versturen: rij met status 'ingevuld', uniek token, herkomst en partner uit de URL opgeslagen, resultaatmail verstuurd met het indexgetal in onderwerp en tekst, mail_verzonden_op gevuld.
A3. `/leider/:token` toont toestand a, b, c, d volgens paragraaf 6; onbekend token 404; toestand a toont geen landelijk beeld.
A4. Herinnering na zeven dagen alleen bij status 'ingevuld', precies één keer.
A5. Aankoop via de koopknop maakt een team aan, vult team_id, zet status 'gekoppeld' en na Mollie-bevestiging 'betaald'.
A6. Partner die een team aanmaakt voor een e-mailadres met open Leidersbeeld krijgt de koppelvraag; zonder bevestiging geen koppeling.
A7. Na vrijgave kaart: versturen geblokkeerd, gesloten_op en status 'gesloten' gevuld.
A8. Eigen Zelfkracht Index van de leider (zelfde e-mail) verandert de teamlijn niet (K1).
A9. R13 met testdata (paragraaf 14): Zien gedeeld, Sturen leider_hoger, Doen gedeeld; blok begint met de Sturen-zin.
A10. Kaart rendert met Leidersbeeld op A4 en A1; bij op_kaart = false verdwijnen markering en blok.
A11. Beheerscherm toont alle leads met filter en CSV-export, met opvolgstatus, volgende actie en geschiedenis per lead; partner ziet en schrijft alleen eigen partner_id.
A11b. Opvolgtabel gebruikt dezelfde veldnamen als de bestaande opvolgtabel van de Zelfkracht Index; elk contactmoment is een nieuwe rij.
A12. Geen route leest of schrijft teamkracht_leidersbeeld via anon key.

## 14. Testdata

Teamlijn uit `testdata_team_noord.json`. Nieuw bestand `testdata_leidersbeeld_noord.json`:

```json
{
  "leider_naam": "Test Leider",
  "leider_email": "leider@test.happly.nl",
  "organisatie": "Testorganisatie Noord",
  "teamomvang": "8-12",
  "herkomst_src": "professionals",
  "partner_id": null,
  "op_kaart": true,
  "meetmoment": "start",
  "scores": { "zien": "<teamlijn_zien + 0,2 SD>", "sturen": "<teamlijn_sturen + 0,8 SD>", "doen": "<teamlijn_doen - 0,3 SD>" }
}
```

Claude Code rekent de placeholders om met de bevroren norm_bron en zet de waarden vast.

## 15. Oplevervolgorde

Stap 1: migratie als los SQL-blok. Wachten op akkoord.
Stap 2: publieke route `/leidersbeeld`, resultaatmail, herinnering, `/leider/:token` toestand a en b, leadoverzicht. Wachten op akkoord.
Stap 3: koopknop en Mollie-koppeling, partnerkoppeling, statusovergangen. Wachten op akkoord.
Stap 4: R13, kaartweergave, toestand c, print-check, testdata. Wachten op akkoord.
Stap 5: hermeting (toestand d) en Sprint-label.

Per stap: wat gebouwd is, wat getest is, wat open staat. Geen stap overslaan.
