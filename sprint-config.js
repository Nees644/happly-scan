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
// Aangemaakt 24-07-2026 mét redirect naar https://scan.happly.nl/bedankt;
// de eerdere links zonder redirect zijn hiermee vervangen.
export const TREDES = {
  1: { prijs: 245, url: "https://payment-links.mollie.com/payment/oGKnm46j9dA5ahCkzmj2J" },
  2: { prijs: 295, url: "https://payment-links.mollie.com/payment/ExsAJB7LvEhU22cmvhVhy" },
  3: { prijs: 345, url: "https://payment-links.mollie.com/payment/s2RkkSeXXWfojht8zvh3q" }
};
