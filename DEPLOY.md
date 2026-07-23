# Zelfkracht Index scan, in productie zetten

Alles staat klaar in deze repo. Wat jij nog moet doen, in volgorde. Ik kan geen
secrets invoeren, dus de stappen met sleutels doe jij zelf.

## 1. Supabase-tabel aanmaken

Draai `supabase.sql` in de SQL-editor van project `uqulkznqcqpbagbvtqdr`. Dat maakt de
tabel `index_scan_results` met RLS aan, los van de bestaande `scan_results`.

## 2. Vercel env vars zetten

In het Vercel-project (Settings, Environment Variables), voor Production:

| Naam | Waarde |
|---|---|
| `ANTHROPIC_API_KEY` | je Anthropic API-sleutel |
| `RESEND_API_KEY` | je Resend API-sleutel |
| `SUPABASE_URL` | `https://uqulkznqcqpbagbvtqdr.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | de service role key uit Supabase (Settings, API) |

De service role key mag alleen serverside staan. Zet hem nooit in de HTML.

## 3. Resend-domein — KLAAR (23-07-2026)

happly.nl is geverifieerd in Resend (regio EU). DNS-records staan in TransIP op de
subdomeinen `send` (MX + SPF) en `resend._domainkey` (DKIM); de bestaande
TransIP-mailrecords op het hoofddomein zijn onaangeroerd.

## 4. Committen en deployen

De `api/`-map maakt van de repo een Vercel-project met serverless functions. Vercel
draait automatisch `npm install`. Committen kan zoals altijd (GitHub PAT-workflow of
via de browser). Nieuwe en gewijzigde bestanden:

```
scan.html            nieuw   de Index-scan (12 stellingen + uitslag)
verantwoording.html  nieuw   hoe deze meting is opgebouwd
api/duiding.js       nieuw   AI-duiding (Anthropic, claude-sonnet-5)
api/scan.js          nieuw   opslag van elke voltooide meting
api/lead.js          nieuw   leadcapture + Resend profielmail
package.json         nieuw   dependencies voor de functions
vercel.json          nieuw   functie-timeouts
supabase.sql         nieuw   het schema (draai je in Supabase, niet in Vercel)
```

Gewijzigd: `quick_scan.html` is vervangen door een redirect naar `scan.html` (de oude
Quick Scan is uitgefaseerd, besluit 23-07-2026). De Diepte Scans (`scan_lg.html`,
`scan_mw.html`), `dashboard.html`, `index.html` en `happly-logo.svg` blijven onaangeroerd.

De scan komt live op `scan.happly.nl/scan.html` (Vercel). Test na deploy: doe de scan,
check dat de duiding laadt, dat er een rij in `index_scan_results` verschijnt en dat de
mail aankomt.

## 5. Snel lokaal testen (optioneel)

```bash
npm install
npx vercel dev
```

Zet dezelfde env vars in een `.env`-bestand of via `vercel env pull`.

---

## Vastgestelde keuzes (Maarten, 23-07-2026)

1. **Plus-rekenregel: één niveauband omhoog, plafond 90.** Richtgetal per score:
   onder 80 -> 80 (stevig in Sterk); 80 tot 90 -> 90 (Zeer sterk halen); 90 en hoger ->
   geen plus, label "onderhouden". Identiek geïmplementeerd in `scan.html` en
   `api/duiding.js`; wijzig ze altijd samen. Dit vervangt de through/cap-varianten uit
   de blauwdruk. Neem de regel ook over in het blauwdruk-document, zodat canon en bouw
   gelijk lopen.

2. **Oude Quick Scan uitgefaseerd.** `quick_scan.html` is vervangen door een redirect
   naar `scan.html`, zodat oude links en bookmarks blijven werken. De Diepte Scans en
   het dashboard blijven ongemoeid (B2B-spoor).

3. **Afronding: rekenkundig.** De scoring volgt vragenset v1 exact (som x 6,25,
   rekenkundig afronden; Index is het gemiddelde van de drie deelscores, rekenkundig
   afgerond). Twee getallen in de ijkvoorbeelden van document 4 bevatten een
   afrondingsslip (voorbeeld A Sturen: 56,25 -> 56, document drukt 57 af; voorbeeld B
   Index: 60,67 -> 61, document drukt 60 af). De code is leidend; corrigeer de twee
   getallen in het document.

## Wat bewust nog niet is gebouwd (parkeerstand)

De Sprint-verkooppagina, het werkboek en de Academy-integratie. De "Meer over de Sprint"
knoppen in de uitslag en de mail wijzen nu naar `happly.nl`; wissel dat om zodra de korte
Sprint-pagina achter de scan er staat.
