// api/toets.js — Vercel serverless function
// De toets van de Lezer-module: twintig vragen uit veertig, zestien goed om te
// slagen, hoogstens drie pogingen per dertig dagen.
//
// GET                geeft de stand: mag je beginnen, hoeveel pogingen heb je
//                    over, en heb je al een certificaat.
// POST {start}       trekt de vragen en legt de poging vast. De vragen gaan
//                    zonder het juiste antwoord naar de browser.
// POST {inleveren}   kijkt na op de server, en bij een voldoende volgt het
//                    certificaat en het niveau lezer.
//
// Het juiste antwoord verlaat de server nooit voordat er is ingeleverd. De
// getrokken vragen worden bij de poging bewaard, zodat het nakijken over
// dezelfde twintig gaat als de kandidaat heeft gezien.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import {
  AANTAL_VRAGEN, LAT, MAX_POGINGEN, VENSTER_DAGEN,
  magStarten, trekVragen, zonderAntwoord, nakijken, leesadvies, venstergrens
} from "../toets.js";

const ROLLEN = ["lezer", "coach", "beheerder"];

export default async function handler(req, res){
  const gebruiker = await eisGebruiker(req, res, ROLLEN);
  if (!gebruiker) return;
  const db = serviceClient();

  try{
    if (req.method === "GET") return await stand(res, db, gebruiker);
    if (req.method === "POST"){
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      if (body.actie === "start") return await start(res, db, gebruiker);
      if (body.actie === "inleveren") return await inleveren(res, db, gebruiker, body);
      if (body.actie === "register") return await register(res, db, gebruiker, body);
      res.status(400).json({ error: "onbekende actie" });
      return;
    }
    res.status(405).json({ error: "method" });
  }catch(e){
    await logFout("toets", e.message);
    res.status(500).json({ error: "de toets is nu niet beschikbaar" });
  }
}

async function haalPogingen(db, userId){
  const q = await db.from("toets_pogingen")
    .select("id, gestart_op, afgerond_op, score, geslaagd")
    .eq("gebruiker_id", userId)
    .order("gestart_op", { ascending: false });
  if (q.error) throw q.error;
  return q.data || [];
}

async function stand(res, db, gebruiker){
  const [pogingen, gebr, cert] = await Promise.all([
    haalPogingen(db, gebruiker.user_id),
    db.from("teamkracht_gebruikers")
      .select("naam, niveau, lezer_module_toegang, register_toestemming").eq("user_id", gebruiker.user_id).maybeSingle(),
    db.from("certificaten")
      .select("id, niveau, uitgegeven_op, status, verificatiecode")
      .eq("gebruiker_id", gebruiker.user_id).eq("niveau", "lezer")
      .order("uitgegeven_op", { ascending: false }).limit(1)
  ]);

  const mag = magStarten(pogingen);
  const grens = venstergrens();
  res.status(200).json({
    aantal_vragen: AANTAL_VRAGEN,
    lat: LAT,
    max_pogingen: MAX_POGINGEN,
    venster_dagen: VENSTER_DAGEN,
    module_toegang: !!gebr.data?.lezer_module_toegang,
    naam: gebr.data?.naam || null,
    niveau: gebr.data?.niveau || "geen",
    register_toestemming: !!gebr.data?.register_toestemming,
    certificaat: (cert.data || [])[0] || null,
    pogingen_gedaan: pogingen.filter(p => new Date(p.gestart_op) >= grens).length,
    mag_starten: mag.mag,
    reden: mag.reden,
    melding: mag.tekst || null,
    laatste: pogingen[0]
      ? { score: pogingen[0].score, geslaagd: pogingen[0].geslaagd, afgerond_op: pogingen[0].afgerond_op }
      : null
  });
}

async function start(res, db, gebruiker){
  // De toets hoort bij de module. Wie geen toegang heeft tot hoofdstuk 3 tot en
  // met 6 kan de vragen daarover niet hebben gelezen.
  const gebr = await db.from("teamkracht_gebruikers")
    .select("lezer_module_toegang").eq("user_id", gebruiker.user_id).maybeSingle();
  if (!gebr.data?.lezer_module_toegang){
    res.status(403).json({ error: "De toets hoort bij de Lezer-module. Die staat nog niet voor je open." });
    return;
  }

  const pogingen = await haalPogingen(db, gebruiker.user_id);
  const mag = magStarten(pogingen);
  if (!mag.mag){ res.status(429).json({ error: mag.tekst, reden: mag.reden }); return; }

  const pool = await db.from("toets_vragen")
    .select("id, vraag, opties, juist, hoofdstuk, actief").eq("actief", true);
  if (pool.error) throw pool.error;
  if ((pool.data || []).length < AANTAL_VRAGEN){
    res.status(503).json({ error: "Er staan nog te weinig vragen klaar voor een toets." });
    return;
  }

  // Een lopende poging hervat je met dezelfde vragen. Anders zou opnieuw
  // beginnen een manier zijn om net zo lang te trekken tot de vragen bevallen.
  if (mag.reden === "hervatten"){
    const oud = await db.from("toets_pogingen")
      .select("id, antwoorden").eq("id", mag.poging.id).single();
    const ids = oud.data?.antwoorden?.getrokken || [];
    const vragen = ids.map(id => (pool.data || []).find(v => v.id === id)).filter(Boolean);
    if (vragen.length === AANTAL_VRAGEN){
      res.status(200).json({ poging_id: oud.data.id, hervat: true, vragen: vragen.map(zonderAntwoord) });
      return;
    }
  }

  const getrokken = trekVragen(pool.data, AANTAL_VRAGEN);
  const ins = await db.from("toets_pogingen").insert({
    gebruiker_id: gebruiker.user_id,
    antwoorden: { getrokken: getrokken.map(v => v.id) }
  }).select("id").single();
  if (ins.error) throw ins.error;

  res.status(200).json({ poging_id: ins.data.id, hervat: false, vragen: getrokken.map(zonderAntwoord) });
}

async function inleveren(res, db, gebruiker, body){
  const pogingId = String(body.poging_id || "");
  const gegeven = body.antwoorden && typeof body.antwoorden === "object" ? body.antwoorden : {};

  const p = await db.from("toets_pogingen")
    .select("id, gebruiker_id, gestart_op, afgerond_op, antwoorden").eq("id", pogingId).maybeSingle();
  if (p.error || !p.data){ res.status(404).json({ error: "onbekende poging" }); return; }
  if (p.data.gebruiker_id !== gebruiker.user_id){ res.status(403).json({ error: "geen toegang" }); return; }
  if (p.data.afgerond_op){ res.status(409).json({ error: "deze poging is al ingeleverd" }); return; }

  const ids = p.data.antwoorden?.getrokken || [];
  const q = await db.from("toets_vragen").select("id, vraag, opties, juist, hoofdstuk").in("id", ids);
  if (q.error) throw q.error;
  // In dezelfde volgorde als bij het trekken, zodat de uitslag per hoofdstuk
  // klopt met wat de kandidaat zag.
  const vragen = ids.map(id => (q.data || []).find(v => v.id === id)).filter(Boolean);

  const uitslag = nakijken(vragen, gegeven);
  const nu = new Date().toISOString();

  const bij = await db.from("toets_pogingen").update({
    afgerond_op: nu,
    score: uitslag.score,
    geslaagd: uitslag.geslaagd,
    antwoorden: { getrokken: ids, gegeven: uitslag.antwoorden }
  }).eq("id", pogingId).is("afgerond_op", null).select("id").maybeSingle();
  if (!bij.data){ res.status(409).json({ error: "deze poging is al ingeleverd" }); return; }

  let certificaat = null;
  if (uitslag.geslaagd){
    certificaat = await geefCertificaat(db, gebruiker, pogingId, body);
  }

  res.status(200).json({
    score: uitslag.score,
    totaal: uitslag.totaal,
    lat: LAT,
    geslaagd: uitslag.geslaagd,
    per_hoofdstuk: uitslag.perHoofdstuk,
    lees_terug: uitslag.geslaagd ? [] : leesadvies(uitslag.perHoofdstuk),
    certificaat
  });
}

/* De toestemming voor het openbare register. Staat standaard uit en wordt hier
   aan- of uitgezet; de vraag komt na de uitslag, want daarvoor valt er niets te
   publiceren. Intrekken kan altijd en werkt meteen. */
async function register(res, db, gebruiker, body){
  const toestemming = body.toestemming === true;
  const uit = await db.from("teamkracht_gebruikers")
    .update({ register_toestemming: toestemming }).eq("user_id", gebruiker.user_id)
    .select("register_toestemming").single();
  if (uit.error) throw uit.error;
  res.status(200).json({ ok: true, register_toestemming: uit.data.register_toestemming });
}

/* Het certificaat. De naam wordt bevroren zoals hij nu is: een diploma hoort
   niet met terugwerkende kracht op een andere naam te komen staan. Iemand die
   al een Lezer-certificaat heeft, krijgt er geen tweede. */
async function geefCertificaat(db, gebruiker, pogingId, body){
  const bestaand = await db.from("certificaten")
    .select("id, uitgegeven_op, verificatiecode, status")
    .eq("gebruiker_id", gebruiker.user_id).eq("niveau", "lezer")
    .order("uitgegeven_op", { ascending: false }).limit(1);
  if ((bestaand.data || []).length) return bestaand.data[0];

  const gebr = await db.from("teamkracht_gebruikers")
    .select("naam, email").eq("user_id", gebruiker.user_id).maybeSingle();

  const ins = await db.from("certificaten").insert({
    gebruiker_id: gebruiker.user_id,
    naam_op_certificaat: gebr.data?.naam || gebr.data?.email || null,
    niveau: "lezer",
    poging_id: pogingId
  }).select("id, uitgegeven_op, verificatiecode, status").single();
  if (ins.error) throw ins.error;

  // Het niveau volgt uit het certificaat en nergens anders vandaan. De
  // toestemming voor het openbare register wordt hier gevraagd en vastgelegd;
  // standaard staat hij uit.
  const bij = { niveau: "lezer" };
  if (body.register_toestemming === true) bij.register_toestemming = true;
  await db.from("teamkracht_gebruikers").update(bij).eq("user_id", gebruiker.user_id);

  return ins.data;
}
