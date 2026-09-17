-- ===========================================================================
-- MIGRATIE · Doel-intake en Ruimteblok, fase A (17 september 2026)
--
-- Hoort bij briefing/teamkracht/briefing_code_doel_ruimte_v1.md, paragraaf 4.
--
-- Draait NA migratie-teamkracht-2026-09-07.sql (en de 08-09-aanvulling met
-- de kolom teksten), de tarievenmigraties van 9 en 14 september en
-- migratie-leidersbeeld-2026-09-15.sql plus -b.
--
-- Alleen toevoegen. Er wordt niets verwijderd of hernoemd. Alle nieuwe
-- kolommen zijn nullable, zodat bestaande metingen zonder doel blijven
-- werken: die vallen terug op de ketenregel (L1). Herhaalbaar: overal
-- if not exists, elke policy wordt eerst gedropt.
--
-- Geen enkele score verandert door deze migratie. teamkracht_ruimte is een
-- lezing van bestaande scores, geen nieuwe score.
--
-- Drie plekken wijken bewust af van, of vullen aan op, de briefing. Ze staan
-- gemarkeerd met AFWIJKING of AANVULLING en wachten op akkoord van Maarten.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOK A · het doel (paragraaf 4.1)
--
-- Dezelfde vijf kolommen op drie tabellen: het team, de individuele meting en
-- het Leidersbeeld. Zelfde namen, zelfde checks, zodat de code er op één
-- manier mee omgaat.

alter table public.teamkracht_teams
  add column if not exists doel_tekst         text check (char_length(doel_tekst) <= 200),
  add column if not exists doeltype           text check (doeltype in ('zien','sturen','doen','onbekend')),
  add column if not exists doeltype_bron      text check (doeltype_bron in ('klant','keten')),
  add column if not exists doel_ingevuld_op   timestamptz,
  add column if not exists doel_ingevuld_door text check (doel_ingevuld_door in ('teamleider','begeleider','deelnemer','leider'));

alter table public.index_scan_results
  add column if not exists doel_tekst         text check (char_length(doel_tekst) <= 200),
  add column if not exists doeltype           text check (doeltype in ('zien','sturen','doen','onbekend')),
  add column if not exists doeltype_bron      text check (doeltype_bron in ('klant','keten')),
  add column if not exists doel_ingevuld_op   timestamptz,
  add column if not exists doel_ingevuld_door text check (doel_ingevuld_door in ('teamleider','begeleider','deelnemer','leider'));

alter table public.teamkracht_leidersbeeld
  add column if not exists doel_tekst         text check (char_length(doel_tekst) <= 200),
  add column if not exists doeltype           text check (doeltype in ('zien','sturen','doen','onbekend')),
  add column if not exists doeltype_bron      text check (doeltype_bron in ('klant','keten')),
  add column if not exists doel_ingevuld_op   timestamptz,
  add column if not exists doel_ingevuld_door text check (doel_ingevuld_door in ('teamleider','begeleider','deelnemer','leider'));


-- ---------------------------------------------------------------------------
-- BLOK B · de ruimte (paragraaf 4.2)
--
-- Eén rij per berekening. Bij een gewijzigd doel komt er een nieuwe rij met
-- dezelfde meting_id en een nieuwe berekend_op; de uitslag toont de nieuwste
-- en de oude rijen blijven staan (paragraaf 10). De uitslagpagina leest deze
-- rij en rekent niet opnieuw.
--
-- meting_id wijst naar teamkracht_teambeeld.id (niveau team) of naar
-- index_scan_results.id (niveau individu). Eén kolom voor twee tabellen, zoals
-- de briefing hem beschrijft; daarom geen foreign key. Zie de vraag in de
-- oplevering: het patroon van opvolging (twee echte verwijzingen met een
-- check) is het alternatief.
create table if not exists public.teamkracht_ruimte (
  id                   uuid primary key default gen_random_uuid(),
  meting_id            uuid not null,
  niveau               text not null check (niveau in ('individu','team')),
  leidende_dimensie    text not null check (leidende_dimensie in ('zien','sturen','doen')),
  eerste_stap_dimensie text not null check (eerste_stap_dimensie in ('zien','sturen','doen')),
  ketencheck_actief    boolean not null default false,
  referentie_type      text not null check (referentie_type in ('eigen_sterkste','landelijk_bovenste_helft')),
  referentie_waarde    numeric not null,
  huidige_waarde       numeric not null,
  ruimte_punten        numeric not null check (ruimte_punten >= 0),
  status               text not null check (status in ('ruimte','op_orde')),
  op_orde_dimensies    text[] not null default '{}',
  draagprofielen       text[] not null default '{}',
  bewegingsprofielen   text[] not null default '{}',
  berekend_op          timestamptz not null default now(),
  regelversie          text not null default 'L-v1',
  -- AANVULLING 1 · de drempels waarmee deze rij is berekend (KETEN_DREMPEL,
  -- OP_ORDE_DREMPEL, de landelijke grens, wel of geen landelijk beeld).
  -- Zelfde gedachte als config_snapshot op teamkracht_teambeeld: Maarten ijkt
  -- de drempels op de eerste tien founderteams, en een uitslag die al bij een
  -- team op tafel ligt hoort daar niet van te verschuiven.
  config_snapshot      jsonb
);

-- De nieuwste rij per meting en niveau is wat de uitslag toont.
create index if not exists teamkracht_ruimte_meting_idx
  on public.teamkracht_ruimte (meting_id, niveau, berekend_op desc);


-- ---------------------------------------------------------------------------
-- BLOK C · route en resultaat (paragraaf 4.3), alleen het schema
--
-- Fase B vult dit. Er komt in fase A geen route en geen scherm dat hierin
-- schrijft (acceptatiecriterium 11).
--
-- AFWIJKING 1 · sinds 07-09-2026 bestaat teamkracht_plan al: het
-- interventieplan bij een doelbeeld (teamkracht_doel), met interventie_code,
-- eigen_tekst, eigenaar, ritme en telling. Deze tabel overlapt daarmee. De
-- briefing vraagt om teamkracht_maatregelen met een eigenaar met mailadres, een
-- streefdatum en een status; die velden heeft teamkracht_plan niet. Hier staat
-- de tabel zoals de briefing hem vraagt. Of de Sprint in fase B hierop bouwt
-- of teamkracht_plan uitbreidt, is een besluit voor Maarten; zolang beide
-- leeg zijn kost het niets om te kiezen.
create table if not exists public.teamkracht_maatregelen (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teamkracht_teams(id) on delete cascade,
  meting_id       uuid references public.teamkracht_teambeeld(id) on delete set null,
  -- De regel R1 tot en met R13 waaruit de interventie komt.
  interventie_ref text references public.teamkracht_regels(code),
  omschrijving    text,
  eigenaar_naam   text,
  eigenaar_email  text,
  streefdatum     date,
  status          text not null default 'gepland'
                  check (status in ('gepland','gestart','afgerond','vervallen')),
  aangemaakt_op   timestamptz not null default now()
);

create index if not exists teamkracht_maatregelen_team_idx
  on public.teamkracht_maatregelen (team_id, aangemaakt_op);

-- De hermeting. Bij een team is dat teamkracht_teambeeld met soort
-- 'hermeting'; bij een persoon is dat index_scan_results met is_hermeting.
-- AANVULLING 2 · de briefing zegt "op de hermeting" zonder tabel te noemen;
-- beide niveaus krijgen de velden, zodat laag 5 straks voor allebei werkt.
alter table public.teamkracht_teambeeld
  add column if not exists doelbereik          int check (doelbereik between 0 and 100),
  add column if not exists anders_gedaan_tekst text;

alter table public.index_scan_results
  add column if not exists doelbereik          int check (doelbereik between 0 and 100),
  add column if not exists anders_gedaan_tekst text;


-- ---------------------------------------------------------------------------
-- BLOK D · rechten
--
-- Schrijven gebeurt uitsluitend serverside met de service role. De anon-rol
-- krijgt niets. Lezen via de browser alleen voor wie het team mag zien; de
-- individuele rijen (niveau individu) zijn nooit via een ingelogde sessie
-- leesbaar, want die horen bij één deelnemer en die leest ze via zijn eigen
-- resultaat_token op de server (harde regel 6).
alter table public.teamkracht_ruimte       enable row level security;
alter table public.teamkracht_maatregelen  enable row level security;

drop policy if exists "eigen ruimte lezen" on public.teamkracht_ruimte;
create policy "eigen ruimte lezen" on public.teamkracht_ruimte
  for select to authenticated
  using (
    niveau = 'team'
    and exists (
      select 1 from public.teamkracht_teambeeld b
      join public.teamkracht_teams t on t.id = b.team_id
      where b.id = meting_id
        and (t.coach_user_id = auth.uid() or public.teamkracht_is_beheerder())
    )
  );

drop policy if exists "eigen maatregelen lezen" on public.teamkracht_maatregelen;
create policy "eigen maatregelen lezen" on public.teamkracht_maatregelen
  for select to authenticated
  using (exists (
    select 1 from public.teamkracht_teams t
    where t.id = team_id and (t.coach_user_id = auth.uid() or public.teamkracht_is_beheerder())
  ));

-- Geen insert-, update- of deletepolicy: de service role schrijft, en in
-- fase A schrijft er nog niets in teamkracht_maatregelen.
