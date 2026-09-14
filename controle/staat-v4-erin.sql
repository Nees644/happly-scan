-- Eén regel antwoord: staat v4 erin, of wat ontbreekt er nog.
-- Leest alleen, verandert niets.

with verwacht as (
  select 'tabel' as soort, t.naam, to_regclass('public.' || t.naam) is not null as aanwezig
    from (values ('afnames'),('facturen'),('betalingen')) as t(naam)

  union all
  select 'functie', 'volgend_factuurnummer',
         to_regprocedure('public.volgend_factuurnummer()') is not null

  union all
  select 'kolom', k.tabel || '.' || k.kolom,
         exists (select 1 from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = k.tabel and c.column_name = k.kolom)
    from (values ('teamkracht_gebruikers','founder'),
                 ('teamkracht_gebruikers','founder_tot'),
                 ('teamkracht_gebruikers','afname_geblokkeerd'),
                 ('teamkracht_gebruikers','mollie_mandate_id'),
                 ('producten','betaalwijze'),
                 ('teamkracht_config','landelijk_beeld_zonder_licentie')) as k(tabel, kolom)

  union all
  select 'productrij', r.code, exists (select 1 from public.producten p where p.code = r.code)
    from (values ('PAK-LOS'),('PAK-PZL'),('PAK-BUR3'),('HM-PZL'),('BUR-1'),('PRO-START-F')) as r(code)

  union all
  select 'prijs 495', 'PAK-LOS',
         exists (select 1 from public.producten p where p.code = 'PAK-LOS' and p.prijs_ex_btw = 49500)
)
select case
         when count(*) filter (where not aanwezig) = 0
           then 'KLAAR, v4 staat erin (' || count(*) || ' gecontroleerd)'
         else 'ONTBREEKT NOG: ' || string_agg(naam, ', ') filter (where not aanwezig)
       end as stand
  from verwacht;
