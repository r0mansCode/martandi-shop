import { getCategories } from "@/server/catalog";
import { getPickupInfo } from "@/server/shop-hours";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PickupInfoProvider } from "@/components/layout/PickupHours";
import s from "./layout.module.scss";

// Amplify Hosting does not support on-demand revalidation: revalidatePath() from the admin
// never reaches the cached pages there. Time-based ISR is what actually refreshes the
// storefront after catalog edits. The lowest value in a route wins, so this covers every
// page below this layout.
export const revalidate = 60;

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [categories, pickupInfo] = await Promise.all([getCategories(), getPickupInfo()]);

  return (
    <PickupInfoProvider value={pickupInfo}>
      {pickupInfo.closure && <p className={`${s.announcement} ${s.closure}`}>{pickupInfo.closure}</p>}
      <Header categories={categories} />
      <main className={s.main}>{children}</main>
      <Footer categories={categories} pickupInfo={pickupInfo} />
    </PickupInfoProvider>
  );
}
