import { z } from "zod";
import { MAX_QTY } from "./cart-limits";

// Checkout input. The client sends only variant ids, quantities and the prices it showed;
// the server re-prices everything from the database and is the only place this is trusted.

export const MAX_CART_LINES = 50;

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} ir obligāts`)
    .max(max, `${label} ir pārāk garš`);

/** Removes spaces so "4010 3844 462" and "LV 4010…" are accepted. */
const compact = (s: string) => s.replace(/\s+/g, "");

const customer = z.object({
  name: text("Vārds, uzvārds", 2, 100),
  email: z
    .string()
    .trim()
    .max(200, "E-pasts ir pārāk garš")
    .pipe(z.email("Ievadiet derīgu e-pasta adresi")),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Ievadiet derīgu tālruņa numuru, piem. +371 20000000"),
});

const company = z.object({
  name: text("Uzņēmuma nosaukums", 2, 150),
  regNo: z
    .string()
    .transform(compact)
    .pipe(z.string().regex(/^\d{11}$/, "Reģistrācijas numurs – 11 cipari")),
  vatNo: z
    .string()
    .transform((s) => compact(s).toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^([A-Z]{2}[0-9A-Z]{2,13})?$/, "PVN numurs, piem. LV40000000000")
        .transform((v) => v || undefined),
    ),
  legalAddress: text("Juridiskā adrese", 5, 200),
});

const line = z.object({
  variantId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(MAX_QTY),
  /** The price the customer saw; a mismatch means the cart is stale. */
  priceCents: z.number().int().min(0),
});

const common = {
  customer,
  ageConfirmed: z.boolean(),
  lines: z.array(line).min(1, "Grozs ir tukšs").max(MAX_CART_LINES, "Grozā ir pārāk daudz preču"),
};

export const checkoutInput = z.discriminatedUnion("buyerType", [
  z.object({ ...common, buyerType: z.literal("private") }),
  z.object({ ...common, buyerType: z.literal("company"), company }),
]);

export type CheckoutInput = z.infer<typeof checkoutInput>;

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; message: string; errors: Record<string, string> }
  /** The cart was out of date; the client applies the server's prices and asks to confirm again. */
  | { status: "cart_changed"; message: string; prices: Record<string, number>; removed: string[] }
  | { status: "ok"; orderId: string };

export const initialCheckoutState: CheckoutState = { status: "idle" };
