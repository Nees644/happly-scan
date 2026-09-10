> **Bron van waarheid.** Dit bestand in de repo is leidend. Een kopie in
> Downloads of Drive is een werkversie; wijk je daarvan af, werk dan dit bestand
> bij. Zie CLAUDE.md.
>
> **Gecorrigeerd ten opzichte van de aangeleverde versie:** waar de briefing acht
> deelnemers noemt staat hier vijf, het besluit van 7, 8 en 9 september 2026.

# Briefing Code · Teamkracht, fase 1 (startbeeld)

> Naamgeving: Zelfkracht is het individu (de Zelfkracht Index), Teamkracht is de optelsom van het team. De eerdere werknaam Samenspel wordt nergens meer gebruikt, ook niet in code, tabellen of commit-boodschappen.

Versie 5 september 2026. Voor Claude Code in de repo `Nees644/happly-scan` (Vercel, Supabase project `uqulkznqcqpbagbvtqdr`). Opdrachtgever: Maarten Neeskens. Inhoudelijk model: Google Doc "Teamkracht · model v4 keten (5 september 2026)" in de Drive-root.

## 0. Wat we bouwen en waarom

De Zelfkracht Index meet per deelnemer drie vaardigheden: Zien, Sturen, Doen (elk 0 tot 100). Een coach zet de meting in bij een team en krijgt een Teamfoto. Teamkracht is de pagina in die Teamfoto die laat zien hoe de vaardigheden van de teamleden op elkaar inwerken: waar de keten zien, sturen, doen in dit team breekt, welke profielen er zijn, en welke drie dynamieken het meest waarschijnlijk zijn, elk met één interventie en één gespreksvraag.

Fase 1 levert het startbeeld: de Teamkrachtkaart als pagina in de Teamfoto en als posterexport, plus de profielnaam en profieltekst in de individuele uitslag van de deelnemer. Fase 2 (doelbeeld en interventieplan) en fase 3 (eindbeeld en feedbacklus) komen later; hun datastructuur wordt nu al aangelegd zodat er later niets omgebouwd hoeft te worden.

Geen AI in dit onderdeel. Alles is rekenwerk, een regeltabel en rendering. Teksten worden beheerd in de database en door de opdrachtgever aangepast zonder code.

## 1. Werkregels, niet onderhandelbaar

1. **Anonimiteit.** Individuele scores en profielen zijn alleen zichtbaar voor de deelnemer zelf. De Teamkrachtkaart toont nooit namen, e-mailadressen of iets waarmee een lijn of stip aan een persoon te koppelen is. Bij minder dan tien deelnemers in een meting toont de kaart alleen de teamlijn en de profielverdeling in aantallen; geen individuele lijnen. Dit is een harde regel in de code, geen instelling.
2. **Nooit voor beoordeling, selectie of matching.** Geen export van individuele profielen naar de coach of het bedrijf. Geen zoek- of filterfunctie op profiel per persoon. Geen API-route die individuele scores met identificatie teruggeeft aan iemand anders dan de deelnemer.
3. **Taal.** Nederlands. Geen streepjes als gedachtestreep in teksten (gebruik komma, dubbele punt of puntkomma). Geen uitroeptekens. Alles wat het instrument over een team zegt heet "waarschijnlijk"; nooit "dit team is". Een profiel is een patroon in deze context, geen type; dat zinnetje staat op elke kaart en in elke individuele uitslag.
4. **Huisstijl.** Zelfde lettertypen en kleuren als de Teamfoto en de site: DM Serif Display voor koppen, DM Sans voor tekst, inkt `#1A0B2E`, magenta `#D6026F`, papier `#F7F3F0`, lavendel `#B9AECB`, lijn `#E2D8D2`. Magenta is uitsluitend voor het landelijke beeld en voor accenten; het team is inkt.
5. **Vector.** De kaart is SVG, ook in de PDF, zodat de posterexport op A1 scherp is.
6. **Akkoordmomenten.** Vraag akkoord aan de opdrachtgever vóór: (a) het draaien van een migratie op de productiedatabase, (b) het wijzigen van de bestaande Teamfoto- of uitslagpagina, (c) deploy naar productie. Werk tot die tijd op een preview-deploy.

## 2. Stap 0: inventariseer eerst, bouw daarna

Voordat je iets bouwt, breng je in kaart en rapporteer je in één bericht:

- Hoe teams en metingen nu zijn gemodelleerd (campagnes in `dashboard.html`, tabel `scan_results` of `index_scan_results`, koppeling van een meting aan een team, medewerker- versus leidinggevendelink).
- Of er al een Teamfoto-PDF wordt gegenereerd in code (zoek naar Playwright, pdf, teamfoto). Zo ja: waar, en hoe een pagina wordt toegevoegd. Zo nee: stel een minimale route voor (HTML-template plus Playwright of Vercel-compatibele PDF-generatie) en wacht op akkoord.
- Hoe de individuele uitslag wordt gerenderd (`uitslag`, `duiding.js`) en waar profielnaam en profieltekst erbij kunnen.
- Hoe het landelijke beeld nu wordt berekend (gemiddelde per vaardigheid over `index_scan_results`), en of er een standaarddeviatie beschikbaar is.

Bouw pas na akkoord op dit rapport.

## 3. Datamodel (migratie, alle drie de fasen in één keer)

Alle tabellen met RLS aan, geen anon-policies, lezen alleen voor `authenticated` waar aangegeven, schrijven alleen via serverside API-routes met de service role key. Consistent met het bestaande beleid in `supabase.sql`.

```sql
-- Instellingen voor profielbepaling. Eén rij, beheerd via dashboard.
create table if not exists public.teamkracht_config (
  id                 int primary key default 1,
  middenband_sd      numeric not null default 0.25,  -- breedte middenband in standaarddeviaties
  min_deelnemers_lijnen int not null default 10,     -- onder dit aantal geen individuele lijnen
  norm_bron          text not null default 'landelijk', -- 'landelijk' of 'vast'
  norm_zien          numeric, norm_sturen numeric, norm_doen numeric,  -- alleen bij norm_bron = 'vast'
  sd_zien            numeric, sd_sturen numeric, sd_doen numeric,
  updated_at         timestamptz not null default now()
);

-- Profielteksten. Sleutel is het patroon: 'HHH','HLL', enz. (Zien, Sturen, Doen; H = hoog, L = laag, M = middenband)
create table if not exists public.teamkracht_profielen (
  code            text primary key,      -- 'HHH','HLL','HHL','HLH','LHH','LLH','LHL','LLL','MMM'
  naam            text not null,          -- Trekker, Ziener, ...
  zo_ziet_het_eruit text, zin text, voegt_toe text, kost_team text, kost_persoon text,
  breuk           text, ontwikkelrichting text, valkuil_coach text,
  tekst_deelnemer text,                   -- de versie voor in de individuele uitslag, ik-vorm, vriendelijk
  actief          boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- Regelbibliotheek. Voorwaarde als JSON zodat de opdrachtgever hem in het dashboard kan bewerken.
create table if not exists public.teamkracht_regels (
  code            text primary key,      -- 'R1'..'R10'
  titel           text not null,          -- korte kop op de kaart
  richting        text not null check (richting in ('versterkt','remt','neutraal')),
  voorwaarde      jsonb not null,         -- zie 5
  dynamiek        text not null,
  signaal         text,
  interventie     text not null,
  gespreksvraag   text not null,
  gewicht_opslag  numeric not null default 0,  -- extra gewicht, bv 0.15 voor remmende regels
  actief          boolean not null default true,
  volgorde        int,
  updated_at      timestamptz not null default now()
);

-- Berekend teambeeld per meting (start of hermeting). Geen persoonsgegevens.
create table if not exists public.teamkracht_teambeeld (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  campagne_id     uuid not null,          -- koppel aan de bestaande team/campagne-sleutel
  soort           text not null check (soort in ('start','hermeting')),
  n               int not null,
  team_zien numeric, team_sturen numeric, team_doen numeric,
  norm_zien numeric, norm_sturen numeric, norm_doen numeric,   -- het landelijke beeld op het moment van berekenen, bevroren
  verdeling       jsonb not null,         -- {"HHH":1,"HLL":4,...}
  breuk           text,                   -- 'zien_sturen','sturen_doen','geen','begin'
  dynamieken      jsonb not null,         -- [{"code":"R1","score":0.62},...] de drie gekozen
  lijnen          jsonb,                  -- alleen als n >= min_deelnemers_lijnen: [[z,s,d],...] zonder id, gesorteerd op zien, afgerond op hele punten
  config_snapshot jsonb                   -- middenband_sd etc. op het moment van berekenen
);

-- Fase 2, nu alleen aanleggen.
create table if not exists public.teamkracht_doel (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  teambeeld_id uuid not null references public.teamkracht_teambeeld(id),
  doel_code text,                          -- 'naar_landelijk','halverwege','bundel'
  doel_zien numeric, doel_sturen numeric, doel_doen numeric,
  gekozen_door text                        -- 'team' of 'coach'
);

create table if not exists public.teamkracht_interventies (
  code text primary key, titel text not null, breuk text, profielen jsonb,
  tekst text not null, eigenaar_suggestie text, ritme text, telling text,
  actief boolean not null default true, volgorde int
);

create table if not exists public.teamkracht_plan (
  id uuid primary key default gen_random_uuid(),
  doel_id uuid not null references public.teamkracht_doel(id),
  interventie_code text, eigen_tekst text, eigenaar text, ritme text, telling text, volgorde int
);

-- Fase 3, nu alleen aanleggen. Nooit persoonsgebonden.
create table if not exists public.teamkracht_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  teambeeld_id uuid not null references public.teamkracht_teambeeld(id),
  moment text not null check (moment in ('sessie','week5','hermeting')),
  dynamiek_code text, herkend text check (herkend in ('ja','deels','nee')),
  plan_id uuid, uitgevoerd text, telling_waarde int, treffend text
);
```

Voeg aan de bestaande metingstabel toe (kolomnamen aanpassen aan wat stap 0 oplevert):

```sql
alter table public.index_scan_results
  add column if not exists profiel_code text;   -- alleen zichtbaar voor de deelnemer zelf via de eigen uitslag
```

## 4. Profielbepaling

Input per deelnemer: `zien`, `sturen`, `doen`. Input norm: per vaardigheid gemiddelde `m` en standaarddeviatie `sd` over alle metingen in `index_scan_results` (norm_bron 'landelijk'), of vaste waarden uit `teamkracht_config`.

Per vaardigheid:
- `H` als score > m + middenband_sd × sd
- `L` als score < m − middenband_sd × sd
- anders `M`

Profielcode is de drie letters in de volgorde Zien, Sturen, Doen. Mapping naar naam via `teamkracht_profielen`. Codes met één of twee `M` die niet `MMM` zijn: rond af naar het dichtstbijzijnde H/L-patroon per vaardigheid (score boven m wordt H, onder m wordt L) en markeer `afgerond = true` in de lijnen-JSON. `MMM` blijft middenband.

Teamlijn: gemiddelde per vaardigheid over alle deelnemers van de meting. Breuk: bereken de verschillen `team_zien − norm_zien`, `team_sturen − norm_sturen`, `team_doen − norm_doen`. De breuk is de overgang waar het verschil het sterkst daalt: `zien_sturen` of `sturen_doen`. Als beide dalingen kleiner zijn dan 3 punten: `geen`. Als alle drie de verschillen negatief zijn en er geen duidelijke daling is: `begin`.

Het landelijke beeld op het moment van berekenen wordt bevroren in `teamkracht_teambeeld`, zodat het startbeeld later niet verschuift als de norm verandert. Het eindbeeld bij de hermeting gebruikt dezelfde bevroren norm als het startbeeld van dezelfde campagne.

## 5. Regels en selectie

Voorwaarde als JSON op de verdeling. Ondersteun deze vormen en niet meer:

```json
{"min": {"HLL": 2, "LHH": 1}}
{"min": {"HHH": 1}, "meerderheid": ["LLH","LLL"]}
{"meerderheid": ["HLL"]}
{"min": {"HHL": 2}, "max_n": 10}
{"min": {"HHL": 3}, "min_n": 11}
{"meerderheid": ["MMM"], "geen": ["HHH","HHL"]}
{"breuk": "zien_sturen", "team_boven_norm": ["zien"]}
```

Betekenis: `min` = minstens zoveel deelnemers met die code; `meerderheid` = de som van die codes is meer dan de helft van n; `geen` = nul deelnemers met die codes; `min_n`/`max_n` = grens op teamgrootte; `breuk` en `team_boven_norm` = voorwaarden op de teamlijn (teamregels). Een regel gaat af als alle onderdelen waar zijn. Twee regels met dezelfde dynamiek maar andere teamgrootte (R4) zijn twee rijen.

Score per afgegane regel: `betrokken / n + gewicht_opslag`, waarbij `betrokken` het aantal deelnemers is met een code die in de voorwaarde voorkomt. Kies de drie hoogste. Als geen van de drie `versterkt` is en er wel een versterkende regel afging, vervang de derde door de hoogste versterkende. Ties: lagere `volgorde` wint.

Seed de regels uit hoofdstuk 5 van het model v4, plus R11 en R12 hieronder, met deze codes:

| Regel | Voorwaarde | Richting | Opslag |
|---|---|---|---|
| R1 Zieners en Aanpakkers | min HLL 2, LHH 1 | remt | 0.15 |
| R2 Eén Trekker, meerderheid Uitvoerders/Afwachters | min HHH 1, meerderheid LLH+LLL | remt | 0.15 |
| R3 Beslissers en Uitvoerders | min HHL 1, LLH 2 | remt | 0.10 |
| R4a Meerdere Beslissers, team tot 10 | min HHL 2, max_n 10 | remt | 0.15 |
| R4b Meerdere Beslissers, team vanaf 11 | min HHL 3, min_n 11 | remt | 0.15 |
| R5 Meewerker naast Trekker of Beslisser | min HLH 1 en (HHH 1 of HHL 1) | remt | 0.10 |
| R6 Aanpakkers onder elkaar | meerderheid LHH | remt | 0.15 |
| R7 Afwachters in de meerderheid, geen Trekker | meerderheid LLL, geen HHH | remt | 0.20 |
| R8 Ziener naast Beslisser | min HLL 1, HHL 1 | versterkt | 0 |
| R9 Afbakeners met elkaar | min LHL 2 | remt | 0.10 |
| R10 Middenband dominant | meerderheid MMM, geen HHH, HHL | neutraal | 0.05 |
| R11 Eén Trekker met Zieners | min HHH 1, HLL 2 | remt | 0.15 |
| R12 De waarneming is er al (teamregel) | breuk zien_sturen en team_zien boven norm | versterkt | 0 |

R11, dynamiek: de Trekker claimt en doet wat de Zieners zien; zolang dat werkt hoeven de Zieners niet te kiezen. Kop: "Het werkt zolang de Trekker er is". Interventie: regie verdelen, elk signaal een eigenaar die niet de Trekker is; de Trekker wordt vragensteller. Gespreksvraag: wat gebeurt er in dit team in de week dat de trekker er niet is?

R12 is een teamregel op de teamlijn, geen profielregel. Voorwaarde: `{"breuk": "zien_sturen", "team_boven_norm": ["zien"]}`. Dynamiek: dit team ziet meer dan gemiddeld; de verbetering zit niet in beter kijken maar in een route van signaal naar keuze. Interventie: signalen gaan naar één eigenaar per onderwerp, die terugkoppelt wat ermee is gebeurd. Gespreksvraag: welk signaal is de afgelopen maand een besluit geworden, en hoe wist de melder dat? Score voor teamregels: 0.5 + opslag.

R5 heeft een "of"; ondersteun daarvoor `{"min": {"HLH": 1}, "min_een_van": {"HHH": 1, "HHL": 1}}`. R3 krijgt één richting (remt); de nuance "levert op korte termijn" staat in de dynamiektekst.

Teksten (dynamiek, signaal, interventie, gespreksvraag) letterlijk overnemen uit het model v4. Bij R1, R2, R8 en R10 ook een versie van de kop die past bij het aantal (bijvoorbeeld "Vier Zieners en twee Aanpakkers"): gebruik placeholders `{n_HLL}` in de teksten en vul ze bij rendering.

## 6. De Teamkrachtkaart (rendering)

Eén HTML-template, A4 liggend (297 × 210 mm), met een SVG van 800 × 600 als tekening. Layout: links de tekening (circa 60 procent), rechts eerst het breukblok (donker, inkt), dan de profielverdeling, dan de drie dynamieken. Onderaan een voetnoot. Voorbeeld: `teamkrachtkaart_1_startbeeld.png` in de map van deze briefing; volg die opzet.

Tekening:
- Drie verticale kolommen op x = 150, 400, 650, van y = 60 tot 540, lijn `#E2D8D2` 2 px, label ZIEN, STUREN, DOEN eronder in DM Sans 15 px, 600, letterafstand 2 px, kleur `#6B6472`.
- Schaal verticaal: score 25 onder, 100 boven (lineair). Scores onder 25 op de onderrand.
- Landelijk beeld per kolom: horizontale magenta streep van 120 px breed, 3 px, opacity .8, met het label LANDELIJK rechts van de derde kolom.
- Individuele lijnen (alleen als n ≥ min_deelnemers_lijnen): polyline inkt 1.5 px opacity .2, stippen r 4 opacity .28. Geen namen, geen tooltips, geen id's in de SVG. Lijnen gesorteerd op zien zodat de SVG-volgorde niets verraadt.
- Teamlijn: polyline inkt 5 px, stippen r 9 met witte rand 3 px, label "team" links van de eerste stip.
- Bij breuk `zien_sturen` of `sturen_doen`: tekst "hier zakt de keten" in DM Serif Display cursief 16 px magenta, gecentreerd tussen de twee betreffende kolommen, 26 px boven het midden van het segment.

Breukblok: kop per breuk, uit een klein tabelletje met vier varianten (zien_sturen, sturen_doen, geen, begin), met de teamverschillen in de tekst. Bijvoorbeeld zien_sturen: "Dit team ziet meer dan gemiddeld en claimt het niet. De teamlijn zakt tussen Zien en Sturen. De ontwikkelruimte zit in kiezen: van signaal naar eigenaar."

Profielverdeling: aantallen per naam, alleen namen met aantal > 0, middenband als laatste met kleine letter.

Dynamieken: per dynamiek een tag (REMT DE TEAMKRACHT · R1 in magenta, VERSTERKT DE TEAMKRACHT · R8 in grijs), de kop, en de tekst met Interventie en Gespreksvraag vet.

Voetnoot, vaste tekst: "Waarschijnlijke dynamieken, afgeleid uit de verdeling van ketenprofielen. Hypotheses voor de nabespreking, geen diagnose. Een profiel beschrijft gedrag in deze context, niet de persoon. Individuele scores zijn alleen zichtbaar voor de deelnemer zelf; onder tien deelnemers toont deze kaart alleen de teamlijn en de verdeling. Bij de hermeting wordt het eindbeeld over dit startbeeld gelegd. Ook leverbaar als poster A3 en A1."

Posterexport: dezelfde template, alleen de tekening, de breukkop en de verdeling, op A3 en A1 liggend, met logo klein rechtsonder. Aparte route `/api/teamkracht-poster?campagne=...&formaat=a1`.

## 7. Individuele uitslag

In de bestaande uitslag van de deelnemer, na de duiding: een blok "Jouw patroon op dit moment" met de profielnaam en `tekst_deelnemer` uit `teamkracht_profielen`, plus de vaste zin: "Een patroon beschrijft wat je nu doet in deze context, niet wie je bent. Bij de hermeting zie je wat er is verschoven." Alleen zichtbaar via de eigen resultaatlink van de deelnemer; niet in een e-mail naar de coach, niet in het dashboard.

De teksten voor `tekst_deelnemer` schrijft de opdrachtgever; zet als placeholder een ik-vorm-samenvatting van "zo ziet het eruit" en "ontwikkelrichting" per profiel, zonder de woorden "kost" of "valkuil".

## 8. Dashboard

Voor de coach, in het bestaande dashboard bij een campagne:
- Knop "Teamkrachtkaart maken" (berekent `teamkracht_teambeeld`, toont de kaart als preview, biedt PDF en poster aan). Bij n < 5 geen kaart, met melding.
- Weergave van de kaart op het scherm zoals in de PDF.

Voor de beheerder (rol van de opdrachtgever):
- Beheerpagina voor `teamkracht_profielen`, `teamkracht_regels`, `teamkracht_config`: tekstvelden en de voorwaarde als bewerkbare JSON met validatie. Wijzigingen werken door bij de volgende berekening; bestaande teambeelden blijven bevroren.

## 9. API-routes

- `POST /api/teamkracht-bereken` body `{campagne_id, soort}`: berekent en slaat `teamkracht_teambeeld` op; geeft het teambeeld terug zonder persoonsgegevens.
- `GET /api/teamkracht-kaart?teambeeld_id=...&formaat=a4|a3|a1&als=html|pdf|svg`
- Alle routes achter dezelfde authenticatie als het bestaande dashboard.

## 10. Acceptatiecriteria

1. Een fictieve campagne met 11 deelnemers (scores uit het bestand `testdata_team_noord.json` in deze briefing) levert: verdeling 4 Zieners, 2 Aanpakkers, 1 Trekker, 2 Afwachters, 2 middenband; breuk `zien_sturen`; dynamieken R1, R11, R12 in die volgorde (R1 en R11 remmend met gelijke score, R1 wint op volgorde; R12 als versterkende derde).
2. Dezelfde campagne met 7 deelnemers levert een kaart zonder individuele lijnen.
3. De SVG bevat geen tekst of attribuut dat naar een deelnemer verwijst (test: grep op e-mail, naam, id-patronen).
4. Een wijziging van een regeltekst in het dashboard is zichtbaar op een nieuw berekende kaart en niet op een eerder berekende.
5. De PDF is vector (tekst selecteerbaar, tekening schaalbaar); A1-poster rendert zonder pixelatie.
6. De individuele uitslag toont het profiel alleen via de eigen resultaatlink.
7. Geen streepjes als gedachtestreep en geen uitroeptekens in gegenereerde teksten (test op de seed en de vaste teksten).

## 11. Testdata

```json
{"norm": {"zien": 62, "sturen": 55, "doen": 50, "sd_zien": 12, "sd_sturen": 12, "sd_doen": 12},
 "deelnemers": [[84,42,34],[88,44,32],[80,40,38],[86,43,31],[52,70,80],[48,68,84],[90,84,86],[38,32,30],[40,34,32],[60,52,48],[63,54,49]]}
```

## 12. Wat niet

- Geen sociometrische vragen ("met wie werk je samen") toevoegen.
- Geen individuele profielen in een export, e-mail of teamoverzicht.
- Geen AI-gegenereerde dynamiekteksten; alleen de tabel.
- Geen wijziging aan de meting, de items of de scoring.
- Geen doelbeeld- of feedback-UI in fase 1; alleen de tabellen.

## 13. Oplevering

1. Rapport stap 0 en wachten op akkoord.
2. Migratie als los SQL-blok in `supabase.sql`, met datum, en wachten op akkoord voor productie.
3. Profielbepaling, regels en selectie met tests op de testdata.
4. Kaart als HTML en SVG, preview-deploy, akkoord op het beeld.
5. PDF en poster, dashboardknop, beheerpagina.
6. Individuele uitslag.
7. Korte handleiding voor de opdrachtgever: hoe teksten en regels te beheren, hoe een kaart te maken.

Elke stap een aparte commit met een Nederlandse commit-boodschap.
