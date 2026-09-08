// api/instellingen-check.js — Vercel serverless function
// Zegt welke omgevingsvariabelen er in DEZE omgeving staan. Alleen of ze er
// zijn, nooit wat erin staat: een sleutel die je op een scherm kunt lezen is
// een sleutel die je moet vervangen.
//
// Bij de Mollie-sleutel wordt wel het voorvoegsel getoond, test of live, want
// dat is precies wat je wilt weten en het verraadt niets.
//
// Alleen voor de beheerder.

import { eisGebruiker } from "../teamkracht-auth.js";

const VERWACHT = [
  { naam: "SUPABASE_URL",             waarvoor: "verbinding met de database",        nodig: true },
  { naam: "SUPABASE_SERVICE_ROLE_KEY", waarvoor: "serverside lezen en schrijven",    nodig: true },
  { naam: "RESEND_API_KEY",           waarvoor: "uitslagmail en opvolgmails",        nodig: true },
  { naam: "ANTHROPIC_API_KEY",        waarvoor: "de duiding bij een meting",         nodig: true },
  { naam: "CRON_SECRET",              waarvoor: "beschermt de dagelijkse cron",      nodig: false },
  { naam: "MOLLIE_API_KEY",           waarvoor: "betalingen",                        nodig: false },
  { naam: "MOLLIE_WEBHOOK_SECRET",    waarvoor: "beschermt de betaalmelding",        nodig: false },
  { naam: "SITE_URL",                 waarvoor: "waar Mollie de klant terugstuurt",  nodig: false }
];

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res, ["beheerder"]);
  if (!gebruiker) return;

  const regels = VERWACHT.map(v => {
    const waarde = process.env[v.naam];
    const rij = { naam: v.naam, waarvoor: v.waarvoor, nodig: v.nodig, aanwezig: !!waarde };
    if (v.naam === "MOLLIE_API_KEY" && waarde){
      rij.modus = waarde.startsWith("test_") ? "test"
                : waarde.startsWith("live_") ? "live"
                : "onbekend voorvoegsel";
    }
    if (v.naam === "SITE_URL" && waarde) rij.waarde = waarde;  // geen geheim
    return rij;
  });

  const omgeving = process.env.VERCEL_ENV || "onbekend";
  const mollie = regels.find(r => r.naam === "MOLLIE_API_KEY");
  const waarschuwingen = [];
  if (omgeving === "production" && mollie?.modus === "test"){
    waarschuwingen.push("Op productie staat de testsleutel. Echte betalingen komen dan nooit binnen.");
  }
  if (omgeving !== "production" && mollie?.modus === "live"){
    waarschuwingen.push("Buiten productie staat de live sleutel. Elke test kost hier echt geld.");
  }
  if (!mollie?.aanwezig){
    waarschuwingen.push(`In de omgeving ${omgeving} staat geen Mollie-sleutel.`);
  }

  res.status(200).json({
    omgeving,
    ontbreekt_en_is_nodig: regels.filter(r => r.nodig && !r.aanwezig).map(r => r.naam),
    waarschuwingen,
    variabelen: regels
  });
}
