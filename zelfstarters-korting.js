// zelfstarters-korting.js
// Kortingscodes van partners (intermediairs) voor Verificatie & Voorkeur.
// Alleen daarop: de Zelfstarters Dag en de Alumni Dag krijgen nooit korting.
// Een code is hoofdletterongevoelig, hoort bij één partner en geeft een
// percentage korting op het bedrag exclusief btw. De btw komt daarna, in
// bedragMetBtw, zoals altijd.

const CODE = /^[A-Z0-9][A-Z0-9-]{2,23}$/;

export function codeOpschonen(invoer){
  const c = String(invoer || "").trim().toUpperCase().replace(/\s+/g, "");
  return CODE.test(c) ? c : null;
}

/* Korting in centen op een bedrag exclusief btw, in hele centen. */
export function kortingCent(prijsExCent, pct){
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return Math.round(prijsExCent * p / 100);
}

/* Een partner opzoeken op code. Geeft null als de code niet bestaat of de
   partner niet actief is. */
export async function partnerVoorCode(db, code){
  const c = codeOpschonen(code);
  if (!c) return null;
  const q = await db.from("zelfstarters_partners").select("*").ilike("code", c).eq("actief", true).maybeSingle();
  return q.data || null;
}

/* Een nieuwe code voor een partner: de eerste letters van de naam plus
   twee cijfers, zodat hij uit te spreken is aan de telefoon. */
export function codeVoorNaam(naam){
  const basis = String(naam || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "PARTNER";
  return `${basis}-${String(Math.floor(Math.random() * 90) + 10)}`;
}

/* Tegoed voor organisaties: welk tarief hoort bij een aantal plaatsen.
   Vanaf 25 plaatsen 59 euro, vanaf 100 plaatsen 49 euro, daaronder de
   gewone prijs. De bedragen zelf staan in de tabel producten. */
export function tegoedTarief(plaatsen){
  const n = Number(plaatsen) || 0;
  if (n >= 100) return "ZS-TEG-100";
  if (n >= 25) return "ZS-TEG-25";
  return "ZS-STD";
}

/* Hoeveel plaatsen van een tegoed nog vrij zijn. Een gewone kortingscode
   heeft geen maximum en geeft Infinity. Een plaats is gebruikt zodra een
   registratie met deze code geverifieerd is. */
export async function vrijePlaatsen(db, partner){
  if (!partner || !partner.plaatsen) return Infinity;
  const q = await db.from("zelfstarters").select("id", { count: "exact", head: true })
    .eq("partner_id", partner.id).eq("status", "betaald");
  return Math.max(0, partner.plaatsen - (q.count || 0));
}
