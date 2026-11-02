// api/zelfstarters-start.js, Vercel serverless function
// Start een registratie in het Zelfstartregister: eerst de rij, dan de
// betaling bij Mollie. Openbaar en zonder inlog: een zelfstandige die 79 euro
// betaalt, hoort geen account te hoeven maken. Wat hij krijgt hangt niet aan
// een gebruiker maar aan zijn e-mailadres en zijn registratienummer.
//
// POST { naam, email, type: 'standaard' | 'plus' }
// Antwoord: { registratie_id, betaalpagina }

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { bedragMetBtw } from "../betalen.js";
import { maakBetaling } from "../mollie.js";
import { zelfstartersSleutel } from "../zelfstarters-verwerken.js";

const CODE = { standaard: "ZS-STD", plus: "ZS-PLUS" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function basisUrl(req){
  return process.env.SITE_URL || `https://${req.headers?.host || "scan.happly.nl"}`;
}

function euro(centen){
  return (centen / 100).toFixed(2).replace(".", ",").replace(",00", "");
}

export default async function handler(req, res){
  // GET geeft de prijzen voor het formulier, met btw uitgesplitst. De pagina
  // zet nooit zelf een bedrag neer: de tabel producten is de bron.
  if (req.method === "GET"){
    const db = serviceClient();
    const q = await db.from("producten").select("*").in("code", Object.values(CODE)).eq("actief", true);
    const uit = {};
    for (const [type, code] of Object.entries(CODE)){
      const p = (q.data || []).find(x => x.code === code);
      if (!p) continue;
      const b = bedragMetBtw(p);
      uit[type] = { ex: euro(b.ex), btw: euro(b.btw), totaal: euro(b.totaal) };
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(uit);
    return;
  }
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const naam = String(body.naam || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase();
  const type = body.type === "plus" ? "plus" : "standaard";
  if (naam.length < 2){ res.status(400).json({ error: "Vul je naam in." }); return; }
  if (!EMAIL.test(email)){ res.status(400).json({ error: "Vul een geldig e-mailadres in." }); return; }

  const db = serviceClient();
  const p = await db.from("producten").select("*").eq("code", CODE[type]).eq("actief", true).maybeSingle();
  if (!p.data){ res.status(404).json({ error: "Dit tarief is niet meer beschikbaar." }); return; }
  const bedrag = bedragMetBtw(p.data);

  // Eerst de rij, dan de betaling. Een betaling zonder registratie is een
  // bedrag zonder verhaal.
  const ins = await db.from("zelfstarters").insert({
    naam, email, type, product_code: p.data.code,
    bedrag_cent: bedrag.totaal, btw_cent: bedrag.btw, status: "open"
  }).select("id").single();
  if (ins.error){
    await logFout("zelfstarters-start", ins.error.message);
    res.status(500).json({ error: "registratie opslaan mislukt" }); return;
  }
  const id = ins.data.id;

  const basis = basisUrl(req);
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";
  const doorlaat = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? `&x-vercel-protection-bypass=${encodeURIComponent(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)}`
    : "";
  try{
    const betaling = await maakBetaling({
      centen: bedrag.totaal,
      omschrijving: `Zelfstarters ${type === "plus" ? "Plus Class" : "Standaard"}, registratie`,
      redirectUrl: `${basis}/zelfstarters/betaald?z=${id}`,
      webhookUrl: `${basis}/api/zelfstarters-webhook?s=${encodeURIComponent(geheim)}${doorlaat}`,
      metadata: { zelfstarter_id: id, product: p.data.code },
      sleutel: zelfstartersSleutel()
    });
    await db.from("zelfstarters").update({ mollie_payment_id: betaling.id }).eq("id", id);
    res.status(200).json({ registratie_id: id, betaalpagina: betaling?._links?.checkout?.href || null, bedrag_cent: bedrag.totaal });
  }catch(e){
    await db.from("zelfstarters").update({ status: "mislukt" }).eq("id", id);
    await logFout("zelfstarters-start", e.message);
    res.status(502).json({ error: "de betaling kon niet worden gestart" });
  }
}
