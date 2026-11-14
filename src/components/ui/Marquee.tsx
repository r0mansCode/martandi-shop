"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import s from "./Marquee.module.scss";

type Props = {
  /** The <li> items. */
  children: ReactNode;
  /** Accessible name for the list, e.g. "Kategorijas". */
  label: string;
  /** Extra class for each <ul> set (gap between items). */
  listClassName?: string;
  className?: string;
};

/** Pixels per second. */
const SPEED = 30;
/** After a touch, let momentum scrolling settle before taking over again. */
const TOUCH_RESUME_MS = 2000;

/**
 * Row that drifts sideways in an endless loop when it doesn't fit. It pauses while hovered,
 * touched or focused, and stays a normal scrollable row, so swiping and trackpads still work.
 * The loop comes from a second, hidden copy of the items: once the first copy has scrolled
 * out of view, the position jumps back by one copy's width, which looks identical.
 */
export function Marquee({ children, label, listClassName, className }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLUListElement>(null);
  const copy = useRef<HTMLUListElement>(null);
  const [loop, setLoop] = useState(false);

  // Loop only when the items overflow and the visitor hasn't asked for less motion.
  useEffect(() => {
    const el = track.current;
    const list = first.current;
    if (!el || !list) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => setLoop(!motion.matches && list.offsetWidth > el.clientWidth);
    check();
    const resize = new ResizeObserver(check);
    resize.observe(el);
    resize.observe(list);
    motion.addEventListener("change", check);
    return () => {
      resize.disconnect();
      motion.removeEventListener("change", check);
    };
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!loop || !el) return;

    // The copy is often what's on screen, so it must stay clickable (not `inert`), but
    // keyboard and screen-reader users get each link once, from the first set.
    copy.current?.querySelectorAll<HTMLElement>("a, button").forEach((c) => (c.tabIndex = -1));

    let hovered = false;
    let focused = false;
    let touchedUntil = 0;
    // Kept as a float: scrollLeft rounds, which would stall slow speeds.
    let pos = el.scrollLeft;
    let wasPaused = false;
    let last = 0;
    let frame = 0;

    const tick = (time: number) => {
      const dt = Math.min(time - (last || time), 50) / 1000;
      last = time;
      const paused = hovered || focused || time < touchedUntil;
      if (paused) {
        wasPaused = true;
      } else {
        // The visitor may have scrolled by hand while it was paused.
        if (wasPaused) pos = el.scrollLeft;
        wasPaused = false;
        const period = (copy.current?.offsetLeft ?? 0) - (first.current?.offsetLeft ?? 0);
        pos += SPEED * dt;
        if (period > 0 && pos >= period) pos -= period;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovered = true;
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovered = false;
    };
    // Holding a finger keeps it still; it resumes a moment after the finger lifts.
    const touchStart = () => {
      touchedUntil = Infinity;
    };
    const touchEnd = () => {
      touchedUntil = performance.now() + TOUCH_RESUME_MS;
    };
    // Keyboard users tabbing through the links shouldn't have them slide away.
    const focusIn = () => {
      focused = true;
    };
    const focusOut = (e: FocusEvent) => {
      focused = el.contains(e.relatedTarget as Node | null);
    };

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchend", touchEnd, { passive: true });
    el.addEventListener("touchcancel", touchEnd, { passive: true });
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchend", touchEnd);
      el.removeEventListener("touchcancel", touchEnd);
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
    };
  }, [loop]);

  const list = listClassName ? `${s.list} ${listClassName}` : s.list;

  return (
    <div ref={track} className={`${s.track} ${loop ? s.looping : ""} ${className ?? ""}`}>
      <ul ref={first} className={list} aria-label={label}>
        {children}
      </ul>
      {loop && (
        <ul ref={copy} className={list} aria-hidden>
          {children}
        </ul>
      )}
    </div>
  );
}
