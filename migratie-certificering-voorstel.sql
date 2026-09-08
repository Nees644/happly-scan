-- ===========================================================================
-- VOORSTEL · MIGRATIE 09-09-2026 · Certificering fase A
--
-- TER REVIEW. Nog niet draaien. Vier dingen wil ik eerst van Maarten horen;
-- ze staan onderaan dit bestand bij OPEN PUNTEN.
--
-- Uitgangspunt: de bestaande teamkracht_gebruikers is de gebruikerstabel. Die
-- hangt al aan auth.users en wordt al gebruikt door elke Teamkracht-route. Een
-- tweede tabel ernaast zou betekenen dat we op twee plekken moeten opzoeken wie
-- iemand is, en die twee gaan een keer uit elkaar lopen.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOK A · de gebruiker
--
-- rol gaat over toegang tot de software, niveau over certificering. Dat zijn
-- twee dingen: een Opleider hoeft geen beheerder te zijn, en een beheerder
-- hoeft geen certificaat te hebben.
alter table public.teamkracht_gebruikers
  add column if not exists naam                 text,
  add column if not exists niveau               text not null default 'geen',
  add column if not exists licentie_actief      boolean not null default false,
  add column if not exists licentie_tot         date,
  add column if not exists mollie_customer_id   text,
  add column if not exists mollie_subscription_id text,
  add column if not exists register_toestemming boolean not null default false,
  add column if not exists register_slug        text,
  add column if not exists organisatie          text,
  add column if not exists website              text,
  add column if not exists btw_nummer           text,
  -- Bevriezen en verwijderen (besluit 09-09-2026). Bevroren betekent: inloggen
  -- en nieuwe kaarten maken kan niet meer, bestaande kaarten blijven staan.
  -- Verwijderen is het einde: dan gaan de persoonsgegevens eruit.
  add column if not exists bevroren_op          date,
  add column if not exists verwijderen_op       date,
  add column if not exists verwijderd_op        timestamptz;

-- Begeleider en Opleider zitten er al in als waarde; in de interface komen ze
-- pas in fase B, zoals de briefing voorschrijft.
alter table public.teamkracht_gebruikers
  drop constraint if exists teamkracht_gebruikers_niveau_check;
alter table public.teamkracht_gebruikers
  add constraint teamkracht_gebruikers_niveau_check
  check (niveau in ('geen','lezer','begeleider','opleider'));

-- rol krijgt er 'lezer' bij: wie de module koopt heeft toegang nodig maar is
-- nog geen coach met eigen teams.
alter table public.teamkracht_gebruikers
  drop constraint if exists teamkracht_gebruikers_rol_check;
alter table public.teamkracht_gebruikers
  add constraint teamkracht_gebruikers_rol_check
  check (rol in ('lezer','coach','beheerder'));

-- De slug staat in de verificatie-URL op de badge en mag daarom nooit
-- veranderen zodra hij is uitgegeven. Kleine letters, cijfers en streepjes.
create unique index if not exists teamkracht_gebruikers_slug_idx
  on public.teamkracht_gebruikers (register_slug) where register_slug is not null;
alter table public.teamkracht_gebruikers
  drop constraint if exists teamkracht_gebruikers_slug_vorm;
alter table public.teamkracht_gebruikers
  add constraint teamkracht_gebruikers_slug_vorm
  check (register_slug is null or register_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');


-- ---------------------------------------------------------------------------
-- BLOK B · module en toets

-- Zes hoofdstukken; de inhoud komt van Maarten en staat buiten de database.
create table if not exists public.module_voortgang (
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  hoofdstuk    int  not null check (hoofdstuk between 1 and 6),
  afgerond_op  timestamptz not null default now(),
  primary key (gebruiker_id, hoofdstuk)
);

-- De vragenpool. Twintig vragen worden getrokken uit veertig, dus per
-- hoofdstuk horen er ruim genoeg te staan.
create table if not exists public.toets_vragen (
  id         uuid primary key default gen_random_uuid(),
  vraag      text not null,
  opties     jsonb not null,          -- ["a","b","c","d"]
  juist      int not null,            -- index in opties, nul-gebaseerd
  hoofdstuk  int not null check (hoofdstuk between 1 and 6),
  actief     boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Maximaal drie pogingen per dertig dagen; die grens wordt serverside geteld
-- op gestart_op, niet in de browser.
create table if not exists public.toets_pogingen (
  id           uuid primary key default gen_random_uuid(),
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  gestart_op   timestamptz not null default now(),
  afgerond_op  timestamptz,
  score        int check (score between 0 and 20),
  geslaagd     boolean,
  antwoorden   jsonb                  -- [{vraag_id, gekozen}], voor de itemanalyse
);

create index if not exists toets_pogingen_gebruiker_idx
  on public.toets_pogingen (gebruiker_id, gestart_op desc);


-- ---------------------------------------------------------------------------
-- BLOK C · certificaten

-- Een certificaat blijft altijd staan, ook na intrekken of verlopen. De
-- verificatie-URL op een badge die iemand vorig jaar op LinkedIn zette moet
-- blijven werken en dan eerlijk zeggen dat het niet meer actief is.
create table if not exists public.certificaten (
  id              uuid primary key default gen_random_uuid(),
  gebruiker_id    uuid not null references auth.users(id) on delete cascade,
  -- De naam zoals hij op het certificaat staat, vastgelegd bij uitgifte
  -- (besluit 09-09-2026). Wijzigt iemand later zijn naam in zijn profiel, dan
  -- verandert dit certificaat niet mee. Een diploma hoort niet met terugwerkende
  -- kracht op een andere naam te komen staan.
  naam_op_certificaat text not null,
  niveau          text not null check (niveau in ('lezer','begeleider','opleider')),
  uitgegeven_op   date not null default current_date,
  uitgegeven_door uuid references auth.users(id) on delete set null,  -- null = Happly
  status          text not null default 'actief'
                  check (status in ('actief','verlopen','ingetrokken','ingetrokken_op_verzoek')),
  verificatiecode uuid not null default gen_random_uuid(),
  poging_id       uuid references public.toets_pogingen(id) on delete set null,
  updated_at      timestamptz not null default now()
);

create unique index if not exists certificaten_verificatie_idx
  on public.certificaten (verificatiecode);
create index if not exists certificaten_gebruiker_idx
  on public.certificaten (gebruiker_id, uitgegeven_op desc);


-- ---------------------------------------------------------------------------
-- BLOK D · betalingen
--
-- Staat niet in de briefing, maar acceptatiecriterium 1 en 4 kunnen niet
-- zonder: iemand koopt losse Teamfoto's, of een licentie waarmee ze gratis
-- zijn. Zonder deze tabel is achteraf niet vast te stellen waarvoor iemand
-- heeft betaald.
--
-- Mollie is de betaalprovider. Wij bewaren zijn id's en de status, nooit een
-- kaartnummer of iets wat daarop lijkt; dat blijft bij Mollie.
create table if not exists public.bestellingen (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  gebruiker_id      uuid not null references auth.users(id) on delete cascade,
  product_code      text not null references public.producten(code),
  -- Het bedrag zoals het op dat moment gold, inclusief btw, in centen. Bevroren
  -- bij de bestelling: een latere prijswijziging mag een oude factuur niet
  -- veranderen.
  bedrag_cent       int not null check (bedrag_cent >= 0),
  btw_cent          int not null default 0 check (btw_cent >= 0),
  status            text not null default 'open'
                    check (status in ('open','betaald','mislukt','verlopen','terugbetaald')),
  mollie_payment_id text,
  betaald_op        timestamptz,
  -- Bij een losse Teamfoto: waar het recht op slaat. Blijft leeg bij een
  -- licentie, want die geldt voor alles.
  team_id           uuid references public.teamkracht_teams(id) on delete set null,
  verbruikt_op      timestamptz,
  -- Een losse Teamfoto die niet is gebruikt vervalt na een jaar. De kaart die
  -- er al mee is gemaakt vervalt nooit; zie kaart_archief.
  geldig_tot        date
);

create unique index if not exists bestellingen_mollie_idx
  on public.bestellingen (mollie_payment_id) where mollie_payment_id is not null;
create index if not exists bestellingen_gebruiker_idx
  on public.bestellingen (gebruiker_id, created_at desc);

-- Wat Mollie ons stuurt, ruw bewaard. Mollie meldt alleen een id; wij halen de
-- status er zelf bij op. Deze tabel is het geheugen dat voorkomt dat een
-- dubbel bezorgde melding twee keer wordt verwerkt.
create table if not exists public.mollie_meldingen (
  id           uuid primary key default gen_random_uuid(),
  ontvangen_op timestamptz not null default now(),
  mollie_id    text not null,
  verwerkt_op  timestamptz,
  uitkomst     text
);

create index if not exists mollie_meldingen_idx
  on public.mollie_meldingen (mollie_id, ontvangen_op desc);


-- ---------------------------------------------------------------------------
-- BLOK D2 · het archief van gemaakte kaarten
--
-- Een kaart die een team heeft gezien blijft van dat team, ook als de licentie
-- verloopt of een losse aankoop is verbruikt. De kaart wordt daarom bij het
-- maken meteen als bestand weggeschreven en hier vastgelegd. Wat er in de
-- database staat kan later herberekend worden; wat er op tafel lag niet.
--
-- Er staat geen persoonsgegeven op een kaart: geen namen, geen adressen, en de
-- lijnen zijn geanonimiseerd en gesorteerd. Bewaren is daarmee laag risico.
create table if not exists public.kaart_archief (
  id            uuid primary key default gen_random_uuid(),
  aangemaakt_op timestamptz not null default now(),
  teambeeld_id  uuid references public.teamkracht_teambeeld(id) on delete set null,
  doel_id       uuid references public.teamkracht_doel(id) on delete set null,
  formaat       text not null check (formaat in ('a4','a3','a1')),
  soort         text not null check (soort in ('startbeeld','doelbeeld','eindbeeld')),
  bestemming    text not null default 'supabase' check (bestemming in ('supabase','drive')),
  pad           text not null,          -- bucketpad of Drive-bestand-id
  bytes         int,
  check (teambeeld_id is not null or doel_id is not null)
);

create index if not exists kaart_archief_teambeeld_idx
  on public.kaart_archief (teambeeld_id, aangemaakt_op desc);


-- ---------------------------------------------------------------------------
-- BLOK D3 · de verlengreeks
--
-- Loopt een licentie af, dan gaat er een reeks mails uit met een verlenglink.
-- Zelfde opzet als opvolgreeks bij de scan: een rij per licentieperiode, een
-- kolom per moment, en de cron kijkt wie aan de beurt is. Zo kan er nooit
-- twee keer dezelfde mail uitgaan, ook niet als de cron twee keer draait.
create table if not exists public.licentie_reeks (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  gebruiker_id   uuid not null references auth.users(id) on delete cascade,
  licentie_tot   date not null,          -- de datum waar deze reeks bij hoort
  verlengcode    uuid not null default gen_random_uuid(),  -- staat in de mail
  mail30_sent_at timestamptz,            -- dertig dagen voor het einde
  mail7_sent_at  timestamptz,            -- een week voor het einde
  mail0_sent_at  timestamptz,            -- op de dag zelf, bevriezing gemeld
  mail14_sent_at timestamptz,            -- twee weken erna, laatste kans
  verlengd_op    timestamptz,            -- gevuld zodra er is betaald
  bevroren_op    timestamptz,            -- account op slot gezet
  mail_verwijder_sent_at timestamptz,    -- aankondiging van het verwijderen
  afgemeld       boolean not null default false
);

create unique index if not exists licentie_reeks_periode_idx
  on public.licentie_reeks (gebruiker_id, licentie_tot);
create unique index if not exists licentie_reeks_code_idx
  on public.licentie_reeks (verlengcode);


-- ---------------------------------------------------------------------------
-- BLOK E · het openbare register
--
-- De enige plek in dit hele systeem waar iemand zonder inlog een naam kan zien,
-- en dan alleen na expliciete toestemming bij de toets. Een view in plaats van
-- rechtstreekse toegang, zodat er geen kolom per ongeluk mee naar buiten kan.
--
-- Bewust GEEN security_invoker: de anon-rol mag de onderliggende tabellen niet
-- lezen en krijgt alleen wat hier staat.
create or replace view public.register as
select
  g.register_slug                       as slug,
  c.naam_op_certificaat                 as naam,
  g.organisatie,
  g.website,
  c.niveau,
  c.uitgegeven_op,
  c.verificatiecode,
  case
    when c.status <> 'actief' then 'niet actief'
    when g.licentie_actief and (g.licentie_tot is null or g.licentie_tot >= current_date) then 'actief'
    else 'niet actief'
  end                                   as status
from public.teamkracht_gebruikers g
join public.certificaten c on c.gebruiker_id = g.user_id
where g.register_toestemming = true
  and g.register_slug is not null
  and g.verwijderd_op is null
  and c.status <> 'ingetrokken_op_verzoek';

revoke all on public.register from public;
grant select on public.register to anon, authenticated;


-- ---------------------------------------------------------------------------
-- BLOK F · RLS
--
-- Alles dicht, schrijven uitsluitend serverside met de service role. Lezen
-- alleen je eigen gegevens; de beheerder ziet alles.
alter table public.module_voortgang  enable row level security;
alter table public.toets_vragen      enable row level security;
alter table public.toets_pogingen    enable row level security;
alter table public.certificaten      enable row level security;
alter table public.bestellingen      enable row level security;
alter table public.mollie_meldingen  enable row level security;
alter table public.kaart_archief     enable row level security;
alter table public.licentie_reeks    enable row level security;

drop policy if exists "eigen voortgang" on public.module_voortgang;
create policy "eigen voortgang" on public.module_voortgang
  for select to authenticated
  using (gebruiker_id = auth.uid() or public.teamkracht_is_beheerder());

drop policy if exists "eigen pogingen" on public.toets_pogingen;
create policy "eigen pogingen" on public.toets_pogingen
  for select to authenticated
  using (gebruiker_id = auth.uid() or public.teamkracht_is_beheerder());

drop policy if exists "eigen certificaten" on public.certificaten;
create policy "eigen certificaten" on public.certificaten
  for select to authenticated
  using (gebruiker_id = auth.uid() or public.teamkracht_is_beheerder());

drop policy if exists "eigen bestellingen" on public.bestellingen;
create policy "eigen bestellingen" on public.bestellingen
  for select to authenticated
  using (gebruiker_id = auth.uid() or public.teamkracht_is_beheerder());

-- De vragenpool is alleen voor de beheerder. Wie de juiste antwoorden kan
-- lezen, hoeft de toets niet te maken; de browser krijgt de vragen dan ook
-- nooit met het antwoord erbij, alleen de opties.
drop policy if exists "vragen alleen beheerder" on public.toets_vragen;
create policy "vragen alleen beheerder" on public.toets_vragen
  for select to authenticated using (public.teamkracht_is_beheerder());

-- Het archief volgt de kaart: wie het teambeeld mag zien, mag ook het bestand.
drop policy if exists "eigen archief" on public.kaart_archief;
create policy "eigen archief" on public.kaart_archief
  for select to authenticated
  using (exists (select 1 from public.teamkracht_teambeeld b where b.id = teambeeld_id));

drop policy if exists "eigen verlengreeks" on public.licentie_reeks;
create policy "eigen verlengreeks" on public.licentie_reeks
  for select to authenticated
  using (gebruiker_id = auth.uid() or public.teamkracht_is_beheerder());

-- Meldingen van Mollie: alleen de beheerder, want er staan betaal-id's in.
drop policy if exists "meldingen alleen beheerder" on public.mollie_meldingen;
create policy "meldingen alleen beheerder" on public.mollie_meldingen
  for select to authenticated using (public.teamkracht_is_beheerder());


-- ---------------------------------------------------------------------------
-- BLOK G · de producten
--
-- Eén tabel met alle prijzen, zodat er nergens een bedrag in de code of in de
-- frontend staat. Bedragen in centen exclusief btw; de btw wordt bij het
-- afrekenen opgeteld, dus die staat er als percentage bij en niet als bedrag.
--
-- Mollie kent geen productcatalogus zoals Stripe. Er is dus geen price-id om
-- mee te synchroniseren: deze tabel is de catalogus. Dat scheelt een
-- koppeling die uit de pas kan lopen.
--
-- Prijswijziging: nieuwe rij met een nieuwe versie, oude rij op actief = false.
-- Lopende abonnementen houden hun bedrag, want een Mollie-abonnement heeft zijn
-- bedrag bij het aanmaken meegekregen.
create table if not exists public.producten (
  code            text primary key,
  naam            text not null,
  prijs_ex_btw    int  not null check (prijs_ex_btw >= 0),   -- in centen
  btw_promille    int  not null default 210,                 -- 21,0 procent
  interval        text check (interval in ('eenmalig','maand','jaar')),
  soort           text not null check (soort in ('meting','certificering','licentie','credit')),
  fase            text not null default 'later' check (fase in ('bestaand','A','later')),
  bevat           text,
  voorwaarde      text,
  actief          boolean not null default true,
  versie          int not null default 1,
  updated_at      timestamptz not null default now()
);

alter table public.producten enable row level security;

-- Prijzen zijn openbaar; ze staan straks op de website. Wel via een view zodat
-- er geen kolom per ongeluk bijkomt die dat niet is.
create or replace view public.prijslijst as
select code, naam, prijs_ex_btw, btw_promille, interval, soort, bevat, voorwaarde
from public.producten
where actief = true and fase <> 'later';

revoke all on public.prijslijst from public;
grant select on public.prijslijst to anon, authenticated;

drop policy if exists "producten lezen" on public.producten;
create policy "producten lezen" on public.producten
  for select to authenticated using (true);

insert into public.producten (code, naam, prijs_ex_btw, interval, soort, fase, bevat, voorwaarde) values
('ZKI',        'Zelfkracht Index, individueel',            0, 'eenmalig', 'meting',        'bestaand', 'De meting en de persoonlijke uitslag', null),
('TF',         'Teamfoto, een team',                    9500, 'eenmalig', 'meting',        'A',        'De Teamkrachtkaart van een team',      'Hoofdstuk 1 en 2 van de Lezer-module afgerond'),
('HM',         'Hermeting, een team',                   9500, 'eenmalig', 'meting',        'A',        'Het eindbeeld over het startbeeld',    'Eerder een Teamfoto voor dit team'),
('LEZ-1',      'Lezer, instap',                        14900, 'eenmalig', 'certificering', 'A',        'Module, toets, certificaat, badge, register', null),
('LEZ-2',      'Lezer, met licentie',                  39500, 'eenmalig', 'certificering', 'A',        'Lezer instap plus een jaar persoonlijke licentie', null),
('LIC-M',      'Persoonlijke licentie, maand',           2900, 'maand',    'licentie',      'A',        'Onbeperkt Teamfotos en hermetingen voor eigen teams', 'Geldig certificaat'),
('LIC-J',      'Persoonlijke licentie, jaar',           29000, 'jaar',     'licentie',      'A',        'Onbeperkt Teamfotos en hermetingen voor eigen teams', 'Geldig certificaat'),
('LEZ-10',     'Lezer, organisatie tien plekken',      295000, 'eenmalig', 'certificering', 'later',    'Tien maal Lezer met licentie plus organisatiedashboard', null),
('BEG-1',      'Begeleider, instap',                    69500, 'eenmalig', 'certificering', 'later',    'Opleidingsdag, drie intervisies, certificaat, badge, register', 'Geldig Lezer-certificaat'),
('BEG-2',      'Begeleider, met licentie',              89500, 'eenmalig', 'certificering', 'later',    'Begeleider instap plus een jaar licentie, naam en logo op de kaart', 'Geldig Lezer-certificaat'),
('BEG-8',      'Begeleider, in-company acht plekken',  495000, 'eenmalig', 'certificering', 'later',    'Acht maal Begeleider met licentie', null),
('OPL-1',      'Opleider, instap',                     250000, 'eenmalig', 'certificering', 'later',    'Train de trainer en het eerste jaar opleiderslicentie', 'Geldig Begeleider-certificaat'),
('OPL-2',      'Opleider, met startpakket',            325000, 'eenmalig', 'certificering', 'later',    'Opleider instap plus tien certificaatcredits en marketingpakket', 'Geldig Begeleider-certificaat'),
('LIC-ORG-10', 'Organisatiebundel tien licenties',     249000, 'jaar',     'licentie',      'later',    'Tien persoonlijke licenties, toegekend door een beheerder', null),
('LIC-ORG-30', 'Organisatiebundel dertig licenties',   649000, 'jaar',     'licentie',      'later',    'Dertig persoonlijke licenties', null),
('LIC-ORG-X',  'Organisatiebundel onbeperkt',         1490000, 'jaar',     'licentie',      'later',    'Onbeperkt persoonlijke licenties', null),
('LIC-OPL',    'Opleiderslicentie, verlenging',         99000, 'jaar',     'licentie',      'later',    'Verlenging van het opleiderschap met een jaar', 'Geldig Opleider-certificaat'),
('CERT-AFD',   'Certificaatcredit',                      9500, 'eenmalig', 'credit',        'later',    'Een uit te reiken certificaat', 'Alleen voor Opleiders')
on conflict (code) do nothing;


-- ===========================================================================
-- OPEN PUNTEN, graag antwoord voordat dit draait
--
-- 1. OPGELOST met de tarievenbriefing van 09-09-2026: de prijzen staan in blok
--    G, in centen exclusief btw. Wat er nog niet staat is wat er gebeurt als
--    de twaalf maanden van LEZ-2 aflopen; zie de aantekening bij dat blok.
--
-- 2. OPGELOST: een losse Teamfoto vervalt na een jaar als hij niet is
--    gebruikt (geldig_tot). De kaart die ermee is gemaakt vervalt nooit en
--    wordt bij het maken gearchiveerd; zie blok D2.
--
-- 3. OPGELOST: het certificaat blijft staan als de licentie verloopt. De
--    registerstatus wordt "niet actief" en er start een verlengreeks; zie
--    blok D3. Reactivatie zet de status terug zonder nieuwe toets.
--
-- 4. OPGELOST: de naam staat vast op het certificaat en beweegt niet mee met
--    het profiel.
--
-- 5. Minimum voor een Teamfoto blijft VIJF deelnemers. Dat is nu drie keer
--    bevestigd; in de briefings staat op drie plekken acht, en dat is telkens
--    onjuist. Deze regel staat in teamkracht_config.min_deelnemers_kaart en
--    nergens anders, zodat er maar een plek is om te wijzigen.
--
-- 6. Btw: bedragen op de site worden getoond exclusief btw, facturen zijn
--    inclusief. Daarom staat prijs_ex_btw in producten en worden bedrag_cent
--    en btw_cent apart op de bestelling bevroren.
--
-- NOG WEL NODIG, drie keuzes:
--
-- A. Waar de kaarten worden gearchiveerd. Blok D2 kan allebei: 'supabase' of
--    'drive'. Supabase Storage zit al in de stack, gebruiken we al voor de
--    deelbeelden, heeft dezelfde rechten als de rest en kost niets extra aan
--    koppeling. Google Drive is prettiger om zelf in te bladeren, maar vraagt
--    een OAuth-koppeling die kan verlopen, en zet klantmateriaal in een
--    Google-account. Mijn voorstel: standaard Supabase, en een knop
--    "naar Drive" voor wie dat wil.
--
-- B. Hoe lang na het bevriezen volgt het verwijderen. Er is nog geen termijn
--    afgesproken. Mijn voorstel: vierentwintig maanden, met een aankondiging
--    dertig dagen vooraf. Kort genoeg om geen slapende gegevens te bewaren,
--    lang genoeg om iemand die na een jaar terugkomt zijn materiaal terug te
--    geven.
--
-- C. Verwijderen breekt de verificatielink. Zie de aantekening hieronder; dit
--    is de belangrijkste van de drie.
--
-- ---------------------------------------------------------------------------
-- LET OP, hier spreken twee afspraken elkaar tegen
--
-- Acceptatiecriterium 3 van de certificeringsbriefing zegt: een ingetrokken of
-- verlopen licentie toont "niet actief" ZONDER de pagina te verwijderen. Dat
-- is ook de reden dat een badge op LinkedIn jaren blijft werken.
--
-- Het account verwijderen haalt die pagina wel weg, want er staat een naam op
-- en die mag na verwijdering niet blijven staan. Een badge uit 2026 wijst dan
-- naar een pagina die niet meer bestaat, en dat leest als een vervalsing.
--
-- Drie manieren eruit, jij kiest:
--   1. Alleen bevriezen, nooit automatisch verwijderen. Verwijderen gebeurt
--      op verzoek van de persoon zelf, zoals de AVG voorschrijft. Het register
--      blijft dan altijd kloppen.
--   2. Verwijderen zoals je zegt, en de verificatiepagina toont daarna
--      "dit certificaat is verwijderd op verzoek" zonder naam. De link werkt,
--      de naam is weg. Dit is wat ik zou doen.
--   3. Verwijderen en de link laten breken. Dan moet je in de badge geen
--      verificatielink meer opnemen, want een dode link is erger dan geen link.
-- ===========================================================================
