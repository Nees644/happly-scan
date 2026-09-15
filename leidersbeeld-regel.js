// leidersbeeld-regel.js — regel R13, het Leidersbeeld naast de teamlijn.
//
// De leider heeft zijn team beoordeeld op dezelfde items. Het verschil tussen
// zijn beeld en wat het team van zichzelf zegt is de kern van het gesprek. Het
// is geen fout en geen oordeel over de leider: een verschil is een plek waar
// twee waarnemingen uiteenlopen, en dat is precies wat er te bespreken valt.
//
// Deterministisch, zoals alle regels op de kaart. Geen taalmodel in de
// beslissing en geen totaalscore van het verschil: een gemiddeld verschil zegt
// niets, want twee verschillen kunnen elkaar opheffen terwijl er van alles aan
// de hand is.
//
// Teksten uit paragraaf 10 van briefings/leidersbeeld.md, letterlijk.

export const DREMPEL_SD = 0.5;

export const DIMENSIES = ["zien", "sturen", "doen"];
export const LABEL = { zien: "Zien", sturen: "Sturen", doen: "Doen" };

export const ALLES_GEDEELD =
  "Jouw beeld en het beeld van het team lopen gelijk op Zien, Sturen en Doen. Een goede basis om samen een doel te kiezen.";

export const SLOTZIN =
  "Een verschil in beeld is geen fout. Het is de plek waar het gesprek begint en het eerste Sprint-doel meestal ligt.";

export const TEKSTEN = {
  zien: {
    leider_hoger: "Jij ziet het team scherper kijken dan het team zichzelf ziet. Gespreksvraag: welke signalen pik jij op die het team nog niet benoemt?",
    leider_lager: "Het team ziet zichzelf scherper kijken dan jij het ziet. Gespreksvraag: wat ziet het team al, dat jou nog niet bereikt?"
  },
  sturen: {
    leider_hoger: "Jij ziet het team vaker zelf kiezen dan het team dat zelf ervaart. Gespreksvraag: waar wacht het team op jou terwijl jij denkt dat het al kiest?",
    leider_lager: "Het team ervaart meer eigen sturing dan jij ziet. Gespreksvraag: welke keuzes maakt het team al zonder dat jij ze ziet?"
  },
  doen: {
    leider_hoger: "Jij ziet het team meer afmaken dan het team zelf vindt. Gespreksvraag: wat blijft er liggen dat jij niet ziet?",
    leider_lager: "Het team vindt dat het meer afmaakt dan jij ziet. Gespreksvraag: wat wordt er opgeleverd dat bij jou niet zichtbaar wordt?"
  }
};

/* Een dimensie beoordelen. De drempel is een halve standaarddeviatie van de
   bevroren norm: kleiner dan dat is ruis en geen verschil. */
export function beoordeelDimensie(leidersbeeld, teamlijn, sd){
  const verschil = Number(leidersbeeld) - Number(teamlijn);
  const drempel = DREMPEL_SD * Number(sd);
  let uitkomst = "gedeeld";
  if (verschil >= drempel) uitkomst = "leider_hoger";
  else if (verschil <= -drempel) uitkomst = "leider_lager";
  return { verschil: Math.round(verschil * 100) / 100, drempel: Math.round(drempel * 100) / 100, uitkomst };
}

/* De statusregel bovenaan de kaart. Drie woorden als het gedeeld is, anders de
   dimensies waar het verschilt. */
export function statusregel(per){
  const anders = DIMENSIES.filter(d => per[d].uitkomst !== "gedeeld");
  if (!anders.length) return "Gedeeld beeld op Zien, Sturen en Doen";
  return `Verschil in beeld op ${lijst(anders.map(d => LABEL[d]))}`;
}

function lijst(woorden){
  if (woorden.length <= 1) return woorden[0] || "";
  return `${woorden.slice(0, -1).join(", ")} en ${woorden[woorden.length - 1]}`;
}

/* Het hele blok. Volgorde: het grootste verschil boven de drempel eerst, want
   daar begint het gesprek. */
export function beoordeelLeidersbeeld({ leidersbeeld, teamlijn, sd }){
  if (!leidersbeeld || !teamlijn || !sd) return null;

  const per = {};
  for (const d of DIMENSIES){
    per[d] = beoordeelDimensie(leidersbeeld[d], teamlijn[d], sd[`sd_${d}`] ?? sd[d]);
  }

  const volgorde = DIMENSIES
    .filter(d => per[d].uitkomst !== "gedeeld")
    .sort((a, b) => Math.abs(per[b].verschil) - Math.abs(per[a].verschil));

  const blokken = volgorde.map(d => ({
    dimensie: d, label: LABEL[d], uitkomst: per[d].uitkomst, tekst: TEKSTEN[d][per[d].uitkomst]
  }));

  return {
    per,
    volgorde,
    blokken,
    allesGedeeld: volgorde.length === 0,
    kop: statusregel(per),
    inleiding: volgorde.length === 0 ? ALLES_GEDEELD : null,
    slotzin: volgorde.length === 0 ? null : SLOTZIN
  };
}
