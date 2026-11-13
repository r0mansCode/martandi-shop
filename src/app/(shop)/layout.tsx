import { getCategories } from "@/server/catalog";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { pickup } from "@/config/site";
import s from "./layout.module.scss";

// Amplify Hosting does not support on-demand revalidation: revalidatePath() from the admin
// never reaches the cached pages there. Time-based ISR is what actually refreshes the
// storefront after catalog edits. The lowest value in a route wins, so this covers every
// page below this layout.
export const revalidate = 60;

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const categories = await getCategories();

  return (
    <>
      <p className={s.announcement}>
        Saņemšana tikai veikalā – {pickup.address} · ar personu apliecinošu dokumentu
      </p>
      <Header categories={categories} />
      <main className={s.main}>{children}</main>
      <Footer categories={categories} />
    </>
  );
}
