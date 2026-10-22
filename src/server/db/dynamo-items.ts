import type { Category, Order, Product } from "@/lib/types";

// Single-table layout shared by the Dynamo store and scripts/seed-dynamo.ts.
// No "server-only" here so the seed script can import it outside Next.
//
//   Item      PK                 SK      GSI1PK      GSI1SK
//   Category  CATEGORY#<id>      META    CATEGORY    <slug>
//   Product   PRODUCT#<id>       META    PRODUCT     <slug>
//   Order     ORDER#<id>         META    ORDER       <createdAt>#<id>
//   Counter   COUNTER#<key>      META    -           -
//
// GSI1 (projection ALL) serves list() and getBySlug(); orders sort newest first on GSI1SK.

export const GSI1 = "GSI1";
export const META = "META";

export type EntityType = "CATEGORY" | "PRODUCT" | "ORDER";

const KEY_ATTRS = ["PK", "SK", "GSI1PK", "GSI1SK"] as const;

export const pk = (type: EntityType | "COUNTER", id: string) => `${type}#${id}`;

export const categoryItem = (c: Category) => ({
  ...c,
  PK: pk("CATEGORY", c.id),
  SK: META,
  GSI1PK: "CATEGORY",
  GSI1SK: c.slug,
});

export const productItem = (p: Product) => ({
  ...p,
  PK: pk("PRODUCT", p.id),
  SK: META,
  GSI1PK: "PRODUCT",
  GSI1SK: p.slug,
});

export const orderItem = (o: Order) => ({
  ...o,
  PK: pk("ORDER", o.id),
  SK: META,
  GSI1PK: "ORDER",
  GSI1SK: `${o.createdAt}#${o.id}`,
});

/** Strips the key attributes, leaving the domain object. */
export function fromItem<T>(item: Record<string, unknown>): T {
  const rest = { ...item };
  for (const key of KEY_ATTRS) delete rest[key];
  return rest as T;
}
