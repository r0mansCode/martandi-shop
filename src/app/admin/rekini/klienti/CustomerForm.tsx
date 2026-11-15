"use client";

import { startTransition, useActionState, useState } from "react";
import { saveCustomer } from "../actions";
import { initialFormState } from "@/lib/catalog-input";
import { CUSTOMER_TYPE_LABEL, type CustomerFormValues } from "@/lib/invoice-input";
import a from "../../admin.module.scss";
import s from "../invoices.module.scss";

type Field = { key: Exclude<keyof CustomerFormValues, "id" | "type">; label: string; multiline?: boolean };

// Which fields each buyer type has, in print order (as in the ohmycrisp admin).
const FIELDS: Record<CustomerFormValues["type"], Field[]> = {
  company: [
    { key: "name", label: "Nosaukums" },
    { key: "regNo", label: "Reģistrācijas Nr." },
    { key: "vatNo", label: "PVN Nr." },
    { key: "address", label: "Juridiskā adrese", multiline: true },
    { key: "bank", label: "Banka" },
    { key: "swift", label: "SWIFT/BIC" },
    { key: "iban", label: "Konta Nr. (IBAN)" },
    { key: "contactPerson", label: "Kontaktpersona" },
    { key: "email", label: "E-pasts" },
    { key: "phone", label: "Tālrunis" },
  ],
  private: [
    { key: "name", label: "Vārds, uzvārds" },
    { key: "personalCode", label: "Personas kods" },
    { key: "address", label: "Adrese", multiline: true },
    { key: "bank", label: "Banka" },
    { key: "iban", label: "Konta Nr. (IBAN)" },
    { key: "email", label: "E-pasts" },
    { key: "phone", label: "Tālrunis" },
  ],
};

export function CustomerForm({ initial }: { initial: CustomerFormValues }) {
  const isNew = !initial.id;
  const [values, setValues] = useState(initial);
  const [state, formAction, pending] = useActionState(saveCustomer, initialFormState);
  const err = (key: string) => state.errors[key];
  const cls = (key: string) => (err(key) ? `${a.input} ${a.invalid}` : a.input);

  return (
    <form
      className={a.form}
      // Submit by hand instead of <form action>, so React doesn't reset the fields after saving.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <input type="hidden" name="customer" value={JSON.stringify(values)} />
      <section className={a.section}>
        <div className={s.segmented} role="radiogroup" aria-label="Klienta veids">
          {(["company", "private"] as const).map((type) => (
            <label key={type}>
              <input
                type="radio"
                name="type"
                checked={values.type === type}
                onChange={() => setValues((v) => ({ ...v, type }))}
              />
              {CUSTOMER_TYPE_LABEL[type]}
            </label>
          ))}
        </div>
        {FIELDS[values.type].map(({ key, label, multiline }) => (
          <label key={key} className={a.field}>
            <span>
              {label}
              {key !== "name" && <span className={a.muted}> (neobligāts)</span>}
            </span>
            {multiline ? (
              <textarea
                className={cls(key)}
                rows={2}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            ) : (
              <input
                className={cls(key)}
                type={key === "email" ? "email" : "text"}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            )}
            {err(key) && <span className={a.error}>{err(key)}</span>}
          </label>
        ))}
      </section>
      <div className={a.actions}>
        <button type="submit" className={a.button} disabled={pending}>
          {pending ? "Saglabā…" : isNew ? "Pievienot klientu" : "Saglabāt"}
        </button>
        <span aria-live="polite" className={state.ok ? a.saved : a.error}>
          {!pending && state.message}
        </span>
      </div>
    </form>
  );
}
