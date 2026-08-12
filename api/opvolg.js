// api/opvolg.js — Vercel cron (dagelijks, zie vercel.json)
// De opvolgreeks na een meting met mailadres. Dag 0 (de uitslagmail) verstuurt
// api/lead.js direct; deze cron verzorgt de rest, per rij in tabel opvolgreeks:
//   dag 3  · verdiepingsmail: één herkenningsscène bij de laagste dimensie
//            (Zien: het inzicht in de auto · Sturen: de mail van 21:47 ·
//             Doen: het tabblad; teksten letterlijk uit de Scènebibliotheek v1)
//   dag 7  · Sprint-mail: rolverdelingszin, weekkoppeling, beslismoment,
//            actieve trede-link (sprint-config.js), nulpuntzin
//   dag 56 · hermeting-herinnering, link naar de scan met src=hermeting
// Regels: sober, huisstijl, maximaal één inhoudelijke link per mail, en in
// elke mail een afmeldlink (/api/afmelden) die de hele reeks stopt.
// Per run gaat er hoogstens één mail per reeks uit (de vroegste die open staat).
// Preview zonder DB of verzending: /api/opvolg?preview=3&dim=Zien
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// en (aanbevolen) CRON_SECRET, zodat alleen de Vercel-cron kan versturen.

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { ACTIEVE_TREDE, TREDES } from "../sprint-config.js";

const BASE = "https://scan.happly.nl";

/* Vaste teksten, gelijk aan de uitslagpagina en sprint.html. */
const NULPUNT = "Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je nulpunt.";
const ROLVERDELING = "De Index wijst aan waar jouw ruimte om te groeien zit. In de Zelfkracht Sprint, onze training van zes weken, onderzoek je wat en hoe je kunt veranderen.";
const BESLISMOMENT = "Na de eerste week beslis je definitief. Past het niet, dan krijg je je inleg terug.";
const SPRINT_WEKEN = { Zien: "week 1 en 2", Sturen: "week 3 en 4", Doen: "week 5 en 6" };

/* De drie scènes (Scènebibliotheek v1, 24-07-2026), letterlijk overgenomen:
   scène plus betrapping, zonder omkering (open einde). */
const SCENES = {
  Zien: {
    titel: "Het inzicht in de auto",
    scene: "Je rijdt naar huis. Bij het derde stoplicht weet je ineens precies wat je in dat overleg had willen zeggen.",
    betrapping: "Je inzicht is uitstekend, alleen komt hij structureel te laat op het werk aan. Terugkijkend zie je alles scherp; in het moment stuurde het patroon. Dat is geen gebrek aan intelligentie maar een getraind ritme: eerst reageren, dan pas begrijpen."
  },
  Sturen: {
    titel: "De mail van 21:47",
    scene: "Je ligt op de bank. Je telefoon licht op: mail van je leidinggevende. Je typt: “Even snel geregeld.” Het kostte maar twee minuten.",
    betrapping: "Het ging niet om die twee minuten. Met dat ene antwoord heb je zonder woorden afgesproken dat 21:47 een normaal moment is om jou te bereiken. Grenzen worden zelden weggenomen; ze worden weggegeven, in porties van twee minuten."
  },
  Doen: {
    titel: "Het tabblad",
    scene: "Het inschrijfformulier voor die opleiding staat al drie weken open in een browsertab. Je sluit hem niet. Je vult hem ook niet in.",
    betrapping: "Het open tabblad is het compromis tussen willen en doen: je hoeft geen nee te zeggen tegen je droom zolang je hem maar niet start. Wachten tot het moment goed voelt klinkt als zorgvuldigheid. Maar het goede moment is een gevoel, en gevoelens komen zelden op afspraak."
  }
};

/* Mailveilige opmaak, zelfde shell als de uitslagmail in api/lead.js. */
const FONT = "'DM Sans',Helvetica,Arial,sans-serif";
const DP = "#1A0B2E", PK = "#D6026F", RT = "#FBEFF5", MUT = "#6A5A78", BD = "#E7DCEC", TX = "#3A2E46";

function p(t, extra){ return `<p style="font-family:${FONT};font-size:14px;color:${TX};line-height:1.7;margin:0 0 13px;${extra||""}">${t}</p>`; }

function shell(inhoud, afmeldUrl){
  return `<div style="background:${RT};padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:${DP};padding:22px 32px;color:#fff;font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase">Zelfkracht Index</div>
      <div style="padding:30px 32px 36px">${inhoud}</div>
    </div>
    <p style="font-family:${FONT};font-size:11.5px;color:${MUT};text-align:center;margin:18px 0 0">Je ontvangt dit als vervolg op je Zelfkracht Index.
      <a href="${afmeldUrl}" style="color:${MUT}">Geen mail meer ontvangen</a></p>
  </div>`;
}

/* Dag 3 · verdieping: één scène bij de laagste dimensie, open einde, geen CTA. */
function mailVerdieping({ name, laagste, afmeldUrl }){
  const sc = SCENES[laagste] || SCENES.Sturen;
  const inhoud = `
    ${p(name ? `Hallo ${name},` : "Hallo,")}
    ${p(`Een paar dagen geleden kreeg je je Zelfkracht Index. Van je drie deelscores liet <strong style="color:${DP}">${laagste}</strong> de meeste ruimte zien. Zo'n score is abstract, tot je hem tegenkomt in een gewoon moment. Zoals dit:`)}
    <div style="border-left:3px solid ${PK};padding:2px 0 2px 18px;margin:20px 0">
      ${p(`<em>${sc.scene}</em>`, "margin-bottom:0;font-size:14.5px")}
    </div>
    ${p(sc.betrapping)}
    ${p("Herken je zo'n moment? Je hoeft er niets mee. Kijken is de eerste stap.", `color:${DP};font-weight:500;margin-top:20px;margin-bottom:0`)}`;
  return { subject: sc.titel, html: shell(inhoud, afmeldUrl) };
}

/* Dag 7 · Sprint: rolverdeling, weekkoppeling, beslismoment, trede-link, nulpunt. */
function mailSprint({ name, laagste, afmeldUrl }){
  const weken = SPRINT_WEKEN[laagste] || SPRINT_WEKEN.Sturen;
  const trede = TREDES[ACTIEVE_TREDE];
  const inhoud = `
    ${p(name ? `Hallo ${name},` : "Hallo,")}
    ${p(`<strong style="color:${DP}">${ROLVERDELING}</strong>`)}
    ${p(`Jouw meting liet de meeste ruimte zien bij ${laagste}. Dat is precies waar ${weken} van de Sprint op zijn gebouwd: zes weken, een kleine groep, start vrijdag 18 september.`)}
    ${p(BESLISMOMENT)}
    ${p(`<a href="${trede.url}" style="color:${PK};font-weight:700;text-decoration:none">Reserveer je plek (${trede.prijs} euro) &rarr;</a>`, "margin:22px 0")}
    ${p(`<em style="color:${DP};font-size:15px">${NULPUNT}</em>`, "margin-bottom:0")}`;
  return { subject: "Je kent je getal. Hier ga je ermee aan de slag.", html: shell(inhoud, afmeldUrl) };
}

/* Dag 56 · hermeting: sober, één link naar de scan met src=hermeting. */
function mailHermeting({ name, index, afmeldUrl }){
  const getal = typeof index === "number" ? `: ${index}` : "";
  const inhoud = `
    ${p(name ? `Hallo ${name},` : "Hallo,")}
    ${p(`Acht weken geleden mat je je Zelfkracht Index${getal}. Dat getal was je nulpunt.`)}
    ${p("Een Index is een momentopname. Wie er in de tussentijd aan gewerkt heeft, ziet dat terug in het getal. Opnieuw meten duurt drie tot vier minuten.")}
    ${p(`<a href="${BASE}/scan?src=hermeting" style="color:${PK};font-weight:700;text-decoration:none">Meet je Index opnieuw &rarr;</a>`, "margin:22px 0 0")}`;
  return { subject: "Tijd om opnieuw te meten", html: shell(inhoud, afmeldUrl) };
}

const MAILS = {
  3:  { veld: "mail3_sent_at",  bouw: mailVerdieping },
  7:  { veld: "mail7_sent_at",  bouw: mailSprint },
  56: { veld: "mail56_sent_at", bouw: mailHermeting }
};

export default async function handler(req, res){
  // Preview: statische weergave van een reeksmail, zonder database of verzending.
  // /api/opvolg?preview=3&dim=Zien  (dim alleen relevant voor 3 en 7)
  const preview = req.query && req.query.preview;
  if (preview){
    const dag = MAILS[Number(preview)];
    const dim = ["Zien","Sturen","Doen"].includes(req.query.dim) ? req.query.dim : "Sturen";
    if (!dag){ res.status(400).send("preview: 3, 7 of 56"); return; }
    const m = dag.bouw({ name: null, laagste: dim, index: 67, afmeldUrl: BASE + "/api/afmelden?r=voorbeeld" });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<p style="font-family:sans-serif;font-size:13px;color:#6A5A78">Onderwerp: <b>${m.subject}</b></p>` + m.html);
    return;
  }

  // Verzenden: alleen voor de Vercel-cron (of een aanroep met het juiste secret).
  if (process.env.CRON_SECRET){
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`){ res.status(401).json({error:"unauthorized"}); return; }
  }

  try{
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const nu = Date.now();
    const grens = d => new Date(nu - d * 86400000).toISOString();

    // Alle actieve reeksen waarvan mail 3 aan de beurt kán zijn (ruimste filter);
    // per reeks bepalen we hieronder de vroegste openstaande mail.
    const { data: reeksen, error } = await db.from("opvolgreeks")
      .select("id,email,name,index_score,laagste_dimensie,created_at,mail3_sent_at,mail7_sent_at,mail56_sent_at")
      .eq("afgemeld", false)
      .lte("created_at", grens(3))
      .or("mail3_sent_at.is.null,mail7_sent_at.is.null,mail56_sent_at.is.null")
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;

    let verstuurd = 0;
    for (const r of (reeksen || [])){
      const leeftijd = (nu - new Date(r.created_at).getTime()) / 86400000;
      // De vroegste mail die open staat en waarvan de dag is bereikt.
      const dag = [3, 7, 56].find(d => leeftijd >= d && !r[MAILS[d].veld]);
      if (!dag) continue;
      const afmeldUrl = `${BASE}/api/afmelden?r=${r.id}`;
      const m = MAILS[dag].bouw({ name: r.name, laagste: r.laagste_dimensie, index: r.index_score, afmeldUrl });
      const sent = await resend.emails.send({
        from: "Happly <hallo@happly.nl>",
        to: r.email,
        subject: m.subject,
        html: m.html
      });
      if (sent && sent.error) continue;   // volgende run opnieuw proberen
      await db.from("opvolgreeks").update({ [MAILS[dag].veld]: new Date().toISOString() }).eq("id", r.id);
      verstuurd++;
    }
    res.status(200).json({ ok: true, verstuurd });
  }catch(e){
    res.status(500).json({ error: "opvolg mislukt" });
  }
}
