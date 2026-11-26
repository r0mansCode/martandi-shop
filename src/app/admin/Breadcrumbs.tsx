import Link from "next/link";
import { HomeIcon } from "@/components/icons";
import a from "./admin.module.scss";

type Crumb = { label: string; href?: string };

/** Admin page trail: home icon (overview), then sections; the last crumb is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Navigācija" className={a.breadcrumbs}>
      <ol>
        <li>
          <Link href="/admin" aria-label="Pārskats">
            <HomeIcon width={18} height={18} />
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`}>
            {item.href && i < items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
