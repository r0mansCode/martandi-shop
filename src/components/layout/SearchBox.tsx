"use client";

import Form from "next/form";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/money";
import { matchesQuery, type SearchEntry } from "@/lib/search";
import { CloseIcon, SearchIcon } from "@/components/icons";
import s from "./SearchBox.module.scss";

const MAX_SUGGESTIONS = 8;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

/** The search term to apply: empty until the user has typed enough. */
const term = (q: string) => (q.trim().length >= MIN_CHARS ? q.trim() : "");

/** Reports the catalog's ?q, behind Suspense because of useSearchParams. */
function UrlQuery({ onChange }: { onChange: (q: string) => void }) {
  const q = useSearchParams().get("q") ?? "";
  useEffect(() => onChange(q), [q, onChange]);
  return null;
}

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
  // On catalog pages the grid itself shows the results, so typing filters it live.
  const onCatalog = usePathname().startsWith("/katalogs");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Only push to the URL after the user typed, never on mount or a URL sync.
  const typedRef = useRef(false);
  // Last ?q this box wrote, so the URL echo doesn't overwrite what is being typed.
  const writtenRef = useRef<string | null>(null);
  const listId = useId();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term(query)), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Push the debounced term into the catalog URL; CatalogBrowser reads it from there.
  useEffect(() => {
    if (!onCatalog || !typedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if ((params.get("q") ?? "") === debounced) return;
    if (debounced) params.set("q", debounced);
    else params.delete("q");
    writtenRef.current = debounced;
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [debounced, onCatalog]);

  // Mirror ?q changes made elsewhere (filter chips, „Notīrīt visus”, navigation).
  const syncFromUrl = useCallback((q: string) => {
    if (q === writtenRef.current) return;
    typedRef.current = false;
    writtenRef.current = q;
    setQuery(q);
    setDebounced(term(q));
  }, []);

  const change = (value: string) => {
    typedRef.current = true;
    setQuery(value);
    setActive(-1);
    setOpen(true);
  };

  const results = useMemo(() => {
    if (!index || !debounced) return [];
    return index.filter((e) => matchesQuery(e.haystack, debounced)).slice(0, MAX_SUGGESTIONS);
  }, [index, debounced]);

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

  // On catalog pages the grid below already shows the matches.
  const showList = open && results.length > 0 && !onCatalog;

  return (
    <div className={s.root} ref={rootRef}>
      <Suspense fallback={null}>
        <UrlQuery onChange={syncFromUrl} />
      </Suspense>
      <Form action="/katalogs" role="search" className={s.form} onSubmit={() => setOpen(false)}>
        <input
          ref={inputRef}
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
          onChange={(e) => change(e.target.value)}
          onFocus={() => {
            setOpen(true);
            if (!index) loadIndex().then(setIndex);
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className={s.clear}
            aria-label="Notīrīt meklēšanu"
            onClick={() => {
              change("");
              inputRef.current?.focus();
            }}
          >
            <CloseIcon width={18} height={18} />
          </button>
        )}
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
