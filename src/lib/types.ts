// Domain types. The mock store and the DynamoDB store both persist exactly these shapes.

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type ProductImage = {
  url: string;
  alt: string;
};

export type Variant = {
  id: string;
  /** Shown to the customer, e.g. "0,7 l". */
  label: string;
  /** Price including VAT, in euro cents. */
  priceCents: number;
  active: boolean;
  /** Optional variant-specific image (must also be in product.images). */
  image?: string;
  /**
   * Packaging deposit (depozīts) per unit, in euro cents; unset means none. VAT-free and charged
   * on top of the price. Per variant rather than per product: sizes can come in different packaging.
   */
  depositCents?: number;
};

export type ProductStatus = "draft" | "published";
export type ProductBadge = "Jaunums" | "Populārs";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** "" = unsorted („Bez kategorijas”), e.g. after its category was deleted. Hidden from the storefront. */
  categoryId: string;
  images: ProductImage[];
  status: ProductStatus;
  /** Drives the pickup-only + 18+ requirements. */
  isAlcohol: boolean;
  badge?: ProductBadge;
  /** Alcohol by volume, %. */
  abv?: number;
  country?: string;
  producer?: string;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "ready_for_pickup"
  | "collected"
  | "cancelled";

export type BuyerType = "private" | "company";
export type PaymentMethod = "bank_transfer" | "stripe";

export type Customer = {
  name: string;
  email: string;
  phone: string;
};

export type CompanyDetails = {
  name: string;
  regNo: string;
  vatNo?: string;
  legalAddress: string;
};

/** Snapshot of a cart line at order time; later product edits don't change it. */
export type OrderItem = {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  unitPriceCents: number;
  /** Packaging deposit per unit (0% VAT), charged on top of unitPriceCents. */
  depositCents?: number;
  qty: number;
};

export type OrderTotals = {
  /** Goods without VAT. netCents + vatCents is the VAT-inclusive goods total. */
  netCents: number;
  vatCents: number;
  /** Packaging deposits, outside VAT; unset when the order has none. */
  depositCents?: number;
  /** Amount payable: goods with VAT plus deposits. */
  grossCents: number;
};

export type Order = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  status: OrderStatus;
  customer: Customer;
  buyerType: BuyerType;
  company?: CompanyDetails;
  items: OrderItem[];
  totals: OrderTotals;
  /** Set when the order contains alcohol and the buyer confirmed 18+. */
  ageConfirmedAt?: string;
  pickupLocation: string;
  paymentMethod: PaymentMethod;
  /** When the invoice email was accepted by the mail provider; unset if sending failed. */
  invoiceEmailedAt?: string;
  /** When the customer was emailed about each status change (paid, ready, collected). */
  statusEmailedAt?: Partial<Record<OrderStatus, string>>;
  paidAt?: string;
  readyAt?: string;
  collectedAt?: string;
  cancelledAt?: string;
};

// Manual invoices (rēķini): issued by the admin outside the shop checkout, e.g. to companies.
// They share the MRT-YYYY-NNNNN number sequence with order invoices.

/** A customer in the manual-invoice directory. Empty string = not given. */
export type InvoiceCustomer = {
  id: string;
  type: BuyerType;
  name: string;
  /** Private persons only. */
  personalCode: string;
  /** Companies only. */
  regNo: string;
  vatNo: string;
  address: string;
  bank: string;
  swift: string;
  iban: string;
  email: string;
  phone: string;
  /** Companies only. */
  contactPerson: string;
  createdAt: string;
  updatedAt: string;
};

/** The customer as printed on an invoice; later edits to the customer don't change it. */
export type InvoiceCustomerSnapshot = Omit<InvoiceCustomer, "createdAt" | "updatedAt">;

export type InvoiceLine = {
  /** Set when the line was picked from the catalog; free-text lines have neither. */
  productId?: string;
  variantId?: string;
  name: string;
  /** Unit of measure, e.g. "gb". */
  unit: string;
  /** Up to 3 decimals. */
  qty: number;
  /** Price per unit without VAT: manual invoices are net-priced (B2B). */
  unitNetCents: number;
  /** Packaging deposit per unit (0% VAT), a row of its own on the PDF. */
  depositCents?: number;
};

export type InvoiceStatus = "unpaid" | "paid";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  /** Calendar days, YYYY-MM-DD. */
  issueDate: string;
  dueDate: string;
  /** Leaves the due date off the PDF (e.g. already paid in cash). */
  hideDueDate: boolean;
  orderNumber?: string;
  status: InvoiceStatus;
  paidAt?: string;
  /** 0.21 or 0. */
  vatRate: number;
  customerId: string;
  customer: InvoiceCustomerSnapshot;
  lines: InvoiceLine[];
  totals: OrderTotals;
  /** Adds „Preci izsniedza” / „Preci saņēma” signature lines instead of „derīgs bez paraksta”. */
  includeSignatures: boolean;
  createdAt: string;
  updatedAt: string;
};
