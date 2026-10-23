import Link from "next/link";
import { site } from "@/config/site";
import type { Category } from "@/lib/types";
import { CategoryMenu } from "./CategoryMenu";
import { SearchBox } from "./SearchBox";
import { CartLink } from "./CartLink";
import s from "./Header.module.scss";

export function Header({ categories }: { categories: Category[] }) {
  return (
    <header className={s.header}>
      <div className={s.top}>
        <Link href="/" className={s.logo} aria-label={`${site.name} – sākums`}>
          {site.name}
        </Link>
        <div className={s.menu}>
          <CategoryMenu categories={categories} />
        </div>
        <div className={s.search}>
          <SearchBox />
        </div>
        <div className={s.cart}>
          <CartLink />
        </div>
      </div>
      <nav className={s.nav} aria-label="Kategorijas">
        <ul className={s.navList}>
          <li className={s.mobileOnly}>
            <Link href="/katalogs" className={s.navLink}>
              Visi produkti
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/katalogs/${c.slug}`} className={s.navLink}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
