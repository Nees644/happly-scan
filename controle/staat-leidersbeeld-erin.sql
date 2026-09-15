-- Controle na migratie-leidersbeeld-2026-09-15.sql.
-- Verwacht: 4 regels, elk met klopt = true.
select 'tabel teamkracht_leidersbeeld' as wat,
       count(*) as gevonden, 26 as verwacht, count(*) = 26 as klopt
  from information_schema.columns
 where table_schema = 'public' and table_name = 'teamkracht_leidersbeeld'
union all
select 'tabel opvolging',
       count(*), 10, count(*) = 10
  from information_schema.columns
 where table_schema = 'public' and table_name = 'opvolging'
union all
select 'policies op de twee nieuwe tabellen',
       count(*), 3, count(*) = 3
  from pg_policies
 where schemaname = 'public'
   and tablename in ('teamkracht_leidersbeeld','opvolging')
union all
select 'opvolgreeks alleen voor de beheerder',
       count(*), 1, count(*) = 1
  from pg_policies
 where schemaname = 'public' and tablename = 'opvolgreeks'
   and policyname = 'beheerder leest opvolgreeks';

-- Na stap 2: de kolom voor de klik op de knop in de resultaatmail.
select 'kolom mail_geopend_op' as wat,
       count(*) as gevonden, 1 as verwacht, count(*) = 1 as klopt
  from information_schema.columns
 where table_schema = 'public' and table_name = 'teamkracht_leidersbeeld'
   and column_name = 'mail_geopend_op';
