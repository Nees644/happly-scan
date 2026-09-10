// api/betaling-start.js — Vercel serverless function
// Start een betaling. Legt eerst de bestelling vast met het bedrag zoals het op
// dit moment geldt, en maakt daarna pas de betaling bij Mollie aan. Die
// volgorde is met opzet: een betaling zonder bestelling is een bedrag zonder
// verhaal, en dat is achteraf niet meer uit te zoeken.
//
// De client vraagt om een groep (PAK of HM), niet om een productcode. Welke rij
// daarbij hoort volgt uit de lijn van de koper en wordt hier bepaald. Zou de
// client de code mogen kiezen, dan koos hij de goedkoopste.

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { bedragMetBtw, soortBetaling, magKopen, omschrijving, prijsVoor } from "../betalen.js";
import { haalKoper, haalProducten, zetHermetingTegoed, haalOfMaakMollieKlant } from "../koper-db.js";
import { maakBetaling } from "../mollie.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function basisUrl(req){
  return process.env.SITE_URL || `https://${req.headers?.host || "scan.happly.nl"}`;
}

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  // Kopen mag vanaf de laagste rol. De leesdrempel is vervallen, dus de rol is
  // hier geen slot meer; wat iemand mag kopen volgt uit zijn lijn.
  const gebruiker = await eisGebruiker(req, res, ["lezer", "coach", "beheerder"]);
  if (!gebruiker) return;

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const groep = body.groep ? String(body.groep).toUpperCase() : null;
  const code = body.product_code ? String(body.product_code) : null;
  const teamId = body.team_id ? String(body.team_id) : null;
  if (!groep && !code){ res.status(400).json({ error: "geef groep of product_code" }); return; }
  if (teamId && !UUID.test(teamId)){ res.status(400).json({ error: "ongeldig team_id" }); return; }

  const db = serviceClient();
  const wie = await haalKoper(db, gebruiker.user_id);

  // Bij een groep bepaalt de lijn de rij. Bij een losse code (een abonnement,
  // een certificering) is er maar één rij en mag hij worden opgegeven.
  let product = null;
  if (groep){
    const producten = await haalProducten(db, [groep]);
    product = prijsVoor(producten, groep, wie.prijsniveau);
    if (!product){ res.status(404).json({ error: "voor jouw abonnement is hier geen tarief" }); return; }
  }else{
    const p = await db.from("producten").select("*").eq("code", code).maybeSingle();
    if (!p.data){ res.status(404).json({ error: "onbekend product" }); return; }
    product = p.data;
  }

  // Wat het team meebrengt: is er al een startbeeld, en ligt er nog een
  // hermeting in het pakket.
  let team = null, heeftStartbeeld = false, teamnaam = null;
  if (teamId){
    const t = await db.from("teamkracht_teams")
      .select("id, naam, coach_user_id, hermeting_tegoed, hermeting_tot").eq("id", teamId).maybeSingle();
    if (!t.data){ res.status(404).json({ error: "onbekend team" }); return; }
    if (wie.rol !== "beheerder" && t.data.coach_user_id !== gebruiker.user_id){
      res.status(403).json({ error: "dit team is niet van jou" }); return;
    }
    team = t.data;
    teamnaam = t.data.naam;
    const b = await db.from("teamkracht_teambeeld")
      .select("id").eq("team_id", teamId).eq("soort", "start").limit(1);
    heeftStartbeeld = (b.data || []).length > 0;
  }

  const bezwaar = magKopen({ product, wie, teamId, team, heeftStartbeeld });
  if (bezwaar){ res.status(400).json({ error: bezwaar }); return; }

  const soort = soortBetaling(product);
  if (!soort){ res.status(400).json({ error: "Dit product kan nog niet online worden afgerekend." }); return; }

  const bedrag = bedragMetBtw(product);
  const isMeting = product.groep === "PAK" || product.groep === "HM";

  // Eerst de bestelling, dan pas de betaling.
  const bestelling = await db.from("bestellingen").insert({
    gebruiker_id: gebruiker.user_id,
    product_code: product.code,
    bedrag_cent: bedrag.totaal,
    btw_cent: bedrag.btw,
    status: "open",
    team_id: teamId,
    geldig_tot: isMeting
      ? new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10)
      : null
  }).select("id").single();
  if (bestelling.error){
    await logFout("betaling-start", "bestelling opslaan mislukt");
    res.status(500).json({ error: "bestelling opslaan mislukt" }); return;
  }

  // Een pakket uit het bundeltegoed kost niets en gaat niet langs Mollie. De
  // bestelling blijft wel bestaan, want anders is achteraf niet te zien welk
  // team er een pakket uit de bundel heeft gehad.
  if (bedrag.totaal === 0){
    await db.from("bestellingen")
      .update({ status: "betaald", betaald_op: new Date().toISOString() })
      .eq("id", bestelling.data.id);
    if (product.groep === "PAK" && teamId) await zetHermetingTegoed(db, teamId, bestelling.data.id);
    if (product.prijsniveau === "bur" && wie.bureau){
      // Via een functie en niet via lezen-optellen-schrijven: twee aankopen
      // tegelijk zouden anders één pakket van het tegoed afhalen.
      const af = await db.rpc("verbruik_bureau_tegoed", { p_bureau_id: wie.bureau.id });
      if (af.error || af.data === null){
        await logFout("betaling-start", "bundeltegoed afboeken mislukt");
      }
    }
    res.status(200).json({ bestelling_id: bestelling.data.id, betaalpagina: null, bedrag_cent: 0 });
    return;
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
    // Loopt er een abonnement uit voort, dan is deze eerste betaling meteen de
    // machtiging. Zonder sequenceType first is er later geen mandaat om op te
    // incasseren, en dan staat de verlenging stil zonder dat iemand het merkt.
    const metAbonnement = soort !== "eenmalig";
    const customerId = metAbonnement
      ? await haalOfMaakMollieKlant(db, { userId: gebruiker.user_id, email: gebruiker.email })
      : null;

    const betaling = await maakBetaling({
      centen: bedrag.totaal,
      omschrijving: omschrijving(product, teamnaam),
      redirectUrl: `${basis}/betaald?b=${bestelling.data.id}`,
      webhookUrl: `${basis}/api/betaling-webhook?s=${encodeURIComponent(geheim)}${doorlaat}`,
      metadata: { bestelling_id: bestelling.data.id, product: product.code },
      ...(customerId ? { customerId, sequenceType: "first" } : {})
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
