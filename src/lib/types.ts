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
  qty: number;
};

export type OrderTotals = {
  netCents: number;
  vatCents: number;
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
  paidAt?: string;
  readyAt?: string;
  collectedAt?: string;
  cancelledAt?: string;
};
