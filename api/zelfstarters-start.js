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
import { partnerVoorCode, kortingCent } from "../zelfstarters-korting.js";
import { verwerkGratisVerificatie } from "../zelfstarters-verwerken.js";

// Type plus is sinds 6 november 2026 de Zelfstarters Dag (ZS-DAG); de
// kolommen plus_class_op en plus_class_gevolgd_op blijven de dagkeuze en de
// gevolgde dag, en de plus op de badge komt na die dag.
export const CODE = { standaard: "ZS-STD", plus: "ZS-DAG" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function basisUrl(req){
  return process.env.SITE_URL || `https://${req.headers?.host || "scan.happly.nl"}`;
}

function euro(centen){
  return (centen / 100).toFixed(2).replace(".", ",").replace(",00", "");
}

/* De prijzen, en met een partner erbij ook de prijzen na korting. Korting
   geldt alleen op Verificatie & Voorkeur (standaard), nooit op de Dag. */
export async function prijzen(db, partner){
  const q = await db.from("producten").select("*").in("code", Object.values(CODE)).eq("actief", true);
  const uit = {};
  for (const [type, code] of Object.entries(CODE)){
    const p = (q.data || []).find(x => x.code === code);
    if (!p) continue;
    const b = bedragMetBtw(p);
    uit[type] = { ex: euro(b.ex), btw: euro(b.btw), totaal: euro(b.totaal) };
    if (partner && type === "standaard"){
      const korting = kortingCent(p.prijs_ex_btw, partner.korting_pct);
      const k = bedragMetBtw({ ...p, prijs_ex_btw: p.prijs_ex_btw - korting });
      uit[type].met_korting = { ex: euro(k.ex), btw: euro(k.btw), totaal: euro(k.totaal), korting_ex: euro(korting) };
    }
  }
  return uit;
}

/* De partner bij een ingevulde code, of null. Een onbekende code geeft een
   fout met status 400, zodat de klant het ziet voordat hij betaalt. */
export async function partnerBijCode(db, code){
  if (!code) return null;
  const partner = await partnerVoorCode(db, code);
  if (!partner) throw Object.assign(new Error("Deze kortingscode is niet bekend. Vraag je intermediair om de juiste code."), { status: 400 });
  return partner;
}

/* Een betaling bij Mollie starten voor een bestaande rij. Gebruikt door de
   oude weg (hier) en door de verificatie (api/zelfstarters-verifieer.js).
   terug is de pagina waar de klant na Mollie op terugkomt. */
export async function startBetaling({ db, req, rij, type, terug, partner }){
  const p = await db.from("producten").select("*").eq("code", CODE[type]).eq("actief", true).maybeSingle();
  if (!p.data) throw Object.assign(new Error("Dit tarief is niet meer beschikbaar."), { status: 404 });
  // Korting alleen op Verificatie & Voorkeur; de Zelfstarters Dag is altijd de volle prijs.
  const korting = partner && type === "standaard" ? kortingCent(p.data.prijs_ex_btw, partner.korting_pct) : 0;
  const bedrag = bedragMetBtw({ ...p.data, prijs_ex_btw: p.data.prijs_ex_btw - korting });
  if (bedrag.totaal <= 0){
    // Een code van honderd procent: geen betaling, Mollie neemt geen nul
    // euro aan. De registratie gaat direct op geverifieerd, en de code blijft
    // op de rij staan zodat geschonken en betaald nooit door elkaar lopen.
    if (type === "plus") throw Object.assign(new Error("De Zelfstarters Dag kan niet met deze code. Kies Verificatie & Voorkeur."), { status: 400 });
    await db.from("zelfstarters").update({
      type, product_code: p.data.code, bedrag_cent: 0, btw_cent: 0,
      partner_id: partner.id, kortingscode: partner.code, korting_cent: korting
    }).eq("id", rij.id);
    await verwerkGratisVerificatie(db, rij.id);
    return { betaalpagina: null, bedrag_cent: 0, gratis: true, terug: `${basisUrl(req)}${terug}?z=${rij.id}` };
  }
  const basis = basisUrl(req);
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";
  const doorlaat = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? `&x-vercel-protection-bypass=${encodeURIComponent(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)}`
    : "";
  const betaling = await maakBetaling({
    centen: bedrag.totaal,
    omschrijving: `Zelfstarters ${type === "plus" ? "Dag" : "Verificatie & Voorkeur"}, ${rij.nummer || "registratie"}${partner ? `, via ${partner.code}` : ""}`,
    redirectUrl: `${basis}${terug}?z=${rij.id}`,
    webhookUrl: `${basis}/api/zelfstarters-webhook?s=${encodeURIComponent(geheim)}${doorlaat}`,
    metadata: { zelfstarter_id: rij.id, product: p.data.code, partner: partner ? partner.code : null },
    sleutel: zelfstartersSleutel()
  });
  await db.from("zelfstarters").update({
    mollie_payment_id: betaling.id, type, product_code: p.data.code,
    bedrag_cent: bedrag.totaal, btw_cent: bedrag.btw, betaling_status: "open",
    partner_id: partner ? partner.id : null, kortingscode: partner ? partner.code : null, korting_cent: korting
  }).eq("id", rij.id);
  return { betaalpagina: betaling?._links?.checkout?.href || null, bedrag_cent: bedrag.totaal };
}

export default async function handler(req, res){
  if (req.method === "GET"){
    res.setHeader("Cache-Control", "no-store");
    const db = serviceClient();
    let partner = null;
    try{ partner = await partnerBijCode(db, req.query?.code); }catch(e){ res.status(400).json({ error: e.message }); return; }
    res.status(200).json({
      prijzen: await prijzen(db, partner), vakgebieden: VAKGEBIEDEN,
      partner: partner ? { naam: partner.naam, code: partner.code, korting_pct: partner.korting_pct } : null
    });
    return;
  }
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const naam = String(body.naam || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().toLowerCase();
  const type = body.type === "plus" ? "plus" : "standaard";
  const vakgebied = VAKGEBIEDEN.includes(body.vakgebied) ? body.vakgebied : null;
  const werkvorm = body.werkvorm === "loondienst" ? "loondienst" : "zelfstandig";
  const openbaar = body.openbaar === true;
  let partner = null;
  try{ partner = await partnerBijCode(serviceClient(), body.code); }catch(e){ res.status(400).json({ error: e.message }); return; }
  if (naam.length < 2){ res.status(400).json({ error: "Vul je naam in." }); return; }
  if (!EMAIL.test(email)){ res.status(400).json({ error: "Vul een geldig e-mailadres in." }); return; }

  const db = serviceClient();

  // Eerst de rij. Een meting of betaling zonder registratie is een getal
  // zonder verhaal.
  const ins = await db.from("zelfstarters").insert({
    naam, email, type, vakgebied, werkvorm, openbaar, status: "open"
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
    const b = await startBetaling({ db, req, rij, type, terug: "/zelfstarters-naar-scan", partner });
    res.status(200).json({ registratie_id: rij.id, ...b, scan_url: b.gratis ? `/zelfstarters-naar-scan?z=${rij.id}` : undefined });
  }catch(e){
    await db.from("zelfstarters").update({ status: "mislukt" }).eq("id", rij.id);
    await logFout("zelfstarters-start", e.message);
    res.status(e.status || 502).json({ error: e.status ? e.message : "de betaling kon niet worden gestart" });
  }
}
