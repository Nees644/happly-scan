-- Zelfstartregister: tegoed voor organisaties, 7 november 2026.
--
-- Een werkgever of intermediair koopt Verificatie & Voorkeur voor een aantal
-- mensen in één keer. Hij betaalt via één Mollie-betaling, krijgt één
-- factuur, en zijn mensen krijgen één code waarmee ze direct geverifieerd
-- zijn. De badge blijft van de persoon.
--
-- Bundelprijs per plaats, excl. btw:
--   vanaf 25 plaatsen   59 euro   (ZS-TEG-25)
--   vanaf 100 plaatsen  49 euro   (ZS-TEG-100)
--   minder dan 25       79 euro   (gewoon ZS-STD)
-- Alleen Verificatie & Voorkeur; de Zelfstarters Dag krijgt nooit korting.
--
-- Een tegoed is een rij in zelfstarters_partners met soort tegoed, honderd
-- procent korting en een maximum aantal plaatsen. Hij staat pas aan als de
-- organisatie heeft betaald.

insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, prijsniveau, betaalwijze, bevat, voorwaarde)
values
('ZS-TEG-25', 'Zelfstarters Verificatie & Voorkeur, tegoed vanaf 25 plaatsen', 5900, 'eenmalig', 'registratie', 'A', 'ZS', null, 'vooraf',
  'Per plaats een jaar Verificatie & Voorkeur: badge, plan met herinneringen, hermeting', 'Vanaf 25 plaatsen, voor werkgevers en intermediairs'),
('ZS-TEG-100', 'Zelfstarters Verificatie & Voorkeur, tegoed vanaf 100 plaatsen', 4900, 'eenmalig', 'registratie', 'A', 'ZS', null, 'vooraf',
  'Per plaats een jaar Verificatie & Voorkeur: badge, plan met herinneringen, hermeting', 'Vanaf 100 plaatsen, voor werkgevers en intermediairs')
on conflict (code) do update set naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, bevat = excluded.bevat, voorwaarde = excluded.voorwaarde, actief = true;

alter table public.zelfstarters_partners drop constraint if exists zelfstarters_partners_soort_check;
alter table public.zelfstarters_partners add constraint zelfstarters_partners_soort_check
  check (soort in ('open', 'founding', 'tegoed'));

alter table public.zelfstarters_partners
  add column if not exists doelgroep text not null default 'intermediair' check (doelgroep in ('intermediair', 'werkgever')),
  add column if not exists plaatsen integer check (plaatsen is null or plaatsen > 0),
  add column if not exists product_code text,
  add column if not exists prijs_plaats_cent integer,
  add column if not exists bedrag_cent integer,
  add column if not exists btw_cent integer,
  add column if not exists mollie_payment_id text,
  add column if not exists betaald_op timestamptz,
  add column if not exists klant_naam text,
  add column if not exists klant_adres text,
  add column if not exists klant_postcode text,
  add column if not exists klant_plaats text,
  add column if not exists klant_btw_nummer text;

create unique index if not exists zelfstarters_partners_mollie
  on public.zelfstarters_partners (mollie_payment_id) where mollie_payment_id is not null;

-- Een registratie die met een tegoed is geverifieerd, telt apart: niet
-- gratis en niet zelf betaald, maar betaald door de organisatie.
alter table public.zelfstarters drop constraint if exists zelfstarters_betaling_status_check;
alter table public.zelfstarters add constraint zelfstarters_betaling_status_check
  check (betaling_status is null or betaling_status in ('open','betaald','mislukt','verlopen','gratis','tegoed'));

-- Een tegoed krijgt hoogstens één factuur.
alter table public.facturen add column if not exists zs_tegoed_id uuid references public.zelfstarters_partners (id) on delete set null;
create unique index if not exists facturen_zs_tegoed_idx on public.facturen (zs_tegoed_id) where zs_tegoed_id is not null;

-- Controle: drie rijen, en de nieuwe kolommen.
select code, prijs_ex_btw, actief from public.producten where code in ('ZS-STD', 'ZS-TEG-25', 'ZS-TEG-100') order by prijs_ex_btw desc;
