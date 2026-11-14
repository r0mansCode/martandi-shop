"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCategory, reorderCategories } from "../actions";
import { ConfirmButton } from "../ConfirmButton";
import { plural } from "@/lib/format";
import { deleteCategoryConfirm } from "@/lib/catalog-input";
import a from "../admin.module.scss";
import s from "./categories.module.scss";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

/**
 * Compact category list. Rows open the edit page; drag a row (or focus its handle and press
 * ↑/↓) to change the order, which is saved straight away as positions 1, 2, 3…
 */
export function CategoryList({ categories }: { categories: CategoryRow[] }) {
  const [rows, setRows] = useState(categories);
  const [dragging, setDragging] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSaving] = useTransition();

  // Take the server's list when it changes (after a save, a delete or an edit elsewhere), but
  // not mid-drag or mid-save, so a stale refresh can't undo a move. Adjusting state here instead
  // of remounting by key keeps the save message and the handle's keyboard focus.
  const signature = JSON.stringify(categories);
  const [synced, setSynced] = useState(signature);
  if (signature !== synced && !saving && !dragging) {
    setSynced(signature);
    setRows(categories);
  }

  const save = (next: CategoryRow[]) => {
    setStatus(null);
    startSaving(async () => {
      const result = await reorderCategories(next.map((r) => r.id));
      setStatus(result);
      if (!result.ok) setRows(categories); // Put back what the server has.
    });
  };

  const move = (list: CategoryRow[], from: number, to: number) => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const sameOrder = (x: CategoryRow[], y: CategoryRow[]) => x.every((r, i) => r.id === y[i]?.id);

  return (
    <>
      <p className={s.status} aria-live="polite">
        {saving ? "Saglabā secību…" : status && <span className={status.ok ? a.saved : a.error}>{status.message}</span>}
      </p>

      <div className={a.tableWrap}>
        <table className={`${a.table} ${a.clickable} ${s.table}`}>
          <thead>
            <tr>
              <th aria-label="Pārvietot" />
              <th>Nr.</th>
              <th>Nosaukums</th>
              <th>Adrese</th>
              <th>Produkti</th>
              <th aria-label="Darbības" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                draggable
                className={dragging === row.id ? s.dragging : undefined}
                onDragStart={(e) => {
                  setDragging(row.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", row.id);
                }}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  const from = rows.findIndex((r) => r.id === dragging);
                  if (from !== index) setRows(move(rows, from, index));
                }}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={(e) => {
                  setDragging(null);
                  // Dropped outside the table or cancelled with Esc: put the rows back, save nothing.
                  if (e.dataTransfer.dropEffect === "none") return setRows(categories);
                  if (!sameOrder(rows, categories)) save(rows);
                }}
              >
                <td className={s.handleCell}>
                  <button
                    type="button"
                    className={`${s.handle} ${a.aboveRow}`}
                    aria-label={`Pārvietot „${row.name}” (bultiņas uz augšu/leju)`}
                    title="Velciet, lai mainītu secību"
                    onKeyDown={(e) => {
                      const to = e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : -1;
                      if (to < 0 || to >= rows.length) return;
                      e.preventDefault();
                      const next = move(rows, index, to);
                      setRows(next);
                      save(next);
                    }}
                  >
                    ⠿
                  </button>
                </td>
                <td className={a.muted}>{index + 1}</td>
                <td>
                  <Link href={`/admin/kategorijas/${row.id}`} className={a.rowLink} draggable={false}>
                    {row.name}
                  </Link>
                </td>
                <td className={a.muted}>/{row.slug}</td>
                <td>
                  {row.productCount} {plural(row.productCount, "produkts", "produkti")}
                </td>
                <td className={s.actions}>
                  <form action={deleteCategory.bind(null, row.id)} className={a.aboveRow}>
                    <ConfirmButton confirm={deleteCategoryConfirm(row.name, row.productCount)} className={s.delete}>
                      Dzēst
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
