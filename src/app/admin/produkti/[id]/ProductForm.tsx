"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "../../actions";
import { initialFormState, type ProductFormValues } from "@/lib/catalog-input";
import type { ProductImage } from "@/lib/types";
import a from "../../admin.module.scss";

type Props = {
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
  images: ProductImage[];
};

export function ProductForm({ initial, categories, images }: Props) {
  const [values, setValues] = useState(initial);
  const [state, formAction, pending] = useActionState(saveProduct, initialFormState);

  // After a save, take the server's version: new variants now have ids.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.ok && state.values) setValues(state.values);
  }

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const setVariant = (i: number, patch: Partial<ProductFormValues["variants"][number]>) =>
    setValues((v) => ({ ...v, variants: v.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const err = (key: string) => state.errors[key];
  const cls = (key: string) => (err(key) ? `${a.input} ${a.invalid}` : a.input);
  const slugChanged = values.slug !== initial.slug && initial.status === "published";

  return (
    <form action={formAction} className={a.form}>
      <input type="hidden" name="product" value={JSON.stringify(values)} />

      <section className={a.section}>
        <h2>Pamatinformācija</h2>
        <label className={a.field}>
          <span>Nosaukums</span>
          <input className={cls("name")} value={values.name} onChange={(e) => set("name", e.target.value)} />
          {err("name") && <span className={a.error}>{err("name")}</span>}
        </label>
        <label className={a.field}>
          <span>Adrese (slug)</span>
          <input className={cls("slug")} value={values.slug} onChange={(e) => set("slug", e.target.value)} />
          <span className={a.hint}>/produkts/{values.slug}</span>
          {slugChanged && (
            <span className={a.error}>
              Mainot adresi, vecā saite /produkts/{initial.slug} vairs nedarbosies.
            </span>
          )}
          {err("slug") && <span className={a.error}>{err("slug")}</span>}
        </label>
        <label className={a.field}>
          <span>Apraksts</span>
          <textarea
            className={cls("description")}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
          {err("description") && <span className={a.error}>{err("description")}</span>}
        </label>
        <div className={a.row}>
          <label className={a.field}>
            <span>Kategorija</span>
            <select className={cls("categoryId")} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {err("categoryId") && <span className={a.error}>{err("categoryId")}</span>}
          </label>
          <label className={a.field}>
            <span>Statuss</span>
            <select
              className={a.input}
              value={values.status}
              onChange={(e) => set("status", e.target.value as ProductFormValues["status"])}
            >
              <option value="published">Publicēts</option>
              <option value="draft">Melnraksts (nav redzams veikalā)</option>
            </select>
          </label>
          <label className={a.field}>
            <span>Birka</span>
            <select
              className={a.input}
              value={values.badge}
              onChange={(e) => set("badge", e.target.value as ProductFormValues["badge"])}
            >
              <option value="">Nav</option>
              <option value="Jaunums">Jaunums</option>
              <option value="Populārs">Populārs</option>
            </select>
          </label>
        </div>
      </section>

      <section className={a.section}>
        <h2>Īpašības</h2>
        <label className={a.check}>
          <input type="checkbox" checked={values.isAlcohol} onChange={(e) => set("isAlcohol", e.target.checked)} />
          Alkoholisks dzēriens (18+ pārbaude pie pasūtīšanas)
        </label>
        <div className={a.row}>
          <label className={a.field}>
            <span>Alkohols, %</span>
            <input className={cls("abv")} inputMode="decimal" value={values.abv} onChange={(e) => set("abv", e.target.value)} />
            {err("abv") && <span className={a.error}>{err("abv")}</span>}
          </label>
          <label className={a.field}>
            <span>Valsts</span>
            <input className={cls("country")} value={values.country} onChange={(e) => set("country", e.target.value)} />
          </label>
          <label className={a.field}>
            <span>Ražotājs</span>
            <input className={cls("producer")} value={values.producer} onChange={(e) => set("producer", e.target.value)} />
          </label>
        </div>
      </section>

      <section className={a.section}>
        <h2>Tilpumi un cenas</h2>
        <span className={a.hint}>Cenas ar PVN, eiro. Lai paslēptu tilpumu, noņemiet „Aktīvs”.</span>
        <div className={a.variants}>
          {values.variants.map((v, i) => (
            <div key={v.id || `new-${i}`} className={a.variant}>
              <label className={a.field}>
                <span>Tilpums</span>
                <input
                  className={cls(`variants.${i}.label`)}
                  value={v.label}
                  placeholder="0,7 l"
                  onChange={(e) => setVariant(i, { label: e.target.value })}
                />
                {err(`variants.${i}.label`) && <span className={a.error}>{err(`variants.${i}.label`)}</span>}
              </label>
              <label className={a.field}>
                <span>Cena, €</span>
                <input
                  className={cls(`variants.${i}.price`)}
                  inputMode="decimal"
                  value={v.price}
                  placeholder="12,99"
                  onChange={(e) => setVariant(i, { price: e.target.value })}
                />
                {err(`variants.${i}.price`) && <span className={a.error}>{err(`variants.${i}.price`)}</span>}
              </label>
              <label className={`${a.check} ${a.variantControl}`}>
                <input type="checkbox" checked={v.active} onChange={(e) => setVariant(i, { active: e.target.checked })} />
                Aktīvs
              </label>
              {/* Saved variants can only be deactivated: carts and orders may refer to them. */}
              {!v.id && (
                <button
                  type="button"
                  className={`${a.linkButton} ${a.variantControl}`}
                  onClick={() => setValues((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))}
                >
                  Noņemt
                </button>
              )}
            </div>
          ))}
        </div>
        {err("variants") && <span className={a.error}>{err("variants")}</span>}
        <div>
          <button
            type="button"
            className={a.buttonSecondary}
            onClick={() => set("variants", [...values.variants, { id: "", label: "", price: "", active: true }])}
          >
            + Pievienot tilpumu
          </button>
        </div>
      </section>

      <section className={a.section}>
        <h2>Attēli</h2>
        <div className={a.images}>
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.url} src={img.url} alt={img.alt} />
          ))}
        </div>
        <span className={a.hint}>Attēlu augšupielāde būs pieejama nākamajā solī.</span>
      </section>

      <div className={a.actions}>
        <button type="submit" className={a.button} disabled={pending}>
          {pending ? "Saglabā…" : "Saglabāt"}
        </button>
        <span aria-live="polite" className={state.ok ? a.saved : a.error}>
          {!pending && state.message}
        </span>
      </div>
    </form>
  );
}
