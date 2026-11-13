"use server";

import { headers } from "next/headers";
import { checkoutInput, type CheckoutState } from "@/lib/checkout-input";
import { createOrder } from "@/server/orders";
import { sendInvoice } from "@/server/customer-emails";
import { rateLimit } from "@/server/rate-limit";

const ORDERS_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60 * 1000;

const fail = (message: string, errors: Record<string, string> = {}): CheckoutState => ({
  status: "error",
  message,
  errors,
});

/**
 * Places an order: validates, re-prices from the database, saves, then emails the PDF invoice.
 * The order is kept even if the email fails; the thank-you page then says the invoice is delayed.
 */
export async function placeOrder(_prev: CheckoutState, payload: unknown): Promise<CheckoutState> {
  // Honeypot: a field hidden from people. Bots that fill it get a generic error and no order.
  if (typeof payload === "object" && payload !== null && "website" in payload && payload.website) {
    return fail("Neizdevās noformēt pasūtījumu. Lūdzu, mēģiniet vēlreiz.");
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`checkout:${ip}`, ORDERS_PER_WINDOW, WINDOW_MS)) {
    return fail("Pārāk daudz mēģinājumu. Lūdzu, pagaidiet dažas minūtes un mēģiniet vēlreiz.");
  }

  const parsed = checkoutInput.safeParse(payload);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
    return fail("Pārbaudiet iezīmētos laukus.", errors);
  }

  let result;
  try {
    result = await createOrder(parsed.data);
  } catch (err) {
    console.error("[checkout] Failed to create order", err);
    return fail("Neizdevās saglabāt pasūtījumu. Lūdzu, mēģiniet vēlreiz.");
  }

  switch (result.kind) {
    case "age_required":
      return fail("Apstipriniet, ka jums ir vismaz 18 gadu.", {
        ageConfirmed: "Alkoholiskos dzērienus pārdodam tikai personām no 18 gadu vecuma",
      });
    case "cart_changed":
      return {
        status: "cart_changed",
        message: result.removed.length
          ? "Daži produkti vairs nav pieejami, un tie ir izņemti no groza. Pārbaudiet pasūtījumu un apstipriniet vēlreiz."
          : "Dažu produktu cenas ir mainījušās. Pārbaudiet jauno summu un apstipriniet vēlreiz.",
        prices: result.prices,
        removed: result.removed,
      };
    case "created":
      try {
        await sendInvoice(result.order);
      } catch (err) {
        console.error(`[checkout] Order ${result.order.invoiceNumber} saved, but the invoice email failed`, err);
      }
      return { status: "ok", orderId: result.order.id };
  }
}
