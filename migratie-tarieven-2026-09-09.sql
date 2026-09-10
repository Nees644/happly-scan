-- ===========================================================================
-- VOORSTEL · MIGRATIE 09-09-2026 · Tarieven en producten v3
--
-- Hoort bij briefing_code_tarieven_v3.md. Vervangt het prijsdeel van de
-- migratie van dezelfde dag (migratie-certificering-2026-09-09.sql); alles wat
-- daar over module, toets, register en betalingen staat blijft ongewijzigd.
--
-- Draait NA migratie-certificering-2026-09-09.sql: dit blok bouwt voort op de
-- tabel producten, de tabel bestellingen en de kolommen licentie_actief en
-- licentie_tot die daar worden aangemaakt.
--
-- Herhaalbaar: create if not exists, on conflict do update, en elke policy
-- wordt eerst gedropt. Draaien in de SQL-editor van uqulkznqcqpbagbvtqdr.
--
-- LET OP, in twee delen.
--   BLOK A tot en met H voegt toe en verandert niets aan wat nu verkocht wordt.
--   Dat kan vandaag draaien.
--   BLOK Z zet de oude productcodes uit. Zodra dat blok draait kan niemand meer
--   een TF of HM kopen, en de knoppen in teamkracht.html vragen nog om die
--   codes. Blok Z hoort dus pas te draaien op het moment dat de nieuwe
--   PAK-codes in de code staan, niet eerder.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOK A · de producttabel krijgt een staffel
--
-- Het pakket heeft zeven prijzen en de hermeting zes. Dat zijn dus zeven en zes
-- rijen, want code is de primaire sleutel en bestellingen.product_code wijst
-- ernaar. Een rij per prijsniveau heeft er nog een voordeel: in de bestelling
-- staat achteraf niet alleen wat er is gekocht maar ook tegen welke lijn, en
-- dat is precies wat je bij een vraag over een factuur wilt weten.
--
-- groep zegt wat het is (PAK, HM, ORG, PRO, BUR), prijsniveau tegen welke lijn.
-- De frontend vraagt nooit om een code maar om een groep; het niveau komt uit
-- de view gebruiker_prijsniveau in blok H.
alter table public.producten
  add column if not exists groep         text,
  add column if not exists prijsniveau   text,
  -- Alleen gevuld bij ORG en BUR. null betekent onbeperkt bij een staffel die
  -- seats kent, en niet van toepassing bij de rest; groep zegt welke van twee.
  add column if not exists seats_max     int,
  add column if not exists pak_tegoed    int,
  -- Waar dit product na het eerste jaar in overgaat. Alleen PRO-START heeft
  -- dit: het eerste jaar zit in de instapprijs, daarna loopt PRO-J.
  add column if not exists verlengt_als  text;

alter table public.producten drop constraint if exists producten_groep_check;
alter table public.producten add constraint producten_groep_check
  check (groep is null or groep in ('PAK','HM','ORG','PRO','BUR','LEZ','BEG','OPL'));

alter table public.producten drop constraint if exists producten_prijsniveau_check;
alter table public.producten add constraint producten_prijsniveau_check
  check (prijsniveau is null or prijsniveau in ('los','org1','org2','org3','pro','bur','bur_extra'));

-- Binnen een groep hoort een prijsniveau maar een keer voor te komen, anders
-- weet de prijsbepaling niet welke rij ze moet pakken.
create unique index if not exists producten_groep_niveau_idx
  on public.producten (groep, prijsniveau) where actief = true and prijsniveau is not null;

-- Fase B bestond nog niet als waarde.
alter table public.producten drop constraint if exists producten_fase_check;
alter table public.producten add constraint producten_fase_check
  check (fase in ('bestaand','A','B','later'));

-- Een bundel is geen van de vier bestaande soorten: PRO-START is een
-- certificaat plus een abonnement plus tegoed in een aankoop.
alter table public.producten drop constraint if exists producten_soort_check;
alter table public.producten add constraint producten_soort_check
  check (soort in ('meting','certificering','licentie','credit','bundel'));

alter table public.producten drop constraint if exists producten_verlengt_fk;
alter table public.producten add constraint producten_verlengt_fk
  foreign key (verlengt_als) references public.producten(code);


-- ---------------------------------------------------------------------------
-- BLOK B · het pakket en de hermeting, een rij per lijn
--
-- Bedragen in centen exclusief btw, zoals overal. Bureau binnen tegoed staat er
-- als rij van nul: dat is geen gratis product maar de boeking die het tegoed
-- afschrijft, en zonder rij is er niets om de bestelling aan te hangen.
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, prijsniveau, bevat, voorwaarde) values
('PAK-LOS',      'Pakket Teamfoto en hermeting',                34500, 'eenmalig', 'meting', 'A', 'PAK', 'los',       'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Een team, minimaal het aantal deelnemers uit teamkracht_config'),
('PAK-ORG1',     'Pakket Teamfoto en hermeting, Organisatie',   19500, 'eenmalig', 'meting', 'A', 'PAK', 'org1',      'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopend abonnement Organisatie klein'),
('PAK-ORG2',     'Pakket Teamfoto en hermeting, Organisatie',   17500, 'eenmalig', 'meting', 'A', 'PAK', 'org2',      'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopend abonnement Organisatie midden'),
('PAK-ORG3',     'Pakket Teamfoto en hermeting, Organisatie',   14500, 'eenmalig', 'meting', 'A', 'PAK', 'org3',      'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopend abonnement Organisatie groot'),
('PAK-PRO',      'Pakket Teamfoto en hermeting, Professional',  14500, 'eenmalig', 'meting', 'B', 'PAK', 'pro',       'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopende Professional-licentie'),
('PAK-BUR',      'Pakket uit het bureautegoed',                     0, 'eenmalig', 'meting', 'B', 'PAK', 'bur',       'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Bureaubundel met tegoed over'),
('PAK-BUR-EXTRA','Pakket boven het bureautegoed',               12500, 'eenmalig', 'meting', 'B', 'PAK', 'bur_extra', 'De Teamfoto van een team plus een hermeting binnen zes maanden', 'Lopende bureaubundel'),
('HM-LOS',       'Extra hermeting',                             14500, 'eenmalig', 'meting', 'A', 'HM',  'los',       'Het eindbeeld over het startbeeld',  'Eerder een Teamfoto voor dit team'),
('HM-ORG1',      'Extra hermeting, Organisatie',                 9500, 'eenmalig', 'meting', 'A', 'HM',  'org1',      'Het eindbeeld over het startbeeld',  'Lopend abonnement Organisatie klein'),
('HM-ORG2',      'Extra hermeting, Organisatie',                 9500, 'eenmalig', 'meting', 'A', 'HM',  'org2',      'Het eindbeeld over het startbeeld',  'Lopend abonnement Organisatie midden'),
('HM-ORG3',      'Extra hermeting, Organisatie',                 7500, 'eenmalig', 'meting', 'A', 'HM',  'org3',      'Het eindbeeld over het startbeeld',  'Lopend abonnement Organisatie groot'),
('HM-PRO',       'Extra hermeting, Professional',                9500, 'eenmalig', 'meting', 'B', 'HM',  'pro',       'Het eindbeeld over het startbeeld',  'Lopende Professional-licentie'),
('HM-BUR',       'Extra hermeting, Bureau',                      7500, 'eenmalig', 'meting', 'B', 'HM',  'bur',       'Het eindbeeld over het startbeeld',  'Lopende bureaubundel')
on conflict (code) do update set
  naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, interval = excluded.interval,
  soort = excluded.soort, fase = excluded.fase, groep = excluded.groep,
  prijsniveau = excluded.prijsniveau, bevat = excluded.bevat, voorwaarde = excluded.voorwaarde,
  actief = true, updated_at = now();


-- ---------------------------------------------------------------------------
-- BLOK C · de drie abonnementslijnen
--
-- Organisatie is fase A, Professional en Bureau zijn fase B. Ze staan er nu al
-- in omdat de prijsbepaling ze kent en de tests ze doorrekenen; de prijslijst
-- in blok H laat alleen fase A en bestaand naar buiten.
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, seats_max, pak_tegoed, verlengt_als, bevat, voorwaarde) values
('ORG-1',  'Organisatie klein',        49000, 'jaar',     'licentie', 'A', 'ORG',    3, null, null, 'Organisatiedashboard, drie seats, pakketten tegen 195 euro', null),
('ORG-2',  'Organisatie midden',       99000, 'jaar',     'licentie', 'A', 'ORG',   10, null, null, 'Organisatiedashboard, tien seats, pakketten tegen 175 euro', null),
('ORG-3',  'Organisatie groot',       199000, 'jaar',     'licentie', 'A', 'ORG', null, null, null, 'Organisatiedashboard, onbeperkt seats, pakketten tegen 145 euro', null),
('PRO-M',  'Professional, maand',       5900, 'maand',    'licentie', 'B', 'PRO', null, null, null, 'Licentie, register, leadknop, doelbeeld-tool, intervisie', 'Certificaat Begeleider'),
('PRO-J',  'Professional, jaar',       59000, 'jaar',     'licentie', 'B', 'PRO', null, null, null, 'Licentie, register, leadknop, doelbeeld-tool, intervisie', 'Certificaat Begeleider'),
('BUR-1',  'Bureau klein',            249000, 'jaar',     'licentie', 'B', 'BUR',    3,  15, null, 'Vijftien pakketten, drie Professional-seats', null),
('BUR-2',  'Bureau midden',           490000, 'jaar',     'licentie', 'B', 'BUR',   10,  40, null, 'Veertig pakketten, tien Professional-seats, bureaulogo op de kaart', null),
('BUR-3',  'Bureau groot',            990000, 'jaar',     'licentie', 'B', 'BUR', null, 100, null, 'Honderd pakketten, onbeperkt seats, bureaulogo en eigen registerpagina', null)
on conflict (code) do update set
  naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, interval = excluded.interval,
  soort = excluded.soort, fase = excluded.fase, groep = excluded.groep,
  seats_max = excluded.seats_max, pak_tegoed = excluded.pak_tegoed,
  bevat = excluded.bevat, voorwaarde = excluded.voorwaarde,
  actief = true, updated_at = now();


-- ---------------------------------------------------------------------------
-- BLOK C2 · certificering en de twee bundels
--
-- PRO-START is de enige rij met verlengt_als gevuld. Dat is geen sierveld: de
-- checkout leest het en zet er het abonnement op dat na het eerste jaar begint
-- te lopen.
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, verlengt_als, bevat, voorwaarde) values
('BEG-1',     'Begeleider, certificering', 89500, 'eenmalig', 'certificering', 'B',     'BEG', null,    'Opleidingsdag, drie intervisies, certificaat, badge, register', 'Geldig Lezer-certificaat'),
('PRO-START', 'Professional, startpakket',125000, 'eenmalig', 'bundel',        'B',     'PRO', 'PRO-J', 'Certificering Begeleider, twaalf maanden licentie, vijf pakketten tegoed', 'Geldig Lezer-certificaat'),
('OPL-P',     'Opleider, partner',             0, 'eenmalig', 'certificering', 'later', 'OPL', null,    'Op maat voor instituten met meer dan honderd deelnemers per jaar', 'Handmatig, niet online te koop')
on conflict (code) do update set
  naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw, soort = excluded.soort,
  fase = excluded.fase, groep = excluded.groep, verlengt_als = excluded.verlengt_als,
  bevat = excluded.bevat, voorwaarde = excluded.voorwaarde,
  actief = true, updated_at = now();

-- LEZ-2 is vervallen (besluit 10-09-2026). De weg naar de module loopt niet meer
-- via een bundel met een abonnement erin: een Organisatie-abonnement geeft de
-- beheerder zelf toegang tot de module en de toets. Zie blok D2.
--
-- De rij is nooit verkocht en staat ook niet meer in de bronmigratie. Deze
-- delete is er alleen voor het geval het blok van 09-09 ergens al is gedraaid;
-- de voorwaarde zorgt dat er nooit een rij verdwijnt waar een bestelling aan
-- hangt.
delete from public.producten p
 where p.code = 'LEZ-2'
   and not exists (select 1 from public.bestellingen b where b.product_code = 'LEZ-2');

update public.producten set groep = 'LEZ', updated_at = now() where code = 'LEZ-1';

-- Nieuwe prijzen voor drie rijen die nooit verkocht zijn. Bij een rij waar wel
-- een bestelling aan hangt zou dit niet mogen: dan hoort er een nieuwe rij te
-- komen en gaat de oude op actief = false, zoals sectie 8.7 voorschrijft.
-- Vandaar de voorwaarde; die maakt dit blok ook veilig om nog eens te draaien.
update public.producten p set
  prijs_ex_btw = v.prijs, naam = v.naam, bevat = v.bevat, groep = v.groep, updated_at = now()
from (values
  ('LEZ-10',   199000, 'Lezer, tien plekken',      'Tien maal toegang tot de module en de toets, plus twaalf maanden Organisatie midden', 'LEZ'),
  ('CERT-AFD',  14500, 'Certificaatcredit',        'Een uit te reiken certificaat',                                  'OPL'),
  ('OPL-1',    250000, 'Opleider, instap',         'Train de trainer en het eerste jaar opleiderslicentie',           'OPL'),
  ('OPL-2',    325000, 'Opleider, met startpakket','Opleider instap plus tien certificaatcredits en marketingpakket', 'OPL')
) as v(code, prijs, naam, bevat, groep)
where p.code = v.code
  and not exists (select 1 from public.bestellingen b where b.product_code = p.code);

update public.producten set groep = 'OPL', updated_at = now() where code = 'LIC-OPL';


-- ---------------------------------------------------------------------------
-- BLOK D · de gebruiker krijgt een lijn
--
-- lijn is de handmatige stand. Wat er werkelijk geldt komt uit de view in blok
-- H, want lidmaatschap van een organisatie of bureau verloopt vanzelf en een
-- kolom die dat moet bijhouden loopt een keer achter.
alter table public.teamkracht_gebruikers
  add column if not exists lijn       text not null default 'los',
  add column if not exists beta       boolean not null default false,
  add column if not exists beta_tot   date,
  -- Alleen bij PRO-START: vijf pakketten die binnen de licentieperiode gelden.
  add column if not exists pak_tegoed int not null default 0,
  -- Zie blok D2.
  add column if not exists lezer_module_toegang boolean not null default false;

alter table public.teamkracht_gebruikers drop constraint if exists teamkracht_gebruikers_lijn_check;
alter table public.teamkracht_gebruikers add constraint teamkracht_gebruikers_lijn_check
  check (lijn in ('los','organisatie','professional','bureau'));


-- ---------------------------------------------------------------------------
-- BLOK D2 · toegang tot de Lezer-module
--
-- Besluit 10-09-2026. Toegang tot hoofdstuk 3 tot en met 6 en de toets hing tot
-- nu toe aan een betaalde bestelling op LEZ-1 of LEZ-2. Dat kan niet meer:
-- LEZ-2 is vervallen, en een Organisatie-abonnement geeft de beheerder toegang
-- zonder dat er een LEZ-rij aan te pas komt. Er zijn dus drie bronnen voor
-- hetzelfde recht, en dan hoort er een veld te zijn in plaats van een afleiding.
--
-- lezer_module_toegang gaat op true bij:
--   - aankoop LEZ-1
--   - aankoop LEZ-10, voor elk van de tien plekken
--   - aanmaak van een organisatie, voor de beheerder (ORG-1, ORG-2, ORG-3)
--
-- Wat het NIET doet: een niveau zetten. niveau = 'lezer' komt uitsluitend na een
-- geslaagde toets. Toegang tot de module is iets anders dan het certificaat, en
-- dat verschil is de hele waarde van het register.
--
-- Verloopt het abonnement, dan blijft de toegang staan. Iemand die halverwege
-- hoofdstuk 4 zit hoort niet buiten te staan omdat de beheerder een factuur
-- vergat; het certificaat is waar het abonnement over gaat, niet het lezen.

-- Wie de module al heeft gekocht houdt zijn toegang. Herhaalbaar, en overbodig
-- zodra er geen bestellingen van voor deze migratie meer bijkomen.
update public.teamkracht_gebruikers g set lezer_module_toegang = true
 where lezer_module_toegang = false
   and exists (select 1 from public.bestellingen b
                where b.gebruiker_id = g.user_id
                  and b.status = 'betaald'
                  and b.product_code in ('LEZ-1','LEZ-2','LEZ-10'));

-- En wie nu al beheerder is van een organisatie.
update public.teamkracht_gebruikers g set lezer_module_toegang = true
 where lezer_module_toegang = false
   and exists (select 1 from public.organisatie_leden l
                where l.user_id = g.user_id and l.rol = 'beheerder');


-- ---------------------------------------------------------------------------
-- BLOK E · het hermetingtegoed hangt aan het team
--
-- Bewust bij het team en niet bij de gebruiker. Het pakket is voor een team
-- gekocht, en als de coach wisselt hoort de hermeting bij het team te blijven.
alter table public.teamkracht_teams
  add column if not exists hermeting_tegoed int  not null default 0,
  add column if not exists hermeting_tot    date,
  -- Welke bestelling het tegoed heeft gebracht, zodat een terugbetaling is
  -- terug te vinden zonder de bestellingen af te zoeken.
  add column if not exists pakket_bestelling_id uuid references public.bestellingen(id) on delete set null;

alter table public.teamkracht_teams drop constraint if exists teamkracht_teams_tegoed_check;
alter table public.teamkracht_teams add constraint teamkracht_teams_tegoed_check
  check (hermeting_tegoed >= 0);


-- ---------------------------------------------------------------------------
-- BLOK F · organisaties
--
-- Een organisatie is een abonnement met seats. Teams blijven van hun coach; de
-- organisatie is alleen de bril waardoor de beheerder ze bij elkaar ziet en de
-- lijn waartegen de pakketten worden afgerekend.
create table if not exists public.organisaties (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  naam              text not null,
  staffel           text not null check (staffel in ('klein','midden','groot')),
  seats_max         int,                      -- null is onbeperkt, bij groot
  abonnement_tot    date not null,
  beheerder_user_id uuid not null references auth.users(id) on delete restrict,
  product_code      text references public.producten(code),
  actief            boolean not null default true
);

create table if not exists public.organisatie_leden (
  organisatie_id uuid not null references public.organisaties(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  rol            text not null default 'gebruiker' check (rol in ('beheerder','gebruiker')),
  toegevoegd_op  timestamptz not null default now(),
  primary key (organisatie_id, user_id)
);

-- Een gebruiker heeft precies een lijn, dus hoogstens een organisatie. Zonder
-- deze index zou de view uit blok H twee rijen per gebruiker kunnen geven.
create unique index if not exists organisatie_leden_user_idx
  on public.organisatie_leden (user_id);

alter table public.organisaties      enable row level security;
alter table public.organisatie_leden enable row level security;

drop policy if exists "eigen organisatie lezen" on public.organisaties;
create policy "eigen organisatie lezen" on public.organisaties
  for select to authenticated using (
    beheerder_user_id = auth.uid()
    or exists (select 1 from public.organisatie_leden l
               where l.organisatie_id = organisaties.id and l.user_id = auth.uid())
  );

drop policy if exists "eigen leden lezen" on public.organisatie_leden;
create policy "eigen leden lezen" on public.organisatie_leden
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.organisaties o
               where o.id = organisatie_leden.organisatie_id and o.beheerder_user_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- BLOK G · bureaus
--
-- Zelfde opzet, met een tegoed erbij. pak_verbruikt loopt op en wordt nooit
-- teruggezet; bij verlenging komt er een nieuwe bundelperiode en gaat de teller
-- op nul. Het tegoed vervalt aan het einde van het jaar, dus de vergelijking is
-- altijd verbruikt tegen tegoed binnen deze periode.
create table if not exists public.bureaus (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  naam              text not null,
  staffel           text not null check (staffel in ('klein','midden','groot')),
  pak_tegoed        int  not null default 0 check (pak_tegoed >= 0),
  pak_verbruikt     int  not null default 0 check (pak_verbruikt >= 0),
  seats_max         int,
  abonnement_tot    date not null,
  beheerder_user_id uuid not null references auth.users(id) on delete restrict,
  logo_url          text,
  product_code      text references public.producten(code),
  actief            boolean not null default true
);

create table if not exists public.bureau_leden (
  bureau_id     uuid not null references public.bureaus(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  rol           text not null default 'gebruiker' check (rol in ('beheerder','gebruiker')),
  toegevoegd_op timestamptz not null default now(),
  primary key (bureau_id, user_id)
);

create unique index if not exists bureau_leden_user_idx
  on public.bureau_leden (user_id);

alter table public.bureaus      enable row level security;
alter table public.bureau_leden enable row level security;

drop policy if exists "eigen bureau lezen" on public.bureaus;
create policy "eigen bureau lezen" on public.bureaus
  for select to authenticated using (
    beheerder_user_id = auth.uid()
    or exists (select 1 from public.bureau_leden l
               where l.bureau_id = bureaus.id and l.user_id = auth.uid())
  );

drop policy if exists "eigen bureauleden lezen" on public.bureau_leden;
create policy "eigen bureauleden lezen" on public.bureau_leden
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.bureaus b
               where b.id = bureau_leden.bureau_id and b.beheerder_user_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- BLOK H · welke prijs geldt voor wie
--
-- De volgorde uit sectie 1 van de briefing, letterlijk: beta gaat voor lijn en
-- staffel, en wie geen van beide heeft valt op los. Een view en geen kolom,
-- want een abonnement verloopt op een datum en niemand zet dan een vlag om.
--
-- Bewust geen security_invoker: de view leest tabellen die de gebruiker zelf
-- niet mag lezen en geeft alleen zijn eigen niveau terug.
create or replace view public.gebruiker_prijsniveau as
select
  g.user_id,
  case
    when g.beta and (g.beta_tot is null or g.beta_tot >= current_date) then 'beta'
    when b.id is not null and b.actief and b.abonnement_tot >= current_date
      then case when b.pak_tegoed > b.pak_verbruikt then 'bur' else 'bur_extra' end
    when g.licentie_actief and g.lijn = 'professional'
         and (g.licentie_tot is null or g.licentie_tot >= current_date) then 'pro'
    when o.id is not null and o.actief and o.abonnement_tot >= current_date
      then case o.staffel when 'klein' then 'org1' when 'midden' then 'org2' else 'org3' end
    else 'los'
  end as prijsniveau,
  b.id as bureau_id,
  o.id as organisatie_id
from public.teamkracht_gebruikers g
left join public.bureau_leden      bl on bl.user_id = g.user_id
left join public.bureaus            b on b.id  = bl.bureau_id
left join public.organisatie_leden ol on ol.user_id = g.user_id
left join public.organisaties       o on o.id  = ol.organisatie_id;

revoke all on public.gebruiker_prijsniveau from public;
grant select on public.gebruiker_prijsniveau to authenticated;

-- De openbare prijslijst krijgt de staffelvelden erbij. Kolommen mogen er bij
-- create or replace alleen achteraan bij, vandaar de volgorde.
create or replace view public.prijslijst as
select code, naam, prijs_ex_btw, btw_promille, interval, soort, bevat, voorwaarde,
       groep, prijsniveau, seats_max, pak_tegoed, verlengt_als
from public.producten
where actief = true and fase in ('bestaand','A');

revoke all on public.prijslijst from public;
grant select on public.prijslijst to anon, authenticated;


-- ---------------------------------------------------------------------------
-- BLOK G2 · openstaande seats
--
-- Een beheerder nodigt uit op e-mailadres, ook als die persoon nog geen account
-- heeft. Zonder deze tabel kun je alleen mensen toevoegen die toevallig al zijn
-- ingelogd, en dat is geen seatbeheer maar een toevalstreffer.
--
-- De uitnodiging wordt ingelost bij de eerste inlog van dat adres. Daarna blijft
-- de rij staan met gebruikt_op gevuld, zodat een beheerder kan zien wie hij
-- wanneer heeft uitgenodigd.
create table if not exists public.seat_uitnodigingen (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  soort          text not null check (soort in ('organisatie','bureau')),
  organisatie_id uuid references public.organisaties(id) on delete cascade,
  bureau_id      uuid references public.bureaus(id) on delete cascade,
  email          text not null,
  rol            text not null default 'gebruiker' check (rol in ('beheerder','gebruiker')),
  uitgenodigd_door uuid references auth.users(id) on delete set null,
  gebruikt_op    timestamptz,
  ingetrokken_op timestamptz,
  check ((soort = 'organisatie' and organisatie_id is not null and bureau_id is null)
      or (soort = 'bureau'      and bureau_id is not null and organisatie_id is null))
);

-- Eén openstaande uitnodiging per adres. Twee zou betekenen dat het van de
-- volgorde afhangt in welke organisatie iemand terechtkomt.
create unique index if not exists seat_uitnodiging_open_idx
  on public.seat_uitnodigingen (lower(email))
  where gebruikt_op is null and ingetrokken_op is null;

alter table public.seat_uitnodigingen enable row level security;

drop policy if exists "eigen uitnodigingen lezen" on public.seat_uitnodigingen;
create policy "eigen uitnodigingen lezen" on public.seat_uitnodigingen
  for select to authenticated using (
    exists (select 1 from public.organisaties o
            where o.id = seat_uitnodigingen.organisatie_id and o.beheerder_user_id = auth.uid())
    or exists (select 1 from public.bureaus b
            where b.id = seat_uitnodigingen.bureau_id and b.beheerder_user_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- BLOK H2 · het bundeltegoed afboeken
--
-- Eén pakket van het tegoed af, in één stap. Lezen, optellen en terugschrijven
-- vanuit de route zou betekenen dat twee aankopen op hetzelfde moment samen één
-- pakket kosten. Geeft terug hoeveel er daarna over is, of null als het tegoed
-- al op was of de bundel niet meer loopt.
create or replace function public.verbruik_bureau_tegoed(p_bureau_id uuid)
returns int
language sql
security definer
set search_path = public
as $$
  update public.bureaus
     set pak_verbruikt = pak_verbruikt + 1
   where id = p_bureau_id
     and actief = true
     and abonnement_tot >= current_date
     and pak_verbruikt < pak_tegoed
  returning pak_tegoed - pak_verbruikt;
$$;

revoke all on function public.verbruik_bureau_tegoed(uuid) from public, anon, authenticated;


-- ===========================================================================
-- BLOK Z · de omschakeling
--
-- Draaien op het moment dat de nieuwe codes in de code staan, niet eerder.
-- Zolang dit blok niet is gedraaid werkt de winkel van vandaag gewoon door.
-- ===========================================================================

-- TF en HM uit v1 vervallen; het pakket komt ervoor in de plaats. Niet
-- verwijderen: bestellingen wijzen ernaar en een factuur van vorige week hoort
-- te blijven kloppen.
update public.producten set actief = false, updated_at = now()
  where code in ('TF','HM','BEG-2','BEG-8','LIC-ORG-10','LIC-ORG-30','LIC-ORG-X');

-- LIC-M en LIC-J, de persoonlijke licentie van 29 en 290 euro uit v1. Ze staan
-- niet in het rijtje dat vervalt maar ze moeten wel weg: ze beloven onbeperkt
-- gratis metingen, terwijl een Professional in v3 145 euro per pakket betaalt.
-- Bevestigd op 10 september 2026: er is er geen een verkocht, dus er is geen
-- klant die er recht aan ontleent. De lijn Professional (PRO-M, PRO-J) komt
-- ervoor in de plaats.
update public.producten set actief = false, updated_at = now()
  where code in ('LIC-M','LIC-J');


-- ===========================================================================
-- Wat hier is aangenomen, en waarom
--
-- 1. Prijsniveau 'bur' staat niet in het rijtje van sectie 1 (los, org1, org2,
--    org3, pro, bur_extra) maar is wel nodig: een pakket uit het bureautegoed
--    kost nul en heeft toch een rij, anders is er niets om de afboeking aan te
--    hangen.
-- 2. De tabel heet bestellingen en niet betalingen. Die tabel ligt er al sinds
--    de migratie van 08-09-2026, doet precies wat sectie 8.5 vraagt, en er
--    staan rijen in. Een tweede tabel ernaast zou betekenen dat een omzetvraag
--    op twee plekken moet worden gesteld.
-- 3. Er is geen kolom met een extern product-id. De betaalprovider is Mollie en
--    die kent geen productcatalogus: deze tabel IS de catalogus. Een bedrag
--    gaat per betaling mee, dus er is niets om mee te synchroniseren.
-- 4. Het minimum aantal deelnemers staat niet in dit bestand. Dat is een
--    meetregel en die hoort in teamkracht_config.min_deelnemers_kaart, waar hij
--    op vijf staat. Sectie 0 van de briefing noemt acht; zie het rapport.
-- ===========================================================================
