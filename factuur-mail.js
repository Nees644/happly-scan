// factuur-mail.js — de factuur zoals de klant hem in zijn mail krijgt.
//
// Geen pdf. Die staat op de lijst en hoort in Supabase Storage; tot die tijd is
// een volledige factuur in de mail beter dan geen factuur. Alles wat er
// wettelijk op moet staan, staat erop: nummer, datum, beide adressen, het
// btw-nummer, wat er is geleverd, en het bedrag gesplitst in ex btw, btw en
// totaal.

import { BEDRIJF } from "./bedrijf.js";
import { euro, nederlandseDatum } from "./factuur.js";

const FONT = "'DM Sans',Helvetica,Arial,sans-serif";
const DP = "#1A0B2E", PK = "#D6026F", MUT = "#6A5A78", BD = "#E7DCEC", TX = "#3A2E46";

function ontsnap(t){
  return String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function adresblok(kop, r){
  const regels = [
    r.naam, r.toevoeging, r.adres,
    [r.postcode, r.plaats].filter(Boolean).join("  "),
    r.land && r.land !== "NL" ? r.land : null,
    r.kvk ? `KvK ${r.kvk}` : null,
    r.btw_nummer ? `Btw ${r.btw_nummer}` : null
  ].filter(Boolean);
  return `<td style="vertical-align:top;font-family:${FONT};font-size:13px;color:${TX};line-height:1.6;padding-right:18px">
    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${MUT};margin-bottom:6px">${kop}</div>
    ${regels.map(ontsnap).join("<br>")}
  </td>`;
}

export function bouwFactuurHtml(factuur, bedrijf = BEDRIJF){
  const regels = (factuur.regels || []).map(r => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${BD};font-family:${FONT};font-size:13.5px;color:${TX}">
        ${ontsnap(r.omschrijving)}<br><span style="color:${MUT};font-size:12px">${ontsnap(r.code)}</span>
      </td>
      <td style="padding:9px 0;border-bottom:1px solid ${BD};font-family:${FONT};font-size:13.5px;color:${TX};text-align:right">${r.aantal}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${BD};font-family:${FONT};font-size:13.5px;color:${TX};text-align:right">${euro(r.bedrag_ex_btw)}</td>
    </tr>`).join("");

  const btwregel = factuur.btw_verlegd
    ? `<tr><td colspan="2" style="padding:5px 0;font-family:${FONT};font-size:13.5px;color:${TX}">Btw verlegd</td>
           <td style="padding:5px 0;text-align:right;font-family:${FONT};font-size:13.5px;color:${TX}">${euro(0)}</td></tr>`
    : `<tr><td colspan="2" style="padding:5px 0;font-family:${FONT};font-size:13.5px;color:${TX}">Btw 21 procent</td>
           <td style="padding:5px 0;text-align:right;font-family:${FONT};font-size:13.5px;color:${TX}">${euro(factuur.btw_cent)}</td></tr>`;

  return `<div style="background:#F7F3F0;padding:32px 16px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-bottom:1px solid ${BD}">
      <tr>
        <td style="padding:22px 32px 18px">
          ${bedrijf.logo
            ? `<img src="${bedrijf.logo}" alt="${ontsnap(bedrijf.naam)}" width="104" style="display:block;width:104px;height:auto;border:0">`
            : `<span style="font-family:${FONT};font-size:19px;font-weight:600;color:${PK}">${ontsnap(bedrijf.naam)}</span>`}
        </td>
        <td style="padding:22px 32px 18px;text-align:right;font-family:${FONT};font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${MUT}">Factuur</td>
      </tr>
    </table>
    <div style="padding:26px 32px 34px">

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:22px">
        <tr>
          <td style="font-family:${FONT};font-size:13px;color:${TX};line-height:1.7">
            <b style="font-size:16px;color:${DP}">Factuur ${ontsnap(factuur.nummer)}</b><br>
            <span style="color:${MUT}">Factuurdatum ${ontsnap(nederlandseDatum(factuur.created_at))}</span><br>
            <span style="color:${MUT}">Leverdatum ${ontsnap(nederlandseDatum(factuur.periode_van))}</span>
            ${factuur.klant_referentie ? `<br><span style="color:${MUT}">Referentie ${ontsnap(factuur.klant_referentie)}</span>` : ""}
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px">
        <tr>
          ${adresblok("Van", bedrijf)}
          ${adresblok("Aan", {
            naam: factuur.klant_naam, adres: factuur.klant_adres,
            postcode: factuur.klant_postcode, plaats: factuur.klant_plaats,
            land: factuur.klant_land, btw_nummer: factuur.btw_nummer
          })}
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <th style="text-align:left;padding-bottom:7px;border-bottom:1.5px solid ${DP};font-family:${FONT};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUT}">Omschrijving</th>
          <th style="text-align:right;padding-bottom:7px;border-bottom:1.5px solid ${DP};font-family:${FONT};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUT}">Aantal</th>
          <th style="text-align:right;padding-bottom:7px;border-bottom:1.5px solid ${DP};font-family:${FONT};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUT}">Bedrag</th>
        </tr>
        ${regels}
        <tr><td colspan="2" style="padding:11px 0 5px;font-family:${FONT};font-size:13.5px;color:${TX}">Totaal exclusief btw</td>
            <td style="padding:11px 0 5px;text-align:right;font-family:${FONT};font-size:13.5px;color:${TX}">${euro(factuur.bedrag_ex_btw)}</td></tr>
        ${btwregel}
        <tr><td colspan="2" style="padding:9px 0 0;border-top:1.5px solid ${DP};font-family:${FONT};font-size:15px;font-weight:600;color:${DP}">Te betalen</td>
            <td style="padding:9px 0 0;border-top:1.5px solid ${DP};text-align:right;font-family:${FONT};font-size:15px;font-weight:600;color:${PK}">${euro(factuur.bedrag_totaal)}</td></tr>
      </table>

      <p style="font-family:${FONT};font-size:13px;color:${MUT};line-height:1.7;margin:22px 0 0">
        ${factuur.status === "betaald"
          ? "Dit bedrag is voldaan via Mollie. Je hoeft niets meer te doen."
          : "Dit bedrag staat nog open."}
      </p>
      ${factuur.btw_verlegd ? `<p style="font-family:${FONT};font-size:12.5px;color:${MUT};margin:8px 0 0">Btw verlegd naar de afnemer.</p>` : ""}
    </div>
  </div>
  <p style="font-family:${FONT};font-size:11.5px;color:${MUT};text-align:center;margin:18px 0 0">
    ${ontsnap(bedrijf.naam)} &middot; ${ontsnap(bedrijf.email)}${bedrijf.telefoon ? ` &middot; ${ontsnap(bedrijf.telefoon)}` : ""}${bedrijf.iban ? ` &middot; ${ontsnap(bedrijf.iban)}` : ""}
  </p>
</div>`;
}

export function factuurMail(factuur, bedrijf = BEDRIJF){
  return {
    subject: `Factuur ${factuur.nummer} van ${bedrijf.naam}`,
    html: bouwFactuurHtml(factuur, bedrijf)
  };
}
