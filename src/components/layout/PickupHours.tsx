"use client";

import { createContext, useContext, type ReactNode } from "react";
import { hoursLine, type PickupInfo } from "@/lib/shop-hours";
import s from "./PickupHours.module.scss";

// Opening hours come from the database (admin "Darba laiks"). The shop layout loads them once
// and hands them to client components here, so the cart, checkout and product page agree.

const PickupInfoContext = createContext<PickupInfo | null>(null);

export function PickupInfoProvider({ value, children }: { value: PickupInfo; children: ReactNode }) {
  return <PickupInfoContext value={value}>{children}</PickupInfoContext>;
}

export function usePickupInfo(): PickupInfo {
  const info = useContext(PickupInfoContext);
  if (!info) throw new Error("usePickupInfo needs <PickupInfoProvider> (the shop layout).");
  return info;
}

/** Hours line ("P–Pk 10:00–20:00 · …") plus the closure notice when one is set. */
export function PickupHours({ className }: { className?: string }) {
  const { hours, closure } = usePickupInfo();
  return (
    <>
      <p className={className}>{hoursLine(hours)}</p>
      {closure && <ClosureNotice text={closure} />}
    </>
  );
}

export function ClosureNotice({ text }: { text: string }) {
  return <p className={s.closure}>{text}</p>;
}
