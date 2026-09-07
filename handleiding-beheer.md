# Teamkracht, handleiding voor de beheerder

Voor Maarten. Wat je zelf kunt doen zonder mij, en wat je beter niet doet.
Bijgewerkt 7 september 2026.

## De vier plekken

| Waar | Waarvoor | Wie komt erbij |
|---|---|---|
| `/teamkracht` | Teams aanmaken, scanlink delen, kaarten en hermetingen maken | elke coach, en jij |
| `/teamkracht-beheer` | Teksten, regels, interventies en instellingen aanpassen | alleen jij |
| `/teamkracht-handleiding` | Werkinstructie voor coaches | iedereen met de link |
| `/teamkracht-demo` | Verkooppagina met het fictieve team Noord | iedereen met de link |
| Supabase SQL-editor | Coaches toevoegen, de oogst van coachvragen lezen | alleen jij |

## Een coach toegang geven

Hier is nog geen scherm voor. Twee stappen in Supabase.

De coach maakt eerst zelf een account aan, of jij maakt er een aan onder
Authentication, Users. Daarna geef je hem een rol:

```sql
insert into public.teamkracht_gebruikers (user_id, email, rol)
select id, email, 'coach' from auth.users where email = 'adres@van.de.coach'
on conflict (user_id) do update set rol = 'coach';
```

Zonder rij in die tabel krijgt iemand overal een 403, ook met een geldig
wachtwoord. Dat is met opzet: een account alleen is niet genoeg.

Rol `coach` ziet alleen zijn eigen teams. Rol `beheerder` ziet alles en komt
bij de beheerpagina. Toegang weer intrekken:

```sql
delete from public.teamkracht_gebruikers where email = 'adres@van.de.coach';
```

## De beheerpagina

Vijf tabbladen. Elke rij klapt open, je past aan en slaat per rij op.

**Instellingen.** De breedte van de middenband en het gemiddelde waar profielen
tegen worden afgezet. Raak `middenband_sd` alleen aan als je weet wat je doet:
smaller betekent dat meer mensen een uitgesproken profiel krijgen, breder dat
er meer in de middenband vallen. De werkhypothese is 0,25.

**Regels.** De dertien dynamieken. Titel, dynamiektekst, interventie en
gespreksvraag mag je vrij herschrijven. De voorwaarde is JSON en wordt
gecontroleerd; een typefout in een sleutel wordt geweigerd met uitleg, in
plaats van dat de regel stil van de kaart verdwijnt.

**Profielen.** De negen patronen. Het veld `tekst_deelnemer` is de enige tekst
die deelnemers zelf te zien krijgen, op hun eigen resultaatpagina. Die staan er
nu in als ik-vorm-samenvatting van mijn hand; die zou ik als eerste door jouw
pen halen.

**Interventies.** Dertien stuks. De velden `ritme` en `telling` zijn van mij en
niet van jou, en ze bepalen of een traject bewijs oplevert. Vier ervan deugen
niet: de telling bij "Eerst veiligheid, dan zien" vraagt een oordeel in plaats
van een telling, bij "Eén ding per week teruggeven" staan twee dingen in één
veld, wekelijks en elk overleg gebruik ik door elkaar, en twee interventies
delen dezelfde telling.

**Ambitiebanden.** Onder 5, 5 tot 10, 10 tot 15, boven 15 punten per jaar. Dat
zijn jouw getallen als werkhypothese. Zodra er genoeg hermetingen zijn kun je ze
vervangen door de werkelijke verdeling: de mediaan wordt normaal, het derde
kwartiel wordt hoog.

Bij het opslaan wordt de taalregel gecontroleerd: geen gedachtestreep, geen
uitroepteken. Zie `taalregels.md`.

**Wat je aanpast werkt door bij de volgende berekening.** Kaarten die al gemaakt
zijn veranderen niet, want die hebben hun teksten en hun cijfers bevroren. Dat
is met opzet: wat een team heeft gezien, blijft wat het heeft gezien.

## Het gemiddelde

Op de kaart heet de magenta lijn het gemiddelde. Het staat nu op 74, 69 en 65,
gemeten over 73 metingen op 7 september 2026, en het is vast ingesteld.

Het actuele cijfer haal je zo op:

```sql
select * from public.teamkracht_referentie;
```

Die view filtert drie dingen weg: hermetingen, metingen zonder mailadres, en
alles wat via een teamlink binnenkwam. Dat laatste is de belangrijkste. Zonder
dat filter zou het instrument zijn eigen coaching gaan meten en zou het
gemiddelde omhoog kruipen omdat wij eraan hebben gewerkt.

De kolom `marge_sturen` zegt hoe hard je het cijfer mag nemen: het is de halve
breedte van het betrouwbaarheidsinterval. Nu is dat 3,7 punten, ongeveer de
hele halve middenband. Zakt hij onder de 2, rond 250 metingen, dan kun je gaan
denken aan `norm_bron = landelijk`, waarbij het gemiddelde automatisch meeloopt.

**Verhoog het als versie, niet als bijstelling.** Zet de nieuwe cijfers in de
beheerpagina, verhoog `norm_versie` van 2026.1 naar 2026.2, en vul `norm_n` en
`norm_gemeten_op` in. Bestaande teambeelden veranderen niet; die hebben hun
eigen cijfer bevroren, zodat een hermeting langs dezelfde meetlat wordt
gemeten als het startbeeld waar hij bij hoort.

## De oogst van coachvragen

Formuleert een coach een eigen gespreksvraag in plaats van de voorgestelde, dan
wordt die bewaard naast de suggestie die hij verving.

```sql
select c.created_at, i.titel, c.suggestie, c.vraag
from public.teamkracht_coachvragen c
left join public.teamkracht_interventies i on i.code = c.interventie_code
order by c.created_at desc;
```

Kom je een vraag tegen die beter is dan de onze, zet hem dan in de
beheerpagina bij die interventie en markeer de oogstrij:

```sql
update public.teamkracht_coachvragen set opgenomen = true where id = '...';
```

Dit is de plek waar de bibliotheek zichzelf verbetert. Ik zou er per kwartaal
een halfuur voor nemen.

## Wat je niet moet aanraken

De tabellen `teamkracht_teambeeld`, `teamkracht_doel`, `teamkracht_plan` en
`teamkracht_coachvragen` staan bewust niet in de beheerpagina. Dat zijn
vastgelegde uitkomsten. Wijzig je die achteraf, dan klopt niet meer wat een
team destijds heeft gezien, en is de hermeting geen bewijs meer maar een
verhaal.

Hetzelfde geldt voor `resultaat_token` op een meting en voor het token van een
team: die zijn iemands toegang tot zijn eigen uitslag.

## Als er iets misgaat

**Een coach ziet geen teams.** Kijk of hij in `teamkracht_gebruikers` staat.

**De kaartknop blijft uit.** Er zijn nog geen vijf metingen via de teamlink
binnengekomen. Controleer of de deelnemers de link met `?team=` hebben gebruikt
en niet de gewone scanlink:

```sql
select count(*) from public.index_scan_results where teamkracht_team_id is not null;
```

**Iemand vulde in via de verkeerde link.** Zijn meting hangt dan aan geen team.
Handmatig alsnog koppelen kan, maar doe dat alleen als de deelnemer het weet:

```sql
update public.index_scan_results
set teamkracht_team_id = (select id from public.teamkracht_teams where token = 'PAJBAV')
where id = '...';
```

**Een kaart klopt niet.** Bereken hem opnieuw; er komt een nieuw beeld bij, het
oude blijft staan. Verwijderen doe je alleen als het echt fout is:

```sql
delete from public.teamkracht_teambeeld where id = '...';
```

## Waar de code staat

Branch `teamkracht-fase-1` in `Nees644/happly-scan`, straks samengevoegd met
main. Het rekenwerk zit in `teamkracht-logica.js`, de kaart in
`teamkracht-kaart.js`, de gedeelde uitslagonderdelen in `zelfkracht-uitslag.js`.
De migratie staat onderaan `supabase.sql` met de datum erbij. Tests draai je met
`npm test`; die lezen de regels rechtstreeks uit het seedblok, zodat er geen
tweede waarheid kan ontstaan.
