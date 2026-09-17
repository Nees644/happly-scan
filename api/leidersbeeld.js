// api/leidersbeeld.js — Vercel serverless function
// Het gratis Leidersbeeld op /leidersbeeld. Slaat de invulling op, stuurt de
// resultaatmail, en geeft niets terug behalve dat het gelukt is: de scores
// staan bewust alleen in de mail en achter de knop (paragraaf 4 en K8 van
// briefings/leidersbeeld.md). Dat valideert het mailadres en maakt van elke
// invulling een lead, ook een die niet koopt.
//
// De rij wordt via de service role weggeschreven; de anon-rol komt niet bij
// deze tabel. De browser bepaalt niets: de scores worden hier uitgerekend uit
// de antwoorden.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { maakInzending } from "../leidersbeeld.js";
import { scores } from "../items.js";
import { resultaatMail } from "../leidersbeeld-mail.js";

const AFZENDER = "Happly <hallo@happly.nl>";

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // Het tweede Leidersbeeld, bij de hermeting. De leider hoeft zijn naam en
    // adres niet nog eens te geven; die staan al in de rij van het startbeeld.
    if (body.vervolg_token) return await hermeting(req, res, body);

    const uit = maakInzending(body);
    if (!uit.ok){ res.status(400).json({ error: "ongeldige invoer", fouten: uit.fouten }); return; }

    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // partner_id komt uit de URL en kan van alles zijn. Bestaat de gebruiker
    // niet, dan gaat de lead er zonder partner in: een typefout in een link
    // mag nooit een invulling kosten.
    let partner = uit.rij.partner_id;
    if (partner){
      const p = await db.from("teamkracht_gebruikers").select("user_id").eq("user_id", partner).maybeSingle();
      if (p.error || !p.data) partner = null;
    }

    const ingevoegd = await db.from("teamkracht_leidersbeeld")
      .insert({ ...uit.rij, partner_id: partner })
      .select("id, leider_token, index_score, leider_naam, leider_email")
      .single();
    if (ingevoegd.error) throw ingevoegd.error;
    const rij = ingevoegd.data;

    // De mail is het product van deze pagina. Lukt hij niet, dan is de lead er
    // wel en hoort de bezoeker dat te weten, want hij ziet verder niets.
    const mail = resultaatMail({ naam: rij.leider_naam, index: rij.index_score, token: rij.leider_token });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const verstuurd = await resend.emails.send({
      from: AFZENDER, to: rij.leider_email, subject: mail.subject, html: mail.html
    });
    if (verstuurd && verstuurd.error){
      res.status(502).json({ error: "mail mislukt" });
      return;
    }

    await db.from("teamkracht_leidersbeeld")
      .update({ mail_verzonden_op: new Date().toISOString() })
      .eq("id", rij.id);

    res.status(200).json({ ok: true });
  }catch(e){
    res.status(500).json({ error: "opslaan mislukt" });
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Het Leidersbeeld van de hermeting (K6). Zelfde items, zelfde persoon, zelfde
   team, meetmoment 'eind'. Beide beelden blijven bestaan; het eerste wordt niet
   overschreven, want het verschil tussen de twee is het hele punt.

   Versturen kan tot de eindkaart er is (K2 en A7). Daarna is het gesloten: een
   beeld van na de kaart is geen onafhankelijk beeld meer. */
async function hermeting(req, res, body){
  const token = String(body.vervolg_token || "");
  if (!UUID.test(token)){ res.status(400).json({ error: "ongeldige link" }); return; }

  const gemeten = scores(body.antwoorden);
  if (!gemeten){ res.status(400).json({ error: "beantwoord alle vragen" }); return; }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const q = await db.from("teamkracht_leidersbeeld")
    .select("id, team_id, leider_naam, leider_email, organisatie, teamomvang, herkomst_src, partner_id, op_kaart, norm_bron, opt_in_kwartaal, meetmoment, doel_tekst, doel_datum, doeltype, doeltype_bron, doel_ingevuld_op, doel_ingevuld_door")
    .eq("leider_token", token).maybeSingle();
  if (q.error || !q.data){ res.status(404).json({ error: "onbekende link" }); return; }
  const start = q.data;

  if (!start.team_id){ res.status(400).json({ error: "er hangt nog geen team aan dit Leidersbeeld" }); return; }
  if (start.meetmoment !== "start"){ res.status(400).json({ error: "dit is al het tweede Leidersbeeld" }); return; }

  // Is de eindkaart er al, dan is het gesloten.
  const eindbeeld = await db.from("teamkracht_teambeeld")
    .select("id").eq("team_id", start.team_id).eq("soort", "hermeting").limit(1);
  if ((eindbeeld.data || []).length){
    res.status(409).json({ error: "De eindkaart van dit team is al gemaakt. Je Leidersbeeld staat erbij zoals je het gaf." });
    return;
  }

  const nu = new Date().toISOString();
  const ins = await db.from("teamkracht_leidersbeeld").insert({
    team_id: start.team_id,
    meetmoment: "eind",
    leider_naam: start.leider_naam,
    leider_email: start.leider_email,
    organisatie: start.organisatie,
    teamomvang: start.teamomvang,
    zien: gemeten.zien, sturen: gemeten.sturen, doen: gemeten.doen,
    index_score: gemeten.index,
    antwoorden: gemeten.items,
    norm_bron: start.norm_bron,
    op_kaart: start.op_kaart,
    herkomst_src: start.herkomst_src,
    partner_id: start.partner_id,
    opt_in_kwartaal: start.opt_in_kwartaal,
    // Het doel van de eerste keer gaat mee: het tweede Leidersbeeld is dezelfde
    // leider over hetzelfde team.
    doel_tekst: start.doel_tekst, doel_datum: start.doel_datum, doeltype: start.doeltype, doeltype_bron: start.doeltype_bron,
    doel_ingevuld_op: start.doel_ingevuld_op, doel_ingevuld_door: start.doel_ingevuld_door,
    // Het akkoord van de eerste keer geldt nog; dit is dezelfde persoon en
    // dezelfde verwerking. Het moment van deze invulling leggen we wel vast.
    privacy_akkoord_op: nu,
    ingevuld_op: nu,
    status: "gekoppeld"
  }).select("id, leider_token").single();

  if (ins.error){
    if (/duplicate|unique/i.test(ins.error.message || "")){
      res.status(409).json({ error: "Je hebt je Leidersbeeld voor deze hermeting al gegeven." });
      return;
    }
    throw ins.error;
  }

  res.status(200).json({ ok: true, token: ins.data.leider_token });
}
