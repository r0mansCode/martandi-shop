"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { sendInvoice } from "@/server/send-invoice";
import { NEXT_STATUSES, STATUS_TIMESTAMP } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";

// Order management. Each action re-checks the admin session and reports back through the
// URL (?zina=…), which the order page turns into a message.

const orderPath = (id: string) => `/admin/pasutijumi/${id}`;

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();

  const order = await db.orders.getById(orderId);
  if (!order) redirect("/admin/pasutijumi");
  if (!NEXT_STATUSES[order.status].includes(status)) redirect(`${orderPath(orderId)}?zina=statuss-nederigs`);

  const stamp = STATUS_TIMESTAMP[status];
  await db.orders.put({ ...order, status, ...(stamp ? { [stamp]: new Date().toISOString() } : {}) });

  revalidatePath("/admin", "layout");
  redirect(`${orderPath(orderId)}?zina=statuss`);
}

export async function resendInvoice(orderId: string) {
  await requireAdmin();

  const order = await db.orders.getById(orderId);
  if (!order) redirect("/admin/pasutijumi");

  let ok = true;
  try {
    await sendInvoice(order, { resend: true });
  } catch (err) {
    console.error(`[admin] Resending invoice ${order.invoiceNumber} failed`, err);
    ok = false;
  }

  revalidatePath("/admin", "layout");
  redirect(`${orderPath(orderId)}?zina=${ok ? "rekins-nosutits" : "rekins-kluda"}`);
}
