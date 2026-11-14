"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Scrolling down this far hides the header… */
const HIDE_AFTER = 100;
/** …and scrolling back up this far shows it again. */
const SHOW_AFTER = 70;

/**
 * Sticky <header> that slides away while scrolling down and returns on scrolling up. It
 * publishes its visible height as --header-offset on <html>, so other sticky elements
 * (cart summary, product info) can sit below it.
 */
export function StickyHeader({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;

    let isHidden = false;
    // Where the current scroll direction started; distances are measured from here.
    let anchor = window.scrollY;
    let last = window.scrollY;
    let wasDown = true;

    const apply = (next: boolean) => {
      isHidden = next;
      setHidden(next);
      root.style.setProperty("--header-offset", next ? "0px" : `${el.offsetHeight}px`);
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (y === last) return;
      const down = y > last;
      // Restart the distance whenever the direction flips.
      if (down !== wasDown) anchor = last;
      wasDown = down;
      last = y;

      // Never hide while the visitor is typing a search or moving through it by keyboard.
      // (A clicked link keeps plain focus too, which mustn't pin the header.)
      const active = document.activeElement;
      if (active && el.contains(active) && active.matches("input, :focus-visible")) {
        if (isHidden) apply(false);
        return;
      }
      if (y <= el.offsetHeight) {
        if (isHidden) apply(false);
      } else if (!isHidden && down && y - anchor >= HIDE_AFTER) {
        apply(true);
      } else if (isHidden && !down && anchor - y >= SHOW_AFTER) {
        apply(false);
      }
    };

    const resize = new ResizeObserver(() => apply(isHidden));
    resize.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.style.removeProperty("--header-offset");
    };
  }, []);

  return (
    <header ref={ref} className={className} data-hidden={hidden || undefined}>
      {children}
    </header>
  );
}
