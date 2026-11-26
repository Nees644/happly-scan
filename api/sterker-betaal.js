// api/sterker-betaal.js, Vercel serverless function
// De betaalknop in de factuurmail. Maakt op het moment van klikken een
// betaling bij Mollie en stuurt door naar de betaalpagina. Met &stand=1 geeft
// hij de stand terug voor de terugkeerpagina, en vraagt hij die zo nodig zelf
// bij Mollie op.

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { haalBetaling } from "../mollie.js";
import { zoekOpToken, startBetaling, verwerkMollieId } from "../sterker.js";

export default async function handler(req, res){
  const db = serviceClient();
  const a = await zoekOpToken(db, req.query?.t);
  if (!a){ res.status(404).send("Deze betaallink kennen we niet. Mail hallo@happly.nl."); return; }

  if (req.query?.stand){
    let status = a.status;
    if (status !== "betaald" && a.mollie_payment_id){
      try{
        await verwerkMollieId(db, a.mollie_payment_id, haalBetaling);
        status = (await zoekOpToken(db, a.token))?.status || status;
      }catch(e){ /* de melding van Mollie volgt nog */ }
    }
    res.status(200).json({ status, organisatie: a.organisatie });
    return;
  }

  if (a.status === "betaald"){ res.redirect(302, `/sterker-betaald?t=${encodeURIComponent(a.token)}`); return; }
  try{
    const { betaalpagina } = await startBetaling(db, req, a);
    if (!betaalpagina) throw new Error("geen betaalpagina van Mollie");
    res.redirect(303, betaalpagina);
  }catch(e){
    await logFout("sterker-betaal", e.message);
    res.status(502).send("Betalen lukt op dit moment niet. Probeer het zo nog eens, of mail hallo@happly.nl.");
  }
}
