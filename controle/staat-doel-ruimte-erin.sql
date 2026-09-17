-- Controle na migratie-doel-ruimte-2026-09-17.sql.
-- Verwacht: 7 regels, elk met klopt = true.
select 'doelkolommen op teamkracht_teams' as wat,
       count(*) as gevonden, 5 as verwacht, count(*) = 5 as klopt
  from information_schema.columns
 where table_schema = 'public' and table_name = 'teamkracht_teams'
   and column_name in ('doel_tekst','doeltype','doeltype_bron','doel_ingevuld_op','doel_ingevuld_door')
union all
select 'doelkolommen op index_scan_results',
       count(*), 5, count(*) = 5
  from information_schema.columns
 where table_schema = 'public' and table_name = 'index_scan_results'
   and column_name in ('doel_tekst','doeltype','doeltype_bron','doel_ingevuld_op','doel_ingevuld_door')
union all
select 'doelkolommen op teamkracht_leidersbeeld',
       count(*), 5, count(*) = 5
  from information_schema.columns
 where table_schema = 'public' and table_name = 'teamkracht_leidersbeeld'
   and column_name in ('doel_tekst','doeltype','doeltype_bron','doel_ingevuld_op','doel_ingevuld_door')
union all
select 'tabel teamkracht_ruimte',
       count(*), 17, count(*) = 17
  from information_schema.columns
 where table_schema = 'public' and table_name = 'teamkracht_ruimte'
union all
select 'tabel teamkracht_maatregelen',
       count(*), 10, count(*) = 10
  from information_schema.columns
 where table_schema = 'public' and table_name = 'teamkracht_maatregelen'
union all
select 'hermetingsvelden op teambeeld en meting',
       count(*), 4, count(*) = 4
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('teamkracht_teambeeld','index_scan_results')
   and column_name in ('doelbereik','anders_gedaan_tekst')
union all
select 'policies op de twee nieuwe tabellen',
       count(*), 2, count(*) = 2
  from pg_policies
 where schemaname = 'public'
   and tablename in ('teamkracht_ruimte','teamkracht_maatregelen');

-- Na migratie-doel-datum-2026-09-17.sql: de termijn van het doel.
-- Verwacht: 1 regel met klopt = true.
select 'kolom doel_datum op drie tabellen' as wat,
       count(*) as gevonden, 3 as verwacht, count(*) = 3 as klopt
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('teamkracht_teams','index_scan_results','teamkracht_leidersbeeld')
   and column_name = 'doel_datum';
