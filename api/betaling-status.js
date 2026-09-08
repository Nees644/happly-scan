// api/betaling-status.js — Vercel serverless function
// De stand van een bestelling, voor de pagina waar de klant na het betalen op
// terugkomt. Mollie stuurt de klant vaak terug voordat de melding binnen is,
// dus die pagina vraagt het een paar keer opnieuw.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";
import { verwerkMollieBetaling } from "../betaling-verwerken.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const id = String(req.query?.b || "");
  if (!UUID.test(id)){ res.status(400).json({ error: "ongeldig bestelling-id" }); return; }

  const db = serviceClient();
  const q = await db.from("bestellingen")
    .select("id, product_code, bedrag_cent, status, betaald_op, team_id, gebruiker_id, mollie_payment_id")
    .eq("id", id).single();
  if (q.error || !q.data){ res.status(404).json({ error: "onbekende bestelling" }); return; }
  if (q.data.gebruiker_id !== gebruiker.user_id && gebruiker.rol !== "beheerder"){
    res.status(403).json({ error: "geen toegang" }); return;
  }

  // Staat de bestelling nog open, dan vragen we het zelf bij Mollie na in
  // plaats van te wachten op de melding. Die kan uitblijven of geblokkeerd
  // worden, en dan hoort de klant niet in het ongewisse te blijven staan.
  let rij = q.data;
  if (rij.status === "open" && rij.mollie_payment_id){
    try{
      const uit = await verwerkMollieBetaling(db, rij.mollie_payment_id);
      if (uit.bestelling) rij = { ...rij, status: uit.bestelling.status };
    }catch(e){ /* stil: dan blijft hij open en probeert de pagina het zo weer */ }
  }

  const p = await db.from("producten").select("naam").eq("code", rij.product_code).single();
  const { gebruiker_id, mollie_payment_id, ...rest } = rij;
  res.status(200).json({ ...rest, product: p.data?.naam || rij.product_code });
}
