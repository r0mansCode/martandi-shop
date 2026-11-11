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

/** Timestamp field set when an order enters a status. */
export const STATUS_TIMESTAMP: Partial<Record<OrderStatus, keyof Order>> = {
  paid: "paidAt",
  ready_for_pickup: "readyAt",
  collected: "collectedAt",
  cancelled: "cancelledAt",
};

export const isOverdue = (order: Order, now = Date.now()) =>
  order.status === "awaiting_payment" && Date.parse(order.dueDate) < now;
