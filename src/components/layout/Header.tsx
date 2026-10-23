import Link from "next/link";
import { site } from "@/config/site";
import type { Category } from "@/lib/types";
import { CategoryMenu } from "./CategoryMenu";
import { CategoryNav } from "./CategoryNav";
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
      <CategoryNav categories={categories} />
    </header>
  );
}
