import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/logo.png";
import { site } from "@/config/site";
import type { Category } from "@/lib/types";
import { CategoryMenu } from "./CategoryMenu";
import { CategoryNav } from "./CategoryNav";
import { SearchBox } from "./SearchBox";
import { CartLink } from "./CartLink";
import { StickyHeader } from "./StickyHeader";
import s from "./Header.module.scss";

export function Header({ categories }: { categories: Category[] }) {
  return (
    <StickyHeader className={s.header}>
      <div className={s.top}>
        <Link href="/" className={s.logo} aria-label={`${site.name} – sākums`}>
          <Image src={logo} alt="" priority sizes="5rem" className={s.logoImg} />
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
    </StickyHeader>
  );
}
