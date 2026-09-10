-- Wat er is gebeurd bij de laatste aankoop. Leest alleen, verandert niets.
-- Draai dit nadat je een pakket hebt afgerekend.

-- 1. De bestelling zelf
select 'bestelling' as wat,
       b.created_at,
       b.product_code,
       b.status,
       (b.bedrag_cent / 100.0) as bedrag_incl_btw,
       (b.btw_cent / 100.0)    as waarvan_btw,
       b.betaald_op,
       b.verbruikt_op,
       b.geldig_tot,
       t.naam as team
  from public.bestellingen b
  left join public.teamkracht_teams t on t.id = b.team_id
 order by b.created_at desc
 limit 3;

-- 2. Het hermetingtegoed op het team. Hier hoort na een pakket
--    hermeting_tegoed = 1 te staan met een datum zes maanden verderop.
select 'tegoed op team' as wat,
       t.naam,
       t.hermeting_tegoed,
       t.hermeting_tot,
       (t.pakket_bestelling_id is not null) as bestelling_gekoppeld
  from public.teamkracht_teams t
 where t.pakket_bestelling_id is not null
    or t.hermeting_tegoed > 0
 order by t.created_at desc
 limit 5;

-- 3. Heeft Mollie zijn melding kwijt gekund, en is die verwerkt
select 'mollie-melding' as wat, m.ontvangen_op, m.mollie_id, m.verwerkt_op, m.uitkomst
  from public.mollie_meldingen m
 order by m.ontvangen_op desc
 limit 3;

-- 4. Welk tarief geldt er voor de koper, volgens de view die de server gebruikt
select 'prijsniveau koper' as wat, g.email, p.prijsniveau, p.organisatie_id, p.bureau_id
  from public.gebruiker_prijsniveau p
  join public.teamkracht_gebruikers g on g.user_id = p.user_id
 where g.email is not null
 order by g.user_id
 limit 10;

-- 5. Ging er iets mis in een route
select 'fouten vandaag' as wat, f.created_at, f.bron
  from public.funnel_events f
 where f.event = 'teamkracht_fout'
   and f.created_at > now() - interval '1 day'
 order by f.created_at desc
 limit 10;
