// teamkracht-auth.js
// Serverside authenticatie voor de Teamkracht-routes. De browser stuurt het
// access token van de Supabase-sessie mee als Authorization: Bearer <token>;
// hier wordt dat gevalideerd en de rol opgezocht in teamkracht_gebruikers.
// Zonder rij in die tabel is er geen toegang, ook niet met een geldig token.
// Vereist de migratie 07-09-2026, blok A.

import { createClient } from "@supabase/supabase-js";

export function serviceClient(){
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/* Geeft {user_id, email, rol} terug, of null als er geen geldige sessie is. */
export async function haalGebruiker(req){
  const kop = req.headers?.authorization || "";
  const token = kop.startsWith("Bearer ") ? kop.slice(7).trim() : "";
  if (!token) return null;

  const db = serviceClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;

  const rol = await db.from("teamkracht_gebruikers")
    .select("rol").eq("user_id", data.user.id).single();

  // Sinds registratie open staat (09-09-2026) krijgt iemand die voor het eerst
  // inlogt vanzelf een rij, met de laagste rol. Lezer mag de gratis
  // hoofdstukken lezen en een team aanmaken; alles wat geld kost of gegevens
  // van anderen raakt, zit achter een eigen controle verderop.
  if (rol.error || !rol.data){
    const nieuw = await db.from("teamkracht_gebruikers").insert({
      user_id: data.user.id, email: data.user.email, rol: "lezer", niveau: "geen"
    }).select("rol").single();
    if (nieuw.error) return null;
    // Stond er een seat op dit adres te wachten, dan gaat hij nu in. Dit is het
    // enige moment waarop dat kan: de beheerder nodigde uit op e-mailadres,
    // want er was toen nog geen account om aan te koppelen.
    await losSeatIn(db, data.user.id, data.user.email);
    return { user_id: data.user.id, email: data.user.email, rol: nieuw.data.rol, nieuw: true };
  }

  return { user_id: data.user.id, email: data.user.email, rol: rol.data.rol };
}

/* Een openstaande uitnodiging voor dit adres inlossen. Stil bij een fout: een
   nieuwe gebruiker hoort binnen te komen, ook als zijn seat niet doorgaat. De
   beheerder ziet de uitnodiging dan nog openstaan en kan het opnieuw doen. */
async function losSeatIn(db, userId, email){
  try{
    if (!email) return;
    const u = await db.from("seat_uitnodigingen")
      .select("id, soort, organisatie_id, bureau_id, rol")
      .ilike("email", email).is("gebruikt_op", null).is("ingetrokken_op", null)
      .maybeSingle();
    if (!u.data) return;

    const tabel = u.data.soort === "bureau" ? "bureau_leden" : "organisatie_leden";
    const sleutel = u.data.soort === "bureau"
      ? { bureau_id: u.data.bureau_id }
      : { organisatie_id: u.data.organisatie_id };

    const ins = await db.from(tabel).insert({ ...sleutel, user_id: userId, rol: u.data.rol });
    if (ins.error) return;

    await db.from("teamkracht_gebruikers")
      .update({ lijn: u.data.soort }).eq("user_id", userId);
    await db.from("seat_uitnodigingen")
      .update({ gebruikt_op: new Date().toISOString() }).eq("id", u.data.id);
  }catch(e){ /* stil */ }
}

/* Vangnet voor een route: geeft de gebruiker terug of sluit het verzoek af. */
export async function eisGebruiker(req, res, rollen = ["coach", "beheerder"]){
  const gebruiker = await haalGebruiker(req);
  if (!gebruiker){ res.status(401).json({ error: "niet ingelogd" }); return null; }
  if (!rollen.includes(gebruiker.rol)){ res.status(403).json({ error: "geen toegang" }); return null; }
  return gebruiker;
}

/* Een mislukking van een Teamkracht-route landt in funnel_events, zodat je in
   het dashboard ziet dat er iets stukging in plaats van het van een coach te
   horen. Alleen echte fouten, geen 400 of 403: dat zijn gebruikersfouten en
   die zeggen niets over de software. Er staat geen persoonsgegeven in, alleen
   de route en de melding die de gebruiker ook kreeg.
   Loggen mag nooit een verzoek laten vallen, vandaar de lege catch. */
export async function logFout(route, melding){
  try{
    await serviceClient().from("funnel_events").insert({
      event: "teamkracht_fout",
      bron: `${route}: ${String(melding).slice(0, 140)}`,
      sessie: crypto.randomUUID()
    });
  }catch(e){ /* stil */ }
}
