import "server-only";
import { db } from "./db";
import { sendEmail } from "./email";
import { invoiceFilename, renderInvoicePdf } from "./invoice-pdf";
import { orderInvoiceEmail } from "./emails/order-invoice";
import type { Order } from "@/lib/types";

/**
 * Emails the PDF invoice to the customer and records `invoiceEmailedAt` on the order.
 * Throws if the PDF or the send fails; the order itself is untouched in that case.
 * `resend: true` bypasses the duplicate-send protection (e.g. an admin re-sending on request).
 */
export async function sendInvoice(order: Order, { resend = false } = {}): Promise<Order> {
  const pdf = await renderInvoicePdf(order);
  const { subject, text, html } = orderInvoiceEmail(order);

  await sendEmail({
    to: order.customer.email,
    subject,
    text,
    html,
    attachments: [{ filename: invoiceFilename(order), content: pdf }],
    // Retries of the same checkout must not email the customer twice.
    idempotencyKey: resend ? undefined : `invoice-${order.id}`,
  });

  const updated = { ...order, invoiceEmailedAt: new Date().toISOString() };
  await db.orders.put(updated);
  return updated;
}
