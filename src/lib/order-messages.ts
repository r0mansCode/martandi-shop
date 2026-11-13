/** Feedback after an admin order action, keyed by the ?zina=… value the action redirects with. */
export const ORDER_MESSAGES: Record<string, { text: string; error?: boolean }> = {
  statuss: { text: "Statuss atjaunināts." },
  "statuss-nederigs": { text: "Šo statusu vairs nevar iestatīt – pārlādējiet lapu.", error: true },
  "rekins-nosutits": { text: "Rēķins nosūtīts atkārtoti." },
  "rekins-kluda": { text: "Rēķinu neizdevās nosūtīt. Mēģiniet vēlreiz vēlāk.", error: true },
  "dzests-numurs-brivs": { text: "Pasūtījums dzēsts. Tā rēķina numurs tiks piešķirts nākamajam pasūtījumam." },
  dzests: {
    text: "Pasūtījums dzēsts. Tā rēķina numurs paliek neizmantots, jo pēc tā jau ir izrakstīti citi rēķini.",
  },
};
