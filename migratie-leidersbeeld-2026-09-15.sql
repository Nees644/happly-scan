-- ===========================================================================
-- MIGRATIE · Leidersbeeld (15 september 2026)
--
-- Hoort bij briefing_code_leidersbeeld_v2_2.md, stap 1 van de oplevervolgorde.
--
-- Draait NA migratie-teamkracht-2026-09-07.sql, migratie-certificering en de
-- beide tarievenmigraties van 9 en 14 september.
--
-- Herhaalbaar: create if not exists, elke policy wordt eerst gedropt. Niets
-- wordt verwijderd en niets bestaands verandert, dus dit blok kan draaien
-- terwijl de site doorloopt. Er is nog geen route die deze tabellen gebruikt;
-- die komt in stap 2.
--
-- Vier plekken wijken bewust af van de briefing. Ze staan hieronder met de
-- reden erbij en zijn gemarkeerd met AFWIJKING. Alle vier zijn op 15 september
-- 2026 bevestigd door Maarten.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOK A · het Leidersbeeld zelf
--
-- Een rij is twee dingen tegelijk: de meting van de leider over zijn team, en
-- een lead. Daarom staan naam, mailadres en herkomst verplicht in dezelfde rij
-- en niet in een aparte leadtabel.
create table if not exists public.teamkracht_leidersbeeld (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- De eigen ingang van de leider: /leider/:token. Staat alleen in zijn mail.
  -- Zelfde gedachte als resultaat_token op index_scan_results: een los uuid,
  -- zodat de sleutel naar de pagina nooit de sleutel naar de rij is.
  leider_token      uuid not null unique default gen_random_uuid(),

  -- Leeg zolang er nog geen team is. Wordt gevuld bij aankoop of bij koppeling
  -- door een partner, nooit automatisch.
  team_id           uuid references public.teamkracht_teams(id) on delete set null,
  meetmoment        text not null default 'start' check (meetmoment in ('start','eind')),

  leider_naam       text not null,
  leider_email      text not null,
  organisatie       text not null,

  -- AFWIJKING 1 · de banden lopen in de briefing 2-7, 8-12, 13-20, 21+. Het
  -- minimum voor een Teamfoto is vijf deelnemers en niet acht
  -- (teamkracht_config.min_deelnemers_kaart, bevestigd op 7, 8 en 9 september
  -- en opnieuw op 15 september). Met de banden uit de briefing valt de grens
  -- middenin de eerste band en is van een team van zes niet te zeggen of het
  -- een kaart kan krijgen. De grens ligt hier daarom op vijf.
  teamomvang        text not null check (teamomvang in ('2-4','5-9','10-20','21+')),

  -- De drie dimensies, op dezelfde schaal van nul tot honderd als een meting.
  zien              numeric,
  sturen            numeric,
  doen              numeric,
  -- AFWIJKING 2 · staat niet in de briefing, maar de resultaatmail heeft het
  -- getal in onderwerp en tekst nodig. Zelfde formule als de individuele
  -- meting: round((zien + sturen + doen) / 3), zie scan.html. Een teamindex als
  -- getal bestaat vandaag nergens in de code; dit is dus de eerste plek waar
  -- hij wordt vastgelegd. Opgeslagen en niet elke keer herrekend, zodat de mail
  -- van vorige maand blijft kloppen als de formule ooit verandert.
  index_score       int,
  antwoorden        jsonb,

  -- Welke referentie gold op het moment van invullen, bevroren zoals bij
  -- teamkracht_teambeeld. R13 rekent met de SD hieruit.
  norm_bron         text,

  op_kaart          boolean not null default true,

  -- Waar hij vandaan kwam. src is de vrije parameter uit de URL (professionals,
  -- linkedin, een partnernaam); partner_id is de harde koppeling voor de
  -- verrekening.
  herkomst_src      text,
  -- Een partnertoken bestaat niet in de code. Een partner is een rij in
  -- teamkracht_gebruikers met lijn professional of bureau, dus dit is zijn
  -- auth-id, precies zoals de briefing als terugval noemt.
  partner_id        uuid references auth.users(id) on delete set null,

  status            text not null default 'ingevuld'
                    check (status in ('ingevuld','gekoppeld','betaald','gesloten')),

  mail_verzonden_op timestamptz,
  herinnering_op    timestamptz,
  ingevuld_op       timestamptz,
  gesloten_op       timestamptz,

  opt_in_kwartaal   boolean not null default false,

  -- AFWIJKING 3 · twee velden die de briefing niet noemt en die er moeten zijn.
  -- Het privacyvinkje is verplicht (A1); een verplicht akkoord dat nergens
  -- wordt vastgelegd is geen akkoord. En privacy.html belooft onder elke
  -- opvolgmail een afmeldlink, dus de herinnering van dag zeven heeft er een
  -- nodig. Zelfde veldnaam als in opvolgreeks.
  privacy_akkoord_op timestamptz,
  afgemeld           boolean not null default false
);

-- Een Leidersbeeld per team per meetmoment. Partiele index, want zolang er geen
-- team is mogen er meer rijen naast elkaar bestaan.
create unique index if not exists teamkracht_leidersbeeld_team_moment_idx
  on public.teamkracht_leidersbeeld (team_id, meetmoment)
  where team_id is not null;

-- Zoeken op mailadres: de partner die een team aanmaakt krijgt de koppelvraag.
create index if not exists teamkracht_leidersbeeld_email_idx
  on public.teamkracht_leidersbeeld (lower(leider_email));

-- De leadlijst en de herinneringscron lezen allebei op status en datum.
create index if not exists teamkracht_leidersbeeld_status_idx
  on public.teamkracht_leidersbeeld (status, created_at desc);
create index if not exists teamkracht_leidersbeeld_partner_idx
  on public.teamkracht_leidersbeeld (partner_id, created_at desc);


-- ---------------------------------------------------------------------------
-- BLOK B · opvolging
--
-- Een rij per contactmoment, nooit overschrijven. De laatste rij bepaalt wat er
-- in de lijst staat; de rijen ervoor zijn de geschiedenis.
--
-- De briefing vraagt om een opvolgtabel die alleen bij het Leidersbeeld hoort.
-- Dat is een tabel te veel. Bij de Zelfkracht Index bestaat tabel opvolgreeks,
-- en die wordt met de hand gebruikt om na te bellen terwijl hij daar niet voor
-- gemaakt is: hij houdt alleen bij welke automatische mail op dag 3, 7 en 56 is
-- verstuurd, en heeft geen veld voor een status of een notitie. Er valt dus
-- geen veldnaam over te nemen, en er komt op termijn wel een scherm waarin
-- beide soorten leads worden opgevolgd.
--
-- AFWIJKING 4 · daarom een opvolging die niet aan het Leidersbeeld vastzit.
-- Twee bronnen, elk met een echte verwijzing, en een check die afdwingt dat er
-- precies een van de twee is gevuld. Een los bron_id zonder foreign key zou
-- hetzelfde lijken en de verwijzing niet bewaken.
create table if not exists public.opvolging (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  bron            text not null check (bron in ('leidersbeeld','zelfkracht')),
  leidersbeeld_id uuid references public.teamkracht_leidersbeeld(id) on delete cascade,
  opvolgreeks_id  uuid references public.opvolgreeks(id) on delete cascade,

  opvolgstatus    text not null check (opvolgstatus in
                    ('nieuw','gebeld','gemaild','afspraak','offerte','gewonnen','verloren','parkeren')),
  notitie         text,
  volgende_actie  text,
  volgende_datum  date,
  -- Wie het schreef: Maarten of de partner.
  door            uuid references auth.users(id) on delete set null,

  constraint opvolging_een_bron check (
    (bron = 'leidersbeeld' and leidersbeeld_id is not null and opvolgreeks_id  is null)
    or
    (bron = 'zelfkracht'   and opvolgreeks_id  is not null and leidersbeeld_id is null)
  )
);

create index if not exists opvolging_leidersbeeld_idx
  on public.opvolging (leidersbeeld_id, created_at desc)
  where leidersbeeld_id is not null;
create index if not exists opvolging_opvolgreeks_idx
  on public.opvolging (opvolgreeks_id, created_at desc)
  where opvolgreeks_id is not null;

-- De lijst sorteert op volgende datum, zodat bovenaan staat wie vandaag aan de
-- beurt is.
create index if not exists opvolging_datum_idx
  on public.opvolging (volgende_datum)
  where volgende_datum is not null;


-- ---------------------------------------------------------------------------
-- BLOK C · rechten
--
-- De publieke route schrijft via de serverfunctie met de service role, en die
-- gaat langs RLS heen. De anon-rol krijgt hier niets: geen insert, geen select.
-- /leider/:token leest ook via een serverfunctie, op token.
alter table public.teamkracht_leidersbeeld enable row level security;
alter table public.opvolging enable row level security;

-- Lezen in het beheerscherm: de beheerder ziet alles, een partner alleen zijn
-- eigen leads. Een gecertificeerde zonder leads ziet een lege lijst.
drop policy if exists "leads lezen" on public.teamkracht_leidersbeeld;
create policy "leads lezen" on public.teamkracht_leidersbeeld
  for select to authenticated using (
    public.teamkracht_is_beheerder() or partner_id = auth.uid()
  );

-- Opvolging: lezen en schrijven mag bij de leads die je mag zien. Schrijven
-- gebeurt hier wel rechtstreeks, want dit is het enige wat een mens zelf
-- invult en het staat achter een login.
--
-- De opvolging van de Zelfkracht Index is alleen van de beheerder: die leads
-- komen van de publieke scan en horen bij niemand anders.
drop policy if exists "opvolging lezen" on public.opvolging;
create policy "opvolging lezen" on public.opvolging
  for select to authenticated using (
    public.teamkracht_is_beheerder()
    or exists (select 1 from public.teamkracht_leidersbeeld l
                where l.id = opvolging.leidersbeeld_id and l.partner_id = auth.uid())
  );

drop policy if exists "opvolging schrijven" on public.opvolging;
create policy "opvolging schrijven" on public.opvolging
  for insert to authenticated with check (
    door = auth.uid()
    and (
      public.teamkracht_is_beheerder()
      or exists (select 1 from public.teamkracht_leidersbeeld l
                  where l.id = opvolging.leidersbeeld_id and l.partner_id = auth.uid())
    )
  );

-- Geen update- en geen deletepolicy. Een contactmoment wordt niet herschreven
-- en niet gewist; corrigeren doe je met een nieuwe rij.

-- De beheerder mag de leadlijst van de Zelfkracht Index lezen om hem op te
-- kunnen volgen. opvolgreeks had alleen een leesrecht voor iedere ingelogde
-- gebruiker; dat wordt hier teruggebracht tot de beheerder, want sinds de
-- partnerlijn bestaat zijn er ingelogde gebruikers die deze lijst niet hoeven
-- te zien.
drop policy if exists "authenticated read" on public.opvolgreeks;
drop policy if exists "beheerder leest opvolgreeks" on public.opvolgreeks;
create policy "beheerder leest opvolgreeks" on public.opvolgreeks
  for select to authenticated using (public.teamkracht_is_beheerder());
