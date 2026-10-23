"use client";

import { startTransition, useActionState } from "react";
import { saveCategory } from "../actions";
import { initialFormState } from "@/lib/catalog-input";
import type { Category } from "@/lib/types";
import a from "../admin.module.scss";

export function CategoryForm({ category }: { category: Category }) {
  const [state, formAction, pending] = useActionState(saveCategory, initialFormState);
  const err = (key: string) => state.errors[key];
  const cls = (key: string) => (err(key) ? `${a.input} ${a.invalid}` : a.input);

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
      <input type="hidden" name="id" value={category.id} />
      <div className={a.row}>
        <label className={a.field}>
          <span>Nosaukums</span>
          <input name="name" className={cls("name")} defaultValue={category.name} />
          {err("name") && <span className={a.error}>{err("name")}</span>}
        </label>
        <label className={a.field}>
          <span>Adrese (slug)</span>
          <input name="slug" className={cls("slug")} defaultValue={category.slug} />
          {err("slug") && <span className={a.error}>{err("slug")}</span>}
        </label>
        <label className={a.field}>
          <span>Secība</span>
          <input name="sortOrder" className={cls("sortOrder")} inputMode="numeric" defaultValue={category.sortOrder} />
          {err("sortOrder") && <span className={a.error}>{err("sortOrder")}</span>}
        </label>
      </div>
      <label className={a.field}>
        <span>Apraksts</span>
        <textarea name="description" className={cls("description")} defaultValue={category.description} rows={2} />
        {err("description") && <span className={a.error}>{err("description")}</span>}
      </label>
      <div>
        <button type="submit" className={a.buttonSecondary} disabled={pending}>
          {pending ? "Saglabā…" : "Saglabāt"}
        </button>{" "}
        <span aria-live="polite" className={state.ok ? a.saved : a.error}>
          {!pending && state.message}
        </span>
      </div>
    </form>
  );
}
