import "server-only";
import type { Order } from "@/lib/types";
import type { PickupInfo } from "@/lib/shop-hours";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { site } from "@/config/site";
import { seller } from "@/config/seller";
import {
  ageNote,
  closureLines,
  emailHtml,
  escape,
  firstName,
  heading,
  itemsTable,
  itemsText,
  note,
  p,
  pickupBlock,
  pickupHours,
  textFooter,
  type EmailContent,
} from "./layout";

// Email sent with the PDF invoice right after checkout.
export function orderInvoiceEmail(order: Order, pickup: PickupInfo): EmailContent {
  const total = formatPrice(order.totals.grossCents);
  const age = ageNote(order);
  const payment: [string, string][] = [
    ["Summa", total],
    ["Saņēmējs", seller.name],
    ["Konts", seller.iban],
    ["Banka", `${seller.bank}, SWIFT ${seller.swift}`],
    ["Maksājuma mērķis", order.invoiceNumber],
    ["Apmaksāt līdz", formatDate(order.dueDate)],
  ];

  const subject = `Rēķins ${order.invoiceNumber} – ${site.name}`;

  const text = [
    `Labdien, ${firstName(order)}!`,
    "",
    `Paldies par pasūtījumu ${site.name}. Pielikumā – rēķins Nr. ${order.invoiceNumber}.`,
    "",
    ...itemsText(order),
    "",
    "Apmaksa ar bankas pārskaitījumu:",
    ...payment.map(([k, v]) => `${k}: ${v}`),
    "",
    `Saņemšana veikalā: ${order.pickupLocation}. Darba laiks: ${pickupHours(pickup)}.`,
    ...closureLines(pickup),
    "Pasūtījumu sagatavosim pēc apmaksas saņemšanas un paziņosim, kad tas būs gatavs saņemšanai.",
    ...(age ? [age] : []),
    ...textFooter,
  ].join("\n");

  const paymentRows = payment
    .map(
      ([k, v]) => `<tr>
        <td style="padding:3px 16px 3px 0;color:#757575;white-space:nowrap;vertical-align:top">${escape(k)}</td>
        <td style="padding:3px 0;font-weight:600">${escape(v)}</td>
      </tr>`,
    )
    .join("");

  const html = emailHtml([
    p(`Labdien, ${escape(firstName(order))}!`) +
      p(`Paldies par pasūtījumu. Pielikumā – rēķins Nr. <strong>${escape(order.invoiceNumber)}</strong>.`) +
      itemsTable(order),
    heading("Apmaksa ar bankas pārskaitījumu") +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${paymentRows}</table>`,
    pickupBlock(order, pickup) +
      p("Pasūtījumu sagatavosim pēc apmaksas saņemšanas un paziņosim, kad tas būs gatavs saņemšanai.", "margin:12px 0 0") +
      (age ? note(age) : ""),
  ]);

  return { subject, text, html };
}
