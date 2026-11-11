import "server-only";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { pickup, site } from "@/config/site";
import { seller } from "@/config/seller";

// Email sent with the PDF invoice right after checkout. Inline styles only: email clients
// ignore <style> blocks and external CSS.

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function orderInvoiceEmail(order: Order) {
  const total = formatPrice(order.totals.grossCents);
  const due = formatDate(order.dueDate);
  const hours = pickup.hours.map((h) => `${h.days} ${h.time}`).join(", ");
  const firstName = order.customer.name.split(/\s+/)[0];
  const ageNote = order.ageConfirmedAt
    ? `Alkoholiskos dzērienus izsniedzam tikai personām no ${site.minimumAge} gadu vecuma – lūdzam paņemt līdzi personu apliecinošu dokumentu.`
    : "";

  const payment: [string, string][] = [
    ["Summa", total],
    ["Saņēmējs", seller.name],
    ["Konts", seller.iban],
    ["Banka", `${seller.bank}, SWIFT ${seller.swift}`],
    ["Maksājuma mērķis", order.invoiceNumber],
    ["Apmaksāt līdz", due],
  ];

  const subject = `Rēķins ${order.invoiceNumber} – ${site.name}`;

  const text = [
    `Labdien, ${firstName}!`,
    "",
    `Paldies par pasūtījumu ${site.name}. Pielikumā – rēķins Nr. ${order.invoiceNumber}.`,
    "",
    ...order.items.map((i) => `${i.name}, ${i.variantLabel} × ${i.qty} – ${formatPrice(i.unitPriceCents * i.qty)}`),
    `Kopā apmaksai: ${total} (t. sk. PVN ${formatPrice(order.totals.vatCents)})`,
    "",
    "Apmaksa ar bankas pārskaitījumu:",
    ...payment.map(([k, v]) => `${k}: ${v}`),
    "",
    `Saņemšana veikalā: ${order.pickupLocation}. Darba laiks: ${hours}.`,
    "Pasūtījumu sagatavosim pēc apmaksas saņemšanas un paziņosim, kad tas būs gatavs saņemšanai.",
    ...(ageNote ? [ageNote] : []),
    "",
    "Ja ir jautājumi, vienkārši atbildiet uz šo e-pastu.",
    "",
    site.name,
  ].join("\n");

  const cell = "padding:8px 0;border-bottom:1px solid #e5e5e5;";
  const itemRows = order.items
    .map(
      (i) => `<tr>
        <td style="${cell}">${escape(i.name)}<br><span style="color:#757575;font-size:13px">${escape(i.variantLabel)} × ${i.qty}</span></td>
        <td style="${cell}text-align:right;white-space:nowrap;vertical-align:top">${formatPrice(i.unitPriceCents * i.qty)}</td>
      </tr>`,
    )
    .join("");
  const paymentRows = payment
    .map(
      ([k, v]) => `<tr>
        <td style="padding:3px 16px 3px 0;color:#757575;white-space:nowrap;vertical-align:top">${escape(k)}</td>
        <td style="padding:3px 0;font-weight:600">${escape(v)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="lv">
<body style="margin:0;padding:0;background:#f5f0ea">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#333333">
        <tr><td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:22px">${escape(site.name)}</td></tr>
        <tr><td style="padding:8px 28px">
          <p style="margin:0 0 12px">Labdien, ${escape(firstName)}!</p>
          <p style="margin:0 0 20px">Paldies par pasūtījumu. Pielikumā – rēķins Nr. <strong>${escape(order.invoiceNumber)}</strong>.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itemRows}
            <tr>
              <td style="padding:10px 0 0;font-weight:700">Kopā apmaksai</td>
              <td style="padding:10px 0 0;text-align:right;font-weight:700;white-space:nowrap">${total}</td>
            </tr>
            <tr>
              <td style="padding:2px 0 0;color:#757575;font-size:13px">t. sk. PVN ${Math.round(site.vatRate * 100)}%</td>
              <td style="padding:2px 0 0;color:#757575;font-size:13px;text-align:right">${formatPrice(order.totals.vatCents)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 28px 8px">
          <p style="margin:0 0 8px;font-weight:700">Apmaksa ar bankas pārskaitījumu</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${paymentRows}</table>
        </td></tr>
        <tr><td style="padding:16px 28px 8px">
          <p style="margin:0 0 8px;font-weight:700">Saņemšana veikalā</p>
          <p style="margin:0">${escape(order.pickupLocation)}<br><span style="color:#757575">${escape(hours)}</span></p>
          <p style="margin:12px 0 0">Pasūtījumu sagatavosim pēc apmaksas saņemšanas un paziņosim, kad tas būs gatavs saņemšanai.</p>
          ${ageNote ? `<p style="margin:12px 0 0;padding:12px;background:#f5f0ea">${escape(ageNote)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:20px 28px 28px;color:#757575;font-size:13px">
          Ja ir jautājumi, vienkārši atbildiet uz šo e-pastu.<br>${escape(seller.name)} · Reģ. Nr. ${seller.regNo}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
