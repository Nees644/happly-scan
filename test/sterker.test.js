// test/sterker.test.js
// Sterker op je werk: aanmelden, factuur direct, betalen via Mollie (26 november 2026).
// Draaien met: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTEN, aanmeldBedrag, controleerInvoer, vervaldatum, meldAan, verwerkMollieId, zoekOpToken } from "../sterker.js";
import { openTekst } from "../factuur-mail.js";

/* Een kleine database in het geheugen, net genoeg voor sterker.js. */
function nepDb(begin = {}){
  const tabellen = { producten: [], sterker_aanmeldingen: [], facturen: [], ...begin };
  let teller = 0;
  function query(t){
    let rijen = () => tabellen[t];
    const filters = [];
    let modus = "select", data = null;
    const q = {
      select(){ return q; },
      eq(k, v){ filters.push(r => r[k] === v); return q; },
      neq(k, v){ filters.push(r => r[k] !== v); return q; },
      in(k, vs){ filters.push(r => vs.includes(r[k])); return q; },
      insert(rij){ modus = "insert"; data = rij; return q; },
      update(rij){ modus = "update"; data = rij; return q; },
      uitvoer(){
        if (modus === "insert"){
          if (t === "facturen" && data.sterker_id && tabellen.facturen.some(f => f.sterker_id === data.sterker_id))
            return { error: { message: "duplicate key" } };
          const rij = { id: `id-${++teller}`, created_at: new Date().toISOString(), status: "open", ...data };
          tabellen[t].push(rij); return { data: [rij] };
        }
        const gevonden = rijen().filter(r => filters.every(f => f(r)));
        if (modus === "update"){ gevonden.forEach(r => Object.assign(r, data)); }
        return { data: gevonden };
      },
      async maybeSingle(){ const u = q.uitvoer(); return u.error ? u : { data: u.data[0] || null }; },
      async single(){ const u = q.uitvoer(); return u.error ? u : { data: u.data[0] || null, error: u.data[0] ? null : { message: "geen rij" } }; },
      then(ok, nee){ return Promise.resolve(q.uitvoer()).then(ok, nee); }
    };
    return q;
  }
  return {
    tabellen,
    from: query,
    rpc: async () => ({ data: `2026-${String(tabellen.facturen.length + 1).padStart(4, "0")}` }),
    storage: { from: () => ({ upload: async () => ({ error: null }) }) }
  };
}

const PRODUCTRIJEN = [
  { code: "SOW-START", naam: "Sterker op je werk, twaalf weken", prijs_ex_btw: 39500, btw_promille: 210, actief: true },
  { code: "SOW-LEID", naam: "Sterker op je werk voor leidinggevenden, twaalf weken", prijs_ex_btw: 69500, btw_promille: 210, actief: true },
  { code: "SOW-JAAR", naam: "Sterker op je werk, jaarplek", prijs_ex_btw: 99000, btw_promille: 210, actief: true }
];

const GOED = {
  product: "start", plaatsen: "3", organisatie: "Bakkerij Noord", contact_naam: "Sanne de Vries",
  email: "Sanne@Voorbeeld.nl", klant_adres: "Dorpsstraat 1", klant_postcode: "5301 ab", klant_plaats: "Zaltbommel", akkoord: true
};

test("de bedragen in de migratie zijn die van happly.nl", () => {
  const sql = readFileSync(new URL("../migratie-sterker-2026-11-26.sql", import.meta.url), "utf8");
  for (const [code, cent] of [["SOW-START", 39500], ["SOW-LEID", 69500], ["SOW-JAAR", 99000]]){
    assert.ok(new RegExp(`'${code}',[^\\n]*?, ${cent},`).test(sql), `${code} staat niet op ${cent}`);
  }
  assert.ok(sql.includes("grant select, insert, update, delete on public.sterker_aanmeldingen to service_role;"), "de grant voor service_role ontbreekt");
  assert.ok(!/to (anon|authenticated)/.test(sql.split("sterker_aanmeldingen")[1] || ""), "anon of authenticated krijgt toegang");
  assert.deepEqual(Object.values(PRODUCTEN), ["SOW-START", "SOW-LEID", "SOW-JAAR"]);
});

test("het bedrag: prijs maal plaatsen, btw over het totaal, verlegd buiten Nederland", () => {
  const b = aanmeldBedrag(PRODUCTRIJEN[0], 3);
  assert.deepEqual([b.ex, b.btw, b.totaal], [118500, 24885, 143385]);
  const nl = aanmeldBedrag(PRODUCTRIJEN[0], 1, "NL123456789B01");
  assert.equal(nl.btw, 8295);
  const be = aanmeldBedrag(PRODUCTRIJEN[0], 1, "BE0123456789");
  assert.equal(be.btw, 0); assert.equal(be.verlegd, true);
});

test("de invoer wordt gecontroleerd en de client kiest nooit een bedrag", () => {
  const v = controleerInvoer({ ...GOED, prijs: 1, prijs_ex_btw: 1 });
  assert.equal(v.code, "SOW-START"); assert.equal(v.email, "sanne@voorbeeld.nl"); assert.equal(v.klant_postcode, "5301 AB");
  assert.ok(!("prijs" in v) && !("prijs_ex_btw" in v));
  assert.throws(() => controleerInvoer({ ...GOED, product: "SOW-START" }), /Kies een programma/);
  assert.throws(() => controleerInvoer({ ...GOED, akkoord: false }), /namens de organisatie/);
  assert.throws(() => controleerInvoer({ ...GOED, klant_adres: "" }), /factuuradres/);
  assert.throws(() => controleerInvoer({ ...GOED, plaatsen: 0 }), /aantal deelnemers/);
});

test("de vervaldatum ligt veertien dagen na vandaag", () => {
  assert.equal(vervaldatum(new Date("2026-11-26T10:00:00Z")), "2026-12-10");
});

test("aanmelden maakt direct een open factuur met vervaldatum en een betaallink", async () => {
  const db = nepDb({ producten: PRODUCTRIJEN.map(p => ({ ...p })) });
  const uit = await meldAan(db, { headers: { host: "scan.happly.nl" } }, GOED);
  assert.ok(uit.betaalUrl.startsWith("https://scan.happly.nl/api/sterker-betaal?t="));
  assert.equal(db.tabellen.sterker_aanmeldingen.length, 1);
  const a = db.tabellen.sterker_aanmeldingen[0];
  assert.equal(a.bedrag_cent, 143385); assert.equal(a.status, "open");
  const f = db.tabellen.facturen[0];
  assert.equal(f.status, "open"); assert.equal(f.sterker_id, a.id); assert.ok(f.vervaldatum);
  assert.equal(f.bedrag_totaal, 143385); assert.equal(f.regels[0].aantal, 3); assert.equal(f.klant_naam, "Bakkerij Noord");
  assert.equal(a.factuur_id, f.id);
  assert.match(openTekst(f), /Te betalen uiterlijk/);
});

test("een betaling verwerken is idempotent en zet de factuur op betaald", async () => {
  const db = nepDb({ producten: PRODUCTRIJEN.map(p => ({ ...p })) });
  await meldAan(db, {}, GOED);
  const a = db.tabellen.sterker_aanmeldingen[0];
  const haal = async () => ({ status: "paid", metadata: { sterker_id: a.id } });
  const eerst = await verwerkMollieId(db, "tr_abc", haal);
  assert.match(eerst, /betaald/);
  assert.equal(a.status, "betaald"); assert.equal(db.tabellen.facturen[0].status, "betaald");
  assert.equal(db.tabellen.facturen[0].mollie_payment_id, "tr_abc");
  const tweede = await verwerkMollieId(db, "tr_abc", haal);
  assert.match(tweede, /stond al op betaald/);
  const open = await verwerkMollieId(db, "tr_x", async () => ({ status: "open", metadata: { sterker_id: a.id } }));
  assert.match(open, /open|al op betaald/);
});

test("een onbekend of vreemd token geeft niets", async () => {
  const db = nepDb();
  assert.equal(await zoekOpToken(db, "kort"), null);
  assert.equal(await zoekOpToken(db, "'; drop table--"), null);
});

test("het formulier toont geen vast bedrag en vraagt de prijs aan de server", () => {
  const html = readFileSync(new URL("../sterker-aanmelden.html", import.meta.url), "utf8");
  assert.ok(!/395|695|990/.test(html), "er staat een bedrag in het formulier");
  assert.ok(!/1\.21|\* *0?\.21/.test(html), "het formulier rekent zelf btw");
  assert.ok(html.includes('fetch("/api/sterker-aanmelden")'));
  for (const t of [html, readFileSync(new URL("../sterker-betaald.html", import.meta.url), "utf8")]){
    assert.ok(!t.includes("—"), "gedachtestreepje");
    assert.ok(!/class="eyebrow"/.test(t), "label boven een kop");
  }
});

test("happly.nl stuurt de aanmelders naar het formulier", () => {
  const site = readFileSync(new URL("../happly.html", import.meta.url), "utf8");
  for (const p of ["start", "leider", "jaar"]){
    assert.ok(site.includes(`scan.happly.nl/sterker-aanmelden?p=${p}`), `de knop voor ${p} ontbreekt`);
  }
});
