// api/zelfstarters-start.js, Vercel serverless function
// Start een registratie in het Zelfstartregister. Openbaar en zonder inlog:
// wat iemand krijgt hangt niet aan een gebruiker maar aan zijn e-mailadres
// en zijn registratienummer.
//
// GET                                    de prijzen voor de pagina's
// POST { naam, email, vakgebied, openbaar }
//      gratis registratie: eerst de rij, dan direct naar de meting.
//      Antwoord: { registratie_id, scan_url }
// POST { naam, email, type, betaal: true }
//      de oude weg voor partners: eerst betalen, dan meten.
//      Antwoord: { registratie_id, betaalpagina }

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { bedragMetBtw } from "../betalen.js";
import { maakBetaling } from "../mollie.js";
import { zelfstartersSleutel } from "../zelfstarters-verwerken.js";
import { VAKGEBIEDEN } from "../zelfstarters-uitslag.js";

export const CODE = { standaard: "ZS-STD", plus: "ZS-PLUS" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function basisUrl(req){
  return process.env.SITE_URL || `https://${req.headers?.host || "scan.happly.nl"}`;
}

function euro(centen){
  return (centen / 100).toFixed(2).replace(".", ",").replace(",00", "");
}

export async function prijzen(db){
  const q = await db.from("producten").select("*").in("code", Object.values(CODE)).eq("actief", true);
  const uit = {};
  for (const [type, code] of Object.entries(CODE)){
    const p = (q.data || []).find(x => x.code === code);
    if (!p) continue;
    const b = bedragMetBtw(p);
    uit[type] = { ex: euro(b.ex), btw: euro(b.btw), totaal: euro(b.totaal) };
  }
  return uit;
}

/* Een betaling bij Mollie starten voor een bestaande rij. Gebruikt door de
   oude weg (hier) en door de verificatie (api/zelfstarters-verifieer.js).
   terug is de pagina waar de klant na Mollie op terugkomt. */
export async function startBetaling({ db, req, rij, type, terug }){
  const p = await db.from("producten").select("*").eq("code", CODE[type]).eq("actief", true).maybeSingle();
  if (!p.data) throw Object.assign(new Error("Dit tarief is niet meer beschikbaar."), { status: 404 });
  const bedrag = bedragMetBtw(p.data);
  const basis = basisUrl(req);
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";
  const doorlaat = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? `&x-vercel-protection-bypass=${encodeURIComponent(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)}`
    : "";
  const betaling = await maakBetaling({
    centen: bedrag.totaal,
    omschrijving: `Zelfstarters ${type === "plus" ? "Voorkeur met Plus Class" : "Voorkeur"}, ${rij.nummer || "registratie"}`,
    redirectUrl: `${basis}${terug}?z=${rij.id}`,
    webhookUrl: `${basis}/api/zelfstarters-webhook?s=${encodeURIComponent(geheim)}${doorlaat}`,
    metadata: { zelfstarter_id: rij.id, product: p.data.code },
    sleutel: zelfstartersSleutel()
  });
  await db.from("zelfstarters").update({
    mollie_payment_id: betaling.id, type, product_code: p.data.code,
    bedrag_cent: bedrag.totaal, btw_cent: bedrag.btw, betaling_status: "open"
  }).eq("id", rij.id);
  return { betaalpagina: betaling?._links?.checkout?.href || null, bedrag_cent: bedrag.totaal };
}

export default async function handler(req, res){
  if (req.method === "GET"){
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ prijzen: await prijzen(serviceClient()), vakgebieden: VAKGEBIEDEN });
    return;
  }
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const naam = String(body.naam || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase();
  const type = body.type === "plus" ? "plus" : "standaard";
  const vakgebied = VAKGEBIEDEN.includes(body.vakgebied) ? body.vakgebied : null;
  const openbaar = body.openbaar === true;
  if (naam.length < 2){ res.status(400).json({ error: "Vul je naam in." }); return; }
  if (!EMAIL.test(email)){ res.status(400).json({ error: "Vul een geldig e-mailadres in." }); return; }

  const db = serviceClient();

  // Eerst de rij. Een meting of betaling zonder registratie is een getal
  // zonder verhaal.
  const ins = await db.from("zelfstarters").insert({
    naam, email, type, vakgebied, openbaar, status: "open"
  }).select("*").single();
  if (ins.error){
    await logFout("zelfstarters-start", ins.error.message);
    res.status(500).json({ error: "registratie opslaan mislukt" }); return;
  }
  const rij = ins.data;

  if (body.betaal !== true){
    res.status(200).json({ registratie_id: rij.id, scan_url: `/scan?zs=${rij.id}` });
    return;
  }

  try{
    const b = await startBetaling({ db, req, rij, type, terug: "/zelfstarters/betaald" });
    res.status(200).json({ registratie_id: rij.id, ...b });
  }catch(e){
    await db.from("zelfstarters").update({ status: "mislukt" }).eq("id", rij.id);
    await logFout("zelfstarters-start", e.message);
    res.status(e.status || 502).json({ error: e.status ? e.message : "de betaling kon niet worden gestart" });
  }
}
