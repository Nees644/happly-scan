// sprint-config.js — de ENIGE configuratieplek voor de Sprint-inschrijving.
// Wordt gelezen door sprint.html (prijs, badge, inschrijfknop) én api/lead.js
// (de link "Reserveer je plek" in de uitslagmail), zodat ze nooit uit elkaar lopen.
//
// TREDE VOL? Zet ACTIEVE_TREDE hieronder één hoger (1 -> 2 -> 3), commit en push.
// Prijs, doorstreepprijs, badge "nu geldig", knop en maillink volgen automatisch.
// INSCHRIJVING_OPEN op false zet de knop uit ("Inschrijving opent begin augustus").

export const INSCHRIJVING_OPEN = true;
export const ACTIEVE_TREDE = 1;

// Mollie payment links (profiel Happly Academy), één per voorverkooptrede.
export const TREDES = {
  1: { prijs: 245, url: "https://payment-links.mollie.com/payment/p8op7kvMYFse8bau6ppvE" },
  2: { prijs: 295, url: "https://payment-links.mollie.com/payment/RWWYx86T2okXFGBBvXp2F" },
  3: { prijs: 345, url: "https://payment-links.mollie.com/payment/UuvVoJExTdf2kYAUscnAv" }
};
