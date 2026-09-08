// betaling-verwerken.js
// Eén plek waar een betaling wordt afgehandeld, gebruikt door twee wegen: de
// melding van Mollie, en de pagina waar de klant op terugkomt.
//
// Dat er twee wegen zijn is met opzet. Een melding kan uitblijven, te laat
// komen of geblokkeerd worden, en dan hoort de klant niet in het ongewisse te
// blijven. Beide wegen doen precies hetzelfde en mogen elkaar overlappen: de
// verwerking is idempotent, dus twee keer verwerken verandert niets.

import { haalBetaling } from "./mollie.js";

const MOLLIE_NAAR_ONS = {
  paid: "betaald",
  expired: "verlopen",
  canceled: "mislukt",
  failed: "mislukt"
};

/* Wat er moet gebeuren zodra een betaling binnen is. Alleen dingen die uit de
   bestelling volgen; de bestelling zelf blijft de bron. */
async function pasToe(db, bestelling){
  const code = bestelling.product_code;

  // Een losse Teamfoto of hermeting wordt pas verbruikt als de kaart wordt
  // gemaakt. Het recht staat in de bestelling; hier hoeft niets te gebeuren.
  if (code === "TF" || code === "HM") return "recht op een kaart vastgelegd";

  if (code === "LEZ-1" || code === "LEZ-2"){
    // Toegang tot de hoofdstukken wordt afgeleid uit de betaalde bestelling, dus
    // er is geen vlag om te zetten. Wel de rol, zodat iemand die alleen de
    // module kocht ook echt binnenkomt. Een coach of beheerder houdt zijn rol.
    await db.from("teamkracht_gebruikers")
      .update({ rol: "lezer" })
      .eq("user_id", bestelling.gebruiker_id)
      .eq("rol", "lezer");
    return "module opengezet";
  }

  return "geen actie";
}

/* Haalt de stand bij Mollie op en werkt de bestelling bij. Geeft terug wat er
   is gebeurd, in gewone taal, zodat het in een logregel bruikbaar is. */
export async function verwerkMollieBetaling(db, mollieId){
  const betaling = await haalBetaling(mollieId);
  const bestellingId = betaling?.metadata?.bestelling_id || null;

  let q = db.from("bestellingen").select("*");
  q = bestellingId ? q.eq("id", bestellingId) : q.eq("mollie_payment_id", mollieId);
  const b = await q.single();
  if (b.error || !b.data) return { uitkomst: "geen bestelling gevonden", bestelling: null };

  const bestelling = b.data;
  const nieuw = MOLLIE_NAAR_ONS[betaling.status] || null;

  // Al op de goede stand? Dan niets doen. Mollie bezorgt een melding gerust
  // twee keer, en de bedankpagina vraagt het er nog eens overheen.
  if (!nieuw || bestelling.status === nieuw){
    return { uitkomst: `al op ${bestelling.status}`, bestelling };
  }

  await db.from("bestellingen").update({
    status: nieuw,
    mollie_payment_id: mollieId,
    betaald_op: nieuw === "betaald" ? new Date().toISOString() : null
  }).eq("id", bestelling.id);

  const uitkomst = nieuw === "betaald"
    ? await pasToe(db, bestelling)
    : `bestelling op ${nieuw}`;

  return { uitkomst, bestelling: { ...bestelling, status: nieuw } };
}
