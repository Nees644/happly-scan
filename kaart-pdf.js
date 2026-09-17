// kaart-pdf.js — de Teamkrachtkaart als pdf, op A4 of A1.
//
// Alles is vector: de kolommen komen als svg binnen, de tekst wordt als tekst
// gezet. Een A1 is daarom geen vergroting van een A4 maar dezelfde tekening op
// een groter vel, even scherp. Er zit geen pixel in en er komt geen browser aan
// te pas.
//
// De teksten komen uit teamkracht-kaart.js, zodat de kaart op het scherm en de
// kaart op papier niet uit elkaar kunnen lopen.

import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";

import {
  tekenKaartSvg, BREUKBLOK, BEELDNAAM, VOETNOOT, VOETNOOT_DOEL, ZONDER_LANDELIJK,
  verschilZin, verdelingLijst, dynamiekTekst, sdVan, kaartRuimte
} from "./teamkracht-kaart.js";
import { profielRegels, stripRegel, TEKST, formatteerDatum } from "./teamkracht-ruimte-blokken.js";
import { beoordeelLeidersbeeld, vergelijkMeetmomenten } from "./leidersbeeld-regel.js";
import { kiesDynamieken } from "./teamkracht-logica.js";
import { PAPIER, KLEUR, MM, zetLetters, alsBuffer, label } from "./pdf-basis.js";

const MOMENT = { start: "STARTMETING", doel: "DOELBEELD", hermeting: "HERMETING" };

export const FORMATEN = { a4: PAPIER.a4, a3: PAPIER.a3, a1: PAPIER.a1 };

export async function maakKaartPdf({
  teambeeld, regels = [], profielen = [], teamnaam = "", formaat = "a4",
  doel = null, landelijk_beeld = true, leidersbeeld = null,
  vorig = null, leidersbeeld_vorig = null, ruimte = null, teamdoel = null
}){
  const blad = FORMATEN[formaat] || FORMATEN.a4;
  const [breed, hoog] = blad;

  // Alles schaalt mee met het vel. Een A1 is bijna drie keer een A4, en dan
  // hoort de letter dat ook te zijn; anders staat er een A4 midden op een
  // poster.
  const s = breed / PAPIER.a4[0];
  const kant = 14 * MM * s;
  const binnen = breed - 2 * kant;

  const doc = new PDFDocument({ size: blad, margin: 0, info: {
    Title: `Teamkrachtkaart ${teamnaam || ""}`.trim(),
    Author: "Happly",
    Subject: "Teamkracht Index"
  }});
  zetLetters(doc);
  doc.rect(0, 0, breed, hoog).fill(KLEUR.papier);

  const soort = doel ? "doel" : teambeeld.soort;
  const beeldnaam = BEELDNAAM[soort] || BEELDNAAM.start;

  /* ------------------------------------------------------------- hoofd */
  let y = kant;
  const kruimel = ["TEAMFOTO", teamnaam ? `TEAM ${teamnaam.toUpperCase()}` : null,
                   MOMENT[soort] || MOMENT.start, "TEAMKRACHTKAART"].filter(Boolean).join("  ·  ");
  doc.font("sans").fontSize(7 * s).fillColor(KLEUR.magenta)
     .text(kruimel, kant, y, { characterSpacing: 1.3 * s });
  y = doc.y + 2 * s;

  doc.font("serif").fontSize(26 * s).fillColor(KLEUR.inkt)
     .text(`Teamkracht · ${beeldnaam}`, kant, y);
  y = doc.y + 3 * s;

  const heeftLijnen = Array.isArray(teambeeld.lijnen) && teambeeld.lijnen.length > 0;
  const slot = landelijk_beeld
    ? " Magenta is het gemiddelde van alle metingen tot nu toe."
    : " Dit team wordt vergeleken met zijn eigen vorige meting; het landelijk beeld hoort bij een licentie.";
  const inleiding = heeftLijnen
    ? `De keten van dit team: waar zien overgaat in kiezen, en kiezen in doen. De dikke lijn is het team${doel ? ", de gestippelde lijn is waar het heen wil" : ""}, de dunne lijnen zijn de deelnemers, naamloos en op volgorde van Zien.${slot}`
    : `De keten van dit team: waar zien overgaat in kiezen, en kiezen in doen. De dikke lijn is het team. Onder tien deelnemers toont de kaart geen individuele lijnen.${slot}`;

  doc.font("sans").fontSize(9 * s).fillColor(KLEUR.gedempt)
     .text(inleiding, kant, y, { width: binnen * 0.72, lineGap: 1.5 * s });
  y = doc.y + 4 * s;

  /* Blok 1, het doel, bovenaan de kaart (briefing doel-ruimte v1, 6.1). Alleen
     op een start- of eindbeeld; het doelbeeld is een andere kaart. */
  const g = doel ? null : kaartRuimte({ teambeeld, ruimte, teamdoel, regels, profielen });
  const T = TEKST.team;
  if (!doel){
    doc.moveTo(kant, y).lineTo(kant + binnen * 0.72, y).lineWidth(1 * s).strokeColor(KLEUR.magenta).stroke();
    y += 3 * s;
    label(doc, T.doel_kop, kant, y, { grootte: 7 * s });
    y = doc.y + 1.5 * s;
    if (teamdoel && teamdoel.doel_tekst){
      doc.font("serif").fontSize(13 * s).fillColor(KLEUR.inkt)
         .text(`\u201c${teamdoel.doel_tekst}\u201d`, kant, y, { width: binnen * 0.72 });
      y = doc.y + 1 * s;
      const datum = formatteerDatum(teamdoel.doel_datum);
      if (datum){
        doc.font("sans").fontSize(9 * s).fillColor(KLEUR.inkt).text(`Voor ${datum}.`, kant, y, { width: binnen * 0.72 });
        y = doc.y + 0.5 * s;
      }
      if (g && g.keuzezin){
        doc.font("sans").fontSize(8.5 * s).fillColor(KLEUR.gedempt).text(g.keuzezin, kant, y, { width: binnen * 0.72 });
        y = doc.y;
      }
    } else {
      doc.font("sans").fontSize(9 * s).fillColor(KLEUR.gedempt).text(T.geen_doel, kant, y, { width: binnen * 0.72 });
      y = doc.y;
    }
  }
  y += 5 * s;

  /* -------------------------------------------------------------- romp */
  const linksBreed = binnen * 0.54;
  const rechtsX = kant + linksBreed + 8 * MM * s;
  const rechtsBreed = binnen - linksBreed - 8 * MM * s;
  const rompTop = y;

  // De tekening, in een wit vlak zoals op het scherm.
  const svg = tekenKaartSvg(teambeeld, { doel, landelijk_beeld, leidersbeeld, vorig, leidersbeeld_vorig });
  const tekeningHoog = linksBreed * (600 / 800);
  doc.roundedRect(kant, y, linksBreed, tekeningHoog + 8 * s, 4 * s)
     .lineWidth(0.8 * s).fillAndStroke(KLEUR.wit, KLEUR.lijn);
  SVGtoPDF(doc, svg, kant, y + 4 * s, {
    width: linksBreed, height: tekeningHoog, assumePt: true,
    fontCallback: (familie, vet) => (/serif/i.test(familie) ? "serif" : "sans")
  });
  y += tekeningHoog + 12 * s;

  // Het Leidersbeeld staat direct onder de kolommen, voor het breukblok.
  const oordeel = leidersbeeld ? beoordeelLeidersbeeld({
    leidersbeeld,
    teamlijn: { zien: teambeeld.team_zien, sturen: teambeeld.team_sturen, doen: teambeeld.team_doen },
    sd: sdVan(teambeeld)
  }) : null;
  const vorigOordeel = (leidersbeeld_vorig && vorig) ? beoordeelLeidersbeeld({
    leidersbeeld: leidersbeeld_vorig, teamlijn: vorig, sd: sdVan(teambeeld)
  }) : null;
  const verloop = (oordeel && vorigOordeel) ? vergelijkMeetmomenten(vorigOordeel, oordeel) : null;

  if (oordeel){
    doc.moveTo(kant, y).lineTo(kant + linksBreed, y).lineWidth(1.2 * s).strokeColor(KLEUR.magenta).stroke();
    y += 4 * s;
    label(doc, "Leidersbeeld en teamlijn", kant, y, { grootte: 7 * s });
    y = doc.y + 2 * s;
    doc.font("serif").fontSize(15 * s).fillColor(KLEUR.inkt)
       .text(verloop ? verloop.kop : oordeel.kop, kant, y, { width: linksBreed });
    y = doc.y + 2 * s;
    doc.font("sans").fontSize(9 * s).fillColor(KLEUR.inkt);
    if (oordeel.allesGedeeld){
      doc.text(oordeel.inleiding, kant, y, { width: linksBreed, lineGap: 1.5 * s });
      y = doc.y;
    }else{
      for (const blok of oordeel.blokken){
        doc.fillColor(KLEUR.inkt).text(`${blok.label}. ${blok.tekst}`, kant, y, { width: linksBreed, lineGap: 1.5 * s });
        y = doc.y + 1.5 * s;
      }
      doc.fontSize(8.5 * s).fillColor(KLEUR.gedempt)
         .text(oordeel.slotzin, kant, y, { width: linksBreed, lineGap: 1.5 * s });
      y = doc.y;
    }
  }

  /* ------------------------------------------------------ rechterkolom */

  /* De rechterkolom moet op het vel passen, en hoeveel tekst erin staat
     verschilt per team: drie dynamieken van vier zinnen is meer dan drie van
     twee. Daarom eerst meten en dan pas zetten, met een letter die krimpt tot
     het past. Liever iets kleiner dan een zin die van de kaart valt. */
  const breuk = BREUKBLOK[teambeeld.breuk] || BREUKBLOK.geen;
  const kernKop = doel ? (doel.titel || "Het doelbeeld") : breuk.kop;
  const kernTekst = doel ? "" : breuk.tekst;
  const kernLabel = doel ? "WAAR DIT TEAM HEEN WIL" : "DE BREUK IN DE KETEN";
  const cijfers = verschilZin(teambeeld, landelijk_beeld);
  const binnenBlok = rechtsBreed - 12 * MM * s;

  const verdeling = verdelingLijst(teambeeld.verdeling, profielen, teambeeld.teksten)
    .map(r => `${r.aantal} ${r.naam}`).join("   ·   ");

  // In de volgorde van L7: de dynamiek die de eerste stap raakt bovenaan.
  const dynamieken = doel ? [] : ((g ? g.dynamieken : teambeeld.dynamieken) || [])
    .map(d => regels.find(r => r.code === d.code)).filter(Boolean)
    .map(r => dynamiekTekst(r, teambeeld));

  /* Blok 3, de ruimte: de drie zinnen, de balken, de profielregels en de
     strip. Komt in de rechterkolom na de profielverdeling en voor de
     dynamieken. */
  const balkHoog = 3 * 5.5 * MM * s + 5 * MM * s;
  const ruimteRegels = g ? [...profielRegels(g), stripRegel(g)].filter(Boolean) : [];
  function meetRuimte(t){
    if (!g) return 0;
    let h = hoogte("serif", 15 * s * t, T.ruimte_kop, rechtsBreed) + 2 * s;
    for (const zin of g.zinnen) h += hoogte("sans", 9 * s * t, zin, rechtsBreed) + 1.5 * s;
    h += balkHoog * t + 2 * s;
    for (const r of ruimteRegels) h += hoogte("sans", 8.5 * s * t, r, rechtsBreed) + 1 * s;
    return h + 6 * s;
  }

  const hoogte = (font, grootte, tekst, breedte, gap = 1.5) => {
    doc.font(font).fontSize(grootte);
    return doc.heightOfString(tekst, { width: breedte, lineGap: gap * s });
  };

  /* Wat de kolom nodig heeft bij deze letterschaal. */
  function meet(t){
    let h = 0;
    h += hoogte("sans", 7 * s, kernLabel, binnenBlok) + 1.5 * s;
    h += hoogte("serif", 17 * s * t, kernKop, binnenBlok) + 2 * s;
    if (kernTekst) h += hoogte("sans", 9.5 * s * t, kernTekst, binnenBlok) + 2 * s;
    h += hoogte("sans", 8.5 * s * t, cijfers, binnenBlok);
    h += 12 * s + 6 * s;                                   // marges van het blok
    h += hoogte("serif", 15 * s * t, "Profielverdeling", rechtsBreed) + 2 * s;
    h += hoogte("sans", 9.5 * s * t, verdeling, rechtsBreed) + 6 * s;
    h += meetRuimte(t);
    if (dynamieken.length){
      h += hoogte("serif", 15 * s * t, "Waarschijnlijke dynamieken", rechtsBreed) + 3 * s;
      for (const los of dynamieken){
        h += 3 * s;
        h += hoogte("sans", 6.5 * s * t, los.tag.toUpperCase(), rechtsBreed) + 1 * s;
        h += hoogte("serif", 13 * s * t, los.titel, rechtsBreed) + 1.5 * s;
        h += hoogte("sans", 9 * s * t, `${los.lopend} Interventie: ${los.interventie} Gespreksvraag: ${los.gespreksvraag}`, rechtsBreed) + 4 * s;
      }
    }
    return h;
  }

  const voetTekst = (landelijk_beeld ? "" : ZONDER_LANDELIJK + " ") + (doel ? VOETNOOT_DOEL : VOETNOOT);
  doc.font("sans").fontSize(6.8 * s);
  const voetHoog = doc.heightOfString(voetTekst, { width: binnen, lineGap: 1 * s });

  /* Blok 4 en 5 onderaan, twee lege kaders met de leeg-tekst. Hun hoogte gaat
     van de ruimte voor de rechterkolom af. */
  const kaderBreed = (binnen - 6 * MM * s) / 2;
  const kaderBinnen = kaderBreed - 8 * s;
  const kaderHoog = doel ? 0 : Math.max(
    hoogte("sans", 8 * s, T.route_leeg, kaderBinnen),
    hoogte("sans", 8 * s, T.resultaat_leeg, kaderBinnen)
  ) + 7 * s + 12 * s;
  const onderHoog = doel ? 0 : kaderHoog + 6 * s;
  const ruimteKolom = hoog - kant - voetHoog - 4 * s - onderHoog - rompTop;

  let t = 1;
  while (t > 0.55 && meet(t) > ruimteKolom) t -= 0.03;

  let yr = rompTop;

  // Het kernblok: de breuk, of het doel als er een doelbeeld ligt.
  const blokHoog = hoogte("sans", 7 * s, kernLabel, binnenBlok) + 1.5 * s
    + hoogte("serif", 17 * s * t, kernKop, binnenBlok) + 2 * s
    + (kernTekst ? hoogte("sans", 9.5 * s * t, kernTekst, binnenBlok) + 2 * s : 0)
    + hoogte("sans", 8.5 * s * t, cijfers, binnenBlok) + 12 * s;

  doc.roundedRect(rechtsX, yr, rechtsBreed, blokHoog, 4 * s).fill(KLEUR.inkt);
  let yb = yr + 6 * s;
  doc.font("sans").fontSize(7 * s).fillColor(KLEUR.magenta)
     .text(kernLabel, rechtsX + 6 * MM * s, yb, { characterSpacing: 1.3 * s });
  yb = doc.y + 1.5 * s;
  doc.font("serif").fontSize(17 * s * t).fillColor(KLEUR.papier)
     .text(kernKop, rechtsX + 6 * MM * s, yb, { width: binnenBlok });
  yb = doc.y + 2 * s;
  if (kernTekst){
    doc.font("sans").fontSize(9.5 * s * t).fillColor(KLEUR.papier)
       .text(kernTekst, rechtsX + 6 * MM * s, yb, { width: binnenBlok, lineGap: 1.5 * s });
    yb = doc.y + 2 * s;
  }
  doc.font("sans").fontSize(8.5 * s * t).fillColor(KLEUR.lavendel)
     .text(cijfers, rechtsX + 6 * MM * s, yb, { width: binnenBlok });
  yr += blokHoog + 6 * s;

  // Profielverdeling.
  doc.font("serif").fontSize(15 * s * t).fillColor(KLEUR.inkt)
     .text("Profielverdeling", rechtsX, yr);
  yr = doc.y + 2 * s;
  doc.font("sans").fontSize(9.5 * s * t).fillColor(KLEUR.inkt)
     .text(verdeling, rechtsX, yr, { width: rechtsBreed, lineGap: 1.5 * s });
  yr = doc.y + 6 * s;

  // Blok 3: waar de winst zit.
  if (g){
    doc.font("serif").fontSize(15 * s * t).fillColor(KLEUR.inkt).text(T.ruimte_kop, rechtsX, yr);
    yr = doc.y + 2 * s;
    doc.font("sans").fontSize(9 * s * t).fillColor(KLEUR.inkt);
    for (const zin of g.zinnen){
      doc.text(zin, rechtsX, yr, { width: rechtsBreed, lineGap: 1.5 * s });
      yr = doc.y + 1.5 * s;
    }
    yr = tekenBalkenPdf(doc, g, rechtsX, yr, Math.min(rechtsBreed, 90 * MM * s), s * t) + 2 * s;
    doc.font("sans").fontSize(8.5 * s * t).fillColor(KLEUR.inkt);
    for (const r of ruimteRegels){
      doc.text(r, rechtsX, yr, { width: rechtsBreed, lineGap: 1.2 * s });
      yr = doc.y + 1 * s;
    }
    yr += 5 * s;
  }

  // Dynamieken, alleen bij een startbeeld of eindbeeld.
  if (dynamieken.length){
    doc.font("serif").fontSize(15 * s * t).fillColor(KLEUR.inkt)
       .text("Waarschijnlijke dynamieken", rechtsX, yr);
    yr = doc.y + 3 * s;

    for (const los of dynamieken){
      doc.moveTo(rechtsX, yr).lineTo(rechtsX + rechtsBreed, yr)
         .lineWidth(1.2 * s).strokeColor(KLEUR.magenta).stroke();
      yr += 3 * s;
      doc.font("sans").fontSize(6.5 * s * t).fillColor(KLEUR.magenta)
         .text(los.tag.toUpperCase(), rechtsX, yr, { characterSpacing: 1.2 * s });
      yr = doc.y + 1 * s;
      doc.font("serif").fontSize(13 * s * t).fillColor(KLEUR.inkt)
         .text(los.titel, rechtsX, yr, { width: rechtsBreed });
      yr = doc.y + 1.5 * s;
      doc.font("sans").fontSize(9 * s * t).fillColor(KLEUR.inkt)
         .text(`${los.lopend} Interventie: ${los.interventie} Gespreksvraag: ${los.gespreksvraag}`,
               rechtsX, yr, { width: rechtsBreed, lineGap: 1.5 * s });
      yr = doc.y + 4 * s;
    }
  }

  /* ------------------------------------------------- blok 4 en 5 */
  if (!doel){
    const yk = hoog - kant - voetHoog - 4 * s - kaderHoog;
    const kaders = [[T.route_kop, T.route_leeg], [T.resultaat_kop, T.resultaat_leeg]];
    kaders.forEach(([kop, leeg], i) => {
      const xk = kant + i * (kaderBreed + 6 * MM * s);
      doc.save().dash(2 * s, { space: 2 * s })
         .roundedRect(xk, yk, kaderBreed, kaderHoog, 3 * s).lineWidth(0.8 * s).strokeColor(KLEUR.lijn).stroke()
         .undash().restore();
      doc.font("serif").fontSize(11 * s).fillColor(KLEUR.inkt).text(kop, xk + 4 * s, yk + 4 * s, { width: kaderBinnen });
      doc.font("sans").fontSize(8 * s).fillColor(KLEUR.gedempt).text(leeg, xk + 4 * s, doc.y + 1 * s, { width: kaderBinnen });
    });
  }

  /* -------------------------------------------------------------- voet */
  doc.font("sans").fontSize(6.8 * s).fillColor(KLEUR.gedempt)
     .text(voetTekst, kant, hoog - kant - voetHoog, { width: binnen, lineGap: 1 * s });

  return await alsBuffer(doc);
}

/* De compacte visual van blok 3 op papier: drie balken van 0 tot 100, de
   eerste stap in magenta, de referentie als streepje, de ruimte gearceerd
   tussen de huidige waarde en de referentie. Geen pijlen omlaag, geen rood.
   Geeft de y terug waar het volgende begint. */
function tekenBalkenPdf(doc, g, x, y, breed, s){
  const rij = 5.5 * MM * s, dik = 2.6 * MM * s, labelBreed = 14 * MM * s;
  const x0 = x + labelBreed, spoor = breed - labelBreed - 8 * MM * s;
  const px = w => x0 + Math.max(0, Math.min(100, w)) / 100 * spoor;
  g.balken.forEach((b, i) => {
    const yb = y + i * rij;
    const kleur = b.eerste_stap ? KLEUR.magenta : KLEUR.inkt;
    doc.font("sans").fontSize(8 * s).fillColor(kleur)
       .text(b.label, x, yb + dik / 2 - 4 * s, { width: labelBreed - 2 * s, align: "right" });
    doc.roundedRect(x0, yb, spoor, dik, dik / 2).fill(KLEUR.lijn);
    doc.roundedRect(x0, yb, Math.max(dik, px(b.waarde) - x0), dik, dik / 2)
       .fillOpacity(b.eerste_stap ? 1 : 0.55).fill(kleur).fillOpacity(1);
    if (b.ruimte_tot !== null && b.ruimte_tot > b.waarde){
      const xa = px(b.waarde), xb = px(b.ruimte_tot);
      doc.save().rect(xa, yb, xb - xa, dik).clip();
      doc.lineWidth(0.6 * s).strokeColor(KLEUR.magenta).strokeOpacity(0.5);
      for (let l = xa - dik; l < xb + dik; l += 2 * s){
        doc.moveTo(l, yb + dik).lineTo(l + dik, yb).stroke();
      }
      doc.strokeOpacity(1).restore();
    }
    const xt = (b.ruimte_tot !== null ? px(b.ruimte_tot) : px(b.waarde)) + 2 * s;
    doc.font("sans").fontSize(7 * s).fillColor(KLEUR.gedempt).text(String(Math.round(b.waarde)), xt, yb + dik / 2 - 3.5 * s);
  });
  const xr = px(g.referentie_waarde);
  doc.save().dash(1.5 * s, { space: 1.5 * s }).lineWidth(0.8 * s).strokeColor(KLEUR.inkt)
     .moveTo(xr, y - 1 * s).lineTo(xr, y + 2 * rij + dik + 1 * s).stroke().undash().restore();
  doc.font("sans").fontSize(6 * s).fillColor(KLEUR.gedempt)
     .text(`REFERENTIE ${Math.round(g.referentie_waarde)}`, xr - 15 * MM * s, y + 2 * rij + dik + 2 * s, { width: 30 * MM * s, align: "center", characterSpacing: 0.6 * s });
  return y + 3 * rij + 3 * MM * s;
}
