// api/dagtaken.js — Vercel cron (werkdagen, zie vercel.json)
// Stuurt elke werkdag om 06:30 UTC (08:30 NL zomertijd) één mail met de taken
// van vandaag voor de kleine route (Zelfkracht Index Professional).
//
// Weekritme (vast, elke week hetzelfde skelet):
//   ma · DISTRIBUTIE: bel- en maildag, minimaal 2 partnergesprekken gepland
//   di · OPERATING: funnel en cijfers bekijken, 1 verbetering doorvoeren
//   wo · DISTRIBUTIE: opvolging en nieuwe namen op de lijst
//   do · BOUWDAG: alleen bouwen als ma en wo zijn gedaan
//   vr · WEEKSLUITING: cijfers noteren, volgende week 3 namen klaarzetten
//
// De eerste twee weken (opstartfase) hebben eigen, specifieke taken; daarna
// valt de mail terug op het vaste weekritme hierboven.
//
// Aanpassen: wijzig ONTVANGER hieronder en desgewenst de taken in OPSTART.
// Preview zonder verzending: /api/dagtaken?preview=1 (toont de mail van vandaag)
// Vereist env vars: RESEND_API_KEY en (aanbevolen) CRON_SECRET.

import { Resend } from "resend";

const ONTVANGER = "hallo@happly.nl"; // pas aan naar je eigen mailbox als die anders is
const AFZENDER = "Happly Route <hallo@happly.nl>"; // zelfde geverifieerde afzender als api/opvolg.js

// Startdatum van de opstartfase (week 1, dag 1 = eerstvolgende maandag na livegang).
const START = "2026-09-07";

// Specifieke taken voor de eerste twee weken. Sleutel = dagnummer vanaf START (0 = ma week 1).
const OPSTART = {
  0: ["Lijst van 10 warme namen afmaken: coaches, trainers, HR-adviseurs die je kent",
      "De eerste 3 daarvan vandaag bellen of appen met het founding-aanbod (3 maanden halve prijs)",
      "Founding-zin paraat: verdient zich terug met één klant"],
  1: ["Funnel controleren: doe zelf een testmeting via professionals-pagina tot en met de mail",
      "Eén ding verbeteren dat je in de test opviel (tekst, knop, mail)",
      "Namen 4 en 5 van de lijst benaderen"],
  2: ["Opvolgen: iedereen van maandag die nog niet reageerde één korte reminder",
      "Namen 6 en 7 benaderen",
      "Vraag elke ja-zegger om één doorverwijzing: wie ken jij die dit ook zou willen?"],
  3: ["Bouwdag, alleen als ma en wo zijn gedaan: partneromgeving inrichten voor de eerste ja-zeggers",
      "Mollie-betaalverzoeken klaarzetten voor bevestigde partners"],
  4: ["Weeksluiting: hoeveel benaderd, hoeveel gesprekken, hoeveel ja: noteer de drie cijfers",
      "Namen 8, 9, 10 klaarzetten voor maandag",
      "Eén zin naar mij (Claude) in een nieuwe chat: de drie cijfers plus wat je opviel"],
  7: ["Namen 8, 9, 10 bellen",
      "Eerste founding partners: check of hun eerste klantmeting al is gedaan (activatie is alles)"],
  8: ["Cijferdag: metingen per partner bekijken, wie is stil? Die vandaag persoonlijk een bericht",
      "Eén funnelverbetering doorvoeren"],
  9: ["LinkedIn-bericht plaatsen: beschikbaar-signaal plus founding-aanbod, scan als uitgang",
      "Reacties zelfde dag opvolgen"],
  10: ["Bouwdag, alleen als ma en wo zijn gedaan",
       "Voorbereiden: welk optreden of podium kun je dit najaar boeken? Eén mail eruit"],
  11: ["Weeksluiting: cijfers noteren en vergelijken met week 1",
       "Besluit: doorgaan op dit ritme of één ding aanpassen. Nooit twee dingen tegelijk."]
};

const WEEKRITME = {
  1: { kop: "DISTRIBUTIE", taken: ["Minimaal 2 partnergesprekken plannen of voeren", "3 nieuwe namen op de lijst", "Elke ja-zegger om één doorverwijzing vragen"] },
  2: { kop: "OPERATING", taken: ["Cijfers bekijken: metingen per partner, stille partners persoonlijk berichten", "Eén funnel- of productverbetering doorvoeren, niet meer dan één"] },
  3: { kop: "DISTRIBUTIE", taken: ["Opvolgen wie niet reageerde", "2 nieuwe gesprekken", "Eén zichtbaar moment: post, reactie of mail met de scan als uitgang"] },
  4: { kop: "BOUWDAG", taken: ["Alleen bouwen als ma en wo zijn gedaan; anders eerst de distributie-achterstand", "Eén bouwtaak, afmaken, niet beginnen aan een tweede"] },
  5: { kop: "WEEKSLUITING", taken: ["Drie cijfers noteren: benaderd, gesprekken, betalende partners", "Volgende week 3 namen klaarzetten", "De cijfers in een nieuwe chat met Claude gooien voor de weekanalyse"] }
};

function vandaagInfo(now){
  const dagen = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  const wd = now.getUTCDay();
  const startD = new Date(START + "T00:00:00Z");
  const dagNr = Math.floor((now - startD) / 86400000);
  return { wd, dagNaam: dagen[wd], dagNr };
}

function bouwMail(now){
  const { wd, dagNaam, dagNr } = vandaagInfo(now);
  if (wd === 0 || wd === 6) return null; // weekend: geen mail

  let kop, taken;
  if (dagNr >= 0 && OPSTART[dagNr]) {
    kop = "Opstartfase · dag " + (dagNr + 1);
    taken = OPSTART[dagNr];
  } else {
    const r = WEEKRITME[wd];
    kop = r.kop;
    taken = r.taken;
  }

  const items = taken.map(t => `<li style="padding:8px 0;border-top:1px solid #eee">${t}</li>`).join("");
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1A0B2E">
    <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#D6026F;font-weight:700">${kop} · ${dagNaam}</p>
    <h1 style="font-size:22px;margin:6px 0 14px">Vandaag, kleine route:</h1>
    <ul style="list-style:none;padding:0;margin:0 0 20px">${items}</ul>
    <p style="font-size:13px;color:#777">Regel van de week: eerst distributie, dan bouwen.<br>Klein zetje. Grote beweging.</p>
  </div>`;
  const onderwerp = "Route vandaag · " + kop.toLowerCase();
  return { onderwerp, html };
}

export default async function handler(req, res){
  if (process.env.CRON_SECRET && !("preview" in (req.query||{}))){
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`){ res.status(401).json({error:"unauthorized"}); return; }
  }

  const mail = bouwMail(new Date());
  if (!mail){ res.status(200).json({ ok:true, skipped:"weekend" }); return; }

  if (req.query && req.query.preview){
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.status(200).send(`<p><b>${mail.onderwerp}</b></p>` + mail.html);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: AFZENDER,
    to: ONTVANGER,
    subject: mail.onderwerp,
    html: mail.html
  });
  res.status(200).json({ ok:true, sent: mail.onderwerp });
}
