// api/teamkracht-beheer.js — Vercel serverless function
// De beheerpagina voor de teksten en de instellingen. Alleen voor de
// beheerder; een coach komt hier niet.
//
// Wat te bewerken is, staat in teamkracht-beheer-schema.js. Alles wat daar
// niet in staat wordt genegeerd, ook als de browser het meestuurt: de route
// bouwt de update zelf op uit de witte lijst in plaats van door te geven wat
// binnenkomt.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";
import { SCHEMA, taalcontrole } from "../teamkracht-beheer-schema.js";
import { controleerVoorwaarde } from "../teamkracht-logica.js";

export default async function handler(req, res){
  const gebruiker = await eisGebruiker(req, res, ["beheerder"]);
  if (!gebruiker) return;

  const naam = String(req.query?.tabel || (req.body && JSON.parse(typeof req.body === "string" ? req.body : JSON.stringify(req.body)).tabel) || "");
  const def = SCHEMA[naam];
  if (!def){ res.status(400).json({ error: "onbekende tabel" }); return; }
  const db = serviceClient();

  if (req.method === "GET"){
    const kolommen = [def.sleutel, ...def.velden.map(v => v.kolom)].join(", ");
    let q = db.from(def.tabel).select(kolommen);
    if (!def.enkel) q = q.order(def.velden.some(v => v.kolom === "volgorde") ? "volgorde" : def.sleutel);
    const uit = await q;
    if (uit.error){ res.status(500).json({ error: "ophalen mislukt" }); return; }
    res.status(200).json({ tabel: naam, rijen: uit.data });
    return;
  }

  if (req.method === "PUT"){
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const sleutel = body.sleutel;
    if (sleutel === undefined || sleutel === null || sleutel === ""){
      res.status(400).json({ error: "sleutel ontbreekt" }); return;
    }

    const waarden = {};
    for (const veld of def.velden){
      if (!(veld.kolom in (body.waarden || {}))) continue;
      const ruw = body.waarden[veld.kolom];

      if (veld.type === "getal"){
        if (ruw === null || ruw === "") { waarden[veld.kolom] = null; continue; }
        const n = Number(ruw);
        if (!Number.isFinite(n)){ res.status(400).json({ error: `${veld.label} moet een getal zijn` }); return; }
        waarden[veld.kolom] = n;

      } else if (veld.type === "vinkje"){
        waarden[veld.kolom] = !!ruw;

      } else if (veld.type === "keuze"){
        if (!veld.opties.includes(ruw)){ res.status(400).json({ error: `${veld.label} mag alleen ${veld.opties.join(" of ")} zijn` }); return; }
        waarden[veld.kolom] = ruw;

      } else if (veld.type === "json"){
        if (ruw === null || ruw === "") { waarden[veld.kolom] = null; continue; }
        let ontleed;
        try{ ontleed = typeof ruw === "string" ? JSON.parse(ruw) : ruw; }
        catch(e){ res.status(400).json({ error: `${veld.label}: dit is geen geldige JSON. ${e.message}` }); return; }
        // De voorwaarde van een regel wordt ook inhoudelijk nagekeken, zodat een
        // typefout in een sleutel hier stukloopt en niet stil op de kaart.
        if (naam === "regels" && veld.kolom === "voorwaarde"){
          try{ controleerVoorwaarde(ontleed); }
          catch(e){ res.status(400).json({ error: `Voorwaarde: ${e.message}` }); return; }
        }
        waarden[veld.kolom] = ontleed;

      } else {
        const tekst = ruw === null || ruw === "" ? null : String(ruw).slice(0, 4000);
        const klacht = taalcontrole(tekst);
        if (klacht){ res.status(400).json({ error: `${veld.label}: ${klacht}` }); return; }
        waarden[veld.kolom] = tekst;
      }
    }

    if (!Object.keys(waarden).length){ res.status(400).json({ error: "niets te wijzigen" }); return; }
    if (def.updated) waarden.updated_at = new Date().toISOString();

    const uit = await db.from(def.tabel).update(waarden).eq(def.sleutel, sleutel).select(def.sleutel).single();
    if (uit.error){ res.status(500).json({ error: "opslaan mislukt" }); return; }

    res.status(200).json({ ok: true, sleutel: uit.data[def.sleutel] });
    return;
  }

  res.status(405).json({ error: "method" });
}
