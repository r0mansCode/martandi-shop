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
