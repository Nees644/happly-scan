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
  if (rol.error || !rol.data) return null;

  return { user_id: data.user.id, email: data.user.email, rol: rol.data.rol };
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
