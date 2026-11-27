// test/proefkwartier.test.js
// Het gratis proefkwartier voor leidinggevenden (27 november 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { controleer, calLink, plekkenOver, vraagAan, PLEKKEN, CAL_URL } from "../proefkwartier.js";

function nepDb(aantal = 0){
  const rijen = [];
  return {
    rijen,
    from(){
      const q = {
        select(){ return q; }, gte(){ return Promise.resolve({ count: aantal + rijen.length }); },
        insert(r){ rijen.push(r); return { select(){ return { single: async () => ({ data: r }) }; } }; }
      };
      return q;
    }
  };
}

const GOED = { doel: "grip", naam: "Sanne de Vries", email: "Sanne@Voorbeeld.nl", organisatie: "Bakkerij Noord", toelichting: "Te veel ballen in de lucht", src: "site_keuze" };

test("de aanvraag wordt gecontroleerd", () => {
  const a = controleer(GOED);
  assert.equal(a.email, "sanne@voorbeeld.nl"); assert.equal(a.doel, "grip"); assert.equal(a.herkomst, "site_keuze");
  assert.throws(() => controleer({ ...GOED, doel: "iets" }), /Kies waar/);
  assert.throws(() => controleer({ ...GOED, email: "geen" }), /e-mailadres/);
  assert.equal(controleer({ ...GOED, t: "'; drop" }).leider_token, null);
});

test("de link naar cal.com vult naam, mailadres en antwoord alvast in", () => {
  const u = new URL(calLink(controleer(GOED)));
  assert.equal(u.origin + u.pathname, CAL_URL);
  assert.equal(u.searchParams.get("name"), "Sanne de Vries");
  assert.equal(u.searchParams.get("email"), "sanne@voorbeeld.nl");
  assert.match(u.searchParams.get("notes"), /Grip op je week/);
});

test("twintig plekken, daarna en na december dicht", async () => {
  assert.deepEqual(await plekkenOver(nepDb(5), new Date("2026-12-01")), { over: 15, totaal: PLEKKEN, open: true });
  assert.equal((await plekkenOver(nepDb(20), new Date("2026-12-01"))).open, false);
  assert.equal((await plekkenOver(nepDb(0), new Date("2027-01-02"))).open, false);
  await assert.rejects(vraagAan(nepDb(20), GOED), /vergeven/);
});

test("de migratie geeft alleen de service-sleutel toegang", () => {
  const sql = readFileSync(new URL("../migratie-proefkwartier-2026-11-27.sql", import.meta.url), "utf8");
  assert.ok(sql.includes("grant select, insert, update, delete on public.proefkwartier_aanvragen to service_role;"));
  assert.ok(!/to (anon|authenticated)/.test(sql));
});

test("site, leiderpagina en mail sturen naar het proefkwartier", () => {
  const site = readFileSync(new URL("../happly.html", import.meta.url), "utf8");
  assert.ok(!site.includes("cal.com/maarten-neeskens-aoijqe/kennismaking"), "de site wijst nog naar de kennismaking");
  assert.ok((site.match(/scan\.happly\.nl\/proefkwartier/g) || []).length >= 4);
  for (const f of ["../leidersbeeld.html", "../leider-pagina.js", "../leidersbeeld-mail.js"]){
    assert.ok(readFileSync(new URL(f, import.meta.url), "utf8").includes("proefkwartier"), `${f} noemt het proefkwartier niet`);
  }
  const pagina = readFileSync(new URL("../proefkwartier.html", import.meta.url), "utf8");
  assert.ok(!pagina.includes("—") && !/class="eyebrow"/.test(pagina));
});
