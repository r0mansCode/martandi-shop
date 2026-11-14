"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { createCategory, saveCategory } from "../actions";
import { initialFormState, slugify } from "@/lib/catalog-input";
import type { Category } from "@/lib/types";
import a from "../admin.module.scss";

type Props =
  /** Editing an existing category; `position` is its place in the menu. */
  | { category: Category; position: number }
  /** Creating a new one (no category yet). */
  | { category?: undefined; position?: undefined };

export function CategoryForm({ category, position }: Props) {
  const isNew = !category;
  const [state, formAction, pending] = useActionState(isNew ? createCategory : saveCategory, initialFormState);
  const err = (key: string) => state.errors[key];
  const cls = (key: string) => (err(key) ? `${a.input} ${a.invalid}` : a.input);

  // New category: the slug follows the name until the admin edits it by hand.
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!isNew);

  return (
    <form
      className={a.form}
      // Submit by hand instead of <form action>, so React doesn't reset the fields to the
      // values the page was loaded with after saving.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className={a.row}>
        <label className={a.field}>
          <span>Nosaukums</span>
          <input
            name="name"
            className={cls("name")}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
          {err("name") && <span className={a.error}>{err("name")}</span>}
        </label>
        <label className={a.field}>
          <span>Adrese (slug)</span>
          <input
            name="slug"
            className={cls("slug")}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
          />
          {err("slug") && <span className={a.error}>{err("slug")}</span>}
        </label>
        {/* Read-only: one place to change the order, so the numbers can't clash or skip. */}
        <div className={a.field}>
          <span>Secība</span>
          <span className={a.muted}>
            {isNew ? "Saraksta beigās" : `${position}. vieta`} · mainiet, velkot rindas{" "}
            <Link href="/admin/kategorijas">kategoriju sarakstā</Link>
          </span>
        </div>
      </div>
      <label className={a.field}>
        <span>Apraksts</span>
        <textarea name="description" className={cls("description")} defaultValue={category?.description} rows={2} />
        {err("description") && <span className={a.error}>{err("description")}</span>}
      </label>
      <div>
        <button type="submit" className={isNew ? a.button : a.buttonSecondary} disabled={pending}>
          {pending ? "Saglabā…" : isNew ? "Izveidot kategoriju" : "Saglabāt"}
        </button>{" "}
        <span aria-live="polite" className={state.ok ? a.saved : a.error}>
          {!pending && state.message}
        </span>
      </div>
    </form>
  );
}
