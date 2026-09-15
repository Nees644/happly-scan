// betaling-verwerken.js
// Eén plek waar een betaling wordt afgehandeld, gebruikt door twee wegen: de
// melding van Mollie, en de pagina waar de klant op terugkomt.
//
// Dat er twee wegen zijn is met opzet. Een melding kan uitblijven, te laat
// komen of geblokkeerd worden, en dan hoort de klant niet in het ongewisse te
// blijven. Beide wegen doen precies hetzelfde en mogen elkaar overlappen: de
// verwerking is idempotent, dus twee keer verwerken verandert niets.

import { haalBetaling, maakAbonnement } from "./mollie.js";
import { groepVanCode } from "./toegang.js";
import { zetHermetingTegoed } from "./koper-db.js";
import { vervolgAbonnement } from "./betalen.js";
import { verderDan } from "./leidersbeeld-koppelen.js";
import { compleet as bedrijfCompleet, ontbreekt as bedrijfOntbreekt, BEDRIJF } from "./bedrijf.js";
import { klantUit, klantCompleet, regelsVoor, totalen, btwVerlegd } from "./factuur.js";
import { factuurMail } from "./factuur-mail.js";
import { Resend } from "resend";

const MOLLIE_NAAR_ONS = {
  paid: "betaald",
  expired: "verlopen",
  canceled: "mislukt",
  failed: "mislukt"
};

/* Wat er moet gebeuren zodra een betaling binnen is. Alleen dingen die uit de
   bestelling volgen; de bestelling zelf blijft de bron. */
async function pasToe(db, bestelling){
  const code = bestelling.product_code;

  const groep = groepVanCode(code);

  // Een pakket zet meteen de hermeting klaar op het team: één stuks, zes
  // maanden geldig. Dat is het enige wat een pakket doet wat een losse
  // Teamfoto niet deed, en het is de reden dat het tegoed aan het team hangt
  // en niet aan de koper.
  if (groep === "PAK"){
    if (!bestelling.team_id) return "pakket betaald, nog geen team gekozen";
    const tot = await zetHermetingTegoed(db, bestelling.team_id, bestelling.id, new Date());
    const leider = await zetLeidersbeeldBetaald(db, bestelling.team_id);
    return `pakket vastgelegd, hermeting tot ${tot}${leider}`;
  }

  // Een losse hermeting wordt pas verbruikt als de kaart wordt gemaakt. Het
  // recht staat in de bestelling; hier hoeft niets te gebeuren.
  if (groep === "HM") return "recht op een hermeting vastgelegd";

  // Een abonnement: de organisatie ontstaat hier, en niet eerder. Wie afhaakt op
  // de betaalpagina hoort geen half aangemaakte organisatie achter te laten.
  if (groep === "ORG") return await zetOrganisatie(db, bestelling, code);

  if (code === "LEZ-1" || code === "LEZ-10"){
    // Toegang tot de module, en uitdrukkelijk geen niveau: niveau = 'lezer'
    // komt pas na een geslaagde toets. Wie betaalt heeft toegang tot de
    // hoofdstukken en de toets, meer niet. Dat verschil is de waarde van het
    // register.
    await zetModuleToegang(db, bestelling.gebruiker_id);

    // LEZ-10 bevat ook twaalf maanden Organisatie midden. De negen andere
    // plekken worden nog niet uitgedeeld; dat vraagt uitnodigingscodes en LEZ-10
    // staat op fase later.
    if (code === "LEZ-10"){
      const uit = await zetOrganisatie(db, bestelling, "ORG-2");
      return `module opengezet voor de koper, ${uit}`;
    }
    return "module opengezet";
  }

  return "geen actie";
}

/* Hangt er een Leidersbeeld aan dit team, dan gaat dat mee naar 'betaald'. De
   status gaat alleen vooruit, dus een tweede melding over dezelfde betaling
   verandert niets. Stil bij een fout: een betaling is verwerkt of niet, en dat
   hoort niet af te hangen van een lead. */
async function zetLeidersbeeldBetaald(db, teamId){
  try{
    const q = await db.from("teamkracht_leidersbeeld")
      .select("id, status").eq("team_id", teamId);
    let geraakt = 0;
    for (const rij of (q.data || [])){
      const nieuw = verderDan(rij.status, "betaald");
      if (nieuw === rij.status) continue;
      await db.from("teamkracht_leidersbeeld").update({ status: nieuw }).eq("id", rij.id);
      geraakt++;
    }
    return geraakt ? ", Leidersbeeld op betaald" : "";
  }catch(e){ return ""; }
}

const STAFFEL = { "ORG-1": "klein", "ORG-2": "midden", "ORG-3": "groot" };

/* Toegang tot hoofdstuk 3 tot en met 6 en tot de toets. Zet nooit een niveau:
   dat komt uit de toets en nergens anders vandaan. */
async function zetModuleToegang(db, userId){
  await db.from("teamkracht_gebruikers")
    .update({ lezer_module_toegang: true }).eq("user_id", userId);
}

/* De organisatie aanmaken en de koper er als beheerder in zetten. Idempotent:
   is deze koper al lid van een organisatie, dan is dit een tweede melding over
   dezelfde betaling en hoort er niets te gebeuren. Een gebruiker heeft precies
   één lijn, dus lidmaatschap is de betrouwbaarste vraag die we kunnen stellen. */
async function zetOrganisatie(db, bestelling, orgCode){
  const bestaand = await db.from("organisatie_leden")
    .select("organisatie_id").eq("user_id", bestelling.gebruiker_id).maybeSingle();
  if (bestaand.data?.organisatie_id) return "organisatie stond er al";

  const p = await db.from("producten")
    .select("code, naam, seats_max").eq("code", orgCode).maybeSingle();
  if (!p.data) return `product ${orgCode} niet gevonden`;

  const tot = new Date();
  tot.setFullYear(tot.getFullYear() + 1);

  const g = await db.from("teamkracht_gebruikers")
    .select("organisatie, naam, email").eq("user_id", bestelling.gebruiker_id).maybeSingle();

  const org = await db.from("organisaties").insert({
    naam: g.data?.organisatie || g.data?.naam || g.data?.email || "Mijn organisatie",
    staffel: STAFFEL[orgCode] || "klein",
    seats_max: p.data.seats_max,
    abonnement_tot: tot.toISOString().slice(0, 10),
    beheerder_user_id: bestelling.gebruiker_id,
    product_code: orgCode
  }).select("id").single();
  if (org.error) throw new Error(`organisatie aanmaken mislukt: ${org.error.message}`);

  await db.from("organisatie_leden").insert({
    organisatie_id: org.data.id, user_id: bestelling.gebruiker_id, rol: "beheerder"
  });
  await db.from("teamkracht_gebruikers")
    .update({ lijn: "organisatie" }).eq("user_id", bestelling.gebruiker_id);

  // De beheerder krijgt de module en de toets erbij (besluit 10-09-2026). Alleen
  // de beheerder: een seat is een gebruiker en geen cursist.
  await zetModuleToegang(db, bestelling.gebruiker_id);

  return `organisatie ${STAFFEL[orgCode]} aangemaakt tot ${tot.toISOString().slice(0, 10)}`;
}

/* Het abonnement bij Mollie, voor als er een verlenging uit deze aankoop
   voortkomt. Pas nadat er is betaald, want zonder betaling is er geen mandaat.
   Idempotent op mollie_subscription_id: een dubbel bezorgde melding hoort geen
   tweede incasso op te leveren. */
async function startVervolg(db, bestelling){
  const p = await db.from("producten")
    .select("code, naam, prijs_ex_btw, btw_promille, interval, verlengt_als")
    .eq("code", bestelling.product_code).maybeSingle();
  if (!p.data) return null;

  const verleng = p.data.verlengt_als
    ? (await db.from("producten")
        .select("code, naam, prijs_ex_btw, btw_promille, interval")
        .eq("code", p.data.verlengt_als).maybeSingle()).data
    : null;

  const plan = vervolgAbonnement({ product: p.data, verlengProduct: verleng, vanaf: new Date() });
  if (!plan) return null;

  const g = await db.from("teamkracht_gebruikers")
    .select("mollie_customer_id, mollie_subscription_id").eq("user_id", bestelling.gebruiker_id).maybeSingle();
  if (!g.data?.mollie_customer_id) return "geen mandaat, abonnement niet gestart";
  if (g.data.mollie_subscription_id) return "abonnement liep al";

  const basis = process.env.SITE_URL || "https://scan.happly.nl";
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";
  const abo = await maakAbonnement(g.data.mollie_customer_id, {
    centen: plan.centen,
    interval: plan.interval,
    omschrijving: plan.omschrijving,
    startDate: plan.startDate,
    webhookUrl: `${basis}/api/betaling-webhook?s=${encodeURIComponent(geheim)}`,
    metadata: { user_id: bestelling.gebruiker_id, product: plan.code }
  });

  await db.from("teamkracht_gebruikers")
    .update({ mollie_subscription_id: abo.id }).eq("user_id", bestelling.gebruiker_id);

  return `${plan.code} loopt door vanaf ${plan.startDate}`;
}

/* Haalt de stand bij Mollie op en werkt de bestelling bij. Geeft terug wat er
   is gebeurd, in gewone taal, zodat het in een logregel bruikbaar is. */
export async function verwerkMollieBetaling(db, mollieId){
  const betaling = await haalBetaling(mollieId);
  const bestellingId = betaling?.metadata?.bestelling_id || null;

  let q = db.from("bestellingen").select("*");
  q = bestellingId ? q.eq("id", bestellingId) : q.eq("mollie_payment_id", mollieId);
  const b = await q.single();
  if (b.error || !b.data) return { uitkomst: "geen bestelling gevonden", bestelling: null };

  const bestelling = b.data;
  const nieuw = MOLLIE_NAAR_ONS[betaling.status] || null;

  // Al op de goede stand? Dan niets doen. Mollie bezorgt een melding gerust
  // twee keer, en de bedankpagina vraagt het er nog eens overheen.
  if (!nieuw || bestelling.status === nieuw){
    return { uitkomst: `al op ${bestelling.status}`, bestelling };
  }

  await db.from("bestellingen").update({
    status: nieuw,
    mollie_payment_id: mollieId,
    betaald_op: nieuw === "betaald" ? new Date().toISOString() : null
  }).eq("id", bestelling.id);

  let uitkomst = `bestelling op ${nieuw}`;
  if (nieuw === "betaald"){
    uitkomst = await pasToe(db, bestelling);
    // Het abonnement is een aparte stap na het toepassen. Gaat die mis, dan is
    // de aankoop wel geleverd en staat alleen de verlenging stil; dat is te
    // herstellen, een niet-geleverde aankoop niet.
    try{
      const vervolg = await startVervolg(db, bestelling);
      if (vervolg) uitkomst = `${uitkomst}, ${vervolg}`;
    }catch(e){
      uitkomst = `${uitkomst}, abonnement mislukt: ${String(e.message).slice(0, 80)}`;
    }
    // De factuur is de laatste stap en mag niets omvergooien. Wie heeft betaald
    // heeft zijn aankoop, ook als de factuur pas later lukt.
    try{
      const factuur = await maakFactuur(db, bestelling);
      if (factuur) uitkomst = `${uitkomst}, ${factuur}`;
    }catch(e){
      uitkomst = `${uitkomst}, factuur mislukt: ${String(e.message).slice(0, 80)}`;
    }
  }

  return { uitkomst, bestelling: { ...bestelling, status: nieuw } };
}

/* De factuur bij een aankoop vooraf. Een bestelling krijgt er hoogstens een;
   dat wordt bewaakt door de unieke index op facturen.bestelling_id, en niet
   door hier te tellen. Twee meldingen tegelijk leveren dus een botsing op en
   geen tweede factuurnummer.

   Zonder complete bedrijfsgegevens gaat er niets uit. Een factuur zonder
   btw-nummer of KvK is geen factuur, en een klant die hem niet kan boeken is
   slechter af dan een klant die nog even wacht. */
export async function maakFactuur(db, bestelling, verzender = undefined){
  // De verzender komt uit de omgeving, tenzij een test er een meegeeft. Zonder
  // sleutel wordt de factuur wel gemaakt en niet gemaild; dan staat hij klaar.
  if (verzender === undefined){
    verzender = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }

  const bestaat = await db.from("facturen").select("id, nummer").eq("bestelling_id", bestelling.id).maybeSingle();
  if (bestaat.data) return `factuur ${bestaat.data.nummer} stond er al`;

  if (!bedrijfCompleet()){
    await waarschuw(verzender, bestelling,
      `De bedrijfsgegevens in bedrijf.js zijn onvolledig: ${bedrijfOntbreekt().join(", ")}.`);
    return `geen factuur: bedrijfsgegevens onvolledig (${bedrijfOntbreekt().join(", ")})`;
  }

  const g = await db.from("teamkracht_gebruikers")
    .select("naam, email, organisatie, btw_nummer, factuur_naam, factuur_adres, factuur_postcode, factuur_plaats, factuur_land")
    .eq("user_id", bestelling.gebruiker_id).maybeSingle();
  const klant = klantUit(g.data || {});
  if (!klantCompleet(klant)){
    await waarschuw(verzender, bestelling, "De factuurgegevens van de klant ontbreken.");
    return "geen factuur: de factuurgegevens van de klant ontbreken";
  }

  const product = (await db.from("producten")
    .select("code, naam, btw_promille").eq("code", bestelling.product_code).maybeSingle()).data;

  const verlegd = btwVerlegd(klant);
  const regels = regelsVoor({ product, bestelling });
  const bedrag = totalen(regels, { verlegd });

  const nummer = await db.rpc("volgend_factuurnummer");
  if (nummer.error || !nummer.data) throw new Error("geen factuurnummer gekregen");

  const vandaag = new Date().toISOString().slice(0, 10);
  const ins = await db.from("facturen").insert({
    nummer: nummer.data,
    soort: "factuur",
    gebruiker_id: bestelling.gebruiker_id,
    bestelling_id: bestelling.id,
    periode_van: vandaag,
    periode_tot: vandaag,
    bedrag_ex_btw: bedrag.ex,
    btw_cent: bedrag.btw,
    bedrag_totaal: bedrag.totaal,
    btw_verlegd: verlegd,
    btw_nummer: klant.btw_nummer,
    status: "betaald",
    mollie_payment_id: bestelling.mollie_payment_id,
    betaald_op: new Date().toISOString(),
    klant_naam: klant.naam,
    klant_adres: klant.adres,
    klant_postcode: klant.postcode,
    klant_plaats: klant.plaats,
    klant_land: klant.land,
    regels
  }).select("*").single();
  if (ins.error){
    if (/duplicate|unique/i.test(ins.error.message || "")) return "factuur werd net al gemaakt";
    throw new Error(`factuur opslaan mislukt: ${ins.error.message}`);
  }

  const naar = klant.email || g.data?.email;
  if (verzender && naar){
    const mail = factuurMail(ins.data, BEDRIJF);
    const uit = await verzender.emails.send({
      from: `${BEDRIJF.naam} <${BEDRIJF.email}>`, to: naar, subject: mail.subject, html: mail.html
    });
    if (!(uit && uit.error)){
      await db.from("facturen").update({ verstuurd_op: new Date().toISOString() }).eq("id", ins.data.id);
      return `factuur ${ins.data.nummer} verstuurd`;
    }
    return `factuur ${ins.data.nummer} gemaakt, mail mislukt`;
  }
  return `factuur ${ins.data.nummer} gemaakt`;
}

/* Kan er geen factuur worden gemaakt terwijl er wel is betaald, dan hoort
   iemand dat te weten. De klant kan er niets aan doen en merkt er niets van;
   dit is een bericht aan onszelf, zodat de factuur met de hand kan volgen. */
async function waarschuw(verzender, bestelling, reden){
  try{
    if (!verzender) return;
    await verzender.emails.send({
      from: `${BEDRIJF.naam} <${BEDRIJF.email}>`,
      to: BEDRIJF.email,
      subject: `Betaling zonder factuur: bestelling ${bestelling.id}`,
      html: `<p>Er is betaald, maar er kon geen factuur worden opgemaakt.</p>
             <p><b>Reden:</b> ${reden}</p>
             <p>Bestelling ${bestelling.id}, product ${bestelling.product_code},
             bedrag ${(Number(bestelling.bedrag_cent || 0) / 100).toFixed(2)} euro.</p>`
    });
  }catch(e){ /* stil */ }
}
