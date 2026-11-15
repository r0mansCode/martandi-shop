/** Feedback after an admin invoice or customer action, keyed by the ?zina=… value it redirects with. */
export const INVOICE_MESSAGES: Record<string, { text: string; error?: boolean }> = {
  izveidots: { text: "Rēķins izveidots." },
  apmaksats: { text: "Rēķins atzīmēts kā apmaksāts." },
  neapmaksats: { text: "Rēķins atzīmēts kā neapmaksāts." },
  "dzests-numurs-brivs": { text: "Rēķins dzēsts. Tā numurs tiks piešķirts nākamajam rēķinam." },
  dzests: {
    text: "Rēķins dzēsts. Tā numurs paliek neizmantots, jo pēc tā jau ir izrakstīti citi rēķini.",
  },
  "klients-izveidots": { text: "Klients pievienots." },
  "klients-dzests": { text: "Klients dzēsts. Jau izrakstītajos rēķinos viņa dati saglabājas." },
};
