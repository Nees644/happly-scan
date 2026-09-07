-- Zelfkracht Index · Supabase-schema
-- Draai dit één keer in de Supabase SQL-editor van project uqulkznqcqpbagbvtqdr.
-- Nieuwe tabel, los van de bestaande scan_results (B2B-spoor), zodat die ongemoeid blijft.

create table if not exists public.index_scan_results (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  index_score   int  not null,
  zien          int  not null,
  sturen        int  not null,
  doen          int  not null,
  items         jsonb,               -- gespiegelde itemscores {Z1..D4}
  age_band      text,                -- optionele contextvraag
  work_situation text,               -- optionele contextvraag
  email         text,                -- pas gevuld bij leadcapture
  name          text,
  company       text,
  duiding       text,                -- de volledige gegenereerde duiding (AI of terugval)
  duiding_generated_at timestamptz,  -- moment van generatie
  duiding_fallback boolean           -- true = terugvaltekst gebruikt in plaats van de AI
);

-- RLS aan. Alle schrijf- en leesacties lopen via de serverside API-routes met de
-- service role key (die RLS omzeilt), dus we geven de anon-rol hier niets.
-- Consistent met het bestaande beleid: anon SELECT ingetrokken op gevoelige tabellen.
alter table public.index_scan_results enable row level security;

-- Bewust geen anon-policies: geen anon INSERT, geen anon SELECT.
-- (De browser praat nooit rechtstreeks met deze tabel; alles gaat via /api/*.)

-- Handige index voor de latere itemanalyse.
create index if not exists index_scan_results_created_at_idx
  on public.index_scan_results (created_at);

-- Leesrecht voor ingelogde dashboardgebruikers (dashboard-index.html).
-- De anon-rol blijft volledig buitengesloten; alleen wie via Supabase Auth is
-- ingelogd (hetzelfde account als het B2B-dashboard) mag lezen.
drop policy if exists "authenticated read" on public.index_scan_results;
create policy "authenticated read" on public.index_scan_results
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- MIGRATIE 24-07-2026 · duiding opslaan bij de meting
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
-- (Nieuwe installaties krijgen de kolommen al via de create table hierboven.)
alter table public.index_scan_results
  add column if not exists duiding text,
  add column if not exists duiding_generated_at timestamptz,
  add column if not exists duiding_fallback boolean;

-- ---------------------------------------------------------------------------
-- MIGRATIE 27-07-2026 · funnel_events (conversiemeting in de keten)
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
-- Anonieme gebruiksstatistieken: event, bron en een random sessie-id per bezoek.
-- Bewust GEEN koppeling aan index_scan_results of persoonsgegevens.

create table if not exists public.funnel_events (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event      text not null,
  bron       text,        -- src-parameter (uitslag, mail, post); null voor scan-events
  sessie     text not null -- random per paginabezoek, leeft alleen in paginageheugen
);

-- RLS: de browser mag met de anon key uitsluitend schrijven, nooit lezen.
alter table public.funnel_events enable row level security;

drop policy if exists "anon insert" on public.funnel_events;
create policy "anon insert" on public.funnel_events
  for insert to anon with check (true);

-- Leesrecht alleen voor ingelogde dashboardgebruikers (zelfde patroon als
-- index_scan_results), zodat de funnel straks in het dashboard kan.
drop policy if exists "authenticated read" on public.funnel_events;
create policy "authenticated read" on public.funnel_events
  for select to authenticated using (true);

create index if not exists funnel_events_created_at_idx
  on public.funnel_events (created_at);
create index if not exists funnel_events_event_idx
  on public.funnel_events (event);

-- ---------------------------------------------------------------------------
-- MIGRATIE 05-08-2026 · herkomstmeting (src) + opvolgreeks
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.

-- 1. Herkomst: de src-parameter uit de URL gaat sessiebreed mee met alle
--    funnel-events (naast de eventgebonden kolom bron, die blijft wat hij was).
alter table public.funnel_events add column if not exists src text;

-- 2. Opvolgreeks: één rij per meting met mailadres. De cron (/api/opvolg)
--    leest hieruit welke mail (dag 3, 7, 56) aan de beurt is.
--    laagste_dimensie bepaalt de scène in de dag-3-mail en de weekkoppeling
--    in de dag-7-mail. afgemeld = true stopt de reeks (afmeldlink of nieuwe
--    meting met hetzelfde mailadres).
create table if not exists public.opvolgreeks (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  scan_id          uuid references public.index_scan_results(id),
  email            text not null,
  name             text,
  index_score      int,
  laagste_dimensie text not null,   -- Zien | Sturen | Doen
  afgemeld         boolean not null default false,
  mail3_sent_at    timestamptz,
  mail7_sent_at    timestamptz,
  mail56_sent_at   timestamptz
);

-- RLS: de browser komt hier nooit; alles loopt serverside via de service role.
alter table public.opvolgreeks enable row level security;

-- Leesrecht alleen voor ingelogde dashboardgebruikers (zelfde patroon als
-- index_scan_results); de anon-rol blijft volledig buitengesloten.
drop policy if exists "authenticated read" on public.opvolgreeks;
create policy "authenticated read" on public.opvolgreeks
  for select to authenticated using (true);

create index if not exists opvolgreeks_due_idx
  on public.opvolgreeks (afgemeld, created_at);
create index if not exists opvolgreeks_email_idx
  on public.opvolgreeks (email);

-- ---------------------------------------------------------------------------
-- MIGRATIE 05-08-2026b · deelbare herkenningszin
-- Voor het bestaande project: draai alleen deze regel in de SQL-editor.
-- De meest markante zin uit de duiding (AI-selectie via /api/deelzin), één keer
-- gegenereerd en met de meting opgeslagen voor het deelbeeld op de uitslagpagina.
alter table public.index_scan_results add column if not exists deel_zin text;

-- ---------------------------------------------------------------------------
-- MIGRATIE 05-08-2026c · LinkedIn-deelpagina (/deel/[id])
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
--
-- deel_id is het PUBLIEKE id van de deelpagina, bewust een ander uuid dan het
-- interne scan-id: het scan-id geeft via /api/lead toegang tot de uitslagmail
-- en mag daarom nooit in een openbare link staan. deel_id ontsluit alleen de
-- deel_zin en het deelbeeld, nooit scores of persoonsgegevens.
alter table public.index_scan_results
  add column if not exists deel_id uuid not null default gen_random_uuid();
create unique index if not exists index_scan_results_deel_id_idx
  on public.index_scan_results (deel_id);

-- Publieke storage-bucket voor de gegenereerde deelbeelden (og:image).
-- Upload loopt serverside via /api/deelbeeld (service role, eenmalig per
-- meting); lezen kan iedereen, er staat alleen het deelbeeld in.
insert into storage.buckets (id, name, public)
  values ('deelbeelden', 'deelbeelden', true)
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- MIGRATIE 12-08-2026 · hermetingen herkennen en labelen
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
--
-- Principe (briefing 12-08-2026): iedereen mag opnieuw meten, maar per
-- e-mailadres telt alleen de eerste afgeronde meting mee in de onderzoeksdata.
-- Latere metingen krijgen is_hermeting = true en verwijzen naar de eerste.
-- Er wordt niets geblokkeerd of verwijderd; geen unique constraint op email.
alter table public.index_scan_results
  add column if not exists is_hermeting boolean not null default false,
  add column if not exists eerste_meting_id uuid references public.index_scan_results(id);

-- Eenmalige opschoning van bestaande data: groepeer op genormaliseerd adres
-- (trim + lower, dezelfde normalisatie als api/hermeting.js en api/lead.js)
-- en label alle latere metingen als hermeting met verwijzing naar de oudste.
with eerste as (
  select distinct on (lower(trim(email))) id, lower(trim(email)) as adres
  from public.index_scan_results
  where email is not null and trim(email) <> ''
  order by lower(trim(email)), created_at asc
)
update public.index_scan_results r
set is_hermeting = true, eerste_meting_id = e.id
from eerste e
where r.email is not null
  and lower(trim(r.email)) = e.adres
  and r.id <> e.id;

-- ===========================================================================
-- MIGRATIE 07-09-2026 · Teamkracht fase 1, 2 en 3 (datastructuur in één keer)
-- Voor het bestaande project: draai de blokken A, B en C hieronder in de
-- SQL-editor van uqulkznqcqpbagbvtqdr, in deze volgorde, gevolgd door blok D
-- (de seed). Blok E is een keuze en staat bewust uitgecommentarieerd; lees de
-- toelichting voordat je hem draait.
--
-- Bron: briefing_code_teamkracht/briefing_code_teamkracht.md (5 september 2026)
-- plus briefing_code_teamkracht/teamkracht_model_v4_keten.md (7 september 2026).
--
-- Naamgeving: Zelfkracht is het individu, Teamkracht is de optelsom van het
-- team.
--
-- Twee afwijkingen van de briefing, beide na akkoord van 07-09-2026:
--   1. Teams krijgen een eigen tabel teamkracht_teams met een token op
--      scan.html, los van het B2B-spoor (companies, campaigns, scan_results).
--      Dat B2B-spoor meet score_zr, score_zrr en score_zs, niet zien, sturen
--      en doen, en is dus geen bruikbare drager voor de Teamkrachtkaart.
--      Waar de briefing campagne_id schrijft, staat hier team_id.
--   2. teamkracht_regels krijgt één kolom extra, titel_geteld, voor de kop met
--      aantallen (paragraaf 5 van de briefing vraagt om twee koppen bij R1,
--      R2, R8 en R10; één tekstveld kan die twee niet dragen).
--
-- Alle tabellen: RLS aan, geen anon-policies, schrijven uitsluitend serverside
-- via de service role key. Consistent met het beleid hierboven.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOK A · rollen en serverside authenticatie
--
-- De dashboards loggen in met Supabase Auth (dashboard.html en
-- dashboard-index.html, signInWithPassword). De API-routes deden tot nu toe
-- geen enkele controle; ze draaien op de service role en zijn alleen door
-- onraadbare id's beschermd. De Teamkracht-routes doen dat wel: de browser
-- stuurt het access token van de sessie mee als Authorization: Bearer <token>,
-- de route valideert dat met auth.getUser en kijkt daarna in deze tabel welke
-- rol erbij hoort. Zonder rij in deze tabel is er geen toegang.

create table if not exists public.teamkracht_gebruikers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  rol        text not null check (rol in ('coach','beheerder')),
  created_at timestamptz not null default now()
);

alter table public.teamkracht_gebruikers enable row level security;

-- Iedereen mag uitsluitend zijn eigen rol zien; niemand ziet de ledenlijst.
drop policy if exists "eigen rol lezen" on public.teamkracht_gebruikers;
create policy "eigen rol lezen" on public.teamkracht_gebruikers
  for select to authenticated using (user_id = auth.uid());

-- Hulpfunctie voor de policies hieronder. Security definer, zodat de policy
-- op teamkracht_gebruikers zelf niet in de weg zit.
create or replace function public.teamkracht_is_beheerder()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.teamkracht_gebruikers
    where user_id = auth.uid() and rol = 'beheerder'
  );
$fn$;

revoke all on function public.teamkracht_is_beheerder() from public, anon;
grant execute on function public.teamkracht_is_beheerder() to authenticated;

-- Zet jezelf als beheerder. Vervang het adres als dat afwijkt; draai dit
-- voordat je blok D overweegt, anders sluit je jezelf buiten.
insert into public.teamkracht_gebruikers (user_id, email, rol)
select id, email, 'beheerder' from auth.users where email = 'mpjneeskens@gmail.com'
on conflict (user_id) do update set rol = 'beheerder';


-- ---------------------------------------------------------------------------
-- BLOK B · teams, koppeling aan de meting, en de eigen resultaatlink

-- Een team is een meetmoment van de Zelfkracht Index bij één groep. De coach
-- maakt het team aan en deelt scan.html?team=TOKEN. Het token is zes tekens
-- uit hetzelfde alfabet als campaigns.token (geen I, O, 0 of 1).
create table if not exists public.teamkracht_teams (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  naam          text not null,
  organisatie   text,
  coach_naam    text,
  coach_user_id uuid references auth.users(id) on delete set null,
  token         text not null check (token ~ '^[A-HJ-NP-Z2-9]{6}$'),
  actief        boolean not null default true,
  archived_at   timestamptz
);

create unique index if not exists teamkracht_teams_token_idx
  on public.teamkracht_teams (token);

alter table public.teamkracht_teams enable row level security;

-- Een coach ziet zijn eigen teams, de beheerder ziet alles. Anon ziet niets;
-- de deelnemer heeft het team niet nodig, die heeft alleen het token.
drop policy if exists "eigen teams lezen" on public.teamkracht_teams;
create policy "eigen teams lezen" on public.teamkracht_teams
  for select to authenticated
  using (coach_user_id = auth.uid() or public.teamkracht_is_beheerder());

-- Koppeling van de meting aan het team, het berekende profiel, en het token
-- van de eigen resultaatlink (/uitslag/:token).
--
-- resultaat_token is bewust een derde uuid, naast id en deel_id:
--   id           geeft via /api/lead toegang tot de uitslagmail, blijft intern;
--   deel_id      is publiek en ontsluit alleen deel_zin, nooit scores;
--   resultaat_token ontsluit de volledige eigen uitslag inclusief profiel, en
--                staat uitsluitend in de mail aan de deelnemer zelf.
alter table public.index_scan_results
  add column if not exists teamkracht_team_id uuid references public.teamkracht_teams(id) on delete set null,
  add column if not exists profiel_code text,
  add column if not exists resultaat_token uuid not null default gen_random_uuid();

create unique index if not exists index_scan_results_resultaat_token_idx
  on public.index_scan_results (resultaat_token);

create index if not exists index_scan_results_teamkracht_team_idx
  on public.index_scan_results (teamkracht_team_id);


-- ---------------------------------------------------------------------------
-- BLOK C · Teamkracht: instellingen, teksten, regels en beelden

-- Instellingen voor profielbepaling. Eén rij, beheerd via het dashboard.
create table if not exists public.teamkracht_config (
  id                    int primary key default 1,
  middenband_sd         numeric not null default 0.25,     -- breedte middenband in standaarddeviaties
  min_deelnemers_lijnen int not null default 10,           -- onder dit aantal geen individuele lijnen
  min_deelnemers_kaart  int not null default 5,            -- onder dit aantal geen kaart
  norm_bron             text not null default 'vast' check (norm_bron in ('landelijk','vast')),
  norm_zien numeric, norm_sturen numeric, norm_doen numeric,   -- alleen bij norm_bron = 'vast'
  sd_zien   numeric, sd_sturen   numeric, sd_doen   numeric,
  updated_at            timestamptz not null default now()
);

-- Profielteksten. Sleutel is het patroon in de volgorde Zien, Sturen, Doen;
-- H = hoog, L = laag, M = middenband.
create table if not exists public.teamkracht_profielen (
  code              text primary key,
  naam              text not null,
  zo_ziet_het_eruit text, zin text, voegt_toe text, kost_team text, kost_persoon text,
  breuk             text, ontwikkelrichting text, valkuil_coach text,
  tekst_deelnemer   text,                    -- versie voor de individuele uitslag, ik-vorm
  actief            boolean not null default true,
  updated_at        timestamptz not null default now()
);

-- Regelbibliotheek. De voorwaarde staat als JSON in de rij, zodat de beheerder
-- hem in het dashboard kan bewerken zonder code.
create table if not exists public.teamkracht_regels (
  code           text primary key,
  titel          text not null,              -- korte kop op de kaart
  titel_geteld   text,                       -- variant met aantallen, placeholders {n_HLL}, {n}
  richting       text not null check (richting in ('versterkt','remt','neutraal')),
  voorwaarde     jsonb not null,
  dynamiek       text not null,
  signaal        text,
  interventie    text not null,
  gespreksvraag  text not null,
  gewicht_opslag numeric not null default 0,
  actief         boolean not null default true,
  volgorde       int,
  updated_at     timestamptz not null default now()
);

-- Berekend teambeeld per meting. Geen persoonsgegevens, geen id's van
-- deelnemers, ook niet in lijnen.
create table if not exists public.teamkracht_teambeeld (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  team_id         uuid not null references public.teamkracht_teams(id) on delete cascade,
  soort           text not null check (soort in ('start','hermeting')),
  n               int not null,
  team_zien numeric, team_sturen numeric, team_doen numeric,
  norm_zien numeric, norm_sturen numeric, norm_doen numeric,   -- bevroren op moment van berekenen
  verdeling       jsonb not null,            -- {"HHH":1,"HLL":4,...}
  breuk           text check (breuk in ('zien_sturen','sturen_doen','geen','begin')),
  dynamieken      jsonb not null,            -- [{"code":"R1","score":0.70},...] de drie gekozen
  lijnen          jsonb,                     -- alleen bij n >= min_deelnemers_lijnen
  config_snapshot jsonb
);

create index if not exists teamkracht_teambeeld_team_idx
  on public.teamkracht_teambeeld (team_id, created_at);

-- Fase 2, nu alleen aanleggen.
create table if not exists public.teamkracht_doel (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  teambeeld_id uuid not null references public.teamkracht_teambeeld(id) on delete cascade,
  doel_code    text check (doel_code in ('naar_landelijk','halverwege','bundel')),
  doel_zien numeric, doel_sturen numeric, doel_doen numeric,
  gekozen_door text check (gekozen_door in ('team','coach'))
);

create table if not exists public.teamkracht_interventies (
  code text primary key, titel text not null, breuk text, profielen jsonb,
  tekst text not null, eigenaar_suggestie text, ritme text, telling text,
  actief boolean not null default true, volgorde int
);

create table if not exists public.teamkracht_plan (
  id               uuid primary key default gen_random_uuid(),
  doel_id          uuid not null references public.teamkracht_doel(id) on delete cascade,
  interventie_code text references public.teamkracht_interventies(code),
  eigen_tekst text, eigenaar text, ritme text, telling text, volgorde int
);

-- Fase 3, nu alleen aanleggen. Nooit persoonsgebonden.
create table if not exists public.teamkracht_feedback (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  teambeeld_id  uuid not null references public.teamkracht_teambeeld(id) on delete cascade,
  moment        text not null check (moment in ('sessie','week5','hermeting')),
  dynamiek_code text, herkend text check (herkend in ('ja','deels','nee')),
  plan_id       uuid references public.teamkracht_plan(id) on delete set null,
  uitgevoerd text, telling_waarde int, treffend text
);

-- RLS op alles. Schrijven kan uitsluitend via de service role.
alter table public.teamkracht_config       enable row level security;
alter table public.teamkracht_profielen    enable row level security;
alter table public.teamkracht_regels       enable row level security;
alter table public.teamkracht_teambeeld    enable row level security;
alter table public.teamkracht_doel         enable row level security;
alter table public.teamkracht_interventies enable row level security;
alter table public.teamkracht_plan         enable row level security;
alter table public.teamkracht_feedback     enable row level security;

-- Referentietabellen: leesbaar voor iedere ingelogde gebruiker. Er staat geen
-- persoonsgegeven in; de coach heeft ze nodig om de kaart te tonen.
drop policy if exists "authenticated read" on public.teamkracht_config;
create policy "authenticated read" on public.teamkracht_config
  for select to authenticated using (true);

drop policy if exists "authenticated read" on public.teamkracht_profielen;
create policy "authenticated read" on public.teamkracht_profielen
  for select to authenticated using (true);

drop policy if exists "authenticated read" on public.teamkracht_regels;
create policy "authenticated read" on public.teamkracht_regels
  for select to authenticated using (true);

drop policy if exists "authenticated read" on public.teamkracht_interventies;
create policy "authenticated read" on public.teamkracht_interventies
  for select to authenticated using (true);

-- Teambeelden en alles wat eraan hangt: alleen de coach van dat team en de
-- beheerder. Zo blijft een teambeeld binnen het traject waar het bij hoort.
drop policy if exists "eigen teambeeld lezen" on public.teamkracht_teambeeld;
create policy "eigen teambeeld lezen" on public.teamkracht_teambeeld
  for select to authenticated
  using (exists (
    select 1 from public.teamkracht_teams t
    where t.id = team_id and (t.coach_user_id = auth.uid() or public.teamkracht_is_beheerder())
  ));

drop policy if exists "eigen doel lezen" on public.teamkracht_doel;
create policy "eigen doel lezen" on public.teamkracht_doel
  for select to authenticated
  using (exists (select 1 from public.teamkracht_teambeeld b where b.id = teambeeld_id));

drop policy if exists "eigen plan lezen" on public.teamkracht_plan;
create policy "eigen plan lezen" on public.teamkracht_plan
  for select to authenticated
  using (exists (select 1 from public.teamkracht_doel d where d.id = doel_id));

drop policy if exists "eigen feedback lezen" on public.teamkracht_feedback;
create policy "eigen feedback lezen" on public.teamkracht_feedback
  for select to authenticated
  using (exists (select 1 from public.teamkracht_teambeeld b where b.id = teambeeld_id));


-- ---------------------------------------------------------------------------
-- BLOK D · seed: config, profielen en regels
--
-- Teksten letterlijk uit teamkracht_model_v4_keten.md, met de twee correcties
-- die de briefing voorschrijft: R1 en R3 krijgen één richting (remt) en de
-- nuance verhuist naar de dynamiektekst. R11 en R12 komen uit de briefing.
-- Alle inserts zijn herhaalbaar; bestaande rijen worden niet overschreven,
-- zodat teksten die de opdrachtgever in het dashboard heeft aangepast blijven
-- staan. Wil je een rij terugzetten naar de seed, verwijder hem eerst.

-- Config: norm_bron 'vast' tot er 200 metingen zijn (besluit 07-09-2026).
-- De waarden hieronder zijn werkwaarden uit de testdata en moeten vervangen
-- worden door de echte cijfers. Deze query levert ze, met dezelfde
-- hermetingfilter als dashboard-index.html:
--
--   select round(avg(zien))::numeric   as norm_zien,
--          round(avg(sturen))::numeric as norm_sturen,
--          round(avg(doen))::numeric   as norm_doen,
--          round(stddev_samp(zien))::numeric   as sd_zien,
--          round(stddev_samp(sturen))::numeric as sd_sturen,
--          round(stddev_samp(doen))::numeric   as sd_doen,
--          count(*) as n
--   from public.index_scan_results
--   where is_hermeting = false;
--
insert into public.teamkracht_config
  (id, middenband_sd, min_deelnemers_lijnen, min_deelnemers_kaart, norm_bron,
   norm_zien, norm_sturen, norm_doen, sd_zien, sd_sturen, sd_doen)
values (1, 0.25, 10, 5, 'vast', 62, 55, 50, 12, 12, 12)
on conflict (id) do nothing;

-- Profielen. tekst_deelnemer is een ik-vorm-placeholder, afgeleid van "zo ziet
-- het eruit" en "ontwikkelrichting", zonder de woorden kost en valkuil. De
-- opdrachtgever schrijft de definitieve versie in het dashboard.
insert into public.teamkracht_profielen
  (code, naam, zo_ziet_het_eruit, zin, voegt_toe, kost_team, kost_persoon, breuk, ontwikkelrichting, valkuil_coach, tekst_deelnemer)
values
('HHH','Trekker',
 $t$Ziet wat er speelt, kiest wat van hem is en handelt. Is overal bij, wordt overal bij gehaald.$t$,
 $t$Laat maar, ik pak het wel op.$t$,
 $t$Voorbeeldgedrag, tempo, veiligheid: als het misgaat is er iemand.$t$,
 $t$Eigenaarschap van de rest. Hoe meer de Trekker doet, hoe minder de anderen hoeven te kiezen. Het team leunt achterover zonder het te merken.$t$,
 $t$Overbelasting, en uiteindelijk ergernis over collega's die niets zelf doen.$t$,
 $t$Bij Sturen van de anderen; de Trekker heeft dat overgenomen.$t$,
 $t$Niet minder doen, maar overdragen: vragen stellen in plaats van oppakken, en het ongemak van een gat verdragen tot een ander het vult.$t$,
 $t$De Trekker als voorbeeld neerzetten. Dat bevestigt precies het patroon dat het team klein houdt.$t$,
 $t$Ik zie wat er speelt, ik kies wat van mij is en ik kom in beweging. Vaak ben ik degene die het oppakt. Mijn ruimte zit niet in minder doen, maar in overdragen: vaker een vraag stellen waar ik nu al aanpak, en verdragen dat er even een gat blijft liggen tot een ander het vult.$t$),
('HLL','Ziener',
 $t$Ziet scherp wat er speelt, ook onder tafel. Zegt het na afloop, op de gang, of tegen de coach. In het overleg zwijgt hij.$t$,
 $t$Dat zag ik allang aankomen.$t$,
 $t$Signalen, vroege waarschuwing, scherpte over wat er echt aan de hand is.$t$,
 $t$Niets zolang het team ernaar vraagt; anders vervalt de Ziener tot commentaar. Onopgehaalde signalen worden cynisme, en cynisme is besmettelijk.$t$,
 $t$Het gevoel dat niemand luistert, terwijl hij het niet heeft gezegd waar het telt.$t$,
 $t$Tussen zien en sturen. De Ziener beschouwt wat hij ziet als van een ander.$t$,
 $t$De kleinste stap naar sturen: één signaal per week in het overleg zeggen, met de vraag erbij wat we ermee doen. Niet meteen doen; eerst claimen.$t$,
 $t$De Ziener veel spreektijd geven in de sessie en denken dat het probleem daarmee is opgelost. De verandering zit in het overleg van volgende week, niet in de sessie.$t$,
 $t$Ik zie scherp wat er speelt, ook wat niemand hardop zegt. Vaak zeg ik het pas na afloop, of tegen iemand anders dan degene die het aangaat. Mijn ruimte zit in de kleinste stap naar kiezen: één signaal per week uitspreken op de plek waar het telt, met de vraag erbij wat we ermee doen.$t$),
('HHL','Beslisser',
 $t$Ziet en kiest. Heeft het plan, de analyse, de prioriteiten. De uitvoering blijft uit of wordt uitbesteed.$t$,
 $t$We moeten eigenlijk...$t$,
 $t$Richting, kaders, overzicht. Vaak de informele leider in het denken.$t$,
 $t$Een kloof tussen praten en doen. Besluiten stapelen zich op, de actielijst niet.$t$,
 $t$Frustratie dat het niet gebeurt, en het niet zien dat hij zelf de eerste stap niet zet.$t$,
 $t$Tussen sturen en doen. De keuze is gemaakt; de beweging niet.$t$,
 $t$Elk besluit koppelen aan een eerste stap die de Beslisser zelf zet binnen een week, hoe klein ook. Het gaat om de ervaring dat doen hem niet degradeert.$t$,
 $t$De Beslisser als de strateeg complimenteren en de uitvoering bij anderen leggen. Dat is de kloof in stand houden.$t$,
 $t$Ik zie wat er speelt en ik kies richting. Ik heb het overzicht, het plan en de prioriteiten helder. Mijn ruimte zit in de eerste stap: aan elk besluit dat ik neem zelf een kleine handeling koppelen die ik binnen een week doe.$t$),
('HLH','Meewerker',
 $t$Ziet alles en doet alles wat gevraagd wordt. Blust branden, vult gaten, is de eerste die bijspringt. Bepaalt zelden zelf wat hij oppakt.$t$,
 $t$Zeg maar wat je wilt dat ik doe.$t$,
 $t$Betrouwbaarheid, snelheid, oog voor wat er misgaat. De collega die iedereen wil.$t$,
 $t$Eigenaarschap van het geheel ontbreekt; de Meewerker lost op wat een ander had moeten voorkomen, en daardoor verandert er niets aan de oorzaak.$t$,
 $t$Uitputting zonder erkenning, want wat hij doet was niet zijn werk.$t$,
 $t$Bij sturen. De Meewerker ziet en doet, maar de keuze ligt bij een ander.$t$,
 $t$Eén ding per week weigeren of teruggeven met de vraag van wie dit eigenlijk is. Sturen leren is voor de Meewerker eerst nee leren zeggen.$t$,
 $t$Dit profiel over het hoofd zien, omdat er geen probleem is. Het probleem is dat het team op deze persoon leunt zonder dat iemand het ziet.$t$,
 $t$Ik zie veel en ik doe veel. Ik spring bij, ik vul gaten en ik ben er als het nodig is. Wat ik oppak, bepaal ik zelden zelf. Mijn ruimte zit in kiezen: één keer per week iets teruggeven met de vraag van wie het eigenlijk is.$t$),
('LHH','Aanpakker',
 $t$Kiest snel en gaat. Neemt initiatief, ook als niemand erom vroeg. Kijkt niet altijd of het klopt met wat er speelt.$t$,
 $t$Gewoon doen, dan zien we het wel.$t$,
 $t$Beweging, energie, doorbreken van stilstand.$t$,
 $t$Richting zonder zicht. De Aanpakker rent, soms de verkeerde kant op, en het team moet achteraf repareren wat een Ziener had zien aankomen.$t$,
 $t$Herhaalde teleurstelling dat anderen niet meegaan, zonder te zien dat ze iets anders zagen.$t$,
 $t$Aan het begin, bij zien. De Aanpakker slaat de waarneming over.$t$,
 $t$Voor het kiezen één vraag stellen aan iemand die anders kijkt. Niet langzamer worden; beter geïnformeerd starten.$t$,
 $t$De Aanpakker afremmen. Dan verlies je de energie van het team. Koppel hem aan een Ziener.$t$,
 $t$Ik kies snel en ik ga. Ik breng beweging, ook als niemand erom vroeg. Mijn ruimte zit aan het begin: voordat ik kies één vraag stellen aan iemand die er anders naar kijkt. Niet langzamer, wel beter geïnformeerd starten.$t$),
('LLH','Uitvoerder',
 $t$Doet wat is afgesproken, goed en op tijd. Wacht op de opdracht. Ziet niet wat er om het werk heen gebeurt en kiest niet zelf.$t$,
 $t$Dat is niet aan mij.$t$,
 $t$Stabiliteit, productie, afronding.$t$,
 $t$Niets zichtbaars, en juist daarom veel: signalen die de Uitvoerder had kunnen geven komen niet, en niemand mist ze.$t$,
 $t$Weinig, tot het werk verandert. Dan blijkt hoe afhankelijk hij is van de opdracht.$t$,
 $t$Voor het begin. Er is geen eigen waarneming en geen eigen keuze; alleen de opdracht.$t$,
 $t$Zien oefenen, niet doen: één observatie per overleg over wat hem opviel in het werk. Vaak is dit een contextprofiel: de omgeving heeft nooit om meer gevraagd.$t$,
 $t$De Uitvoerder als gebrek aan initiatief labelen. Vraag eerst wat er gebeurde de laatste keer dat hij iets opmerkte.$t$,
 $t$Ik doe wat is afgesproken, goed en op tijd. Ik wacht op de opdracht en houd me bij mijn eigen werk. Mijn ruimte zit in waarnemen: één ding per overleg benoemen dat me is opgevallen in het werk, nog zonder dat er iets mee hoeft te gebeuren.$t$),
('LHL','Afbakener',
 $t$Is helder over wat wel en niet van hem is, meestal niet. Bewaakt zijn grenzen, neemt weinig waar en komt weinig in beweging.$t$,
 $t$Daar ga ik niet over.$t$,
 $t$Duidelijkheid over rollen, en bescherming tegen een team dat alles bij iedereen legt.$t$,
 $t$Een hek. Wat aan de andere kant valt, blijft liggen. In teams met veel Afbakeners valt alles tussen wal en schip.$t$,
 $t$Isolatie, en op termijn irrelevantie.$t$,
 $t$Sturen staat aan, maar richt zich op afhouden; zien en doen zijn uitgeschakeld.$t$,
 $t$Sturen omdraaien: van wat is niet van mij naar wat kies ik erbij. Eén onderwerp buiten de eigen rol, met eigen keuze.$t$,
 $t$De Afbakener zien als onwillig. Vaak is het een reactie op eerdere overvraging; dat verhaal moet eerst.$t$,
 $t$Ik ben helder over wat wel en niet van mij is, en ik bewaak dat. Mijn ruimte zit in het omdraaien van die keuze: van wat is niet van mij naar wat kies ik erbij. Eén onderwerp buiten mijn eigen rol, met een eigen keuze erin.$t$),
('LLL','Afwachter',
 $t$Volgt, meldt niets, valt niet op. Is er wel, maar niet in de keten.$t$,
 $t$Weinig. Dat is het signaal.$t$,
 $t$Loyaliteit, rust.$t$,
 $t$Stilte. Problemen blijven onder de radar tot het te laat is.$t$,
 $t$Onzichtbaarheid; wordt overgeslagen bij kansen en bij zorgen.$t$,
 $t$Nergens, want hij begint niet.$t$,
 $t$Eerst veiligheid, dan zien. Een team met meerdere Afwachters is bijna altijd een team waar initiatief ooit is afgestraft; begin bij de context, niet bij de persoon.$t$,
 $t$De Afwachter in de sessie activeren. Dat maakt de sessie onveilig voor precies degene die veiligheid nodig heeft.$t$,
 $t$Ik doe mee, ik volg en ik val niet op. Ik meld weinig, ook als ik iets merk. Mijn ruimte begint bij veiligheid en bij zien: één ding per overleg noemen dat me opviel, zonder dat er meteen een besluit aan hangt.$t$),
('MMM','Middenband',
 $t$Doet mee, geen uitschieters, geen wrijving.$t$,
 null,
 $t$Balans, stabiliteit.$t$,
 $t$Niets, tenzij de middenband de meerderheid is. Dan is er een team dat tevreden is en een opdrachtgever die dat niet is: teamgeluk uit gemak.$t$,
 null,
 null,
 $t$Doelgedrag kiezen: één concreet gedrag dat het team de komende maand oefent en telt.$t$,
 $t$Denken dat er niets te doen is.$t$,
 $t$Ik doe mee zonder uitschieters: ik zie, ik kies en ik doe, alle drie rond het landelijke beeld. Mijn ruimte zit in het kiezen van één concreet gedrag dat ik de komende maand oefen en bijhoud, bijvoorbeeld het voorstel bij het probleem, of het zinnetje dit pak ik op.$t$)
on conflict (code) do nothing;

-- Regels. R12 is de enige teamregel: te herkennen aan de sleutels breuk en
-- team_boven_norm in de voorwaarde. Die scoort 0.5 plus opslag, de overige
-- regels scoren betrokken / n plus opslag.
insert into public.teamkracht_regels
  (code, titel, titel_geteld, richting, voorwaarde, dynamiek, signaal, interventie, gespreksvraag, gewicht_opslag, volgorde)
values
('R1','Zieners en Aanpakkers','{n_HLL} Zieners en {n_LHH} Aanpakkers','remt',
 '{"min": {"HLL": 2, "LHH": 1}}',
 $t$Het team ziet alles en rent een andere kant op. De Aanpakker start zonder de waarneming van de Zieners; de Zieners zeggen achteraf dat ze het zagen. Deze dynamiek versterkt de teamkracht zodra Zieners en Aanpakkers elkaar spreken, en remt zolang dat gesprek uitblijft.$t$,
 $t$Dat zag ik aankomen, gezegd na afloop.$t$,
 $t$Vaste vraag voor elke start: wie ziet iets wat we nog niet hebben besproken? De Aanpakker stelt hem, de Zieners beantwoorden hem.$t$,
 $t$Waar hebben jullie de afgelopen maand iets gezien en besloten het nog niet te zeggen?$t$, 0.15, 1),
('R2','Eén Trekker, meerderheid Uitvoerders of Afwachters','Eén Trekker, {n_LLH} Uitvoerders en {n_LLL} Afwachters','remt',
 '{"min": {"HHH": 1}, "meerderheid": ["LLH","LLL"]}',
 $t$Het team werkt zolang de Trekker er is. Sturen is uitbesteed aan één persoon.$t$,
 $t$Stilte tot de Trekker spreekt; alles wacht op zijn terugkomst.$t$,
 $t$Regie verdelen: elk onderwerp een eigenaar die niet de Trekker is; de Trekker wordt vragensteller.$t$,
 $t$Wat gebeurt er in dit team in de week dat de trekker er niet is?$t$, 0.15, 2),
('R3','Beslissers en Uitvoerders',null,'remt',
 '{"min": {"HHL": 1, "LLH": 2}}',
 $t$Het klassieke team: één denkt, de rest doet. Het levert op korte termijn, en niemand behalve de Beslisser groeit. Bij vertrek van de Beslisser valt het stil.$t$,
 $t$De Uitvoerders wachten met beginnen tot het plan er is.$t$,
 $t$De Beslisser levert per besluit de waarom, niet de wat; de Uitvoerders bepalen zelf de eerste stap.$t$,
 $t$Welk besluit van de afgelopen maand had het team ook zonder de beslisser kunnen nemen?$t$, 0.10, 3),
('R4a','Meerdere Beslissers, team tot tien',null,'remt',
 '{"min": {"HHL": 2}, "max_n": 10}',
 $t$Veel richting, weinig beweging. Plannen concurreren, besluiten worden overgedaan, niemand zet de eerste stap.$t$,
 $t$Dezelfde discussie in drie overleggen; lange overleggen, korte actielijsten.$t$,
 $t$Beslisdomeinen afspreken, en per besluit een eerste stap die de Beslisser zelf zet binnen een week.$t$,
 $t$Welk besluit is dit jaar meer dan één keer genomen, en wat is er sindsdien gedaan?$t$, 0.15, 4),
('R4b','Meerdere Beslissers, team vanaf elf',null,'remt',
 '{"min": {"HHL": 3}, "min_n": 11}',
 $t$Veel richting, weinig beweging. Plannen concurreren, besluiten worden overgedaan, niemand zet de eerste stap.$t$,
 $t$Dezelfde discussie in drie overleggen; lange overleggen, korte actielijsten.$t$,
 $t$Beslisdomeinen afspreken, en per besluit een eerste stap die de Beslisser zelf zet binnen een week.$t$,
 $t$Welk besluit is dit jaar meer dan één keer genomen, en wat is er sindsdien gedaan?$t$, 0.15, 5),
('R5','Meewerker naast een Trekker of Beslisser',null,'remt',
 '{"min": {"HLH": 1}, "min_een_van": {"HHH": 1, "HHL": 1}}',
 $t$De Meewerker vangt op wat de Trekker of Beslisser laat vallen. Het team ziet geen probleem; de Meewerker draagt het. Deze dynamiek remt onzichtbaar.$t$,
 $t$Gelukkig hebben we deze collega, steeds over dezelfde persoon; de Meewerker werkt over.$t$,
 $t$Alles wat de Meewerker opvangt een week lang zichtbaar maken op een lijstje, en per punt de vraag stellen van wie het was.$t$,
 $t$Wat is er de afgelopen maand opgelost zonder dat de eigenaar het merkte?$t$, 0.10, 6),
('R6','Aanpakkers onder elkaar',null,'remt',
 '{"meerderheid": ["LHH"]}',
 $t$Beweging zonder zicht. Ieder kiest zijn eigen richting; fouten herhalen zich omdat niemand kijkt.$t$,
 $t$Dat hebben we al eens geprobeerd, gezegd als verrassing.$t$,
 $t$Korte terugblik bij de start van elk overleg: wat zagen we niet aankomen sinds vorige keer?$t$,
 $t$Welke fout heeft dit team dit jaar twee keer gemaakt?$t$, 0.15, 7),
('R7','Afwachters in de meerderheid, geen Trekker',null,'remt',
 '{"meerderheid": ["LLL"], "geen": ["HHH"]}',
 $t$Stilte; niets komt boven tot het te laat is. Waarschijnlijk een context die initiatief heeft afgestraft.$t$,
 $t$De leidinggevende hoort problemen als eerste van buiten het team.$t$,
 $t$Eerst veiligheid, dan zien: één ronde per overleg waarin iedereen één ding meldt zonder dat het een besluit wordt.$t$,
 $t$Wanneer is voor het laatst iemand hier beloond voor het melden van slecht nieuws?$t$, 0.20, 8),
('R8','Ziener naast een Beslisser','{n_HLL} Zieners naast {n_HHL} Beslissers','versterkt',
 '{"min": {"HLL": 1, "HHL": 1}}',
 $t$De waarneming van de Ziener kan de keuze van de Beslisser voeden. Dit is de combinatie waar de meeste verbetering vandaan komt, en de combinatie die het vaakst niet wordt benut omdat de Ziener zwijgt en de Beslisser niet vraagt.$t$,
 $t$De Beslisser beslist op basis van wat de Ziener aandroeg, of juist nooit.$t$,
 $t$Vaste route: signalen gaan naar de Beslisser, de Beslisser koppelt terug wat ermee is gebeurd.$t$,
 $t$Welk signaal uit dit team is de afgelopen maand een besluit geworden, en hoe wist de melder dat?$t$, 0, 9),
('R9','Afbakeners met elkaar',null,'remt',
 '{"min": {"LHL": 2}}',
 $t$Alles wat tussen de rollen valt, blijft liggen. Het team is helder over wie waar niet over gaat.$t$,
 $t$Dat is niet van ons als vast antwoord; klachten van buiten over wat niemand oppakt.$t$,
 $t$De tussenruimte in kaart: welke onderwerpen hebben geen eigenaar, en wie kiest er één erbij.$t$,
 $t$Wat is er de afgelopen maand blijven liggen omdat het van niemand was?$t$, 0.10, 10),
('R10','Middenband dominant','{n_MMM} van de {n} in de middenband','neutraal',
 '{"meerderheid": ["MMM"], "geen": ["HHH","HHL"]}',
 $t$Geen uitschieters, geen wrijving, geen beweging. Teamgeluk uit gemak, met afvlakken als risico.$t$,
 $t$Goede sfeer, geen initiatief dat niemand had gevraagd.$t$,
 $t$Doelgedrag kiezen: één concreet gedrag, bijvoorbeeld het voorstel bij het probleem of het zinnetje dit pak ik op, dat het team de komende maand oefent en telt.$t$,
 $t$Wat heeft dit team de afgelopen maand gedaan dat niemand had gevraagd?$t$, 0.05, 11),
('R11','Het werkt zolang de Trekker er is',null,'remt',
 '{"min": {"HHH": 1, "HLL": 2}}',
 $t$De Trekker claimt en doet wat de Zieners zien; zolang dat werkt hoeven de Zieners niet te kiezen.$t$,
 null,
 $t$Regie verdelen, elk signaal een eigenaar die niet de Trekker is; de Trekker wordt vragensteller.$t$,
 $t$Wat gebeurt er in dit team in de week dat de trekker er niet is?$t$, 0.15, 12),
('R12','De waarneming is er al',null,'versterkt',
 '{"breuk": "zien_sturen", "team_boven_norm": ["zien"]}',
 $t$Dit team ziet meer dan gemiddeld; de verbetering zit niet in beter kijken maar in een route van signaal naar keuze.$t$,
 null,
 $t$Signalen gaan naar één eigenaar per onderwerp, die terugkoppelt wat ermee is gebeurd.$t$,
 $t$Welk signaal is de afgelopen maand een besluit geworden, en hoe wist de melder dat?$t$, 0, 13)
on conflict (code) do nothing;


-- ---------------------------------------------------------------------------
-- BLOK E · KEUZE, niet automatisch draaien
--
-- index_scan_results heeft nu de policy "authenticated read" met using (true).
-- Elke ingelogde gebruiker van welk dashboard dan ook kan dus alle rijen lezen,
-- inclusief e-mailadres en straks profiel_code. Dat botst met werkregel 2 uit
-- de briefing: geen individuele profielen richting de coach of het bedrijf.
-- Zolang jij de enige gebruiker met een account bent, is er geen lek. Zodra er
-- een coachaccount bijkomt, is er dat wel.
--
-- Dit blok beperkt het leesrecht tot beheerders. dashboard-index.html blijft
-- werken voor jou, een coachaccount ziet niets meer van de ruwe metingen.
-- Draai dit pas nadat blok A jou als beheerder heeft toegevoegd; controleer
-- eerst dat select * from public.teamkracht_gebruikers jouw rij toont.
--
-- drop policy if exists "authenticated read" on public.index_scan_results;
-- create policy "beheerder read" on public.index_scan_results
--   for select to authenticated using (public.teamkracht_is_beheerder());
