"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Category } from "@/lib/types";
import { ChevronDownIcon } from "@/components/icons";
import s from "./CategoryMenu.module.scss";

export function CategoryMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={s.root} ref={ref}>
      <button
        type="button"
        className={s.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        Visas kategorijas
        <ChevronDownIcon width={16} height={16} className={open ? s.chevronOpen : undefined} />
      </button>
      {open && (
        <div id={panelId} className={s.panel}>
          <p className={s.heading}>Kategorijas</p>
          <ul className={s.list}>
            <li>
              <Link href="/katalogs" className={s.link} onClick={() => setOpen(false)}>
                Visi produkti
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/katalogs/${c.slug}`} className={s.link} onClick={() => setOpen(false)}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
