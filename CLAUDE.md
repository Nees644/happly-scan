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
- **De migraties zijn nog niet gedraaid.** `migratie-certificering-2026-09-09.sql`
  en `migratie-tarieven-2026-09-09.sql` liggen klaar in de repo. Tot ze draaien
  kent de database de nieuwe codes en kolommen niet.

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
- Prijswijziging: nieuwe rij, oude op `actief = false`. Bestaande abonnementen
  houden hun bedrag. Een rij waar een bestelling aan hangt gaat nooit weg.
