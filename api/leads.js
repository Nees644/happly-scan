// api/leads.js — Vercel serverless function
// Het leadoverzicht van het Leidersbeeld (paragraaf 5 en 5a van
// briefings/leidersbeeld.md).
//
// GET  geeft de leads met hun laatste contactmoment en de volledige
//      geschiedenis per lead.
// POST legt een nieuw contactmoment vast. Nooit overschrijven: elke actie is
//      een nieuwe rij, zodat de geschiedenis leesbaar blijft.
//
// Wie wat ziet: de beheerder alles, een partner alleen de leads met zijn eigen
// partner_id. Dat staat ook in de RLS-policy op beide tabellen; deze route
// draait met de service role en herhaalt de regel daarom expliciet.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { haalGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";

const OPVOLGSTATUS = ["nieuw","gebeld","gemaild","afspraak","offerte","gewonnen","verloren","parkeren"];

export default async function handler(req, res){
  const gebruiker = await haalGebruiker(req);
  if (!gebruiker){ res.status(401).json({ error: "niet ingelogd" }); return; }

  const beheerder = gebruiker.rol === "beheerder";
  const db = serviceClient();

  try{
    if (req.method === "GET")  return await lijst(res, db, gebruiker, beheerder);
    if (req.method === "POST") return await vastleggen(req, res, db, gebruiker, beheerder);
    res.status(405).json({ error: "method" });
  }catch(e){
    await logFout("leads", e.message);
    res.status(500).json({ error: "ophalen mislukt" });
  }
}

async function lijst(res, db, gebruiker, beheerder){
  let vraag = db.from("teamkracht_leidersbeeld")
    .select("id, created_at, leider_naam, leider_email, organisatie, teamomvang, index_score, herkomst_src, partner_id, status, mail_geopend_op, team_id")
    .order("created_at", { ascending: false })
    .limit(500);
  if (!beheerder) vraag = vraag.eq("partner_id", gebruiker.user_id);

  const leads = await vraag;
  if (leads.error) throw leads.error;
  const rijen = leads.data || [];

  // De opvolging in een keer ophalen en hier verdelen, in plaats van een
  // bevraging per lead.
  const ids = rijen.map(r => r.id);
  let opvolging = [];
  if (ids.length){
    const o = await db.from("opvolging")
      .select("id, created_at, leidersbeeld_id, opvolgstatus, notitie, volgende_actie, volgende_datum, door")
      .in("leidersbeeld_id", ids)
      .order("created_at", { ascending: false });
    if (o.error) throw o.error;
    opvolging = o.data || [];
  }

  // De naam van de partner erbij, zodat de lijst leesbaar is. Alleen voor de
  // beheerder: een partner ziet alleen zijn eigen leads en weet wie hij is.
  const namen = {};
  if (beheerder){
    const partners = [...new Set(rijen.map(r => r.partner_id).filter(Boolean))];
    if (partners.length){
      const p = await db.from("teamkracht_gebruikers").select("user_id, naam, email").in("user_id", partners);
      for (const rij of (p.data || [])) namen[rij.user_id] = rij.naam || rij.email;
    }
  }

  const uit = rijen.map(r => {
    const eigen = opvolging.filter(o => o.leidersbeeld_id === r.id);
    const laatste = eigen[0] || null;
    return {
      ...r,
      partnernaam: r.partner_id ? (namen[r.partner_id] || "partner") : null,
      mail_geopend: !!r.mail_geopend_op,
      opvolgstatus:   laatste ? laatste.opvolgstatus   : "nieuw",
      volgende_actie: laatste ? laatste.volgende_actie : null,
      volgende_datum: laatste ? laatste.volgende_datum : null,
      geschiedenis: eigen
    };
  });

  res.status(200).json({ leads: uit, beheerder, statussen: OPVOLGSTATUS });
}

async function vastleggen(req, res, db, gebruiker, beheerder){
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const lead = String(body.leidersbeeld_id || "");
  if (!OPVOLGSTATUS.includes(body.opvolgstatus)){
    res.status(400).json({ error: "onbekende opvolgstatus" }); return;
  }

  // Mag deze gebruiker bij deze lead. Een partner alleen bij de zijne.
  const l = await db.from("teamkracht_leidersbeeld").select("id, partner_id").eq("id", lead).maybeSingle();
  if (l.error || !l.data){ res.status(404).json({ error: "lead bestaat niet" }); return; }
  if (!beheerder && l.data.partner_id !== gebruiker.user_id){
    res.status(403).json({ error: "geen toegang" }); return;
  }

  const ins = await db.from("opvolging").insert({
    bron: "leidersbeeld",
    leidersbeeld_id: lead,
    opvolgstatus: body.opvolgstatus,
    notitie: tekstOfNull(body.notitie, 2000),
    volgende_actie: tekstOfNull(body.volgende_actie, 300),
    volgende_datum: datumOfNull(body.volgende_datum),
    door: gebruiker.user_id
  }).select("id, created_at, opvolgstatus, notitie, volgende_actie, volgende_datum").single();
  if (ins.error) throw ins.error;

  res.status(200).json({ ok: true, contactmoment: ins.data });
}

function tekstOfNull(waarde, max){
  const t = String(waarde ?? "").trim();
  return t ? t.slice(0, max) : null;
}

function datumOfNull(waarde){
  const t = String(waarde ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}
