"use client";

import Link from "next/link";
import { useCartCount } from "@/lib/cart";
import { plural } from "@/lib/format";
import { CartIcon } from "@/components/icons";
import s from "./CartLink.module.scss";

export function CartLink() {
  const count = useCartCount();
  return (
    <Link href="/grozs" className={s.link} aria-label={`Grozs, ${count} ${plural(count, "prece", "preces")}`}>
      <CartIcon />
      {count > 0 && (
        <span className={s.badge} aria-hidden>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
