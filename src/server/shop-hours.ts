import "server-only";
import { cache } from "react";
import { db } from "./db";
import { pickup } from "@/config/site";
import { toDayKey } from "@/lib/format";
import { closureText, groupHours, shopHoursInput, type PickupInfo, type ShopHours } from "@/lib/shop-hours";

const KEY = "shop-hours";

export const defaultShopHours: ShopHours = { week: pickup.defaultWeek, closedFrom: "", closedTo: "" };

/** Stored hours, or the defaults from config when nothing (valid) is saved yet. */
export async function getShopHours(): Promise<ShopHours> {
  const parsed = shopHoursInput.safeParse(await db.settings.get(KEY));
  return parsed.success ? parsed.data : defaultShopHours;
}

export async function saveShopHours(hours: ShopHours): Promise<void> {
  await db.settings.put(KEY, hours);
}

/**
 * Hours rows and the current closure sentence for the storefront, emails and the invoice.
 * Cached per request: the shop layout and the page both ask for it.
 */
export const getPickupInfo = cache(async (): Promise<PickupInfo> => {
  const hours = await getShopHours();
  return { hours: groupHours(hours.week), closure: closureText(hours, todayKey()) };
});

/** Today in Riga, "YYYY-MM-DD". A function so pages don't read the clock during render. */
export const todayKey = () => toDayKey(new Date());
