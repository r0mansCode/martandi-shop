import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Invoice, InvoiceLogo, Order, OrderTotals } from "@/lib/types";
import { formatPrice, lineNetCents } from "@/lib/money";
import { formatDate, formatQty } from "@/lib/format";
import { site } from "@/config/site";
import { hoursLine, type PickupInfo } from "@/lib/shop-hours";
import { seller } from "@/config/seller";

// A4 invoices (rēķins): one layout for shop orders (VAT-inclusive prices, pickup notes) and
// manual invoices (net prices, optional extra columns and signature lines). Each builds an
// InvoiceDoc, and renderDoc draws it. Roboto is embedded because the built-in PDF fonts can't
// render ā, č, ē, ģ, ī, ķ, ļ, ņ, š, ū, ž. The fonts live outside /public and are included in
// the server bundle via next.config.ts.

const FONTS = path.join(process.cwd(), "assets", "fonts");
const REGULAR = path.join(FONTS, "Roboto-Regular.ttf");
const BOLD = path.join(FONTS, "Roboto-Bold.ttf");
// The shop logo is the storefront's own file; all are traced into the server bundle in next.config.ts.
const LOGOS: Record<InvoiceLogo, string> = {
  tavidzerieni: path.join(process.cwd(), "public", "logo.png"),
  martandi: path.join(process.cwd(), "assets", "logos", "martandi.png"),
};
const LOGO_HEIGHT = 56;

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT = "#333333";
const MUTED = "#757575";
const LINE = "#d9d9d9";

type Doc = PDFKit.PDFDocument;

/** An item-table column; one column has no width and takes what the others leave. */
type Column = { title: string; width?: number; align?: "right" | "center" };

type InvoiceDoc = {
  invoiceNumber: string;
  /** ISO timestamp or YYYY-MM-DD. */
  date: string;
  dueDate?: string;
  orderNumber?: string;
  /** Shop orders always carry the shop logo. */
  logo?: InvoiceLogo;
  buyerLines: string[];
  columns: Column[];
  /** One cell per column. */
  rows: string[][];
  totals: OrderTotals;
  vatRate: number;
  notes: { title: string; body: string }[];
  signatures: boolean;
};

export function invoiceFilename(invoice: { invoiceNumber: string }): string {
  return `Rekins-${invoice.invoiceNumber}.pdf`;
}

const sellerLines = [
  seller.name,
  `Reģ. Nr. ${seller.regNo}`,
  `PVN Nr. ${seller.vatNo}`,
  seller.address,
  `Banka: ${seller.bank}`,
  `SWIFT: ${seller.swift}`,
  `Konts: ${seller.iban}`,
];

const depositName = (name: string) => `Depozīts par iepakojumu (PVN 0%) – ${name}`;

const paymentNote = (grossCents: number, invoiceNumber: string, dueDate?: string) => ({
  title: "Apmaksa",
  body:
    `Lūdzam apmaksāt ${formatPrice(grossCents)}${dueDate ? ` līdz ${formatDate(dueDate)}` : ""} ar bankas ` +
    `pārskaitījumu uz kontu ${seller.iban} (${seller.bank}, SWIFT ${seller.swift}), saņēmējs ${seller.name}. ` +
    `Maksājuma mērķī norādiet rēķina numuru ${invoiceNumber}.`,
});

// ---- Shop orders ----

/** `pickup` gives the current opening hours; a temporary closure is left off the permanent invoice. */
export function renderInvoicePdf(order: Order, pickup: PickupInfo): Promise<Buffer> {
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

  // The packaging deposit is a line of its own right under its product: it is VAT-free (0%)
  // and must not read as part of the product's VAT-inclusive price.
  const lines = order.items.flatMap((item) => {
    const name = `${item.name}, ${item.variantLabel}`;
    return [
      { name, qty: item.qty, unitCents: item.unitPriceCents },
      ...(item.depositCents ? [{ name: depositName(name), qty: item.qty, unitCents: item.depositCents }] : []),
    ];
  });

  const hours = hoursLine(pickup.hours, ", ");
  return renderDoc({
    invoiceNumber: order.invoiceNumber,
    date: order.createdAt,
    dueDate: order.dueDate,
    buyerLines,
    columns: [
      { title: "Nr.", width: 24 },
      { title: "Prece" },
      { title: "Daudz.", width: 50, align: "right" },
      { title: "Cena ar PVN", width: 90, align: "right" },
      { title: "Summa ar PVN", width: CONTENT_WIDTH - 400, align: "right" },
    ],
    rows: lines.map((l, i) => [
      String(i + 1),
      l.name,
      String(l.qty),
      formatPrice(l.unitCents),
      formatPrice(l.unitCents * l.qty),
    ]),
    totals: order.totals,
    vatRate: site.vatRate,
    notes: [
      paymentNote(order.totals.grossCents, order.invoiceNumber, order.dueDate),
      {
        title: "Saņemšana",
        body:
          `Pasūtījumu varēs saņemt veikalā ${order.pickupLocation} pēc apmaksas saņemšanas. Darba laiks: ${hours}.` +
          (order.ageConfirmedAt
            ? ` Alkoholiskos dzērienus izsniedz tikai personām no ${site.minimumAge} gadu vecuma, ` +
              "uzrādot personu apliecinošu dokumentu."
            : ""),
      },
    ],
    signatures: false,
  });
}

// ---- Manual invoices ----

export function renderManualInvoicePdf(invoice: Invoice): Promise<Buffer> {
  const c = invoice.customer;
  const labelled = (label: string, value: string) => (value ? [`${label} ${value}`] : []);
  const plain = (value: string) => (value ? [value] : []);
  const buyerLines =
    c.type === "company"
      ? [
          c.name,
          ...labelled("Reģ. Nr.", c.regNo),
          ...labelled("PVN Nr.", c.vatNo),
          ...plain(c.address),
          ...labelled("Banka:", c.bank),
          ...labelled("SWIFT:", c.swift),
          ...labelled("Konts:", c.iban),
          ...labelled("Kontaktpersona:", c.contactPerson),
          ...plain(c.email),
          ...plain(c.phone),
        ]
      : [
          c.name,
          ...labelled("Personas kods:", c.personalCode),
          ...plain(c.address),
          ...labelled("Banka:", c.bank),
          ...labelled("Konts:", c.iban),
          ...plain(c.email),
          ...plain(c.phone),
        ];

  const columns: Column[] = [
    { title: "Nr.", width: 24 },
    { title: "Prece" },
    { title: "Mērv.", width: 36, align: "center" as const },
    { title: "Daudz.", width: 46, align: "right" as const },
    { title: "Cena bez PVN", width: 72, align: "right" as const },
    { title: "Summa bez PVN", width: 78, align: "right" as const },
  ];

  // Deposits as their own VAT-free row under the product, as on order invoices.
  let n = 0;
  const rows = invoice.lines.flatMap((l) => {
    const row = (name: string, unitCents: number) => [
      String(++n),
      name,
      l.unit,
      formatQty(l.qty),
      formatPrice(unitCents),
      formatPrice(lineNetCents(unitCents, l.qty)),
    ];
    return [
      row(l.name, l.unitNetCents),
      ...(l.depositCents ? [row(depositName(l.name), l.depositCents)] : []),
    ];
  });

  const dueDate = invoice.hideDueDate ? undefined : invoice.dueDate;
  return renderDoc({
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.issueDate,
    dueDate,
    orderNumber: invoice.orderNumber,
    logo: invoice.logo,
    buyerLines,
    columns,
    rows,
    totals: invoice.totals,
    vatRate: invoice.vatRate,
    notes: [paymentNote(invoice.totals.grossCents, invoice.invoiceNumber, dueDate)],
    signatures: invoice.includeSignatures,
  });
}

// ---- Layout ----

function renderDoc(inv: InvoiceDoc): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: { Title: `Rēķins ${inv.invoiceNumber}`, Author: seller.name },
  });
  doc.registerFont("regular", REGULAR);
  doc.registerFont("bold", BOLD);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(doc, inv);
  drawParties(doc, inv.buyerLines);
  const cols = layoutColumns(inv.columns);
  drawItems(doc, cols, inv.rows);
  drawTotals(doc, cols.at(-1)!, inv.totals, inv.vatRate);
  drawNotes(doc, inv.notes);
  if (inv.signatures) drawSignatures(doc);
  else drawUnsignedNote(doc);
  doc.end();

  return done;
}

type PlacedColumn = Column & { x: number; width: number };

function layoutColumns(columns: Column[]): PlacedColumn[] {
  const fixed = columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
  let x = MARGIN;
  return columns.map((c) => {
    const placed = { ...c, x, width: c.width ?? CONTENT_WIDTH - fixed };
    x += placed.width;
    return placed;
  });
}

function rule(doc: Doc, y: number, color = LINE) {
  doc.save().moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(0.75).strokeColor(color).stroke().restore();
}

function drawHeader(doc: Doc, inv: InvoiceDoc) {
  const top = MARGIN;
  doc.image(LOGOS[inv.logo ?? "tavidzerieni"], MARGIN, top, { height: LOGO_HEIGHT });

  const right = { x: MARGIN + CONTENT_WIDTH / 2, width: CONTENT_WIDTH / 2, align: "right" as const };
  doc.font("bold").fontSize(18).fillColor(TEXT).text("RĒĶINS", right.x, top, right);
  doc
    .font("regular")
    .fontSize(10)
    .text(`Nr. ${inv.invoiceNumber}`, right.x, doc.y + 4, right)
    .text(`Datums: ${formatDate(inv.date)}`, right);
  if (inv.dueDate) doc.text(`Apmaksāt līdz: ${formatDate(inv.dueDate)}`, right);
  if (inv.orderNumber) doc.text(`Pasūtījuma Nr.: ${inv.orderNumber}`, right);

  doc.y = Math.max(doc.y, top + LOGO_HEIGHT) + 16;
  rule(doc, doc.y);
  doc.y += 18;
}

function drawParties(doc: Doc, buyerLines: string[]) {
  const top = doc.y;
  const colWidth = CONTENT_WIDTH / 2 - 15;
  const rightX = MARGIN + CONTENT_WIDTH / 2 + 15;

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

function drawTableHeader(doc: Doc, cols: PlacedColumn[]) {
  const y = doc.y;
  doc.font("bold").fontSize(9).fillColor(MUTED);
  for (const c of cols) doc.text(c.title, c.x, y, { width: c.width, align: c.align });
  doc.y = y + 16;
  rule(doc, doc.y, TEXT);
  doc.y += 8;
}

function drawItems(doc: Doc, cols: PlacedColumn[], rows: string[][]) {
  drawTableHeader(doc, cols);
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;

  for (const cells of rows) {
    doc.font("regular").fontSize(10);
    // Any text column may wrap; the tallest cell sets the row height.
    const height = Math.max(12, ...cells.map((text, i) => doc.heightOfString(text, { width: cols[i].width })));

    if (doc.y + height > bottomLimit) {
      doc.addPage();
      drawTableHeader(doc, cols);
    }

    // Set again: the repeated table header on a new page switches to its own font.
    const y = doc.y;
    doc.font("regular").fontSize(10).fillColor(TEXT);
    cells.forEach((text, i) => doc.text(text, cols[i].x, y, { width: cols[i].width, align: cols[i].align }));

    doc.y = y + height + 6;
    rule(doc, doc.y);
    doc.y += 6;
  }
}

function drawTotals(doc: Doc, amountCol: PlacedColumn, totals: OrderTotals, vatRate: number) {
  // Keep the totals block together.
  if (doc.y + 85 > doc.page.height - doc.page.margins.bottom) doc.addPage();

  const labelWidth = 170;
  const labelX = amountCol.x - labelWidth;
  const { netCents, vatCents, depositCents, grossCents } = totals;
  // Net + VAT covers the goods; the deposit is outside VAT, so it is its own row.
  const rows: [string, string, boolean][] = [
    [depositCents ? "Preces bez PVN" : "Summa bez PVN", formatPrice(netCents), false],
    [`PVN ${Math.round(vatRate * 100)}%`, formatPrice(vatCents), false],
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
      .text(value, amountCol.x, y, { width: amountCol.width, align: "right" });
    doc.y = y + (strong ? 18 : 15);
  }
  doc.y += 14;
}

function drawNotes(doc: Doc, notes: InvoiceDoc["notes"]) {
  for (const { title, body } of notes) {
    doc.font("bold").fontSize(10).fillColor(TEXT).text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.2);
    doc.font("regular").fontSize(9.5).fillColor(TEXT).text(body, { width: CONTENT_WIDTH, lineGap: 1.5 });
    doc.moveDown(0.9);
  }
}

function drawUnsignedNote(doc: Doc) {
  doc
    .font("regular")
    .fontSize(8.5)
    .fillColor(MUTED)
    .text("Rēķins sagatavots elektroniski un ir derīgs bez paraksta.", MARGIN, doc.y + 6, {
      width: CONTENT_WIDTH,
      align: "center",
    });
}

/** „Preci izsniedza” / „Preci saņēma” lines, for goods handed over against a signature. */
function drawSignatures(doc: Doc) {
  const blockHeight = 80;
  if (doc.y + blockHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();

  const top = doc.y + 24;
  const width = CONTENT_WIDTH / 2 - 30;
  const lineY = top + 40;
  for (const [label, x] of [
    ["Preci izsniedza", MARGIN],
    ["Preci saņēma", MARGIN + CONTENT_WIDTH / 2 + 30],
  ] as const) {
    doc.font("regular").fontSize(10).fillColor(TEXT).text(label, x, top, { width });
    doc.save().moveTo(x, lineY).lineTo(x + width, lineY).lineWidth(0.75).strokeColor(TEXT).stroke().restore();
    doc.font("regular").fontSize(8).fillColor(MUTED).text("(paraksts, atšifrējums)", x, lineY + 4, { width });
  }
  doc.x = MARGIN;
  doc.y = lineY + 20;
}
