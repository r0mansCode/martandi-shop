"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import {
  categoryInput,
  errorState,
  euroToCents,
  productInput,
  type FormState,
  type ProductFormState,
  type ProductFormValues,
} from "@/lib/catalog-input";
import type { Product, Variant } from "@/lib/types";

// Catalog edits. Each action re-checks the admin session itself (never trust the page that
// rendered the form), validates on the server, then refreshes every storefront page: the
// header menu, grids, search index and related products all read the catalog.

function refreshStorefront() {
  revalidatePath("/", "layout");
  // Static route handler; not covered by the layout revalidation above.
  revalidatePath("/api/search-index");
}

const fail = (message: string, errors: Record<string, string> = {}): FormState => ({
  ok: false,
  message,
  errors,
});

export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("product")));
  } catch {
    return fail("Neizdevās nolasīt formu. Pārlādējiet lapu un mēģiniet vēlreiz.");
  }
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) return errorState(parsed.error);
  const input = parsed.data;

  const existing = await db.products.getById(input.id);
  if (!existing) return fail("Produkts vairs neeksistē.");

  if (!(await db.categories.getById(input.categoryId))) {
    return fail("Pārbaudiet iezīmētos laukus.", { categoryId: "Kategorija neeksistē" });
  }
  const sameSlug = await db.products.getBySlug(input.slug);
  if (sameSlug && sameSlug.id !== existing.id) {
    return fail("Pārbaudiet iezīmētos laukus.", { slug: `Šo adresi jau izmanto „${sameSlug.name}”` });
  }

  const known = new Map(existing.variants.map((v) => [v.id, v]));
  if (input.variants.some((v) => v.id && !known.has(v.id))) {
    return fail("Tilpumi mainījušies citā logā. Pārlādējiet lapu.");
  }
  let nextNumber = Math.max(0, ...existing.variants.map((v) => Number(v.id.split("-v").pop()) || 0)) + 1;
  const variants: Variant[] = input.variants.map((v) => ({
    id: v.id || `${existing.id}-v${nextNumber++}`,
    label: v.label,
    priceCents: euroToCents(v.price),
    active: v.active,
    // Variant photos aren't edited here yet; keep the one it had.
    image: v.id ? known.get(v.id)?.image : undefined,
  }));

  const product: Product = {
    ...existing,
    name: input.name,
    slug: input.slug,
    description: input.description,
    categoryId: input.categoryId,
    status: input.status,
    isAlcohol: input.isAlcohol,
    badge: input.badge,
    abv: input.abv,
    country: input.country,
    producer: input.producer,
    variants,
    updatedAt: new Date().toISOString(),
  };
  await db.products.put(product);
  refreshStorefront();
  return {
    ok: true,
    message: "Saglabāts.",
    errors: {},
    values: {
      ...(raw as ProductFormValues),
      variants: variants.map((v, i) => ({ ...input.variants[i], id: v.id })),
    },
  };
}

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = categoryInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errorState(parsed.error);
  const input = parsed.data;

  if (!(await db.categories.getById(input.id))) return fail("Kategorija vairs neeksistē.");
  const sameSlug = await db.categories.getBySlug(input.slug);
  if (sameSlug && sameSlug.id !== input.id) {
    return fail("Pārbaudiet iezīmētos laukus.", { slug: `Šo adresi jau izmanto „${sameSlug.name}”` });
  }

  await db.categories.put(input);
  refreshStorefront();
  return { ok: true, message: "Saglabāts.", errors: {} };
}
