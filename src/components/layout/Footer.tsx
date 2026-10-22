import Link from "next/link";
import type { Category } from "@/lib/types";
import { pickup } from "@/config/site";
import { seller } from "@/config/seller";
import s from "./Footer.module.scss";

export function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div>
          <p className={s.logo}>Martandi</p>
          <p className={s.muted}>Vīni, stiprie un bezalkoholiskie dzērieni Rīgā.</p>
        </div>
        <div>
          <h2 className={s.heading}>Saņemšana veikalā</h2>
          <p>{pickup.address}</p>
          <dl className={s.hours}>
            {pickup.hours.map((h) => (
              <div key={h.days}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
        <nav aria-label="Kategorijas kājenē">
          <h2 className={s.heading}>Kategorijas</h2>
          <ul className={s.links}>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/katalogs/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={s.legal}>
        <p>
          {seller.name} · Reģ. Nr. {seller.regNo} · PVN Nr. {seller.vatNo}
        </p>
        <p>Alkoholiskos dzērienus pārdodam tikai personām no 18 gadu vecuma.</p>
      </div>
    </footer>
  );
}
