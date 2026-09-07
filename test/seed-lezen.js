// test/seed-lezen.js
// Leest de regelseed rechtstreeks uit supabase.sql, zodat de tests draaien op
// precies de rijen die straks in de database komen. Geen tweede kopie van de
// regels die uit de pas kan gaan lopen.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HIER = dirname(fileURLToPath(import.meta.url));
const SQL_PAD = join(HIER, "..", "supabase.sql");

export function leesSql(){
  return readFileSync(SQL_PAD, "utf8");
}

/* Het seedblok van de migratie 07-09-2026, zonder de rest van het schema. */
export function leesSeedblok(){
  const sql = leesSql();
  const start = sql.indexOf("-- BLOK D · seed");
  const eind  = sql.indexOf("-- BLOK E ·");
  if (start < 0 || eind < 0) throw new Error("seedblok niet gevonden in supabase.sql");
  return sql.slice(start, eind);
}

const KOP = /^\('([^']+)','([^']*)',(?:'([^']*)'|null),'(versterkt|remt|neutraal)',/;

/* De regels als objecten, in dezelfde vorm als de rijen uit teamkracht_regels
   (voorwaarde al geparst naar een object). */
export function leesRegels(){
  const blok = leesSeedblok();
  const start = blok.indexOf("insert into public.teamkracht_regels");
  const eind  = blok.indexOf("on conflict (code) do nothing;", start);
  const body  = blok.slice(start, eind);

  const stukken = body.split(/\n(?=\('R)/).slice(1);
  return stukken.map(stuk => {
    const kop = stuk.match(KOP);
    if (!kop) throw new Error(`regel niet te lezen: ${stuk.slice(0, 60)}`);
    const voorwaarde = stuk.match(/^\s*'(\{.*\})',\s*$/m);
    if (!voorwaarde) throw new Error(`voorwaarde niet gevonden bij ${kop[1]}`);
    const staart = [...stuk.matchAll(/,\s*(-?[\d.]+),\s*(\d+)\)/g)].pop();
    if (!staart) throw new Error(`opslag en volgorde niet gevonden bij ${kop[1]}`);

    // Na de voorwaarde volgen vier velden in vaste volgorde: dynamiek,
    // signaal, interventie en gespreksvraag. Signaal mag null zijn.
    const rest = stuk.slice(voorwaarde.index + voorwaarde[0].length);
    const velden = [];
    const veld = /\$t\$([\s\S]*?)\$t\$|\bnull\b/g;
    let m;
    while (velden.length < 4 && (m = veld.exec(rest)) !== null) velden.push(m[1] ?? null);
    if (velden.length < 4) throw new Error(`te weinig teksten bij ${kop[1]}`);

    return {
      code: kop[1],
      titel: kop[2],
      titel_geteld: kop[3] ?? null,
      richting: kop[4],
      voorwaarde: JSON.parse(voorwaarde[1]),
      dynamiek: velden[0],
      signaal: velden[1],
      interventie: velden[2],
      gespreksvraag: velden[3],
      gewicht_opslag: Number(staart[1]),
      volgorde: Number(staart[2]),
      actief: true
    };
  });
}

/* De testdata uit de briefing. */
export function leesTestdata(){
  const pad = join(HIER, "..", "briefing_code_teamkracht", "testdata_team_noord.json");
  const ruw = JSON.parse(readFileSync(pad, "utf8"));
  return {
    norm: ruw.norm,
    deelnemers: ruw.deelnemers.map(([zien, sturen, doen]) => ({ zien, sturen, doen }))
  };
}

/* De profielen uit de seed: code en naam zijn genoeg om de kaart te vullen. */
export function leesProfielen(){
  const blok = leesSeedblok();
  const start = blok.indexOf("insert into public.teamkracht_profielen");
  const eind  = blok.indexOf("on conflict (code) do nothing;", start);
  const body  = blok.slice(start, eind);
  return [...body.matchAll(/^\('([A-Z]{3})','([^']+)',/gm)]
    .map(m => ({ code: m[1], naam: m[2] }));
}

/* De interventies uit de seed. Zelfde aanpak als bij de regels: één bron. */
export function leesInterventies(){
  const blok = leesSeedblok();
  const start = blok.indexOf("insert into public.teamkracht_interventies");
  const eind  = blok.indexOf("on conflict (code) do nothing;", start);
  const body  = blok.slice(start, eind);

  return body.split(/\n(?=\('[BP]\d)/).slice(1).map(stuk => {
    const kop = stuk.match(/^\('([^']+)',\s*\$t\$([\s\S]*?)\$t\$,\s*(?:'([^']*)'|null),\s*(?:'(\[[^\]]*\])'|null),/);
    if (!kop) throw new Error(`interventie niet te lezen: ${stuk.slice(0, 40)}`);
    const rest = stuk.slice(kop[0].length);
    const velden = [];
    const veld = /\$t\$([\s\S]*?)\$t\$|\bnull\b/g;
    let m;
    while (velden.length < 5 && (m = veld.exec(rest)) !== null) velden.push(m[1] ?? null);
    const volgorde = stuk.match(/,\s*(\d+)\)\s*,?\s*$/m);
    return {
      code: kop[1], titel: kop[2],
      breuk: kop[3] ?? null,
      profielen: kop[4] ? JSON.parse(kop[4]) : null,
      tekst: velden[0], eigenaar_suggestie: velden[1],
      ritme: velden[2], telling: velden[3], gespreksvraag: velden[4],
      actief: true,
      volgorde: volgorde ? Number(volgorde[1]) : null
    };
  });
}

/* De doelregels uit de seed: de ambitiebanden. */
export function leesDoelregels(){
  const blok = leesSeedblok();
  const start = blok.indexOf("insert into public.teamkracht_doelregels");
  const eind  = blok.indexOf("on conflict (code) do nothing;", start);
  const body  = blok.slice(start, eind);

  return body.split(/\n(?=\('D)/).slice(1).map(stuk => {
    const m = stuk.match(/^\('([^']+)',\s*\$t\$([\s\S]*?)\$t\$,\s*'(\{[^']*\})',\s*'(\w+)',\s*\$t\$([\s\S]*?)\$t\$,\s*(\d+)\)/);
    if (!m) throw new Error(`doelregel niet te lezen: ${stuk.slice(0, 40)}`);
    return {
      code: m[1], titel: m[2], voorwaarde: JSON.parse(m[3]),
      oordeel: m[4], melding: m[5], volgorde: Number(m[6]), actief: true
    };
  });
}
