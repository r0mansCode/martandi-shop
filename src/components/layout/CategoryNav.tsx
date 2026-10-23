"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/lib/types";
import { Carousel } from "@/components/ui/Carousel";
import s from "./CategoryNav.module.scss";

/** Category pills under the header; the current category is filled. */
export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const pill = (href: string) => (pathname === href ? `${s.pill} ${s.active}` : s.pill);

  return (
    <nav className={s.nav} aria-label="Kategorijas">
      <Carousel label="Kategorijas" className={s.carousel} trackClassName={s.list}>
        <li className={s.mobileOnly}>
          <Link href="/katalogs" className={pill("/katalogs")} aria-current={pathname === "/katalogs" ? "page" : undefined}>
            Visi produkti
          </Link>
        </li>
        {categories.map((c) => {
          const href = `/katalogs/${c.slug}`;
          return (
            <li key={c.id}>
              <Link href={href} className={pill(href)} aria-current={pathname === href ? "page" : undefined}>
                {c.name}
              </Link>
            </li>
          );
        })}
      </Carousel>
    </nav>
  );
}
