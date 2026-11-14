"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import s from "./PrivacyNotice.module.scss";

// Informational only: the shop stores nothing but the cart (strictly necessary),
// so there is nothing to consent to and no accept/decline choice.
const KEY = "martandi-privacy-ok";

const listeners = new Set<() => void>();
let dismissedInMemory = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Storage blocked: show the notice; dismissing then only lasts for this page view.
    return dismissedInMemory;
  }
}

function dismiss() {
  dismissedInMemory = true;
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
  listeners.forEach((l) => l());
}

export function PrivacyNotice() {
  // Server snapshot is "dismissed" so the notice never flashes in the static HTML.
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  if (dismissed) return null;

  return (
    <div className={s.notice} role="region" aria-label="Paziņojums par privātumu">
      <div className={s.text}>
        <p>
          Mēs izmantojam tikai nepieciešamās sīkdatnes, lai vietne darbotos pareizi un iepirkšanās būtu ērta.
          Turpinot lietot mūsu vietni, jūs piekrītat nepieciešamo sīkdatņu izmantošanai.
        </p>
      </div>
      <div className={s.actions}>
        <Link href="/privatuma-politika" className={s.link}>
          Privātuma politika
        </Link>
        <button type="button" className={s.button} onClick={dismiss}>
          Sapratu
        </button>
      </div>
    </div>
  );
}
