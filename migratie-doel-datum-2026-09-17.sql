-- ===========================================================================
-- MIGRATIE · Doel-intake, aanvulling: de termijn (17 september 2026)
--
-- Besluit Maarten, 17 september 2026: de termijn van het doel is geen vaste
-- tien weken in de vraagzin maar een datum die de klant zelf invult, zoals bij
-- een implementatie-intentie. Eén kolom op dezelfde drie tabellen als het
-- doel. Draait NA migratie-doel-ruimte-2026-09-17.sql. Alleen toevoegen,
-- nullable, herhaalbaar.
-- ===========================================================================

alter table public.teamkracht_teams        add column if not exists doel_datum date;
alter table public.index_scan_results      add column if not exists doel_datum date;
alter table public.teamkracht_leidersbeeld add column if not exists doel_datum date;
