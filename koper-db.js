// koper-db.js
// De brug tussen de database en toegang.js. Haalt de drie brokjes op waaruit
// volgt wie iemand is (zijn gebruikersrij, zijn organisatie, zijn bureau) en
// laat toegang.js zeggen wat er geldt.
//
// Eén plek, want deze vraag wordt op vier routes gesteld en het antwoord moet
// overal hetzelfde zijn.

import { koper } from "./toegang.js";

export async function haalKoper(db, userId, vandaag = new Date()){
  const [g, ol, bl] = await Promise.all([
    db.from("teamkracht_gebruikers")
      .select("user_id, rol, niveau, lijn, licentie_actief, licentie_tot, beta, beta_tot, pak_tegoed")
      .eq("user_id", userId).maybeSingle(),
    db.from("organisatie_leden").select("organisatie_id, rol").eq("user_id", userId).maybeSingle(),
    db.from("bureau_leden").select("bureau_id, rol").eq("user_id", userId).maybeSingle()
  ]);

  const [o, b] = await Promise.all([
    ol.data?.organisatie_id
      ? db.from("organisaties").select("id, naam, staffel, seats_max, abonnement_tot, actief, beheerder_user_id")
          .eq("id", ol.data.organisatie_id).maybeSingle()
      : Promise.resolve({ data: null }),
    bl.data?.bureau_id
      ? db.from("bureaus").select("id, naam, staffel, seats_max, pak_tegoed, pak_verbruikt, abonnement_tot, actief, logo_url, beheerder_user_id")
          .eq("id", bl.data.bureau_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const wie = koper({
    gebruiker: g.data || {}, organisatie: o.data || null, bureau: b.data || null, vandaag
  });

  return {
    ...wie,
    user_id: userId,
    rol: g.data?.rol || "coach",
    niveau: g.data?.niveau || "geen",
    organisatie: o.data || null,
    bureau: b.data || null,
    beheerder_van_organisatie: ol.data?.rol === "beheerder",
    beheerder_van_bureau: bl.data?.rol === "beheerder"
  };
}

/* De producten die bij het pakket en de hermeting horen. Alles in één vraag,
   want de prijsbepaling wil ze alle dertien kunnen zien om er één te kiezen. */
export async function haalProducten(db, groepen = ["PAK", "HM"]){
  const q = await db.from("producten")
    .select("code, naam, prijs_ex_btw, btw_promille, interval, soort, fase, groep, prijsniveau, seats_max, pak_tegoed, verlengt_als, actief")
    .in("groep", groepen).eq("actief", true);
  return q.data || [];
}

/* Een pakket zet één hermeting op het team, zes maanden geldig. Staat hier en
   niet in een route, want een pakket kan langs twee wegen betaald raken: uit
   het bundeltegoed (nul euro, in betaling-start) of via Mollie (in
   betaling-verwerken). Beide komen hier uit. */
export const MAANDEN_TEGOED = 6;

export async function zetHermetingTegoed(db, teamId, bestellingId, vanaf = new Date()){
  const tot = new Date(vanaf);
  tot.setMonth(tot.getMonth() + MAANDEN_TEGOED);
  await db.from("teamkracht_teams").update({
    hermeting_tegoed: 1,
    hermeting_tot: tot.toISOString().slice(0, 10),
    pakket_bestelling_id: bestellingId
  }).eq("id", teamId);
  return tot.toISOString().slice(0, 10);
}

/* De klant bij Mollie. Nodig zodra er een abonnement in het spel is: een
   incasso zonder mandaat bestaat niet, en het mandaat hangt aan de klant.
   Wordt hergebruikt, want een tweede klantrij voor dezelfde persoon betekent
   dat zijn machtigingen over twee dossiers verspreid raken. */
export async function haalOfMaakMollieKlant(db, { userId, email, naam }){
  const g = await db.from("teamkracht_gebruikers")
    .select("mollie_customer_id, naam, email").eq("user_id", userId).maybeSingle();
  if (g.data?.mollie_customer_id) return g.data.mollie_customer_id;

  const { maakKlant } = await import("./mollie.js");
  const klant = await maakKlant({
    naam: naam || g.data?.naam || null,
    email: email || g.data?.email || null,
    metadata: { user_id: userId }
  });
  await db.from("teamkracht_gebruikers")
    .update({ mollie_customer_id: klant.id }).eq("user_id", userId);
  return klant.id;
}
