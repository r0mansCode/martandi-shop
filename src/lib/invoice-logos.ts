// Logos a manual invoice can carry. The images themselves are replaceable in the admin
// („Rēķini” → „Logotipi”); server/invoice-logos.ts reads them, with files in the repo as defaults.

export const INVOICE_LOGOS = { martandi: "Martandi", tavidzerieni: "TaviDzērieni" } as const;
export type InvoiceLogo = keyof typeof INVOICE_LOGOS;

export const DEFAULT_INVOICE_LOGO: InvoiceLogo = "martandi";
/** Invoices saved before the choice existed were printed with the shop logo. */
export const LEGACY_INVOICE_LOGO: InvoiceLogo = "tavidzerieni";

export const isInvoiceLogo = (v: string): v is InvoiceLogo => Object.hasOwn(INVOICE_LOGOS, v);

/** PDFKit embeds only PNG and JPEG. Kept small: the image is stored in the settings item. */
export const LOGO_TYPES = ["image/png", "image/jpeg"] as const;
export type LogoType = (typeof LOGO_TYPES)[number];
export const MAX_LOGO_BYTES = 200 * 1024;
