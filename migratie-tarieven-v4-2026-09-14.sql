-- ===========================================================================
-- MIGRATIE v4 · Tarieven, partnerlijn en verrekening achteraf
--
-- Hoort bij briefing_code_tarieven_v4.md (14 september 2026, b, Mollie).
-- Akkoord gegeven op 14 september 2026.
--
-- Draait NA migratie-certificering-2026-09-09.sql en
-- migratie-tarieven-2026-09-09.sql, die beide op 10 september zijn gedraaid.
--
-- Herhaalbaar: create if not exists, on conflict do update, elke policy wordt
-- eerst gedropt. Niets wordt verwijderd; oude productrijen gaan op actief =
-- false zodat facturen van vorige week blijven kloppen.
--
-- IN TWEE DELEN:
--   BLOK A tot en met J voegt toe en verandert niets aan wat nu verkocht wordt.
--   BLOK Z zet de oude productcodes uit en hoort pas te draaien als de nieuwe
--   code live staat.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOK A · de lijn krijgt er een waarde bij
--
-- partner_zonder_licentie is nieuw: een gecertificeerde die geen licentie heeft.
-- Hij koopt vooraf tegen 249 en factureert zelf 495 aan zijn klant.
alter table public.teamkracht_gebruikers
  drop constraint if exists teamkracht_gebruikers_lijn_check;
alter table public.teamkracht_gebruikers
  add constraint teamkracht_gebruikers_lijn_check
  check (lijn in ('los','partner_zonder_licentie','organisatie','professional','bureau'));


-- ---------------------------------------------------------------------------
-- BLOK B · foundergroep en verrekening op de gebruiker
--
-- founder vervangt beta uit v3. De oude velden blijven staan en worden
-- overgezet, zodat een lopende bèta niet halverwege zijn stand verliest.
alter table public.teamkracht_gebruikers
  add column if not exists founder            boolean not null default false,
  add column if not exists founder_tot        date,
  -- Aan als de maandincasso twee keer is mislukt. Bestaande kaarten blijven
  -- zichtbaar; alleen nieuwe teams en nieuwe afnames gaan op slot.
  add column if not exists afname_geblokkeerd boolean not null default false,
  -- Het mandaat waarop wordt geincasseerd. Zonder mandaat geen licentie.
  add column if not exists mollie_mandate_id  text;

update public.teamkracht_gebruikers
   set founder = true, founder_tot = beta_tot
 where beta = true and founder = false;

-- mollie_customer_id bestaat al sinds de certificeringsmigratie. Deze regel
-- staat er voor het geval dit blok op een omgeving draait waar dat niet zo is.
alter table public.teamkracht_gebruikers
  add column if not exists mollie_customer_id text;


-- ---------------------------------------------------------------------------
-- BLOK C · het hermetingtegoed
--
-- Bestaat al sinds 10 september en verandert niet. Alleen hier herhaald zodat
-- dit bestand op een lege omgeving ook compleet is.
alter table public.teamkracht_teams
  add column if not exists hermeting_tegoed     int  not null default 0,
  add column if not exists hermeting_tot        date,
  add column if not exists pakket_bestelling_id uuid references public.bestellingen(id) on delete set null;


-- ---------------------------------------------------------------------------
-- BLOK D · de producttabel krijgt de nieuwe prijsniveaus
--
-- v4 heeft drie bureaustaffels met elk een eigen pakketprijs, en een niveau
-- voor de partner zonder licentie. Het tegoedniveau 'bur' vervalt: partners
-- kopen niets meer vooraf.
alter table public.producten drop constraint if exists producten_prijsniveau_check;
alter table public.producten add constraint producten_prijsniveau_check
  check (prijsniveau is null or prijsniveau in
    ('los','pzl','org1','org2','org3','pro','bur1','bur2','bur3'));

-- Hoe dit product wordt betaald. Volgt uit de lijn en staat hier zodat het
-- prijsendpoint het kan meesturen zonder het opnieuw af te leiden.
alter table public.producten
  add column if not exists betaalwijze text;
alter table public.producten drop constraint if exists producten_betaalwijze_check;
alter table public.producten add constraint producten_betaalwijze_check
  check (betaalwijze is null or betaalwijze in ('vooraf','achteraf'));


-- ---------------------------------------------------------------------------
-- BLOK E · pakket en hermeting, een rij per lijn
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, prijsniveau, betaalwijze, bevat, voorwaarde) values
('PAK-LOS',   'Pakket Teamfoto en hermeting',                  49500, 'eenmalig', 'meting', 'A', 'PAK', 'los',  'vooraf',   'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Adviesprijs, ook de prijs die een partner aan zijn klant rekent'),
('PAK-PZL',   'Pakket, partner zonder licentie',               24900, 'eenmalig', 'meting', 'A', 'PAK', 'pzl',  'vooraf',   'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Certificaat Lezer of Begeleider, geen actieve licentie'),
('PAK-ORG1',  'Pakket, Organisatie klein',                     19500, 'eenmalig', 'meting', 'A', 'PAK', 'org1', 'achteraf', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopend abonnement Organisatie klein'),
('PAK-ORG2',  'Pakket, Organisatie midden',                    17500, 'eenmalig', 'meting', 'A', 'PAK', 'org2', 'achteraf', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopend abonnement Organisatie midden'),
('PAK-ORG3',  'Pakket, Organisatie groot',                     14500, 'eenmalig', 'meting', 'A', 'PAK', 'org3', 'achteraf', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopend abonnement Organisatie groot'),
('PAK-PRO',   'Pakket, Professional',                          14500, 'eenmalig', 'meting', 'B', 'PAK', 'pro',  'achteraf', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopende Professional-licentie'),
('PAK-BUR1',  'Pakket, Bureau klein',                          12500, 'eenmalig', 'meting', 'B', 'PAK', 'bur1', 'achteraf', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopende bureaulicentie klein'),
('PAK-BUR2',  'Pakket, Bureau midden',                         11000, 'eenmalig', 'meting', 'B', 'PAK', 'bur2', 'achteraf', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopende bureaulicentie midden'),
('PAK-BUR3',  'Pakket, Bureau groot',                           9900, 'eenmalig', 'meting', 'B', 'PAK', 'bur3', 'achteraf', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopende bureaulicentie groot'),
('HM-LOS',    'Extra hermeting',                               19500, 'eenmalig', 'meting', 'A', 'HM',  'los',  'vooraf',   'Het eindbeeld over het startbeeld', 'Eerder een Teamfoto voor dit team'),
('HM-PZL',    'Extra hermeting, partner zonder licentie',      14500, 'eenmalig', 'meting', 'A', 'HM',  'pzl',  'vooraf',   'Het eindbeeld over het startbeeld', 'Eerder een Teamfoto voor dit team'),
('HM-ORG1',   'Extra hermeting, Organisatie klein',             9500, 'eenmalig', 'meting', 'A', 'HM',  'org1', 'achteraf', 'Het eindbeeld over het startbeeld', 'Lopend abonnement Organisatie klein'),
('HM-ORG2',   'Extra hermeting, Organisatie midden',            9500, 'eenmalig', 'meting', 'A', 'HM',  'org2', 'achteraf', 'Het eindbeeld over het startbeeld', 'Lopend abonnement Organisatie midden'),
('HM-ORG3',   'Extra hermeting, Organisatie groot',             7500, 'eenmalig', 'meting', 'A', 'HM',  'org3', 'achteraf', 'Het eindbeeld over het startbeeld', 'Lopend abonnement Organisatie groot'),
('HM-PRO',    'Extra hermeting, Professional',                  9500, 'eenmalig', 'meting', 'B', 'HM',  'pro',  'achteraf', 'Het eindbeeld over het startbeeld', 'Lopende Professional-licentie'),
('HM-BUR1',   'Extra hermeting, Bureau klein',                  7500, 'eenmalig', 'meting', 'B', 'HM',  'bur1', 'achteraf', 'Het eindbeeld over het startbeeld', 'Lopende bureaulicentie'),
('HM-BUR2',   'Extra hermeting, Bureau midden',                 7500, 'eenmalig', 'meting', 'B', 'HM',  'bur2', 'achteraf', 'Het eindbeeld over het startbeeld', 'Lopende bureaulicentie'),
('HM-BUR3',   'Extra hermeting, Bureau groot',                  7500, 'eenmalig', 'meting', 'B', 'HM',  'bur3', 'achteraf', 'Het eindbeeld over het startbeeld', 'Lopende bureaulicentie')
on conflict (code) do update set
  naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, interval = excluded.interval,
  soort = excluded.soort, fase = excluded.fase, groep = excluded.groep,
  prijsniveau = excluded.prijsniveau, betaalwijze = excluded.betaalwijze,
  bevat = excluded.bevat, voorwaarde = excluded.voorwaarde,
  actief = true, updated_at = now();


-- ---------------------------------------------------------------------------
-- BLOK F · de licenties
--
-- De bureaubundels houden hun code maar krijgen een nieuwe prijs en verliezen
-- hun pakkettegoed. Ze zijn nooit verkocht, dus de prijs mag in de rij zelf
-- worden bijgewerkt; de voorwaarde onderaan bewaakt dat.
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, seats_max, pak_tegoed, verlengt_als, betaalwijze, bevat, voorwaarde) values
('ORG-1',     'Organisatie klein',        49000, 'jaar',     'licentie', 'A', 'ORG',    3, null, null,    'vooraf', 'Landelijk beeld, organisatiedashboard, drie seats, maandelijkse verrekening', null),
('ORG-2',     'Organisatie midden',       99000, 'jaar',     'licentie', 'A', 'ORG',   10, null, null,    'vooraf', 'Landelijk beeld, organisatiedashboard, tien seats, maandelijkse verrekening', null),
('ORG-3',     'Organisatie groot',       199000, 'jaar',     'licentie', 'A', 'ORG', null, null, null,    'vooraf', 'Landelijk beeld, organisatiedashboard, onbeperkt seats, maandelijkse verrekening', null),
('PRO-M',     'Professional, maand',       5900, 'maand',    'licentie', 'B', 'PRO', null, null, null,    'vooraf', 'Inkoop 145, landelijk beeld, register, leadknop, opfrisdag', 'Certificaat Begeleider'),
('PRO-J',     'Professional, jaar',       59000, 'jaar',     'licentie', 'B', 'PRO', null, null, null,    'vooraf', 'Inkoop 145, landelijk beeld, register, leadknop, opfrisdag', 'Certificaat Begeleider'),
('BUR-1',     'Bureau klein',            149000, 'jaar',     'licentie', 'B', 'BUR',    3, null, null,    'vooraf', 'Drie Professional-seats, inkoop 125', null),
('BUR-2',     'Bureau midden',           390000, 'jaar',     'licentie', 'B', 'BUR',   10, null, null,    'vooraf', 'Tien Professional-seats, inkoop 110, bureaulogo op de kaart', null),
('BUR-3',     'Bureau groot',            790000, 'jaar',     'licentie', 'B', 'BUR', null, null, null,    'vooraf', 'Onbeperkt seats, inkoop 99, bureaulogo en eigen registerpagina', null),
('PRO-START', 'Professional, startpakket',125000, 'eenmalig','bundel',   'B', 'PRO', null, null, 'PRO-J', 'vooraf', 'Certificering Begeleider plus twaalf maanden licentie', 'Geldig Lezer-certificaat'),
('PRO-START-F','Professional, startpakket founder', 89500, 'eenmalig','bundel','B','PRO', null, null, 'PRO-J', 'vooraf', 'Startpakket voor founding partners na de foundersperiode', 'Founding partner')
on conflict (code) do update set
  naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, interval = excluded.interval,
  soort = excluded.soort, fase = excluded.fase, groep = excluded.groep,
  seats_max = excluded.seats_max, pak_tegoed = null, verlengt_als = excluded.verlengt_als,
  betaalwijze = excluded.betaalwijze, bevat = excluded.bevat, voorwaarde = excluded.voorwaarde,
  actief = true, updated_at = now()
where not exists (select 1 from public.bestellingen b where b.product_code = producten.code);


-- ---------------------------------------------------------------------------
-- BLOK G · certificering
--
-- LEZ-2 is op 10 september verwijderd en komt in v4 terug. Zie het rapport: dit
-- draait het besluit van die dag terug en brengt het prijsgat met ORG-1 mee.
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, verlengt_als, betaalwijze, bevat, voorwaarde) values
('LEZ-1',  'Lezer, instap',               14900, 'eenmalig', 'certificering', 'A',     'LEZ', null,    'vooraf', 'Module, toets, certificaat, badge, register', null),
('LEZ-2',  'Lezer, met Organisatie klein',39500, 'eenmalig', 'bundel',        'A',     'LEZ', 'ORG-1', 'vooraf', 'Lezer instap plus twaalf maanden Organisatie klein', null),
('LEZ-10', 'Lezer, tien plekken',        199000, 'eenmalig', 'bundel',        'later', 'LEZ', 'ORG-2', 'vooraf', 'Tien maal Lezer instap plus twaalf maanden Organisatie midden', null),
('BEG-1',  'Begeleider, certificering',   89500, 'eenmalig', 'certificering', 'B',     'BEG', null,    'vooraf', 'Opleidingsdag, drie intervisies, certificaat, badge, register', 'Geldig Lezer-certificaat')
on conflict (code) do update set
  naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, soort = excluded.soort,
  fase = excluded.fase, groep = excluded.groep, verlengt_als = excluded.verlengt_als,
  betaalwijze = excluded.betaalwijze, bevat = excluded.bevat,
  actief = true, updated_at = now();


-- ---------------------------------------------------------------------------
-- BLOK H · afnames
--
-- Elke keer dat een licentiehouder een pakket of hermeting gebruikt. Dit is het
-- enige dat op de maandfactuur komt; een afname is geen betaling.
--
-- De prijs wordt bij de afname bevroren. Wijzigt een tarief volgende maand, dan
-- verandert een afname van vorige week niet mee.
create table if not exists public.afnames (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  gebruiker_id   uuid not null references auth.users(id) on delete restrict,
  -- Aan wie de rekening gaat. Bij een seat is dat de organisatie of het bureau,
  -- niet de gebruiker zelf.
  organisatie_id uuid references public.organisaties(id) on delete set null,
  bureau_id      uuid references public.bureaus(id) on delete set null,
  team_id        uuid references public.teamkracht_teams(id) on delete set null,
  product_code   text not null references public.producten(code),
  prijs_ex_btw   int  not null check (prijs_ex_btw >= 0),
  btw_promille   int  not null default 210,
  gefactureerd   boolean not null default false,
  factuur_id     uuid,
  -- Een afname die wordt teruggedraaid voordat hij is gefactureerd. Daarna gaat
  -- het via een creditnota.
  geannuleerd_op timestamptz,
  reden          text
);

create index if not exists afnames_open_idx
  on public.afnames (gefactureerd, created_at) where geannuleerd_op is null;
create index if not exists afnames_wie_idx
  on public.afnames (gebruiker_id, created_at desc);

alter table public.afnames enable row level security;
drop policy if exists "eigen afnames lezen" on public.afnames;
create policy "eigen afnames lezen" on public.afnames
  for select to authenticated using (
    gebruiker_id = auth.uid()
    or exists (select 1 from public.organisaties o
                where o.id = afnames.organisatie_id and o.beheerder_user_id = auth.uid())
    or exists (select 1 from public.bureaus b
                where b.id = afnames.bureau_id and b.beheerder_user_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- BLOK I · facturen
--
-- Mollie factureert niet. Nummer, btw en regels maken wij, en de Belastingdienst
-- wil een doorlopende reeks zonder gaten. Vandaar een sequence en geen telling
-- op de tabel: twee facturen tegelijk zouden anders hetzelfde nummer krijgen.
create sequence if not exists public.factuurnummer_seq start 1;

create table if not exists public.facturen (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  -- Vorm: 2026-0001. Het jaar zit in de tekst, de reeks loopt door over
  -- jaargrenzen heen; dat mag en het voorkomt gaten bij de jaarwissel.
  nummer          text not null unique,
  soort           text not null default 'factuur' check (soort in ('factuur','creditnota')),
  -- Bij een creditnota: welke factuur wordt gecrediteerd.
  crediteert_id   uuid references public.facturen(id) on delete restrict,
  gebruiker_id    uuid references auth.users(id) on delete restrict,
  organisatie_id  uuid references public.organisaties(id) on delete set null,
  bureau_id       uuid references public.bureaus(id) on delete set null,
  periode_van     date not null,
  periode_tot     date not null,
  -- Alles in hele centen. Het totaal is wat er wordt geincasseerd.
  bedrag_ex_btw   int not null,
  btw_cent        int not null,
  bedrag_totaal   int not null,
  btw_verlegd     boolean not null default false,
  btw_nummer      text,
  status          text not null default 'open'
                  check (status in ('open','betaald','mislukt','herpoging','oninbaar','gecrediteerd')),
  mollie_payment_id text,
  betaald_op      timestamptz,
  herpoging_op    date,
  pdf_pad         text,
  regels          jsonb not null default '[]'::jsonb
);

create index if not exists facturen_open_idx on public.facturen (status, created_at desc);
create unique index if not exists facturen_mollie_idx
  on public.facturen (mollie_payment_id) where mollie_payment_id is not null;

alter table public.facturen enable row level security;
drop policy if exists "eigen facturen lezen" on public.facturen;
create policy "eigen facturen lezen" on public.facturen
  for select to authenticated using (
    gebruiker_id = auth.uid()
    or exists (select 1 from public.organisaties o
                where o.id = facturen.organisatie_id and o.beheerder_user_id = auth.uid())
    or exists (select 1 from public.bureaus b
                where b.id = facturen.bureau_id and b.beheerder_user_id = auth.uid())
  );

alter table public.afnames drop constraint if exists afnames_factuur_fk;
alter table public.afnames add constraint afnames_factuur_fk
  foreign key (factuur_id) references public.facturen(id) on delete set null;

/* Eén nummer, atomair. Nooit zelf tellen op de tabel. */
create or replace function public.volgend_factuurnummer()
returns text
language sql
security definer
set search_path = public
as $$
  select to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.factuurnummer_seq')::text, 4, '0');
$$;

revoke all on function public.volgend_factuurnummer() from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- BLOK J · betalingen
--
-- Het logboek van alles wat er bij Mollie gebeurt. Bestaat naast bestellingen
-- (wat iemand vooraf koopt) en vervangt mollie_meldingen: die tabel bewaarde
-- alleen de melding, deze bewaart ook de uitkomst en waar de betaling bij hoort.
create table if not exists public.betalingen (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  mollie_payment_id text not null,
  gebruiker_id      uuid references auth.users(id) on delete set null,
  -- Precies een van deze drie is gevuld.
  bestelling_id     uuid references public.bestellingen(id) on delete set null,
  factuur_id        uuid references public.facturen(id) on delete set null,
  abonnement_van    text,
  soort             text not null check (soort in ('eerste','eenmalig','recurring','abonnement')),
  bedrag_cent       int not null,
  status            text not null default 'open'
                    check (status in ('open','betaald','mislukt','verlopen','geannuleerd','terugbetaald')),
  mollie_mandate_id text,
  fout              text,
  verwerkt_op       timestamptz,
  ruw               jsonb
);

create unique index if not exists betalingen_mollie_idx on public.betalingen (mollie_payment_id);
create index if not exists betalingen_wie_idx on public.betalingen (gebruiker_id, created_at desc);

alter table public.betalingen enable row level security;
drop policy if exists "eigen betalingen lezen" on public.betalingen;
create policy "eigen betalingen lezen" on public.betalingen
  for select to authenticated using (gebruiker_id = auth.uid());


-- ---------------------------------------------------------------------------
-- BLOK J2 · het landelijk beeld achter een vlag
--
-- AANNAME, niet uit de briefing bevestigd: wie zonder licentie koopt krijgt geen
-- landelijk beeld op de kaart. Dat is een verarming voor de eindklant die de
-- hoogste prijs betaalt, dus het staat achter een vlag die je zonder deploy kunt
-- omzetten. Zie het rapport.
alter table public.teamkracht_config
  add column if not exists landelijk_beeld_zonder_licentie boolean not null default false;


-- ---------------------------------------------------------------------------
-- BLOK K · het prijsniveau van een gebruiker
--
-- Volgorde uit sectie 1: founder gaat voor lijn en staffel, en wie geen van
-- beide heeft valt op los. Nieuw ten opzichte van v3: de partner zonder
-- licentie zit tussen professional en los in.
create or replace view public.gebruiker_prijsniveau as
select
  g.user_id,
  case
    when g.founder and (g.founder_tot is null or g.founder_tot >= current_date) then 'founder'
    when b.id is not null and b.actief and b.abonnement_tot >= current_date
      then case b.staffel when 'klein' then 'bur1' when 'midden' then 'bur2' else 'bur3' end
    when g.licentie_actief and g.niveau in ('begeleider','opleider')
         and (g.licentie_tot is null or g.licentie_tot >= current_date) then 'pro'
    when o.id is not null and o.actief and o.abonnement_tot >= current_date
      then case o.staffel when 'klein' then 'org1' when 'midden' then 'org2' else 'org3' end
    when g.niveau in ('lezer','begeleider','opleider') then 'pzl'
    else 'los'
  end as prijsniveau,
  b.id as bureau_id,
  o.id as organisatie_id,
  g.afname_geblokkeerd
from public.teamkracht_gebruikers g
left join public.bureau_leden      bl on bl.user_id = g.user_id
left join public.bureaus            b on b.id  = bl.bureau_id
left join public.organisatie_leden ol on ol.user_id = g.user_id
left join public.organisaties       o on o.id  = ol.organisatie_id;

revoke all on public.gebruiker_prijsniveau from public;
grant select on public.gebruiker_prijsniveau to authenticated;

-- De openbare prijslijst krijgt de betaalwijze erbij.
create or replace view public.prijslijst as
select code, naam, prijs_ex_btw, btw_promille, interval, soort, bevat, voorwaarde,
       groep, prijsniveau, seats_max, pak_tegoed, verlengt_als, betaalwijze
from public.producten
where actief = true and fase in ('bestaand','A');

revoke all on public.prijslijst from public;
grant select on public.prijslijst to anon, authenticated;


-- ===========================================================================
-- BLOK Z · de omschakeling
-- Draaien zodra de nieuwe code live staat, niet eerder.
-- ===========================================================================

-- Alles wat v4 vervangt. Niet verwijderen: er hangen bestellingen aan.
update public.producten set actief = false, updated_at = now()
 where code in (
   -- de tegoedrijen uit v3, partners kopen niets meer vooraf
   'PAK-BUR', 'PAK-BUR-EXTRA', 'HM-BUR',
   -- v1 en v2, voor het geval een omgeving ze nog actief heeft
   'TF', 'HM', 'LIC-M', 'LIC-J', 'BEG-2', 'BEG-8',
   'LIC-ORG-10', 'LIC-ORG-30', 'LIC-ORG-X'
 );

-- Wie een certificaat heeft maar geen licentie, is vanaf nu partner zonder
-- licentie en betaalt 249 in plaats van 495.
update public.teamkracht_gebruikers
   set lijn = 'partner_zonder_licentie'
 where lijn = 'los'
   and niveau in ('lezer','begeleider','opleider')
   and licentie_actief = false;


-- ===========================================================================
-- Wat hier is aangenomen
--
-- 1. mollie_customer_id en mollie_mandate_id, niet stripe_customer_id. Sectie 4
--    en 6 van v4 noemen stripe_customer_id in het datamodel; dat is een restant.
--    Zie vraag 2 in het rapport.
-- 2. betalingen komt naast bestellingen te staan en vervangt mollie_meldingen.
--    bestellingen blijft wat iemand vooraf koopt; betalingen is het logboek van
--    Mollie. mollie_meldingen wordt niet verwijderd zolang er rijen in staan.
-- 3. De factuurreeks loopt door over jaargrenzen heen, met het jaar in de tekst.
--    Een reeks die per jaar opnieuw begint kan gaten krijgen bij de eerste
--    factuur van januari als er een creditnota tussendoor komt.
-- 4. HM is voor alle drie de bureaustaffels 75 euro, dus drie rijen met
--    hetzelfde bedrag. Dat is bewust: zo hoeft de prijsbepaling geen uitzondering
--    te kennen en kan een staffel later een eigen bedrag krijgen.
-- 5. Het minimum aantal deelnemers staat niet in dit bestand. Dat is een
--    meetregel in teamkracht_config.min_deelnemers_kaart, waar vijf staat.
--    v4 en het partnerpakket noemen acht; zie het rapport.
-- ===========================================================================
