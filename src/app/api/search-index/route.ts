import { getCategories, getVisibleProducts } from "@/server/catalog";
import { fromPriceCents, activeVariants } from "@/lib/money";
import { buildHaystack, type SearchEntry } from "@/lib/search";

// Static JSON, refreshed by time-based ISR, because Amplify ignores the admin's revalidatePath().
export const dynamic = "force-static";
export const revalidate = 60;

export async function GET() {
  const [products, categories] = await Promise.all([getVisibleProducts(), getCategories()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const entries: SearchEntry[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    image: p.images[0]?.url ?? null,
    fromPriceCents: fromPriceCents(p) ?? 0,
    hasVariants: activeVariants(p).length > 1,
    haystack: buildHaystack(p, categoryName.get(p.categoryId)),
  }));

  return Response.json(entries);
}
