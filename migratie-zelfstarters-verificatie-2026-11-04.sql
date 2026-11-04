-- migratie-zelfstarters-verificatie-2026-11-04.sql
-- Productnamen van het Zelfstartregister, besluit 4 november 2026:
-- Verificatie & Voorkeur, en Verificatie & Voorkeur + Plus Class.
-- Vervangt de naamgeving van 3 november. Codes en prijzen blijven.
-- Draai dit bestand één keer in de SQL-editor van Supabase.

update public.producten set
  naam = 'Zelfstarters Verificatie & Voorkeur, founding-tarief'
where code = 'ZS-STD';

update public.producten set
  naam = 'Zelfstarters Verificatie & Voorkeur + Plus Class, founding-tarief'
where code = 'ZS-PLUS';
