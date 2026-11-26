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

  // .shell re-points the storefront tokens to the admin palette, so every admin module
  // picks it up without its own colour values.
  return (
    <div className={s.shell}>
      <header className={s.topbar}>
        <div className={s.topbarInner}>
          <Link href="/admin" className={s.brand}>
            <span className={s.brandMark} aria-hidden="true">
              {site.name.charAt(0)}
            </span>
            <span>
              {site.name}
              <small>Administrācija</small>
            </span>
          </Link>
          <nav className={s.nav} aria-label="Sadaļas">
            <Link href="/admin/pasutijumi">Pasūtījumi</Link>
            <Link href="/admin/rekini">Rēķini</Link>
            <Link href="/admin/produkti">Produkti</Link>
            <Link href="/admin/kategorijas">Kategorijas</Link>
            <Link href="/admin/darba-laiks">Darba laiks</Link>
          </nav>
          <div className={s.tools}>
            <Link href="/" target="_blank" className={s.toolLink}>
              Veikals ↗
            </Link>
            {!passkeyDone && (
              <a href={ADD_PASSKEY_HREF} className={s.toolLink}>
                Pievienot piekļuves atslēgu
              </a>
            )}
            <form action="/api/auth/logout" method="post">
              <button type="submit" className={s.logout}>
                Iziet
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className={s.main}>{children}</main>
    </div>
  );
}
