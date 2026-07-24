// api/lead.js — Vercel serverless function
// Leadcapture na de uitslag: koppelt e-mail (verplicht), naam en bedrijf (optioneel)
// aan de meting, en stuurt de volledige uitslagmail via Resend vanaf hallo@happly.nl.
// De mail volgt exact de opbouw van de uitslag-blauwdruk (= de uitslagpagina) en
// leest de duiding uit Supabase; de tekst uit de request is alleen terugval.
// Sprint-link en actieve voorverkooptrede komen uit sprint-config.js (één bron).
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { ACTIEVE_TREDE, TREDES } from "../sprint-config.js";

/* Niveaubanden + plus-rekenregel: identiek aan scan.html en api/duiding.js; wijzig ze samen. */
function niveau(s){
  if (s < 30) return "Laag";
  if (s < 50) return "Beperkt";
  if (s < 70) return "Redelijk";
  if (s < 90) return "Sterk";
  return "Zeer sterk";
}
function ontwikkelruimte(s){
  if (s >= 90) return {onderhoud:true, plus:null, doel:null};
  if (s >= 80) return {onderhoud:false, plus:90 - s, doel:90};
  return {onderhoud:false, plus:80 - s, doel:80};
}

/* Vaste teksten, gelijk aan de uitslagpagina (scan.html). */
const PATROON = "Het verlies van regie ontstaat niet in één moment. Het ontstaat in honderden micro-beslissingen per dag, waarbij je kleine keuzes bij anderen laat of laat afhangen van de omstandigheden. Dat voelt in het moment als de gemakkelijkste weg. Maar wat je vaak genoeg doet, wordt automatisch, en wat automatisch is, zie je niet meer.";
const NULPUNT = "Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je nulpunt.";

/* Mailveilige opmaak: alles inline, geen serif-terugval (dus nooit Times), geen beeld. */
const FONT = "'DM Sans',Helvetica,Arial,sans-serif";
const DP = "#1A0B2E", PK = "#D6026F", RT = "#FBEFF5", MUT = "#6A5A78", BD = "#E7DCEC", TX = "#3A2E46";

function p(t, extra){ return `<p style="font-family:${FONT};font-size:14px;color:${TX};line-height:1.7;margin:0 0 13px;${extra||""}">${t}</p>`; }
function kop(t){ return `<h2 style="font-family:${FONT};font-size:17px;color:${DP};margin:30px 0 12px;font-weight:700">${t}</h2>`; }
function fmtBlok(t){
  return (t||"").split(/\n{2,}/).map(par=>{
    par = par.trim();
    if (!par) return "";
    par = par.replace(/\*\*(.+?)\*\*/g, `<strong style="color:${DP}">$1</strong>`);
    return p(par.replace(/\n/g,"<br>"));
  }).join("");
}

/* Zelfde splitsing als de uitslagpagina: duiding boven, route onder eigen kop. */
function splitDuiding(text){
  const marker = /(^|\n)\s*#*\s*Waar het werk zit\s*#*\s*(\n|$)/i;
  const m = text.match(marker);
  if (m){
    return { duiding: text.slice(0, m.index).replace(/#*\s*Wat opvalt in jouw antwoorden\s*#*/i,"").trim(),
             route:   text.slice(m.index + m[0].length).trim() };
  }
  return { duiding: text.replace(/#*\s*Wat opvalt in jouw antwoorden\s*#*/i,"").trim(), route:null };
}

function fmtDatum(d){
  return new Intl.DateTimeFormat("nl-NL", {day:"numeric", month:"long", year:"numeric", timeZone:"Europe/Amsterdam"}).format(d);
}

function nivRow(nm, s){
  const or = ontwikkelruimte(s);
  const plus = or.onderhoud
    ? `<span style="color:${MUT};font-weight:500">onderhouden</span>`
    : `<span style="color:${PK};font-weight:700">+${or.plus}</span>`;
  const td = `font-family:${FONT};padding:10px 8px;border-bottom:1px solid ${BD};font-size:13px;`;
  return `<tr>
    <td style="${td}font-weight:700;color:${DP}">${nm}</td>
    <td style="${td}font-size:16px;color:${DP};font-weight:700">${s}</td>
    <td style="${td}color:${TX}">${niveau(s)}</td>
    <td style="${td}text-align:right">${plus}</td>
  </tr>`;
}

function mailHtml({ index, zien, sturen, doen, name, duiding, datum }){
  const hi = name ? `Hallo ${name},` : "Hallo,";
  const parts = duiding ? splitDuiding(duiding) : null;
  const route = parts && parts.route ? parts.route.replace(NULPUNT, "").trim() : null;
  const sprintUrl = "https://scan.happly.nl/sprint";
  const betaalUrl = TREDES[ACTIEVE_TREDE].url;

  return `<div style="background:${RT};padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:${DP};padding:22px 32px;color:#fff;font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase">Zelfkracht Index</div>
      <div style="padding:30px 32px 36px">

        ${p(`Dit is jouw meting van ${datum}. Bewaar deze mail, dit is je nulpunt.`, `font-size:12.5px;color:${MUT};margin-bottom:22px`)}
        ${p(hi)}

        <!-- Het getal -->
        <div style="text-align:center;margin:16px 0 6px">
          <div style="font-family:${FONT};font-size:64px;color:${DP};line-height:1;font-weight:700">${index}</div>
          <div style="font-family:${FONT};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${MUT};margin-top:6px">Zelfkracht Index</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:18px 0 6px;border-top:1px solid ${BD}">
          <tr>
            <td style="font-family:${FONT};padding:14px 4px 0;text-align:center;width:33%"><div style="font-size:24px;color:${DP};font-weight:700">${zien}</div><div style="font-size:11px;font-weight:700;color:${DP};margin-top:4px">Zien</div></td>
            <td style="font-family:${FONT};padding:14px 4px 0;text-align:center;width:34%;border-left:1px solid ${BD};border-right:1px solid ${BD}"><div style="font-size:24px;color:${DP};font-weight:700">${sturen}</div><div style="font-size:11px;font-weight:700;color:${DP};margin-top:4px">Sturen</div></td>
            <td style="font-family:${FONT};padding:14px 4px 0;text-align:center;width:33%"><div style="font-size:24px;color:${DP};font-weight:700">${doen}</div><div style="font-size:11px;font-weight:700;color:${DP};margin-top:4px">Doen</div></td>
          </tr>
        </table>

        <!-- Canonieke inleiding -->
        <div style="background:${RT};border-radius:10px;padding:20px 22px;margin:24px 0 0">
          ${p(`<strong style="color:${DP}">Zelfkracht heeft nu een eigen getal.</strong>`, "margin-bottom:10px")}
          ${p("De Zelfkracht Index brengt in één score van 0 tot 100 in kaart hoe sterk jij zelf de koers bepaalt: in je werk, je relaties, je keuzes. Ook, en juist, wanneer het spannend wordt.", "font-size:13px;margin-bottom:10px")}
          ${p("De eigenschappen die de Index meet, behoren tot de best onderzochte voorspellers van hoe leven en werk verlopen. En ze liggen niet vast: wat gevormd is, kun je bijstellen.", "font-size:13px;margin-bottom:10px")}
          ${p("Drie deelscores laten zien waar bij jou de meeste ruimte zit. Daar begint het werk.", "font-size:13px;margin-bottom:0")}
        </div>

        <!-- Niveautabel met ontwikkelruimte -->
        ${kop("Waar je nu staat")}
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <th style="font-family:${FONT};text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${MUT};padding:0 8px 8px;border-bottom:1px solid ${BD}">&nbsp;</th>
            <th style="font-family:${FONT};text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${MUT};padding:0 8px 8px;border-bottom:1px solid ${BD}">Score</th>
            <th style="font-family:${FONT};text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${MUT};padding:0 8px 8px;border-bottom:1px solid ${BD}">Niveau</th>
            <th style="font-family:${FONT};text-align:right;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${MUT};padding:0 8px 8px;border-bottom:1px solid ${BD}">Ontwikkelruimte</th>
          </tr>
          ${nivRow("Totaal", index)}${nivRow("Zien", zien)}${nivRow("Sturen", sturen)}${nivRow("Doen", doen)}
        </table>
        ${p("De ontwikkelruimte is de afstand tot stevig in het eerstvolgende niveau. Het maakt de weg concreet en eindig.", `font-size:11.5px;color:${MUT};margin-top:10px`)}

        ${parts ? `
        <!-- Duiding (opgeslagen tekst; wordt nooit opnieuw gegenereerd) -->
        ${kop("Wat jouw meting laat zien")}
        ${fmtBlok(parts.duiding)}` : ""}

        <!-- Patroonvenster -->
        <div style="border-left:3px solid ${PK};padding:2px 0 2px 18px;margin:26px 0 0">
          ${p(`<em>${PATROON}</em>`, "margin-bottom:0;font-size:13.5px")}
        </div>

        <!-- De route + nulpuntzin -->
        ${kop("De route")}
        ${route ? fmtBlok(route) : ""}
        ${p(`<em style="color:${DP};font-size:15px">${NULPUNT}</em>`, "margin:6px 0 0")}

        <!-- Sprint-contextblok -->
        <div style="border-top:1px solid ${BD};margin-top:30px;padding-top:24px">
          ${kop("Over de Zelfkracht Sprint").replace("margin:30px 0 12px","margin:0 0 12px")}
          ${p("De Index wijst de plek aan. In de Zelfkracht Sprint onderzoek je wat en hoe je kunt veranderen.")}
          ${p(`Zes weken in een kleine groep, van 18 september tot eind oktober 2026, met zes live sessies op woensdagavond 20:00.<br>
Inbegrepen: het boek Zelfkracht (e-book), een werkboek per week en een nameting waarmee je je verschuiving meet ten opzichte van deze meting.<br>
Deelname 345 euro; de eerste tien plekken 245, de tien daarna 295.`, "font-size:13px")}
          ${p(`<a href="${sprintUrl}" style="color:${PK};font-weight:700;text-decoration:none">Bekijk het programma</a> &nbsp;·&nbsp; <a href="${betaalUrl}" style="color:${PK};font-weight:700;text-decoration:none">Reserveer je plek</a>`)}
        </div>

      </div>
    </div>
  </div>`;
}

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { id, email, name, company, index, zien, sturen, doen, duiding } = body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      res.status(400).json({error:"ongeldig e-mailadres"}); return;
    }

    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Lees de opgeslagen meting (bron voor de mail) en koppel de lead eraan.
    let row = null;
    if (id){
      let q = await db.from("index_scan_results")
        .select("index_score,zien,sturen,doen,duiding,created_at").eq("id", id).single();
      if (q.error){
        // Vangnet zolang de duiding-migratie (supabase.sql, 24-07-2026) nog niet draait.
        q = await db.from("index_scan_results")
          .select("index_score,zien,sturen,doen,created_at").eq("id", id).single();
      }
      if (!q.error) row = q.data;
      await db.from("index_scan_results")
        .update({ email, name: name || null, company: company || null })
        .eq("id", id);
    } else {
      // Minimale rij als de meting-opslag eerder faalde; met duiding als die meekwam.
      const basis = { index_score:index, zien, sturen, doen, email, name:name||null, company:company||null };
      let ins = await db.from("index_scan_results").insert({
        ...basis, duiding: duiding || null,
        duiding_generated_at: duiding ? new Date().toISOString() : null
      });
      if (ins.error){ await db.from("index_scan_results").insert(basis); }
    }

    // 2. Stuur de uitslagmail (best effort; mag de flow niet blokkeren).
    try{
      const m = {
        index:  row ? row.index_score : index,
        zien:   row ? row.zien   : zien,
        sturen: row ? row.sturen : sturen,
        doen:   row ? row.doen   : doen,
        name,
        duiding: (row && row.duiding) || duiding || null,
        datum: fmtDatum(row && row.created_at ? new Date(row.created_at) : new Date())
      };
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Happly <hallo@happly.nl>",
        to: email,
        subject: `Jouw Zelfkracht Index: ${m.index}`,
        html: mailHtml(m)
      });
    }catch(mailErr){ /* stil */ }

    res.status(200).json({ ok: true });
  }catch(e){
    res.status(500).json({ error: "lead mislukt" });
  }
}
