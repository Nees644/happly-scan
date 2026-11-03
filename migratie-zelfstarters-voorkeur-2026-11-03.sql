-- migratie-zelfstarters-voorkeur-2026-11-03.sql
-- De producten van het Zelfstartregister heten naar buiten Voorkeur en
-- Voorkeur met Plus Class (besluit 3 november 2026). Codes en prijzen
-- blijven; alleen de naam en de omschrijving veranderen, zodat facturen en
-- Mollie-omschrijvingen dezelfde woorden gebruiken als de site.
-- Draai dit bestand één keer in de SQL-editor van Supabase.

update public.producten set
  naam = 'Zelfstarters Voorkeur, founding-tarief',
  bevat = 'Je jaar in de ontwikkelstructuur: geverifieerd met badge en jaartal, volledige duiding, als-dan plan met herinneringen, hermeting en groei'
where code = 'ZS-STD';

update public.producten set
  naam = 'Zelfstarters Voorkeur met Plus Class, founding-tarief',
  bevat = 'Alles van Voorkeur plus een dag live in Zaltbommel en de plus op de badge'
where code = 'ZS-PLUS';
