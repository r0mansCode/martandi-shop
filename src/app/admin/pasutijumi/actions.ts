"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { sendInvoice } from "@/server/send-invoice";
import { deleteOrder } from "@/server/orders";
import { NEXT_STATUSES, STATUS_TIMESTAMP } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";

// Order management. Each action re-checks the admin session and reports back through the
// URL (?zina=…), which the list and order pages turn into a message.

const LIST = "/admin/pasutijumi";
const orderPath = (id: string) => `${LIST}/${id}`;

/** Where to go after an action: the given admin orders URL (list with its filters, or a detail page). */
function back(returnTo: string | undefined, fallback: string, message: string) {
  const target = typeof returnTo === "string" && returnTo.startsWith(LIST) ? returnTo : fallback;
  const url = new URL(target, "http://local");
  url.searchParams.set("zina", message);
  return `${url.pathname}${url.search}`;
}

export async function setOrderStatus(orderId: string, status: OrderStatus, returnTo?: string) {
  await requireAdmin();

  const order = await db.orders.getById(orderId);
  if (!order) redirect(LIST);
  if (!NEXT_STATUSES[order.status].includes(status)) {
    redirect(back(returnTo, orderPath(orderId), "statuss-nederigs"));
  }

  const stamp = STATUS_TIMESTAMP[status];
  await db.orders.put({ ...order, status, ...(stamp ? { [stamp]: new Date().toISOString() } : {}) });

  revalidatePath("/admin", "layout");
  redirect(back(returnTo, orderPath(orderId), "statuss"));
}

export async function removeOrder(orderId: string, returnTo?: string) {
  await requireAdmin();

  const order = await db.orders.getById(orderId);
  if (!order) redirect(LIST);

  const { numberFreed } = await deleteOrder(order);
  console.info(`[admin] Order ${order.invoiceNumber} deleted${numberFreed ? ", number freed" : ""}`);

  revalidatePath("/admin", "layout");
  // The detail page no longer exists, so a return there goes to the list instead.
  const target = typeof returnTo === "string" && returnTo.startsWith(orderPath(orderId)) ? LIST : returnTo;
  redirect(back(target, LIST, numberFreed ? "dzests-numurs-brivs" : "dzests"));
}

export async function resendInvoice(orderId: string, returnTo?: string) {
  await requireAdmin();

  const order = await db.orders.getById(orderId);
  if (!order) redirect(LIST);

  let ok = true;
  try {
    await sendInvoice(order, { resend: true });
  } catch (err) {
    console.error(`[admin] Resending invoice ${order.invoiceNumber} failed`, err);
    ok = false;
  }

  revalidatePath("/admin", "layout");
  redirect(back(returnTo, orderPath(orderId), ok ? "rekins-nosutits" : "rekins-kluda"));
}
