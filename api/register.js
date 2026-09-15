// api/register.js — Vercel serverless function
// Het openbare register en de verificatie van een badge.
//
// GET /register              de lijst
// GET /register/:slug        de pagina van een persoon
// GET /verificatie/:code     dezelfde pagina, bereikt via de code op een badge
//
// Openbaar en zonder inlog; dat is het hele punt van een register. Er staat
// alleen in wat met toestemming is gegeven, en de query leest niets anders dan
// de velden die op de pagina komen.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { registerRij } from "../register.js";
import { bouwRegisterLijst, bouwRegisterPagina, bouwNietGevonden } from "../register-pagina.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

const CERTVELDEN = "id, gebruiker_id, naam_op_certificaat, niveau, uitgegeven_op, status, verificatiecode";
const GEBRUIKERVELDEN = "user_id, naam, organisatie, website, register_toestemming, register_slug, licentie_actief, licentie_tot";

function stuur(res, html, code = 200){
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Niet bewaren. Er stond hier vijf minuten cache, want het register verandert
  // zelden; maar wie zijn vermelding intrekt hoort hem meteen weg te zien, en
  // niet pas na vijf minuten. Zo stond het ook in de briefing, en zo moet het:
  // een openbare pagina met iemands naam erop bewaar je niet tegen zijn zin.
  res.setHeader("Cache-Control", "no-store");
  res.status(code).send(html);
}

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }

  const slug = String(req.query?.slug || "").toLowerCase();
  const code = String(req.query?.code || "");
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try{
    if (code) return await viaCode(res, db, code);
    if (slug) return await viaSlug(res, db, slug);
    return await lijst(res, db);
  }catch(e){
    stuur(res, bouwNietGevonden({ viaCode: !!code }), 500);
  }
}

/* De lijst. Eerst de gebruikers met toestemming, daarna hun certificaten; dat
   is een vraag minder dan andersom en het houdt de lijst kort. */
async function lijst(res, db){
  const g = await db.from("teamkracht_gebruikers")
    .select(GEBRUIKERVELDEN).eq("register_toestemming", true).not("register_slug", "is", null);
  const gebruikers = g.data || [];
  if (!gebruikers.length){ stuur(res, bouwRegisterLijst({ rijen: [] })); return; }

  const c = await db.from("certificaten")
    .select(CERTVELDEN).in("gebruiker_id", gebruikers.map(x => x.user_id))
    .order("uitgegeven_op", { ascending: false });

  const rijen = [];
  const gezien = new Set();
  for (const cert of (c.data || [])){
    // Per persoon het nieuwste certificaat; wie Begeleider wordt, staat niet
    // twee keer in de lijst.
    if (gezien.has(cert.gebruiker_id)) continue;
    gezien.add(cert.gebruiker_id);
    const rij = registerRij({ certificaat: cert, gebruiker: gebruikers.find(x => x.user_id === cert.gebruiker_id) });
    if (rij) rijen.push(rij);
  }

  rijen.sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  stuur(res, bouwRegisterLijst({ rijen }));
}

async function viaSlug(res, db, slug){
  if (!SLUG.test(slug)){ stuur(res, bouwNietGevonden(), 404); return; }

  const g = await db.from("teamkracht_gebruikers")
    .select(GEBRUIKERVELDEN).eq("register_slug", slug).maybeSingle();
  if (g.error || !g.data || g.data.register_toestemming !== true){
    stuur(res, bouwNietGevonden(), 404); return;
  }

  const c = await db.from("certificaten")
    .select(CERTVELDEN).eq("gebruiker_id", g.data.user_id)
    .order("uitgegeven_op", { ascending: false }).limit(1);
  const rij = registerRij({ certificaat: (c.data || [])[0], gebruiker: g.data });
  if (!rij){ stuur(res, bouwNietGevonden(), 404); return; }

  stuur(res, bouwRegisterPagina({ rij }));
}

/* Verificatie gaat op de code van het certificaat en niet op de slug. Dat is
   met opzet: de code staat op de badge en verandert nooit, ook niet als iemand
   zijn naam wijzigt. */
async function viaCode(res, db, code){
  if (!UUID.test(code)){ stuur(res, bouwNietGevonden({ viaCode: true }), 404); return; }

  const c = await db.from("certificaten")
    .select(CERTVELDEN).eq("verificatiecode", code).maybeSingle();
  if (c.error || !c.data){ stuur(res, bouwNietGevonden({ viaCode: true }), 404); return; }

  const g = await db.from("teamkracht_gebruikers")
    .select(GEBRUIKERVELDEN).eq("user_id", c.data.gebruiker_id).maybeSingle();
  if (g.error || !g.data){ stuur(res, bouwNietGevonden({ viaCode: true }), 404); return; }

  // Zonder toestemming is er geen openbare pagina, ook niet via de code. De
  // badge kan dan niet worden nagegaan, en dat is de keuze van de houder zelf.
  const rij = registerRij({ certificaat: c.data, gebruiker: g.data });
  if (!rij){ stuur(res, bouwNietGevonden({ viaCode: true }), 404); return; }

  stuur(res, bouwRegisterPagina({ rij, viaCode: true }));
}
