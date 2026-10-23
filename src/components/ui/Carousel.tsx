"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import s from "./Carousel.module.scss";

type Props = {
  /** The <li> items. */
  children: ReactNode;
  /** Accessible name for the list and its buttons, e.g. "Kategorijas". */
  label: string;
  /** Extra class for the scrolling <ul> (gap, padding, snapping). */
  trackClassName?: string;
  className?: string;
};

/**
 * Horizontal row that scrolls without a visible scrollbar. Glass arrow buttons appear on a
 * side only while there is more to see there; touch and trackpad scrolling keep working.
 */
export function Carousel({ children, label, trackClassName, className }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    // 2px slack: fractional scroll positions never quite reach the end on some zoom levels.
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <div className={className ? `${s.carousel} ${className}` : s.carousel}>
      <ul ref={track} className={trackClassName ? `${s.track} ${trackClassName}` : s.track} aria-label={label}>
        {children}
      </ul>
      {/* Mouse helpers only: keyboard users tab through the links, which scrolls them into view. */}
      <button
        type="button"
        className={`${s.arrow} ${s.prev}`}
        onClick={() => scroll(-1)}
        hidden={edges.start}
        tabIndex={-1}
        aria-label={`${label}: iepriekšējie`}
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        className={`${s.arrow} ${s.next}`}
        onClick={() => scroll(1)}
        hidden={edges.end}
        tabIndex={-1}
        aria-label={`${label}: nākamie`}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
