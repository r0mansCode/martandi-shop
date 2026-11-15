import { MAX_LOGO_BYTES } from "./invoice-logos";

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
  "logo-saglabats": { text: "Logotips nomainīts. Jaunie un esošie rēķini to rādīs nākamreiz, kad atvērsiet PDF." },
  "logo-atjaunots": { text: "Atjaunots noklusējuma logotips." },
  "logo-nav-faila": { text: "Izvēlieties attēla failu.", error: true },
  "logo-par-lielu": { text: `Attēls ir pārāk liels: ne vairāk kā ${MAX_LOGO_BYTES / 1024} KB.`, error: true },
  "logo-tips": { text: "Atļauti tikai PNG vai JPEG attēli.", error: true },
  "klients-dzests": { text: "Klients dzēsts. Jau izrakstītajos rēķinos viņa dati saglabājas." },
};
