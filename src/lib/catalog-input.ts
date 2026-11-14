import { z } from "zod";
import { isAllowedImageUrl, MAX_IMAGES } from "./product-images";
import { plural } from "./format";

// Admin form input for products and categories. Shared by the client forms (shape) and the
// Server Actions (validation); the server is the only place the result is trusted.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EURO = /^\d{1,6}(?:[.,]\d{1,2})?$/;

/** "12,99" or "12.99" → 1299. */
export function euroToCents(value: string): number {
  const [whole, fraction = ""] = value.trim().split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** "Konjaks un brendijs" → "konjaks-un-brendijs": a slug suggestion (diacritics dropped). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 1299 → "12,99", the format the price inputs show. */
export function centsToEuro(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} ir obligāts`).max(max, `${label} ir pārāk garš`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined);

const slug = z
  .string()
  .trim()
  .regex(SLUG, "Tikai mazie burti bez garumzīmēm, cipari un defises, piem. courvoisier-vs");

export const variantInput = z.object({
  /** Empty for a variant added in the editor; the server assigns an id. */
  id: z.string(),
  label: text("Tilpums", 40),
  price: z
    .string()
    .trim()
    .regex(EURO, "Cena formātā 12,99")
    .refine((v) => euroToCents(v) > 0, "Cenai jābūt lielākai par 0"),
  active: z.boolean(),
  /** Packaging deposit (0% VAT) on top of the price. */
  hasDeposit: z.boolean(),
  /** Deposit amount in euro; only checked when hasDeposit is on. */
  deposit: z.string().trim(),
}).superRefine((v, ctx) => {
  if (!v.hasDeposit) return;
  if (!EURO.test(v.deposit)) ctx.addIssue({ code: "custom", path: ["deposit"], message: "Depozīts formātā 0,10" });
  else if (euroToCents(v.deposit) <= 0) ctx.addIssue({ code: "custom", path: ["deposit"], message: "Depozītam jābūt lielākam par 0" });
});

export const productInput = z
  .object({
    id: z.string().min(1),
    name: text("Nosaukums", 120),
    slug,
    description: text("Apraksts", 2000),
    /** "" = unsorted: allowed, the product is then hidden from the storefront. */
    categoryId: z.string(),
    status: z.enum(["draft", "published"]),
    isAlcohol: z.boolean(),
    badge: z.enum(["", "Jaunums", "Populārs"]).transform((v) => v || undefined),
    abv: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{1,2}(?:[.,]\d)?$/.test(v) && Number(v.replace(",", ".")) <= 100), "Alkohols 0–100, piem. 40 vai 13,5")
      .transform((v) => (v === "" ? undefined : Number(v.replace(",", ".")))),
    country: optionalText(60),
    producer: optionalText(80),
    variants: z.array(variantInput).min(1, "Vajag vismaz vienu tilpumu"),
    images: z
      .array(
        z.object({
          url: z.string().refine(isAllowedImageUrl, "Nederīga attēla adrese"),
          alt: text("Attēla apraksts", 200),
        }),
      )
      .max(MAX_IMAGES, `Ne vairāk kā ${MAX_IMAGES} attēli`),
  })
  .refine((p) => p.status === "draft" || p.variants.some((v) => v.active), {
    message: "Publicētam produktam vajag vismaz vienu aktīvu tilpumu",
    path: ["variants"],
  });

/** What the product form sends: every field as the user typed it. */
export type ProductFormValues = z.input<typeof productInput>;

export const categoryInput = z.object({
  id: z.string().min(1),
  name: text("Nosaukums", 60),
  slug,
  description: text("Apraksts", 500),
  // No sortOrder: the order is set only by dragging in the list, which keeps it 1, 2, 3…
});

/** A new category: the server assigns the id and puts it last in the menu. */
export const newCategoryInput = categoryInput.omit({ id: true });

/** `?kategorija=` value of the admin product filter for unsorted products (categoryId ""). */
export const UNSORTED_FILTER = "bez";

/** Confirmation for deleting a category; its products become unsorted, so say so. */
export function deleteCategoryConfirm(name: string, productCount: number): string {
  const moved =
    productCount === 0
      ? ""
      : ` Tās ${productCount} ${plural(
          productCount,
          "produkts tiks pārvietots uz „Bez kategorijas” un netiks rādīts",
          "produkti tiks pārvietoti uz „Bez kategorijas” un netiks rādīti",
        )} veikalā.`;
  return `Dzēst kategoriju „${name}”?${moved} Kategoriju nevarēs atjaunot.`;
}

export type FormState<Values = never> = {
  ok: boolean;
  message: string;
  /** Field path ("name", "variants.0.price") → first error message. */
  errors: Record<string, string>;
  /** The saved values, when the server normalized them (e.g. assigned variant ids). */
  values?: Values;
};

export type ProductFormState = FormState<ProductFormValues>;

export const initialFormState: FormState<never> = { ok: false, message: "", errors: {} };

export function errorState(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    errors[key] ??= issue.message;
  }
  return { ok: false, message: "Pārbaudiet iezīmētos laukus.", errors };
}
