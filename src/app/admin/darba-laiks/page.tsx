import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { getShopHours, todayKey } from "@/server/shop-hours";
import { HoursForm } from "./HoursForm";
import { Breadcrumbs } from "../Breadcrumbs";
import a from "../admin.module.scss";

export const metadata: Metadata = { title: "Darba laiks" };

export default async function AdminHours() {
  await requireAdmin();
  const hours = await getShopHours();

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Darba laiks" }]}
      />
      <div className={a.pageHead}>
        <h1 className={a.title}>Darba laiks</h1>
      </div>
      <HoursForm initial={hours} today={todayKey()} />
    </>
  );
}
