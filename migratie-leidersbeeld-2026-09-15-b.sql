-- ===========================================================================
-- MIGRATIE · Leidersbeeld, aanvulling b (15 september 2026)
--
-- Hoort bij stap 2 van briefings/leidersbeeld.md.
--
-- Een kolom die in stap 1 nog ontbrak. Paragraaf 5 vraagt in het leadoverzicht
-- een kolom "mail geopend, ja of nee, op basis van de klik". De klik op de knop
-- in de resultaatmail komt uit op /leider/:token, en daar wordt dit gezet. Zo
-- is te zien welke leads de mail hebben gehad en welke niet, zonder telpixel.
--
-- Alleen toevoegen. Herhaalbaar.
-- ===========================================================================

alter table public.teamkracht_leidersbeeld
  add column if not exists mail_geopend_op timestamptz;
