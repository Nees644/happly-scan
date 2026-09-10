// mollie.js
// Dunne cliënt op de Mollie-API. Geen pakket erbij: de aanroepen die we nodig
// hebben zijn een handvol GET's en POST's, en een eigen wrapper kan niet uit de
// pas lopen met een versie die iemand anders bijwerkt.
//
// De sleutel komt uit MOLLIE_API_KEY. Op productie staat daar de live sleutel,
// op preview de test; welke er staat is te zien op de beheerpagina.

const BASIS = "https://api.mollie.com/v2";

function sleutel(){
  const s = process.env.MOLLIE_API_KEY;
  if (!s) throw new Error("MOLLIE_API_KEY ontbreekt in deze omgeving");
  return s;
}

/* Test of live, afgeleid uit het voorvoegsel van de sleutel. */
export function modus(){
  const s = process.env.MOLLIE_API_KEY || "";
  return s.startsWith("live_") ? "live" : s.startsWith("test_") ? "test" : "onbekend";
}

async function roep(pad, opties = {}){
  const r = await fetch(`${BASIS}${pad}`, {
    ...opties,
    headers: {
      Authorization: `Bearer ${sleutel()}`,
      "Content-Type": "application/json",
      ...(opties.headers || {})
    }
  });
  const uit = await r.json().catch(() => ({}));
  if (!r.ok){
    // Mollie zet de uitleg in detail; die is bruikbaar in een logregel maar
    // nooit in een melding aan de klant.
    const melding = uit?.detail || uit?.title || `mollie gaf ${r.status}`;
    const fout = new Error(melding);
    fout.status = r.status;
    throw fout;
  }
  return uit;
}

/* Bedragen gaan als string met twee decimalen naar Mollie, niet als getal.
   Wij rekenen in hele centen, dus hier is de enige plek waar wordt gedeeld. */
export function centenNaarBedrag(centen){
  if (!Number.isInteger(centen) || centen < 0) throw new Error("bedrag moet een heel aantal centen zijn");
  return (centen / 100).toFixed(2);
}

export async function maakBetaling({ centen, omschrijving, redirectUrl, webhookUrl, metadata, customerId, sequenceType }){
  return roep("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: { currency: "EUR", value: centenNaarBedrag(centen) },
      description: omschrijving,
      redirectUrl,
      webhookUrl,
      metadata,
      ...(customerId ? { customerId } : {}),
      ...(sequenceType ? { sequenceType } : {})
    })
  });
}

export async function haalBetaling(id){
  return roep(`/payments/${encodeURIComponent(id)}`);
}

export async function maakKlant({ naam, email, metadata }){
  return roep("/customers", {
    method: "POST",
    body: JSON.stringify({ name: naam || null, email: email || null, metadata })
  });
}

export async function maakAbonnement(customerId, { centen, interval, omschrijving, webhookUrl, startDate, metadata }){
  return roep(`/customers/${encodeURIComponent(customerId)}/subscriptions`, {
    method: "POST",
    body: JSON.stringify({
      amount: { currency: "EUR", value: centenNaarBedrag(centen) },
      interval,                 // "1 month" of "12 months"
      description: omschrijving,
      webhookUrl,
      ...(startDate ? { startDate } : {}),
      metadata
    })
  });
}

export async function haalAbonnement(customerId, id){
  return roep(`/customers/${encodeURIComponent(customerId)}/subscriptions/${encodeURIComponent(id)}`);
}

export async function zegAbonnementOp(customerId, id){
  return roep(`/customers/${encodeURIComponent(customerId)}/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" });
}
