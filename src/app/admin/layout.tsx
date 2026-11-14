import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdmin } from "@/server/auth/session";
import { ADD_PASSKEY_HREF, COOKIE } from "@/server/auth/cognito";
import { site } from "@/config/site";
import s from "./layout.module.scss";

export const metadata: Metadata = {
  title: { default: "Administrācija", template: "%s | Administrācija" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const passkeyDone = (await cookies()).has(COOKIE.passkey);

  return (
    <>
      <header className={s.header}>
        <Link href="/admin" className={s.brand}>
          {site.name} · administrācija
        </Link>
        <nav className={s.nav}>
          <Link href="/admin/pasutijumi">Pasūtījumi</Link>
          <Link href="/admin/produkti">Produkti</Link>
          <Link href="/admin/kategorijas">Kategorijas</Link>
          <Link href="/admin/darba-laiks">Darba laiks</Link>
          <Link href="/" target="_blank">
            Veikals ↗
          </Link>
        </nav>
        {!passkeyDone && (
          <a href={ADD_PASSKEY_HREF} className={s.passkey}>
            Pievienot piekļuves atslēgu
          </a>
        )}
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
