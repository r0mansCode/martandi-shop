import type { Order, OrderStatus } from "./types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Gaida apmaksu",
  paid: "Apmaksāts",
  ready_for_pickup: "Gatavs saņemšanai",
  collected: "Izsniegts",
  cancelled: "Atcelts",
};

/** Allowed next steps from each status; collected and cancelled are final. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["collected", "cancelled"],
  collected: [],
  cancelled: [],
};

/** Button text for moving an order into a status. */
export const STATUS_ACTION_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "",
  paid: "Atzīmēt kā apmaksātu",
  ready_for_pickup: "Gatavs saņemšanai",
  collected: "Atzīmēt kā izsniegtu",
  cancelled: "Atcelt pasūtījumu",
};

/** Button text for the orders table rows (shown uppercase there). */
export const STATUS_SHORT_ACTION: Record<OrderStatus, string> = {
  awaiting_payment: "",
  paid: "Atzīmēt kā apmaksātu",
  ready_for_pickup: "Atzīmēt kā gatavu izsniegšanai",
  collected: "Atzīmēt kā izsniegtu",
  cancelled: "Atcelt",
};

/** Statuses that count as revenue: the money has arrived. */
export const PAID_STATUSES: OrderStatus[] = ["paid", "ready_for_pickup", "collected"];

/** Timestamp field set when an order enters a status. */
export const STATUS_TIMESTAMP: Partial<Record<OrderStatus, keyof Order>> = {
  paid: "paidAt",
  ready_for_pickup: "readyAt",
  collected: "collectedAt",
  cancelled: "cancelledAt",
};

/** Confirmation text before deleting; warns when the customer already has the invoice. */
export const deleteConfirmText = (order: Order) =>
  `Dzēst pasūtījumu ${order.invoiceNumber}? To nevarēs atjaunot.` +
  (order.invoiceEmailedAt
    ? "\n\nRēķins jau ir nosūtīts klientam. Ja šis bija jaunākais rēķins, tā numurs tiks piešķirts nākamajam" +
      " pasūtījumam, un diviem rēķiniem būs vienāds numurs."
    : "");

export const isOverdue = (order: Order, now = Date.now()) =>
  order.status === "awaiting_payment" && Date.parse(order.dueDate) < now;
