import "server-only";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { site } from "@/config/site";
import { hoursLine, type PickupInfo } from "@/lib/shop-hours";
import { seller } from "@/config/seller";

// Shared building blocks for customer emails. Inline styles only: email clients ignore
// <style> blocks and external CSS. Every value from the order is escaped.

export const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const firstName = (order: Order) => order.customer.name.split(/\s+/)[0];

/** "P–Pk 10:00–20:00, S 10:00–18:00, Sv Slēgts" */
export const pickupHours = (info: PickupInfo) => hoursLine(info.hours, ", ");

/** The closure sentence as its own text line, when one is set. */
export const closureLines = (info: PickupInfo) => (info.closure ? [info.closure] : []);

export const ageNote = (order: Order) =>
  order.ageConfirmedAt
    ? `Alkoholiskos dzērienus izsniedzam tikai personām no ${site.minimumAge} gadu vecuma – lūdzam paņemt līdzi personu apliecinošu dokumentu.`
    : "";

export type EmailContent = { subject: string; text: string; html: string };

/** Paragraph block. `html` must already be escaped. */
export const p = (html: string, style = "") => `<p style="margin:0 0 12px;${style}">${html}</p>`;

export const heading = (text: string) => `<p style="margin:0 0 8px;font-weight:700">${escape(text)}</p>`;

/** Highlighted note box. */
export const note = (text: string) =>
  `<p style="margin:12px 0 0;padding:12px;background:#f5f0ea">${escape(text)}</p>`;

/** Ordered items with the total (and VAT) underneath. */
export function itemsTable(order: Order): string {
  const cell = "padding:8px 0;border-bottom:1px solid #e5e5e5;";
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="${cell}">${escape(i.name)}<br><span style="color:#757575;font-size:13px">${escape(i.variantLabel)} × ${i.qty}</span></td>
        <td style="${cell}text-align:right;white-space:nowrap;vertical-align:top">${formatPrice(i.unitPriceCents * i.qty)}</td>
      </tr>`,
    )
    .join("");
  const deposit = order.totals.depositCents
    ? `<tr>
      <td style="${cell}">Depozīts par iepakojumu<br><span style="color:#757575;font-size:13px">bez PVN</span></td>
      <td style="${cell}text-align:right;white-space:nowrap;vertical-align:top">${formatPrice(order.totals.depositCents)}</td>
    </tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows}
    ${deposit}
    <tr>
      <td style="padding:10px 0 0;font-weight:700">Kopā</td>
      <td style="padding:10px 0 0;text-align:right;font-weight:700;white-space:nowrap">${formatPrice(order.totals.grossCents)}</td>
    </tr>
    <tr>
      <td style="padding:2px 0 0;color:#757575;font-size:13px">t. sk. PVN ${Math.round(site.vatRate * 100)}%</td>
      <td style="padding:2px 0 0;color:#757575;font-size:13px;text-align:right">${formatPrice(order.totals.vatCents)}</td>
    </tr>
  </table>`;
}

/** Plain-text version of the items, for the text part of an email. */
export const itemsText = (order: Order) => [
  ...order.items.map((i) => `${i.name}, ${i.variantLabel} × ${i.qty} – ${formatPrice(i.unitPriceCents * i.qty)}`),
  ...(order.totals.depositCents ? [`Depozīts par iepakojumu (bez PVN) – ${formatPrice(order.totals.depositCents)}`] : []),
  `Kopā: ${formatPrice(order.totals.grossCents)} (t. sk. PVN ${formatPrice(order.totals.vatCents)})`,
];

/** Pickup address and hours block. */
export const pickupBlock = (order: Order, info: PickupInfo) =>
  `${heading("Saņemšana veikalā")}${p(
    `${escape(order.pickupLocation)}<br><span style="color:#757575">${escape(pickupHours(info))}</span>` +
      (info.closure ? `<br><strong style="color:#a0461e">${escape(info.closure)}</strong>` : ""),
    "margin:0",
  )}`;

/** Wraps the body sections in the branded email frame. */
export function emailHtml(sections: string[]): string {
  const rows = sections.map((s) => `<tr><td style="padding:12px 28px">${s}</td></tr>`).join("");
  return `<!doctype html>
<html lang="lv">
<body style="margin:0;padding:0;background:#f5f0ea">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#333333">
        <tr><td style="padding:28px 28px 4px;font-family:Georgia,serif;font-size:22px">${escape(site.name)}</td></tr>
        ${rows}
        <tr><td style="padding:16px 28px 28px;color:#757575;font-size:13px">
          Ja ir jautājumi, vienkārši atbildiet uz šo e-pastu.<br>${escape(seller.name)} · Reģ. Nr. ${seller.regNo}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Text-part footer matching emailHtml. */
export const textFooter = ["", "Ja ir jautājumi, vienkārši atbildiet uz šo e-pastu.", "", site.name];
