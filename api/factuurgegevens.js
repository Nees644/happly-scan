// api/factuurgegevens.js — Vercel serverless function
// De gegevens die op de factuur van deze klant komen te staan.
//
// GET  geeft wat er nu bekend is, en wat er nog ontbreekt.
// POST slaat het op bij de gebruiker.
//
// Het adres staat op de gebruiker en wordt bij het maken van een factuur
// gekopieerd naar die factuur. Wie verhuist, houdt zijn oude facturen zoals ze
// waren.

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";
import { klantUit, klantCompleet, ontbrekendeKlantvelden } from "../factuur.js";

const VELDEN = {
  factuur_naam:     200,
  factuur_adres:    200,
  factuur_postcode: 20,
  factuur_plaats:   120,
  factuur_land:     2,
  btw_nummer:       40
};

export default async function handler(req, res){
  const gebruiker = await eisGebruiker(req, res, ["lezer", "coach", "beheerder"]);
  if (!gebruiker) return;
  const db = serviceClient();

  try{
    if (req.method === "GET"){
      const g = await db.from("teamkracht_gebruikers")
        .select("naam, email, organisatie, btw_nummer, factuur_naam, factuur_adres, factuur_postcode, factuur_plaats, factuur_land")
        .eq("user_id", gebruiker.user_id).maybeSingle();
      const klant = klantUit(g.data || {});
      res.status(200).json({
        gegevens: g.data || {},
        compleet: klantCompleet(klant),
        ontbreekt: ontbrekendeKlantvelden(klant)
      });
      return;
    }

    if (req.method === "POST"){
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const bij = {};
      for (const [veld, max] of Object.entries(VELDEN)){
        if (!(veld in body)) continue;
        const waarde = String(body[veld] ?? "").trim().slice(0, max);
        bij[veld] = waarde || null;
      }
      if (bij.factuur_land) bij.factuur_land = bij.factuur_land.toUpperCase();
      if (!bij.factuur_land) bij.factuur_land = "NL";

      const uit = await db.from("teamkracht_gebruikers")
        .update(bij).eq("user_id", gebruiker.user_id)
        .select("naam, email, organisatie, btw_nummer, factuur_naam, factuur_adres, factuur_postcode, factuur_plaats, factuur_land")
        .single();
      if (uit.error) throw uit.error;

      const klant = klantUit(uit.data);
      res.status(200).json({
        ok: true, gegevens: uit.data,
        compleet: klantCompleet(klant), ontbreekt: ontbrekendeKlantvelden(klant)
      });
      return;
    }

    res.status(405).json({ error: "method" });
  }catch(e){
    await logFout("factuurgegevens", e.message);
    res.status(500).json({ error: "opslaan mislukt" });
  }
}
