"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { createUploadUrl } from "@/server/images";
import { isImageType, MAX_IMAGE_BYTES } from "@/lib/product-images";
import {
  categoryInput,
  newCategoryInput,
  errorState,
  euroToCents,
  productInput,
  type FormState,
  type ProductFormState,
  type ProductFormValues,
} from "@/lib/catalog-input";
import type { Product, Variant } from "@/lib/types";
import { shopHoursInput, type ShopHours } from "@/lib/shop-hours";
import { saveShopHours } from "@/server/shop-hours";

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

  if (input.categoryId && !(await db.categories.getById(input.categoryId))) {
    return fail("Pārbaudiet iezīmētos laukus.", { categoryId: "Kategorija neeksistē" });
  }
  const sameSlug = await db.products.getBySlug(input.slug);
  if (sameSlug && sameSlug.id !== existing.id) {
    return fail("Pārbaudiet iezīmētos laukus.", { slug: `Šo adresi jau izmanto „${sameSlug.name}”` });
  }

  // Images: either ones the product already had, or new uploads into this product's folder.
  const ownUploads = `/products/${existing.id}/`;
  const hadImage = new Set(existing.images.map((i) => i.url));
  if (input.images.some((i) => !hadImage.has(i.url) && !new URL(i.url, "http://x").pathname.startsWith(ownUploads))) {
    return fail("Nederīgs attēls. Pārlādējiet lapu un augšupielādējiet vēlreiz.");
  }
  const images = input.images.map((i) => ({ url: i.url, alt: i.alt }));
  const imageUrls = new Set(images.map((i) => i.url));

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
    // Variant photos aren't picked here yet; keep the one it had while that image still exists.
    image: v.id ? [known.get(v.id)?.image].find((url) => url && imageUrls.has(url)) : undefined,
    depositCents: v.hasDeposit ? euroToCents(v.deposit) : undefined,
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
    images,
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

  const sameSlug = await db.categories.getBySlug(input.slug);
  if (sameSlug && sameSlug.id !== input.id) {
    return fail("Pārbaudiet iezīmētos laukus.", { slug: `Šo adresi jau izmanto „${sameSlug.name}”` });
  }

  // Read right before writing so the position from the drag-and-drop list is kept.
  const existing = await db.categories.getById(input.id);
  if (!existing) return fail("Kategorija vairs neeksistē.");
  await db.categories.put({ ...existing, ...input });
  refreshStorefront();
  return { ok: true, message: "Saglabāts.", errors: {} };
}

/** Creates a category at the end of the menu, then opens the list with a confirmation. */
export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = newCategoryInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return errorState(parsed.error);
  const input = parsed.data;

  const categories = await db.categories.list();
  const sameSlug = categories.find((c) => c.slug === input.slug);
  if (sameSlug) {
    return fail("Pārbaudiet iezīmētos laukus.", { slug: `Šo adresi jau izmanto „${sameSlug.name}”` });
  }

  // Last in the menu; the drag-and-drop list moves it from there.
  const sortOrder = Math.max(0, ...categories.map((c) => c.sortOrder)) + 1;
  await db.categories.put({ id: crypto.randomUUID(), ...input, sortOrder });
  refreshStorefront();
  revalidatePath("/admin/kategorijas");
  redirect(`/admin/kategorijas?zina=izveidota&kategorija=${encodeURIComponent(input.name)}`);
}

export type ImageUpload = { uploadUrl: string; headers: Record<string, string>; url: string } | { error: string };

/**
 * Saves a new category order from the drag-and-drop list: `ids` top to bottom become
 * sortOrder 1, 2, 3… Only categories whose position changed are written.
 */
export async function reorderCategories(ids: string[]): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();

  const categories = await db.categories.list();
  const known = new Set(categories.map((c) => c.id));
  if (
    !Array.isArray(ids) ||
    ids.length !== categories.length ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => typeof id === "string" && known.has(id))
  ) {
    return { ok: false, message: "Kategoriju saraksts ir mainījies. Pārlādējiet lapu." };
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  await Promise.all(
    ids.map((id, i) => {
      const category = byId.get(id)!;
      return category.sortOrder === i + 1 ? null : db.categories.put({ ...category, sortOrder: i + 1 });
    }),
  );

  refreshStorefront();
  revalidatePath("/admin/kategorijas");
  return { ok: true, message: "Secība saglabāta." };
}

/**
 * Deletes a category. Its products become unsorted (categoryId ""), which hides them from the
 * storefront until the admin gives them a new category.
 */
export async function deleteCategory(id: string) {
  await requireAdmin();

  const category = await db.categories.getById(id);
  if (!category) redirect("/admin/kategorijas");

  // Products first: if this stops halfway, the category still exists and a retry finishes it.
  const inCategory = (await db.products.list()).filter((p) => p.categoryId === id);
  const now = new Date().toISOString();
  await Promise.all(inCategory.map((p) => db.products.put({ ...p, categoryId: "", updatedAt: now })));

  await db.categories.delete(id);
  refreshStorefront();
  revalidatePath("/admin/kategorijas");
  revalidatePath("/admin/produkti");
  redirect(
    `/admin/kategorijas?zina=dzesta&kategorija=${encodeURIComponent(category.name)}&skaits=${inCategory.length}`,
  );
}

/** Step 1 of an upload: a short-lived URL the browser PUTs the file to. Saving the product attaches it. */
export async function createImageUpload(productId: string, type: string, size: number): Promise<ImageUpload> {
  await requireAdmin();
  if (!isImageType(type)) return { error: "Atļauti tikai JPEG, PNG vai WebP attēli." };
  if (!Number.isInteger(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return { error: `Attēls nedrīkst būt lielāks par ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` };
  }
  if (!(await db.products.getById(productId))) return { error: "Produkts vairs neeksistē." };
  return createUploadUrl(productId, type, size);
}

/** Saves the opening hours and closure notice. Every storefront page shows them. */
export async function saveHours(_prev: FormState<ShopHours>, formData: FormData): Promise<FormState<ShopHours>> {
  await requireAdmin();

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("hours")));
  } catch {
    return fail("Neizdevās nolasīt formu. Pārlādējiet lapu un mēģiniet vēlreiz.");
  }
  const parsed = shopHoursInput.safeParse(raw);
  if (!parsed.success) return errorState(parsed.error);

  await saveShopHours(parsed.data);
  refreshStorefront();
  return { ok: true, message: "Saglabāts.", errors: {}, values: parsed.data };
}
