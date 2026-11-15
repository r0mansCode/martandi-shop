"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { saveInvoice } from "./actions";
import { centsToEuro, initialFormState } from "@/lib/catalog-input";
import {
  addDays,
  CUSTOMER_TYPE_LABEL,
  emptyLine,
  formLinesToAmounts,
  INVOICE_VAT_RATES,
  type InvoiceFormValues,
  type InvoiceLineFormValues,
} from "@/lib/invoice-input";
import { formatPrice, invoiceTotals, lineNetCents } from "@/lib/money";
import type { BuyerType } from "@/lib/types";
import { site } from "@/config/site";
import a from "../admin.module.scss";
import s from "./invoices.module.scss";

export type CustomerOption = {
  id: string;
  type: BuyerType;
  name: string;
  /** Reg. Nr. / personal code and address, for the summary under the picker. */
  details: string;
};

export type VariantOption = {
  productId: string;
  variantId: string;
  /** "Courvoisier VS, 0,7 l" */
  name: string;
  priceCents: number;
  depositCents?: number;
};

type Props = {
  initial: InvoiceFormValues;
  customers: CustomerOption[];
  variants: VariantOption[];
};

const vatPercent = (key: InvoiceFormValues["vat"]) => Math.round(INVOICE_VAT_RATES[key] * 100);

export function InvoiceForm({ initial, customers, variants }: Props) {
  const isNew = !initial.id;
  const [values, setValues] = useState(initial);
  const [state, formAction, pending] = useActionState(saveInvoice, initialFormState);
  const initialType = customers.find((c) => c.id === initial.customerId)?.type ?? "company";
  const [customerType, setCustomerType] = useState<BuyerType>(initialType);
  // The due date follows the issue date until the admin sets it by hand.
  const [dueEdited, setDueEdited] = useState(!isNew);

  const set = <K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const setLine = (i: number, patch: Partial<InvoiceLineFormValues>) =>
    setValues((v) => ({ ...v, lines: v.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  const err = (key: string) => state.errors[key];
  const cls = (key: string) => (err(key) ? `${a.input} ${a.invalid}` : a.input);

  const variantById = new Map(variants.map((v) => [v.variantId, v]));
  const pickVariant = (i: number, variantId: string) => {
    const v = variantById.get(variantId);
    if (!v) return setLine(i, { productId: "", variantId: "", name: "" });
    // Catalog prices include VAT at the standard rate; the invoice is priced net.
    setLine(i, {
      productId: v.productId,
      variantId: v.variantId,
      name: v.name,
      price: centsToEuro(Math.round(v.priceCents / (1 + site.vatRate))),
      hasDeposit: !!v.depositCents,
      deposit: centsToEuro(v.depositCents ?? site.defaultDepositCents),
    });
  };

  // Which lines are free text: UI-only, so kept beside the values (index-aligned with lines).
  // Saved lines without a catalog variant open as free text.
  const [textLines, setTextLines] = useState(() => initial.lines.map((l) => !l.variantId));
  const setLineMode = (i: number, text: boolean) => {
    setTextLines((t) => t.map((x, j) => (j === i ? text : x)));
    // Free text keeps the catalog name as a starting point; switching to the catalog needs a fresh pick.
    setLine(i, text ? { productId: "", variantId: "" } : { productId: "", variantId: "", name: "" });
  };
  const removeLine = (i: number) => {
    setValues((v) => ({ ...v, lines: v.lines.filter((_, j) => j !== i) }));
    setTextLines((t) => t.filter((_, j) => j !== i));
  };

  const amounts = formLinesToAmounts(values.lines);
  const totals = invoiceTotals(amounts, INVOICE_VAT_RATES[values.vat]);
  const grossFactor = 1 + INVOICE_VAT_RATES[values.vat];

  const shownCustomers = customers.filter((c) => c.type === customerType);
  const customer = customers.find((c) => c.id === values.customerId);

  return (
    <form
      className={`${a.form} ${s.wide}`}
      // Submit by hand instead of <form action>, so React doesn't reset the fields after saving.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <input type="hidden" name="invoice" value={JSON.stringify(values)} />

      <section className={a.section}>
        <h2>Klients</h2>
        <div className={s.segmented} role="radiogroup" aria-label="Klienta veids">
          {(["company", "private"] as const).map((type) => (
            <label key={type}>
              <input
                type="radio"
                name="customerType"
                checked={customerType === type}
                onChange={() => {
                  setCustomerType(type);
                  if (customer?.type !== type) set("customerId", "");
                }}
              />
              {CUSTOMER_TYPE_LABEL[type]}
            </label>
          ))}
        </div>
        <label className={a.field}>
          <span>{customerType === "company" ? "Uzņēmums" : "Privātpersona"}</span>
          <select className={cls("customerId")} value={values.customerId} onChange={(e) => set("customerId", e.target.value)}>
            <option value="">Izvēlieties…</option>
            {shownCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {err("customerId") && <span className={a.error}>{err("customerId")}</span>}
          <span className={a.hint}>
            {shownCustomers.length === 0 && "Šāda veida klientu vēl nav. "}
            <Link href="/admin/rekini/klienti/jauns" target="_blank">
              Pievienot jaunu klientu ↗
            </Link>{" "}
            (atveras jaunā cilnē; pēc tam pārlādējiet šo lapu)
          </span>
        </label>
        {customer && (
          <div className={s.customerCard}>
            <strong>{customer.name}</strong>
            {customer.details && <div>{customer.details}</div>}
          </div>
        )}
      </section>

      <section className={a.section}>
        <h2>Rēķins</h2>
        <div className={a.row}>
          <label className={a.field}>
            <span>Izrakstīšanas datums</span>
            <input
              type="date"
              className={cls("issueDate")}
              value={values.issueDate}
              onChange={(e) => {
                const issueDate = e.target.value;
                setValues((v) => ({
                  ...v,
                  issueDate,
                  ...(!dueEdited && issueDate ? { dueDate: addDays(issueDate, site.paymentDueDays) } : {}),
                }));
              }}
            />
            {err("issueDate") && <span className={a.error}>{err("issueDate")}</span>}
          </label>
          <label className={a.field}>
            <span>Apmaksas termiņš</span>
            <input
              type="date"
              className={cls("dueDate")}
              value={values.dueDate}
              onChange={(e) => {
                setDueEdited(true);
                set("dueDate", e.target.value);
              }}
            />
            {err("dueDate") && <span className={a.error}>{err("dueDate")}</span>}
          </label>
          <label className={a.field}>
            <span>Statuss</span>
            <select
              className={a.input}
              value={values.status}
              onChange={(e) => set("status", e.target.value as InvoiceFormValues["status"])}
            >
              <option value="unpaid">Neapmaksāts</option>
              <option value="paid">Apmaksāts</option>
            </select>
          </label>
          <label className={a.field}>
            <span>PVN likme</span>
            <select className={a.input} value={values.vat} onChange={(e) => set("vat", e.target.value as InvoiceFormValues["vat"])}>
              {(Object.keys(INVOICE_VAT_RATES) as InvoiceFormValues["vat"][]).map((key) => (
                <option key={key} value={key}>
                  {vatPercent(key)}%
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={a.field}>
          <span>
            Pasūtījuma Nr. <span className={a.muted}>(neobligāts)</span>
          </span>
          <input className={cls("orderNumber")} value={values.orderNumber} onChange={(e) => set("orderNumber", e.target.value)} />
          {err("orderNumber") && <span className={a.error}>{err("orderNumber")}</span>}
        </label>
        <label className={a.check}>
          <input type="checkbox" checked={values.hideDueDate} onChange={(e) => set("hideDueDate", e.target.checked)} />
          Nerādīt apmaksas termiņu rēķinā
        </label>
        <label className={a.check}>
          <input
            type="checkbox"
            checked={values.includeSignatures}
            onChange={(e) => set("includeSignatures", e.target.checked)}
          />
          Pievienot parakstu laukus („Preci izsniedza” / „Preci saņēma”)
        </label>
        <label className={a.check}>
          <input type="checkbox" checked={values.extraBeforeOn} onChange={(e) => set("extraBeforeOn", e.target.checked)} />
          Papildu kolonna pirms nosaukuma
        </label>
        {values.extraBeforeOn && (
          <label className={a.field}>
            <span>Kolonnas virsraksts</span>
            <input
              className={cls("extraBeforeHeader")}
              value={values.extraBeforeHeader}
              onChange={(e) => set("extraBeforeHeader", e.target.value)}
            />
          </label>
        )}
        <label className={a.check}>
          <input type="checkbox" checked={values.extraAfterOn} onChange={(e) => set("extraAfterOn", e.target.checked)} />
          Papildu kolonna aiz nosaukuma
        </label>
        {values.extraAfterOn && (
          <label className={a.field}>
            <span>Kolonnas virsraksts</span>
            <input
              className={cls("extraAfterHeader")}
              value={values.extraAfterHeader}
              onChange={(e) => set("extraAfterHeader", e.target.value)}
            />
          </label>
        )}
      </section>

      <section className={a.section}>
        <h2>Pozīcijas</h2>
        <span className={a.hint}>
          Cenas bez PVN, eiro. Izvēloties preci no kataloga, cena tiek aprēķināta no veikala cenas (bez{" "}
          {Math.round(site.vatRate * 100)}% PVN); visu var labot. Depozīts ir bez PVN un rēķinā ir atsevišķa rinda.
        </span>
        <div className={s.lines}>
          {values.lines.map((line, i) => {
            const p = (field: string) => `lines.${i}.${field}`;
            const lineCents = lineNetCents(amounts[i].unitNetCents, amounts[i].qty);
            return (
              <div key={i} className={s.line}>
                <div className={s.lineHead}>
                  <div className={s.lineHeadGroup}>
                    <span>{i + 1}. pozīcija</span>
                    <div className={`${s.segmented} ${s.segmentedSmall}`} role="radiogroup" aria-label="Pozīcijas veids">
                      {(["catalog", "text"] as const).map((mode) => (
                        <label key={mode}>
                          <input
                            type="radio"
                            name={`lineMode-${i}`}
                            checked={(mode === "text") === textLines[i]}
                            onChange={() => setLineMode(i, mode === "text")}
                          />
                          {mode === "catalog" ? "Prece no kataloga" : "Brīvs teksts"}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className={s.lineHeadGroup}>
                    <label className={a.check}>
                      <input
                        type="checkbox"
                        checked={line.hasDeposit}
                        onChange={(e) => setLine(i, { hasDeposit: e.target.checked })}
                      />
                      Depozīts
                    </label>
                    {values.lines.length > 1 && (
                      <button type="button" className={a.linkButton} onClick={() => removeLine(i)}>
                        Noņemt
                      </button>
                    )}
                  </div>
                </div>
                <div className={s.lineFields}>
                  {values.extraBeforeOn && (
                    <label className={a.field}>
                      <span>{values.extraBeforeHeader || "Papildu kolonna"}</span>
                      <input className={a.input} value={line.extraBefore} onChange={(e) => setLine(i, { extraBefore: e.target.value })} />
                    </label>
                  )}
                  {textLines[i] ? (
                    <label className={`${a.field} ${s.grow}`}>
                      <span>Nosaukums</span>
                      <input className={cls(p("name"))} value={line.name} onChange={(e) => setLine(i, { name: e.target.value })} />
                      {err(p("name")) && <span className={a.error}>{err(p("name"))}</span>}
                    </label>
                  ) : (
                    <label className={`${a.field} ${s.grow}`}>
                      <span>Prece</span>
                      <select className={cls(p("name"))} value={line.variantId} onChange={(e) => pickVariant(i, e.target.value)}>
                        <option value="">Izvēlieties…</option>
                        {line.variantId && !variantById.has(line.variantId) && (
                          <option value={line.variantId}>{line.name} (vairs nav katalogā)</option>
                        )}
                        {variants.map((v) => (
                          <option key={v.variantId} value={v.variantId}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                      {err(p("name")) && <span className={a.error}>Izvēlieties preci</span>}
                    </label>
                  )}
                  {values.extraAfterOn && (
                    <label className={a.field}>
                      <span>{values.extraAfterHeader || "Papildu kolonna"}</span>
                      <input className={a.input} value={line.extraAfter} onChange={(e) => setLine(i, { extraAfter: e.target.value })} />
                    </label>
                  )}
                </div>
                <div className={s.lineFields}>
                  <label className={`${a.field} ${s.narrow}`}>
                    <span>Mērv.</span>
                    <input className={cls(p("unit"))} value={line.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
                    {err(p("unit")) && <span className={a.error}>{err(p("unit"))}</span>}
                  </label>
                  <label className={`${a.field} ${s.narrow}`}>
                    <span>Daudz.</span>
                    <input
                      className={cls(p("qty"))}
                      inputMode="decimal"
                      value={line.qty}
                      onChange={(e) => setLine(i, { qty: e.target.value })}
                    />
                    {err(p("qty")) && <span className={a.error}>{err(p("qty"))}</span>}
                  </label>
                  <label className={a.field}>
                    <span>Cena bez PVN, €</span>
                    <input
                      className={cls(p("price"))}
                      inputMode="decimal"
                      value={line.price}
                      placeholder="12,99"
                      onChange={(e) => setLine(i, { price: e.target.value })}
                    />
                    {err(p("price")) && <span className={a.error}>{err(p("price"))}</span>}
                  </label>
                  {line.hasDeposit && (
                    <label className={`${a.field} ${s.narrow}`}>
                      <span>Depozīts, €</span>
                      <input
                        className={cls(p("deposit"))}
                        inputMode="decimal"
                        value={line.deposit}
                        onChange={(e) => setLine(i, { deposit: e.target.value })}
                      />
                      {err(p("deposit")) && <span className={a.error}>{err(p("deposit"))}</span>}
                    </label>
                  )}
                  <div className={`${a.field} ${s.computed}`}>
                    <span>Cena ar PVN</span>
                    <span className={s.computedValue}>{formatPrice(Math.round(amounts[i].unitNetCents * grossFactor))}</span>
                  </div>
                  <div className={`${a.field} ${s.computed}`}>
                    <span>Summa bez PVN</span>
                    <span className={s.computedValue}>{formatPrice(lineCents)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {err("lines") && <span className={a.error}>{err("lines")}</span>}
        <div>
          <button
            type="button"
            className={a.buttonSecondary}
            onClick={() => {
              set("lines", [...values.lines, emptyLine]);
              setTextLines((t) => [...t, false]);
            }}
          >
            + Pievienot pozīciju
          </button>
        </div>
        <dl className={s.totals} aria-live="polite">
          <div>
            <dt>{totals.depositCents ? "Preces bez PVN" : "Summa bez PVN"}</dt>
            <dd>{formatPrice(totals.netCents)}</dd>
          </div>
          <div>
            <dt>PVN {vatPercent(values.vat)}%</dt>
            <dd>{formatPrice(totals.vatCents)}</dd>
          </div>
          {totals.depositCents && (
            <div>
              <dt>Depozīts (PVN 0%)</dt>
              <dd>{formatPrice(totals.depositCents)}</dd>
            </div>
          )}
          <div className={s.grandTotal}>
            <dt>Kopā apmaksai</dt>
            <dd>{formatPrice(totals.grossCents)}</dd>
          </div>
        </dl>
      </section>

      <div className={a.actions}>
        <button type="submit" className={a.button} disabled={pending}>
          {pending ? "Saglabā…" : isNew ? "Izveidot rēķinu" : "Saglabāt"}
        </button>
        <span aria-live="polite" className={state.ok ? a.saved : a.error}>
          {!pending && state.message}
        </span>
      </div>
    </form>
  );
}
