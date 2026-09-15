// factuur-pdf.js — de factuur als pdf, in vectoren.
//
// Dezelfde gegevens als de factuur in de mail; die blijft bestaan, want een
// mail die je meteen kunt lezen is prettiger dan een bijlage die je eerst moet
// openen. De pdf gaat als bijlage mee en is wat de boekhouding bewaart.

import PDFDocument from "pdfkit";
import { BEDRIJF } from "./bedrijf.js";
import { euro, nederlandseDatum } from "./factuur.js";
import { PAPIER, KLEUR, MM, zetLetters, logoBuffer, alsBuffer, label } from "./pdf-basis.js";

const KANT = 20 * MM;

export async function maakFactuurPdf(factuur, bedrijf = BEDRIJF){
  const doc = new PDFDocument({ size: PAPIER.a4_staand, margin: KANT, info: {
    Title: `Factuur ${factuur.nummer}`,
    Author: bedrijf.naam,
    Subject: `Factuur ${factuur.nummer} van ${bedrijf.naam}`
  }});
  zetLetters(doc);

  const breedte = PAPIER.a4_staand[0] - 2 * KANT;
  const rechts = KANT + breedte;

  /* ------------------------------------------------------------ hoofd */
  const logo = logoBuffer();
  if (logo) doc.image(logo, KANT, KANT, { width: 34 * MM });
  else doc.font("serif").fontSize(20).fillColor(KLEUR.magenta).text(bedrijf.naam, KANT, KANT);

  doc.font("serif").fontSize(22).fillColor(KLEUR.inkt)
     .text("Factuur", KANT, KANT + 2, { width: breedte, align: "right" });
  doc.font("sans").fontSize(9.5).fillColor(KLEUR.gedempt)
     .text(factuur.nummer, KANT, doc.y + 1, { width: breedte, align: "right" });

  let y = KANT + 26 * MM;
  doc.moveTo(KANT, y).lineTo(rechts, y).lineWidth(0.8).strokeColor(KLEUR.lijn).stroke();

  /* --------------------------------------------------------- adressen */
  y += 8 * MM;
  const kolom = (breedte - 10 * MM) / 2;

  const adres = (x, kop, regels) => {
    label(doc, kop, x, y, { kleur: KLEUR.gedempt, grootte: 7 });
    doc.font("sans").fontSize(9.5).fillColor(KLEUR.inkt)
       .text(regels.filter(Boolean).join("\n"), x, y + 5 * MM, { width: kolom, lineGap: 2 });
    return doc.y;
  };

  const onder = Math.max(
    adres(KANT, "Van", [
      bedrijf.naam, bedrijf.toevoeging, bedrijf.adres,
      [bedrijf.postcode, bedrijf.plaats].filter(Boolean).join("  "),
      bedrijf.kvk ? `KvK ${bedrijf.kvk}` : null,
      bedrijf.btw_nummer ? `Btw ${bedrijf.btw_nummer}` : null,
      bedrijf.email
    ]),
    adres(KANT + kolom + 10 * MM, "Aan", [
      factuur.klant_naam, factuur.klant_adres,
      [factuur.klant_postcode, factuur.klant_plaats].filter(Boolean).join("  "),
      factuur.klant_land && factuur.klant_land !== "NL" ? factuur.klant_land : null,
      factuur.btw_nummer ? `Btw ${factuur.btw_nummer}` : null
    ])
  );

  /* ----------------------------------------------------------- datums */
  y = onder + 8 * MM;
  const datums = [
    ["Factuurdatum", nederlandseDatum(factuur.created_at)],
    ["Leverdatum", nederlandseDatum(factuur.periode_van)],
    factuur.klant_referentie ? ["Referentie", factuur.klant_referentie] : null
  ].filter(Boolean);

  doc.font("sans").fontSize(9.5);
  for (const [kop, waarde] of datums){
    doc.fillColor(KLEUR.gedempt).text(kop, KANT, y, { width: 32 * MM, continued: false });
    doc.fillColor(KLEUR.inkt).text(waarde, KANT + 34 * MM, y);
    y += 5.2 * MM;
  }

  /* ----------------------------------------------------------- regels */
  y += 5 * MM;
  const xAantal = KANT + breedte - 46 * MM;
  const xBedrag = KANT + breedte - 30 * MM;

  label(doc, "Omschrijving", KANT, y, { kleur: KLEUR.gedempt, grootte: 7 });
  label(doc, "Aantal", xAantal, y, { kleur: KLEUR.gedempt, grootte: 7 });
  doc.font("sans").fontSize(7).fillColor(KLEUR.gedempt)
     .text("BEDRAG", xBedrag, y, { width: 30 * MM, align: "right", characterSpacing: 1.3 });
  y += 5 * MM;
  doc.moveTo(KANT, y).lineTo(rechts, y).lineWidth(1.2).strokeColor(KLEUR.inkt).stroke();
  y += 3 * MM;

  for (const regel of (factuur.regels || [])){
    doc.font("sans").fontSize(10).fillColor(KLEUR.inkt)
       .text(regel.omschrijving, KANT, y, { width: xAantal - KANT - 6 * MM });
    const naTekst = doc.y;
    doc.fontSize(8.5).fillColor(KLEUR.gedempt).text(regel.code, KANT, naTekst + 0.5);
    const naCode = doc.y;
    doc.fontSize(10).fillColor(KLEUR.inkt)
       .text(String(regel.aantal), xAantal, y)
       .text(euro(regel.bedrag_ex_btw), xBedrag, y, { width: 30 * MM, align: "right" });
    y = naCode + 3.5 * MM;
    doc.moveTo(KANT, y).lineTo(rechts, y).lineWidth(0.6).strokeColor(KLEUR.lijn).stroke();
    y += 3 * MM;
  }

  /* --------------------------------------------------------- totalen */
  const totaalregel = (kop, bedrag, dik) => {
    doc.font(dik ? "serif" : "sans").fontSize(dik ? 13 : 10)
       .fillColor(dik ? KLEUR.inkt : KLEUR.gedempt)
       .text(kop, KANT + breedte - 80 * MM, y, { width: 50 * MM, align: "right" });
    doc.font(dik ? "serif" : "sans").fontSize(dik ? 13 : 10)
       .fillColor(dik ? KLEUR.magenta : KLEUR.inkt)
       .text(euro(bedrag), xBedrag, y, { width: 30 * MM, align: "right" });
    y += (dik ? 7 : 5.4) * MM;
  };

  totaalregel("Totaal exclusief btw", factuur.bedrag_ex_btw);
  if (factuur.btw_verlegd) totaalregel("Btw verlegd", 0);
  else totaalregel("Btw 21 procent", factuur.btw_cent);

  y += 1 * MM;
  doc.moveTo(KANT + breedte - 80 * MM, y).lineTo(rechts, y).lineWidth(1.2).strokeColor(KLEUR.inkt).stroke();
  y += 3 * MM;
  totaalregel("Te betalen", factuur.bedrag_totaal, true);

  /* ------------------------------------------------------------- slot */
  y += 6 * MM;
  doc.font("sans").fontSize(9.5).fillColor(KLEUR.gedempt)
     .text(factuur.status === "betaald"
       ? "Dit bedrag is voldaan via Mollie. Je hoeft niets meer te doen."
       : "Dit bedrag staat nog open.", KANT, y, { width: breedte });
  if (factuur.btw_verlegd){
    doc.text("Btw verlegd naar de afnemer.", KANT, doc.y + 1.5 * MM, { width: breedte });
  }

  const voet = PAPIER.a4_staand[1] - KANT - 6 * MM;
  doc.font("sans").fontSize(8).fillColor(KLEUR.gedempt)
     .text([bedrijf.naam, bedrijf.email, bedrijf.telefoon, bedrijf.iban].filter(Boolean).join("  ·  "),
           KANT, voet, { width: breedte, align: "center" });

  return await alsBuffer(doc);
}
