# Controlequery's

Leesquery's om na een migratie of een aankoop te zien of het is gegaan zoals
bedoeld. Ze veranderen niets en mogen zo vaak draaien als je wilt.

Draaien in de SQL-editor van Supabase, project `uqulkznqcqpbagbvtqdr`.

| Bestand | Wanneer |
|---|---|
| `staat-de-migratie-erin.sql` | na een migratie. Geeft één regel: klaar, of wat er ontbreekt. |
| `na-de-aankoop.sql` | na een betaling. Vijf blokken: de bestelling, het hermetingtegoed op het team, de melding van Mollie, het prijsniveau van de koper, en de fouten van vandaag. |

Het tweede blok van `na-de-aankoop.sql` is de belangrijkste: het hermetingtegoed
staat nergens in de interface zolang een team nog geen startbeeld heeft, dus dit
is de enige plek waar je ziet of een pakket de hermeting goed heeft klaargezet.
