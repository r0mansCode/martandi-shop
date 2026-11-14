import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { site } from "@/config/site";
import { hoursLine, type PickupInfo } from "@/lib/shop-hours";
import { seller } from "@/config/seller";

// A4 invoice (rēķins) for one order. Prices include VAT; the VAT breakdown is shown in the
// totals. Roboto is embedded because the built-in PDF fonts can't render ā, č, ē, ģ, ī, ķ, ļ, ņ, š, ū, ž.
// The fonts live outside /public and are included in the server bundle via next.config.ts.

const FONTS = path.join(process.cwd(), "assets", "fonts");
const REGULAR = path.join(FONTS, "Roboto-Regular.ttf");
const BOLD = path.join(FONTS, "Roboto-Bold.ttf");

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT = "#333333";
const MUTED = "#757575";
const LINE = "#d9d9d9";

// Item table columns: x position and width.
const COL = {
  no: { x: MARGIN, w: 24 },
  name: { x: MARGIN + 24, w: 236 },
  qty: { x: MARGIN + 260, w: 50 },
  price: { x: MARGIN + 310, w: 90 },
  total: { x: MARGIN + 400, w: CONTENT_WIDTH - 400 },
};

type Doc = PDFKit.PDFDocument;

export function invoiceFilename(order: Order): string {
  return `Rekins-${order.invoiceNumber}.pdf`;
}

/** `pickup` gives the current opening hours; a temporary closure is left off the permanent invoice. */
export function renderInvoicePdf(order: Order, pickup: PickupInfo): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: { Title: `Rēķins ${order.invoiceNumber}`, Author: seller.name },
  });
  doc.registerFont("regular", REGULAR);
  doc.registerFont("bold", BOLD);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(doc, order);
  drawParties(doc, order);
  drawItems(doc, order);
  drawTotals(doc, order);
  drawNotes(doc, order, pickup);
  doc.end();

  return done;
}

function rule(doc: Doc, y: number, color = LINE) {
  doc.save().moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(0.75).strokeColor(color).stroke().restore();
}

function drawHeader(doc: Doc, order: Order) {
  const top = MARGIN;
  doc.font("bold").fontSize(18).fillColor(TEXT).text(site.name, MARGIN, top);

  const right = { x: MARGIN + CONTENT_WIDTH / 2, width: CONTENT_WIDTH / 2, align: "right" as const };
  doc.font("bold").fontSize(18).text("RĒĶINS", right.x, top, right);
  doc
    .font("regular")
    .fontSize(10)
    .text(`Nr. ${order.invoiceNumber}`, right.x, doc.y + 4, right)
    .text(`Datums: ${formatDate(order.createdAt)}`, right)
    .text(`Apmaksāt līdz: ${formatDate(order.dueDate)}`, right);

  doc.y += 16;
  rule(doc, doc.y);
  doc.y += 18;
}

function drawParties(doc: Doc, order: Order) {
  const top = doc.y;
  const colWidth = CONTENT_WIDTH / 2 - 15;
  const rightX = MARGIN + CONTENT_WIDTH / 2 + 15;

  const sellerLines = [
    seller.name,
    `Reģ. Nr. ${seller.regNo}`,
    `PVN Nr. ${seller.vatNo}`,
    seller.address,
    `Banka: ${seller.bank}`,
    `SWIFT: ${seller.swift}`,
    `Konts: ${seller.iban}`,
  ];

  const { customer, company } = order;
  const buyerLines = company
    ? [
        company.name,
        `Reģ. Nr. ${company.regNo}`,
        ...(company.vatNo ? [`PVN Nr. ${company.vatNo}`] : []),
        company.legalAddress,
        `Kontaktpersona: ${customer.name}`,
        customer.email,
        customer.phone,
      ]
    : [customer.name, customer.email, customer.phone];

  const column = (title: string, lines: string[], x: number) => {
    doc.font("bold").fontSize(9).fillColor(MUTED).text(title.toUpperCase(), x, top, { width: colWidth });
    doc.moveDown(0.3);
    lines.forEach((line, i) => {
      doc
        .font(i === 0 ? "bold" : "regular")
        .fontSize(10)
        .fillColor(TEXT)
        .text(line, x, doc.y, { width: colWidth });
    });
    return doc.y;
  };

  const leftBottom = column("Pārdevējs", sellerLines, MARGIN);
  const rightBottom = column("Pircējs", buyerLines, rightX);
  doc.y = Math.max(leftBottom, rightBottom) + 24;
}

function drawTableHeader(doc: Doc) {
  const y = doc.y;
  doc.font("bold").fontSize(9).fillColor(MUTED);
  doc.text("Nr.", COL.no.x, y, { width: COL.no.w });
  doc.text("Prece", COL.name.x, y, { width: COL.name.w });
  doc.text("Daudz.", COL.qty.x, y, { width: COL.qty.w, align: "right" });
  doc.text("Cena ar PVN", COL.price.x, y, { width: COL.price.w, align: "right" });
  doc.text("Summa ar PVN", COL.total.x, y, { width: COL.total.w, align: "right" });
  doc.y = y + 16;
  rule(doc, doc.y, TEXT);
  doc.y += 8;
}

function drawItems(doc: Doc, order: Order) {
  drawTableHeader(doc);
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;

  // The packaging deposit is a line of its own right under its product: it is VAT-free (0%)
  // and must not read as part of the product's VAT-inclusive price.
  const rows = order.items.flatMap((item) => [
    { name: `${item.name}, ${item.variantLabel}`, qty: item.qty, unitCents: item.unitPriceCents },
    ...(item.depositCents
      ? [
          {
            name: `Depozīts par iepakojumu (PVN 0%) – ${item.name}, ${item.variantLabel}`,
            qty: item.qty,
            unitCents: item.depositCents,
          },
        ]
      : []),
  ]);

  rows.forEach((row, i) => {
    const { name } = row;
    doc.font("regular").fontSize(10);
    const height = Math.max(doc.heightOfString(name, { width: COL.name.w }), 12);

    if (doc.y + height > bottomLimit) {
      doc.addPage();
      drawTableHeader(doc);
    }

    // Set again: the repeated table header on a new page switches to its own font.
    const y = doc.y;
    doc.font("regular").fontSize(10).fillColor(TEXT);
    doc.text(String(i + 1), COL.no.x, y, { width: COL.no.w });
    doc.text(name, COL.name.x, y, { width: COL.name.w });
    doc.text(String(row.qty), COL.qty.x, y, { width: COL.qty.w, align: "right" });
    doc.text(formatPrice(row.unitCents), COL.price.x, y, { width: COL.price.w, align: "right" });
    doc.text(formatPrice(row.unitCents * row.qty), COL.total.x, y, { width: COL.total.w, align: "right" });

    doc.y = y + height + 6;
    rule(doc, doc.y);
    doc.y += 6;
  });
}

function drawTotals(doc: Doc, order: Order) {
  // Keep the totals block together.
  if (doc.y + 85 > doc.page.height - doc.page.margins.bottom) doc.addPage();

  const labelX = MARGIN + 230;
  const labelWidth = 170;
  const { netCents, vatCents, depositCents, grossCents } = order.totals;
  // Net + VAT covers the goods; the deposit is outside VAT, so it is its own row.
  const rows: [string, string, boolean][] = [
    [depositCents ? "Preces bez PVN" : "Summa bez PVN", formatPrice(netCents), false],
    [`PVN ${Math.round(site.vatRate * 100)}%`, formatPrice(vatCents), false],
    ...(depositCents ? [["Depozīts (PVN 0%)", formatPrice(depositCents), false] as [string, string, boolean]] : []),
    ["Kopā apmaksai", formatPrice(grossCents), true],
  ];

  doc.y += 4;
  for (const [label, value, strong] of rows) {
    const y = doc.y;
    doc
      .font(strong ? "bold" : "regular")
      .fontSize(strong ? 12 : 10)
      .fillColor(TEXT)
      .text(label, labelX, y, { width: labelWidth, align: "right" })
      .text(value, COL.total.x, y, { width: COL.total.w, align: "right" });
    doc.y = y + (strong ? 18 : 15);
  }
  doc.y += 14;
}

function drawNotes(doc: Doc, order: Order, pickup: PickupInfo) {
  const section = (title: string, body: string) => {
    doc.font("bold").fontSize(10).fillColor(TEXT).text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.2);
    doc.font("regular").fontSize(9.5).fillColor(TEXT).text(body, { width: CONTENT_WIDTH, lineGap: 1.5 });
    doc.moveDown(0.9);
  };

  section(
    "Apmaksa",
    `Lūdzam apmaksāt ${formatPrice(order.totals.grossCents)} līdz ${formatDate(order.dueDate)} ar bankas ` +
      `pārskaitījumu uz kontu ${seller.iban} (${seller.bank}, SWIFT ${seller.swift}), saņēmējs ${seller.name}. ` +
      `Maksājuma mērķī norādiet rēķina numuru ${order.invoiceNumber}.`,
  );

  const hours = hoursLine(pickup.hours, ", ");
  section(
    "Saņemšana",
    `Pasūtījumu varēs saņemt veikalā ${order.pickupLocation} pēc apmaksas saņemšanas. Darba laiks: ${hours}.` +
      (order.ageConfirmedAt
        ? ` Alkoholiskos dzērienus izsniedz tikai personām no ${site.minimumAge} gadu vecuma, ` +
          "uzrādot personu apliecinošu dokumentu."
        : ""),
  );

  doc
    .font("regular")
    .fontSize(8.5)
    .fillColor(MUTED)
    .text("Rēķins sagatavots elektroniski un ir derīgs bez paraksta.", MARGIN, doc.y + 6, {
      width: CONTENT_WIDTH,
      align: "center",
    });
}
