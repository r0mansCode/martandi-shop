import "server-only";
import type { Order, OrderStatus } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { site } from "@/config/site";
import {
  ageNote,
  emailHtml,
  escape,
  firstName,
  itemsTable,
  itemsText,
  note,
  p,
  pickupBlock,
  pickupHours,
  textFooter,
  type EmailContent,
} from "./layout";

// Customer emails sent when the shop moves an order to the next status.

/** Statuses that notify the customer. Cancellation is handled personally, not by email. */
export type NotifiedStatus = Extract<OrderStatus, "paid" | "ready_for_pickup" | "collected">;

export const NOTIFIED_STATUSES: OrderStatus[] = ["paid", "ready_for_pickup", "collected"];

export const isNotifiedStatus = (status: OrderStatus): status is NotifiedStatus =>
  NOTIFIED_STATUSES.includes(status);

export function orderStatusEmail(order: Order, status: NotifiedStatus): EmailContent {
  const name = firstName(order);
  const number = order.invoiceNumber;
  const age = ageNote(order);

  switch (status) {
    case "paid":
      return {
        subject: `Apmaksa saņemta – pasūtījums ${number}`,
        text: [
          `Labdien, ${name}!`,
          "",
          `Paldies – esam saņēmuši apmaksu ${formatPrice(order.totals.grossCents)} par pasūtījumu Nr. ${number}.`,
          "Sākam gatavot jūsu pasūtījumu. Kad tas būs gatavs saņemšanai veikalā, nosūtīsim vēl vienu e-pastu.",
          "",
          ...itemsText(order),
          ...textFooter,
        ].join("\n"),
        html: emailHtml([
          p(`Labdien, ${escape(name)}!`) +
            p(
              `Paldies – esam saņēmuši apmaksu <strong>${formatPrice(order.totals.grossCents)}</strong> par ` +
                `pasūtījumu Nr. <strong>${escape(number)}</strong>.`,
            ) +
            p("Sākam gatavot jūsu pasūtījumu. Kad tas būs gatavs saņemšanai veikalā, nosūtīsim vēl vienu e-pastu."),
          itemsTable(order),
        ]),
      };

    case "ready_for_pickup":
      return {
        subject: `Pasūtījums ${number} gatavs saņemšanai`,
        text: [
          `Labdien, ${name}!`,
          "",
          `Jūsu pasūtījums Nr. ${number} ir sagatavots un gaida jūs veikalā.`,
          "",
          `Adrese: ${order.pickupLocation}`,
          `Darba laiks: ${pickupHours()}`,
          `Saņemot, lūdzu, nosauciet pasūtījuma numuru ${number}.`,
          ...(age ? ["", age] : []),
          "",
          ...itemsText(order),
          ...textFooter,
        ].join("\n"),
        html: emailHtml([
          p(`Labdien, ${escape(name)}!`) +
            p(`Jūsu pasūtījums Nr. <strong>${escape(number)}</strong> ir sagatavots un gaida jūs veikalā.`),
          pickupBlock(order) +
            p(`Saņemot, lūdzu, nosauciet pasūtījuma numuru <strong>${escape(number)}</strong>.`, "margin:12px 0 0") +
            (age ? note(age) : ""),
          itemsTable(order),
        ]),
      };

    case "collected":
      return {
        subject: `Paldies, ka iepirkāties ${site.name}!`,
        text: [
          `Labdien, ${name}!`,
          "",
          `Paldies, ka izvēlējāties ${site.name}! Ceram, ka dzērieni sagādās prieku – vai tie būtu svētkiem vai ` +
            "mierīgam vakaram.",
          "",
          "Ja jums ir kāds ieteikums vai jautājums, vienkārši atbildiet uz šo e-pastu – mēs labprāt uzklausīsim.",
          "",
          `Gaidīsim jūs atkal: ${site.url}/katalogs`,
          "",
          site.name,
        ].join("\n"),
        html: emailHtml([
          p(`Labdien, ${escape(name)}!`) +
            p(
              `Paldies, ka izvēlējāties ${escape(site.name)}! Ceram, ka dzērieni sagādās prieku – vai tie būtu ` +
                "svētkiem vai mierīgam vakaram.",
            ) +
            p("Ja jums ir kāds ieteikums vai jautājums, vienkārši atbildiet uz šo e-pastu – mēs labprāt uzklausīsim."),
          `<a href="${escape(`${site.url}/katalogs`)}" style="display:inline-block;padding:12px 20px;background:#333333;color:#ffffff;text-decoration:none;border-radius:2px">Gaidīsim jūs atkal</a>`,
        ]),
      };
  }
}
