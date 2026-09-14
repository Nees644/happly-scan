-- Eén regel antwoord: staat alles er, of wat ontbreekt er nog.
-- Leest alleen, verandert niets.

with verwacht as (
  select 'tabel' as soort, t.naam,
         to_regclass('public.' || t.naam) is not null as aanwezig
    from (values ('organisaties'),('organisatie_leden'),('bureaus'),
                 ('bureau_leden'),('seat_uitnodigingen')) as t(naam)

  union all
  select 'view', 'gebruiker_prijsniveau',
         to_regclass('public.gebruiker_prijsniveau') is not null

  union all
  select 'functie', 'verbruik_bureau_tegoed',
         to_regprocedure('public.verbruik_bureau_tegoed(uuid)') is not null

  union all
  select 'kolom', k.tabel || '.' || k.kolom,
         exists (select 1 from information_schema.columns c
                  where c.table_schema = 'public'
                    and c.table_name = k.tabel
                    and c.column_name = k.kolom)
    from (values ('teamkracht_gebruikers','lijn'),
                 ('teamkracht_gebruikers','lezer_module_toegang'),
                 ('teamkracht_gebruikers','beta'),
                 ('teamkracht_teams','hermeting_tegoed'),
                 ('teamkracht_teams','hermeting_tot'),
                 ('producten','groep'),
                 ('producten','prijsniveau')) as k(tabel, kolom)

  union all
  select 'productrij', r.code,
         exists (select 1 from public.producten p where p.code = r.code)
    from (values ('PAK-LOS'),('PAK-ORG1'),('PAK-BUR-EXTRA'),
                 ('HM-BUR'),('ORG-1'),('ORG-3')) as r(code)
)
select case
         when count(*) filter (where not aanwezig) = 0
           then 'KLAAR, alles staat er (' || count(*) || ' gecontroleerd)'
         else 'ONTBREEKT NOG: ' || string_agg(naam, ', ') filter (where not aanwezig)
       end as stand
  from verwacht;
