# Feiten voor wie een briefing schrijft

Plak dit blad bovenaan in het gesprek waarin een briefing wordt geschreven.
Het bestaat omdat dezelfde fouten steeds terugkomen in nieuwe briefings: ze
komen uit oudere versies en niemand die alleen de briefing leest, ziet dat ze
achterhaald zijn.

Bijgewerkt op 15 september 2026. Wijzigt er iets in de code, dan wijzigt dit
blad mee en niet andersom.

## De harde getallen

| Wat | Waarde | Waar het in de code staat |
|---|---|---|
| Minimum voor een Teamkrachtkaart | **vijf** deelnemers | `teamkracht_config.min_deelnemers_kaart` |
| Onder dit aantal geen individuele lijnen | tien deelnemers | `teamkracht_config.min_deelnemers_lijnen` |
| Adviesprijs Teamfoto plus hermeting | 495 euro exclusief btw | product `PAK-LOS` |
| Extra hermeting los | 195 euro exclusief btw | product `HM-LOS` |
| Btw | 21 procent, komt er in `bedragMetBtw()` bij | `betalen.js` |

Acht deelnemers is een oud getal uit de eerste opzet. Het is op 7, 8, 9 en 15
september bevestigd: het minimum is vijf. Staat er acht in een briefing, dan is
dat een fout, ook als er een hele alinea omheen staat.

## De harde keuzes

1. **De betaalprovider is Mollie.** Stripe bestaat hier niet: geen account,
   geen price-id, geen sessie. Mollie kent geen productcatalogus, dus de tabel
   `producten` is de catalogus.
2. **Er is geen leesdrempel voor de eerste Teamfoto.** De Lezer-module wordt
   aanbevolen, niet vereist. Vervallen op 9 september 2026.
3. **Teams staan nooit naast elkaar op score.** Geen ranglijst, geen gemiddelde
   over teams, geen sortering die van een score is afgeleid, ook niet in een
   export. Een team wordt vergeleken met het landelijk beeld en met zijn eigen
   vorige meting.
4. **Prijs en recht worden op de server bepaald.** De client vraagt om een
   groep (`PAK`, `HM`), nooit om een productcode.

## Wat wel en niet bestaat

Bestaat: vijf koperslijnen (`los`, `partner_zonder_licentie`, `organisatie`,
`professional`, `bureau`), de tabellen `producten`, `organisaties`,
`organisatie_leden`, `afnames`, `facturen`, `betalingen`, de maandelijkse
factuurrun op Mollie-mandaten, en het teamdashboard.

Bestaat niet, en is dus niet "hergebruiken" maar "bouwen": een partnertoken in
een URL, een indexgetal voor een heel team, een leider-login, een pdf van de
kaart, en een opvolgtabel waarin een mens statussen en notities schrijft. De
tabel `opvolgreeks` lijkt daarop maar houdt alleen bij welke automatische mail
is verstuurd.

## De taalregels

Geen gedachtestreepjes en geen uitroeptekens; een test bewaakt dat op de
seedteksten. Nooit "gap", "blinde vlek", "kloof", "cohort" of "Samenspel".
Nooit "kan", altijd "doet". Alles in het Nederlands, ook in de code en het
commentaar.

## De werkregel

Wijkt een briefing af van wat er is gebouwd, dan wordt er niet meegebouwd. Het
verschil wordt gemeld en na het besluit hier en in `briefings/` verwerkt.
