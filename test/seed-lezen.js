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
    return {
      code: kop[1],
      titel: kop[2],
      titel_geteld: kop[3] ?? null,
      richting: kop[4],
      voorwaarde: JSON.parse(voorwaarde[1]),
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
