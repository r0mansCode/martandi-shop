import { getCategories } from "@/server/catalog";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { pickup } from "@/config/site";
import s from "./layout.module.scss";

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
