"use client";

import Form from "next/form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/money";
import { matchesQuery, type SearchEntry } from "@/lib/search";
import { SearchIcon } from "@/components/icons";
import s from "./SearchBox.module.scss";

const MAX_SUGGESTIONS = 8;

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex() {
  indexPromise ??= fetch("/api/search-index")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

export function SearchBox() {
  const router = useRouter();
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    if (!index || query.trim().length < 2) return [];
    return index.filter((e) => matchesQuery(e.haystack, query)).slice(0, MAX_SUGGESTIONS);
  }, [index, query]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/produkts/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && open && active >= 0 && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    }
  };

  const showList = open && results.length > 0;

  return (
    <div className={s.root} ref={rootRef}>
      <Form action="/katalogs" role="search" className={s.form} onSubmit={() => setOpen(false)}>
        <input
          type="search"
          name="q"
          className={s.input}
          placeholder="Meklēt produktus vai ražotājus"
          aria-label="Meklēt"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (!index) loadIndex().then(setIndex);
          }}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className={s.submit} aria-label="Meklēt">
          <SearchIcon width={20} height={20} />
        </button>
      </Form>
      {showList && (
        <ul id={listId} role="listbox" className={s.list}>
          {results.map((r, i) => (
            <li
              key={r.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? `${s.option} ${s.active}` : s.option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(r.slug)}
            >
              <span className={s.thumb}>
                {r.image && <Image src={r.image} alt="" fill sizes="40px" className={s.thumbImg} />}
              </span>
              <span className={s.name}>{r.name}</span>
              <span className={s.price}>
                {r.hasVariants && "no "}
                {formatPrice(r.fromPriceCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
