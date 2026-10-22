import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import s from "./layout.module.scss";

export const metadata: Metadata = {
  title: { default: "Administrācija", template: "%s | Administrācija" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <>
      <header className={s.header}>
        <Link href="/admin" className={s.brand}>
          Martandi · administrācija
        </Link>
        <nav className={s.nav}>
          <Link href="/admin/produkti">Produkti</Link>
          <Link href="/admin/kategorijas">Kategorijas</Link>
          <Link href="/" target="_blank">
            Veikals ↗
          </Link>
        </nav>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className={s.logout}>
            Iziet
          </button>
        </form>
      </header>
      <main className={s.main}>{children}</main>
    </>
  );
}
