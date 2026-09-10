// api/organisatie.js — Vercel serverless function
// Het organisatiedashboard en het seatbeheer.
//
// Wat hier bewust NIET gebeurt: teams van dezelfde organisatie naast elkaar op
// score zetten. De query haalt geen scorekolom op, er wordt niet gesorteerd op
// iets wat van een score is afgeleid, en er staat geen gemiddelde of totaal
// over teams in het antwoord. De score van een team is alleen te zien op de
// kaart van dat team, tegen het gemiddelde en tegen zijn eigen vorige meting.
// Zie rapport-tarieven-v3.md, vraag 5.
//
// GET    de organisatie, de leden, de openstaande uitnodigingen en de teams
// POST   {email, rol} een seat erbij
// DELETE ?user_id=… of ?uitnodiging_id=… een seat eraf

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { haalKoper } from "../koper-db.js";
import { seatsOver, magSeatToevoegen } from "../toegang.js";

const ROLLEN = ["lezer", "coach", "beheerder"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADRES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res){
  const gebruiker = await eisGebruiker(req, res, ROLLEN);
  if (!gebruiker) return;

  const db = serviceClient();
  const wie = await haalKoper(db, gebruiker.user_id);

  if (!wie.organisatie){
    res.status(404).json({ error: "Je hoort niet bij een organisatie met een lopend abonnement." });
    return;
  }
  const org = wie.organisatie;

  if (req.method === "GET")    return await lezen(db, res, wie, org);
  if (req.method === "POST")   return await toevoegen(db, req, res, gebruiker, wie, org);
  if (req.method === "DELETE") return await verwijderen(db, req, res, gebruiker, wie, org);
  res.status(405).json({ error: "method" });
}

async function lezen(db, res, wie, org){
  try{
    const leden = await db.from("organisatie_leden")
      .select("user_id, rol, toegevoegd_op").eq("organisatie_id", org.id)
      .order("toegevoegd_op");
    const ids = (leden.data || []).map(l => l.user_id);

    const [namen, uitnodigingen, teams] = await Promise.all([
      ids.length
        ? db.from("teamkracht_gebruikers").select("user_id, naam, email, niveau").in("user_id", ids)
        : Promise.resolve({ data: [] }),
      db.from("seat_uitnodigingen")
        .select("id, email, rol, created_at").eq("organisatie_id", org.id)
        .is("gebruikt_op", null).is("ingetrokken_op", null),
      ids.length
        ? db.from("teamkracht_teams")
            .select("id, naam, coach_naam, coach_user_id, created_at, hermeting_tegoed, hermeting_tot")
            .in("coach_user_id", ids).eq("actief", true)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] })
    ]);

    const teamIds = (teams.data || []).map(t => t.id);
    const [metingen, beelden] = await Promise.all([
      teamIds.length
        ? db.from("index_scan_results").select("teamkracht_team_id").in("teamkracht_team_id", teamIds)
        : Promise.resolve({ data: [] }),
      // Alleen soort, aantal en datum. Geen breuk en geen score: dat is de hele
      // regel uit sectie 0 van de briefing, en hij hoort in de query te staan
      // en niet pas in het scherm.
      teamIds.length
        ? db.from("teamkracht_teambeeld")
            .select("id, team_id, soort, n, created_at").in("team_id", teamIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] })
    ]);

    const telling = {};
    for (const r of metingen.data || []){
      telling[r.teamkracht_team_id] = (telling[r.teamkracht_team_id] || 0) + 1;
    }
    const perTeam = {};
    for (const b of beelden.data || []){
      (perTeam[b.team_id] = perTeam[b.team_id] || []).push(b);
    }
    const bij = Object.fromEntries((namen.data || []).map(g => [g.user_id, g]));

    res.status(200).json({
      organisatie: {
        id: org.id, naam: org.naam, staffel: org.staffel,
        seats_max: org.seats_max, abonnement_tot: org.abonnement_tot
      },
      ik: { beheerder: wie.beheerder_van_organisatie, prijsniveau: wie.prijsniveau },
      seats: {
        bezet: (leden.data || []).length + (uitnodigingen.data || []).length,
        over: seatsOver({ seats_max: org.seats_max,
                          bezet: (leden.data || []).length + (uitnodigingen.data || []).length })
      },
      leden: (leden.data || []).map(l => ({
        user_id: l.user_id, rol: l.rol, toegevoegd_op: l.toegevoegd_op,
        naam: bij[l.user_id]?.naam || null,
        email: bij[l.user_id]?.email || null,
        niveau: bij[l.user_id]?.niveau || "geen"
      })),
      uitnodigingen: uitnodigingen.data || [],
      teams: (teams.data || []).map(t => ({
        id: t.id, naam: t.naam,
        coach: bij[t.coach_user_id]?.naam || t.coach_naam || null,
        aantal_metingen: telling[t.id] || 0,
        hermeting_tegoed: t.hermeting_tegoed,
        hermeting_tot: t.hermeting_tot,
        beelden: (perTeam[t.id] || []).map(b => ({ soort: b.soort, n: b.n, created_at: b.created_at }))
      }))
    });
  }catch(e){
    await logFout("organisatie", e.message);
    res.status(500).json({ error: "het overzicht kon niet worden opgehaald" });
  }
}

async function toevoegen(db, req, res, gebruiker, wie, org){
  if (!wie.beheerder_van_organisatie){
    res.status(403).json({ error: "Alleen de beheerder kan seats toewijzen." }); return;
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const email = String(body.email || "").trim().toLowerCase();
  const rol = body.rol === "beheerder" ? "beheerder" : "gebruiker";
  if (!ADRES.test(email)){ res.status(400).json({ error: "Vul een geldig e-mailadres in." }); return; }

  const [leden, open] = await Promise.all([
    db.from("organisatie_leden").select("user_id").eq("organisatie_id", org.id),
    db.from("seat_uitnodigingen").select("id").eq("organisatie_id", org.id)
      .is("gebruikt_op", null).is("ingetrokken_op", null)
  ]);
  const bezet = (leden.data || []).length + (open.data || []).length;
  const over = seatsOver({ seats_max: org.seats_max, bezet });

  const oordeel = magSeatToevoegen({ soort: "organisatie", over });
  if (!oordeel.mag){ res.status(400).json({ error: oordeel.melding }); return; }

  // Heeft deze persoon al een account, dan is hij meteen lid. Zo niet, dan
  // blijft de uitnodiging staan tot hij voor het eerst inlogt.
  const bestaand = await db.from("teamkracht_gebruikers")
    .select("user_id").ilike("email", email).maybeSingle();

  if (bestaand.data?.user_id){
    const al = await db.from("organisatie_leden")
      .select("organisatie_id").eq("user_id", bestaand.data.user_id).maybeSingle();
    if (al.data){
      res.status(400).json({ error: "Deze persoon hoort al bij een organisatie." }); return;
    }
    const ins = await db.from("organisatie_leden")
      .insert({ organisatie_id: org.id, user_id: bestaand.data.user_id, rol });
    if (ins.error){ res.status(500).json({ error: "toevoegen mislukt" }); return; }
    await db.from("teamkracht_gebruikers")
      .update({ lijn: "organisatie" }).eq("user_id", bestaand.data.user_id);
    res.status(200).json({ toegevoegd: true, melding: "Deze persoon is toegevoegd en ziet het meteen." });
    return;
  }

  const uit = await db.from("seat_uitnodigingen").insert({
    soort: "organisatie", organisatie_id: org.id, email, rol,
    uitgenodigd_door: gebruiker.user_id
  }).select("id").single();
  if (uit.error){
    const dubbel = /duplicate|unique/i.test(uit.error.message || "");
    res.status(400).json({ error: dubbel
      ? "Voor dit adres staat al een uitnodiging open."
      : "uitnodigen mislukt" });
    return;
  }
  res.status(200).json({
    toegevoegd: false, uitnodiging_id: uit.data.id,
    melding: "De seat staat klaar. Hij gaat in zodra deze persoon voor het eerst inlogt."
  });
}

async function verwijderen(db, req, res, gebruiker, wie, org){
  if (!wie.beheerder_van_organisatie){
    res.status(403).json({ error: "Alleen de beheerder kan seats vrijmaken." }); return;
  }
  const userId = req.query?.user_id ? String(req.query.user_id) : null;
  const uitnodigingId = req.query?.uitnodiging_id ? String(req.query.uitnodiging_id) : null;

  if (uitnodigingId && UUID.test(uitnodigingId)){
    await db.from("seat_uitnodigingen")
      .update({ ingetrokken_op: new Date().toISOString() })
      .eq("id", uitnodigingId).eq("organisatie_id", org.id);
    res.status(200).json({ ok: true }); return;
  }

  if (!userId || !UUID.test(userId)){ res.status(400).json({ error: "geef user_id of uitnodiging_id" }); return; }
  if (userId === org.beheerder_user_id || userId === gebruiker.user_id){
    res.status(400).json({ error: "De beheerder kan zijn eigen seat niet vrijmaken." }); return;
  }

  // De teams van deze persoon blijven van hem. Ze verdwijnen uit het
  // organisatiedashboard omdat hij geen lid meer is, en dat is de bedoeling:
  // een team hoort bij zijn coach en niet bij een abonnement.
  await db.from("organisatie_leden").delete()
    .eq("organisatie_id", org.id).eq("user_id", userId);
  await db.from("teamkracht_gebruikers").update({ lijn: "los" }).eq("user_id", userId);
  res.status(200).json({ ok: true });
}
