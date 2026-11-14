import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/logo.png";
import type { Category } from "@/lib/types";
import type { PickupInfo } from "@/lib/shop-hours";
import { ClosureNotice } from "./PickupHours";
import { pickup, site } from "@/config/site";
import { seller } from "@/config/seller";
import s from "./Footer.module.scss";

export function Footer({ categories, pickupInfo }: { categories: Category[]; pickupInfo: PickupInfo }) {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div>
          <Image src={logo} alt={site.name} className={s.logo} sizes="6rem" />
          <p className={s.muted}>Vīni, stiprie un bezalkoholiskie dzērieni Rīgā.</p>
        </div>
        <div>
          <h2 className={s.heading}>Saņemšana veikalā</h2>
          <p>{pickup.address}</p>
          <dl className={s.hours}>
            {pickupInfo.hours.map((h) => (
              <div key={h.days}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
          </dl>
          {pickupInfo.closure && <ClosureNotice text={pickupInfo.closure} />}
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
