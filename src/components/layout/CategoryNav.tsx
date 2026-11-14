"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/lib/types";
import { Marquee } from "@/components/ui/Marquee";
import s from "./CategoryNav.module.scss";

/** Category pills under the header, drifting in a loop. Shown on the home page only. */
export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <nav className={s.nav} aria-label="Kategorijas">
      <Marquee label="Kategorijas" className={s.row}>
        <li className={s.mobileOnly}>
          <Link href="/katalogs" className={s.pill}>
            Visi produkti
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={`/katalogs/${c.slug}`} className={s.pill}>
              {c.name}
            </Link>
          </li>
        ))}
      </Marquee>
    </nav>
  );
}
