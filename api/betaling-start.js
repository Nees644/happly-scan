// api/betaling-start.js — Vercel serverless function
// Start een betaling. Legt eerst de bestelling vast met het bedrag zoals het op
// dit moment geldt, en maakt daarna pas de betaling bij Mollie aan. Die
// volgorde is met opzet: een betaling zonder bestelling is een bedrag zonder
// verhaal, en dat is achteraf niet meer uit te zoeken.
//
// Fase A: alleen de eenmalige producten. Abonnementen komen hierna.

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { bedragMetBtw, soortBetaling, magKopen, omschrijving } from "../betalen.js";
import { maakBetaling } from "../mollie.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function basisUrl(req){
  return process.env.SITE_URL || `https://${req.headers?.host || "scan.happly.nl"}`;
}

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const code = String(body.product_code || "");
  const teamId = body.team_id ? String(body.team_id) : null;
  if (teamId && !UUID.test(teamId)){ res.status(400).json({ error: "ongeldig team_id" }); return; }

  const db = serviceClient();

  const [p, g] = await Promise.all([
    db.from("producten").select("*").eq("code", code).single(),
    db.from("teamkracht_gebruikers").select("*").eq("user_id", gebruiker.user_id).single()
  ]);
  if (p.error || !p.data){ res.status(404).json({ error: "onbekend product" }); return; }
  const product = p.data;

  // De leesdrempel: hoofdstuk 1 en 2 van de module afgerond.
  let heeftLeesdrempel = false, heeftStartbeeld = false, teamnaam = null;
  if (product.code === "TF" || product.code === "HM"){
    const v = await db.from("module_voortgang")
      .select("hoofdstuk").eq("gebruiker_id", gebruiker.user_id).in("hoofdstuk", [1, 2]);
    heeftLeesdrempel = (v.data || []).length >= 2;

    if (teamId){
      const t = await db.from("teamkracht_teams").select("naam, coach_user_id").eq("id", teamId).single();
      if (t.error || !t.data){ res.status(404).json({ error: "onbekend team" }); return; }
      if (gebruiker.rol !== "beheerder" && t.data.coach_user_id !== gebruiker.user_id){
        res.status(403).json({ error: "dit team is niet van jou" }); return;
      }
      teamnaam = t.data.naam;
      const b = await db.from("teamkracht_teambeeld")
        .select("id").eq("team_id", teamId).eq("soort", "start").limit(1);
      heeftStartbeeld = (b.data || []).length > 0;
    }
  }

  const bezwaar = magKopen({
    product, gebruiker: g.data, teamId, heeftLeesdrempel, heeftStartbeeld
  });
  if (bezwaar){ res.status(400).json({ error: bezwaar }); return; }

  if (soortBetaling(product.code) !== "eenmalig"){
    res.status(400).json({ error: "Abonnementen kunnen nog niet online worden afgerekend." });
    return;
  }

  const bedrag = bedragMetBtw(product);

  // Eerst de bestelling, dan pas de betaling.
  const bestelling = await db.from("bestellingen").insert({
    gebruiker_id: gebruiker.user_id,
    product_code: product.code,
    bedrag_cent: bedrag.totaal,
    btw_cent: bedrag.btw,
    status: "open",
    team_id: teamId,
    geldig_tot: product.code === "TF" || product.code === "HM"
      ? new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10)
      : null
  }).select("id").single();
  if (bestelling.error){
    await logFout("betaling-start", "bestelling opslaan mislukt");
    res.status(500).json({ error: "bestelling opslaan mislukt" }); return;
  }

  const basis = basisUrl(req);
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";
  // Een preview staat achter Deployment Protection en daar komt Mollie niet
  // door. Vercel geeft daar een sleutel voor als je Protection Bypass aanzet;
  // die hangen we aan de melding-URL. Op productie staat geen bescherming en
  // doet dit niets.
  const doorlaat = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? `&x-vercel-protection-bypass=${encodeURIComponent(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)}`
    : "";
  try{
    const betaling = await maakBetaling({
      centen: bedrag.totaal,
      omschrijving: omschrijving(product, teamnaam),
      redirectUrl: `${basis}/betaald?b=${bestelling.data.id}`,
      webhookUrl: `${basis}/api/betaling-webhook?s=${encodeURIComponent(geheim)}${doorlaat}`,
      metadata: { bestelling_id: bestelling.data.id, product: product.code }
    });

    await db.from("bestellingen")
      .update({ mollie_payment_id: betaling.id })
      .eq("id", bestelling.data.id);

    res.status(200).json({
      bestelling_id: bestelling.data.id,
      betaalpagina: betaling?._links?.checkout?.href || null,
      bedrag_cent: bedrag.totaal
    });
  }catch(e){
    await db.from("bestellingen").update({ status: "mislukt" }).eq("id", bestelling.data.id);
    await logFout("betaling-start", e.message);
    res.status(502).json({ error: "de betaling kon niet worden gestart" });
  }
}
