import "server-only";
import { db } from "./db";
import { sendEmail } from "./email";
import { getPickupInfo } from "./shop-hours";
import { invoiceFilename, renderInvoicePdf } from "./invoice-pdf";
import { orderInvoiceEmail } from "./emails/order-invoice";
import { isNotifiedStatus, orderStatusEmail } from "./emails/order-status";
import type { Order } from "@/lib/types";

/**
 * Emails the PDF invoice to the customer and records `invoiceEmailedAt` on the order.
 * Throws if the PDF or the send fails; the order itself is untouched in that case.
 * `resend: true` bypasses the duplicate-send protection (e.g. an admin re-sending on request).
 */
export async function sendInvoice(order: Order, { resend = false } = {}): Promise<Order> {
  const pickup = await getPickupInfo();
  const pdf = await renderInvoicePdf(order, pickup);
  const { subject, text, html } = orderInvoiceEmail(order, pickup);

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

/**
 * Tells the customer about a status change (paid / ready for pickup / collected) and records
 * it in `statusEmailedAt`. Other statuses send nothing. Throws if the send fails.
 */
export async function sendStatusEmail(order: Order): Promise<Order> {
  const status = order.status;
  if (!isNotifiedStatus(status)) return order;

  const { subject, text, html } = orderStatusEmail(order, status, await getPickupInfo());
  await sendEmail({
    to: order.customer.email,
    subject,
    text,
    html,
    // A status is only entered once, so one email per order and status.
    idempotencyKey: `status-${order.id}-${status}`,
  });

  const updated = {
    ...order,
    statusEmailedAt: { ...order.statusEmailedAt, [status]: new Date().toISOString() },
  };
  await db.orders.put(updated);
  return updated;
}
