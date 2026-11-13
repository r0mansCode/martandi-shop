"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useId, useState, useSyncExternalStore } from "react";
import { applyServerCart, clearCart, useCart, useCartPriceSync } from "@/lib/cart";
import { formatPrice, orderTotals } from "@/lib/money";
import { plural } from "@/lib/format";
import { initialCheckoutState, type CheckoutState } from "@/lib/checkout-input";
import type { BuyerType } from "@/lib/types";
import { placeOrder } from "@/app/(shop)/noformet/actions";
import { pickup, site } from "@/config/site";
import s from "./CheckoutForm.module.scss";

const noopSubscribe = () => () => {};

type Fields = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  regNo: string;
  vatNo: string;
  legalAddress: string;
};

const EMPTY_FIELDS: Fields = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  regNo: "",
  vatNo: "",
  legalAddress: "",
};

// Server error keys (zod paths) → form field.
const ERROR_KEY: Record<keyof Fields, string> = {
  name: "customer.name",
  email: "customer.email",
  phone: "customer.phone",
  companyName: "company.name",
  regNo: "company.regNo",
  vatNo: "company.vatNo",
  legalAddress: "company.legalAddress",
};

export function CheckoutForm() {
  const router = useRouter();
  const lines = useCart();
  useCartPriceSync();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [buyerType, setBuyerType] = useState<BuyerType>("private");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [state, submit, pending] = useActionState<CheckoutState, unknown>(placeOrder, initialCheckoutState);

  // React to the server's answer: sync a stale cart, or finish on success.
  useEffect(() => {
    if (state.status === "cart_changed") applyServerCart(state.prices, state.removed);
    if (state.status === "ok") {
      router.replace(`/paldies/${state.orderId}`);
      clearCart();
    }
  }, [state, router]);

  if (!hydrated) return <div className={s.placeholder} />;

  if (state.status === "ok") {
    return <p className={s.redirecting}>Pasūtījums noformēts. Atveram apstiprinājumu…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className={s.empty}>
        <h1 className={s.title}>Noformēt pasūtījumu</h1>
        <p>Grozs ir tukšs.</p>
        <Link href="/katalogs" className={s.button}>
          Uz katalogu
        </Link>
      </div>
    );
  }

  const errors = state.status === "error" ? state.errors : {};
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const totals = orderTotals(lines);
  const hasAlcohol = lines.some((l) => l.isAlcohol);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = { name: fields.name, email: fields.email, phone: fields.phone };
    const company = {
      name: fields.companyName,
      regNo: fields.regNo,
      vatNo: fields.vatNo,
      legalAddress: fields.legalAddress,
    };
    startTransition(() =>
      submit({
        buyerType,
        customer,
        ...(buyerType === "company" ? { company } : {}),
        ageConfirmed,
        lines: lines.map((l) => ({
          variantId: l.variantId,
          qty: l.qty,
          priceCents: l.priceCents,
          depositCents: l.depositCents,
        })),
        website,
      }),
    );
  };

  const field = (key: keyof Fields, label: string, props: InputProps = {}) => (
    <Field
      {...props}
      label={label}
      value={fields[key]}
      error={errors[ERROR_KEY[key]]}
      onChange={(value) => setFields((f) => ({ ...f, [key]: value }))}
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <header className={s.header}>
        <Link href="/grozs" className={s.back}>
          ← Atpakaļ uz grozu
        </Link>
        <h1 className={s.title}>Noformēt pasūtījumu</h1>
      </header>

      {state.status !== "idle" && (
        <p className={state.status === "cart_changed" ? `${s.alert} ${s.alertInfo}` : s.alert} role="alert">
          {state.message}
        </p>
      )}

      <div className={s.layout}>
        <div className={s.sections}>
          <section className={s.section} aria-labelledby="contact">
            <h2 id="contact" className={s.sectionTitle}>
              Kontaktinformācija
            </h2>
            <div className={s.grid}>
              {field("name", "Vārds, uzvārds", { autoComplete: "name", required: true })}
              {field("email", "E-pasts", {
                type: "email",
                autoComplete: "email",
                required: true,
                inputMode: "email",
              })}
              {field("phone", "Tālrunis", { type: "tel", autoComplete: "tel", required: true, placeholder: "+371" })}
            </div>
            <p className={s.hint}>Rēķinu nosūtīsim uz norādīto e-pastu.</p>
          </section>

          <section className={s.section} aria-labelledby="buyer">
            <h2 id="buyer" className={s.sectionTitle}>
              Pircējs
            </h2>
            <div className={s.toggle} role="radiogroup" aria-labelledby="buyer">
              {(
                [
                  ["private", "Privātpersona"],
                  ["company", "Uzņēmums"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className={buyerType === value ? `${s.option} ${s.optionOn}` : s.option}>
                  <input
                    type="radio"
                    name="buyerType"
                    value={value}
                    checked={buyerType === value}
                    onChange={() => setBuyerType(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            {buyerType === "company" && (
              <div className={s.grid}>
                {field("companyName", "Uzņēmuma nosaukums", { autoComplete: "organization", required: true })}
                {field("regNo", "Reģistrācijas numurs", { inputMode: "numeric", required: true })}
                {field("vatNo", "PVN numurs (ja ir)", { placeholder: "LV" })}
                {field("legalAddress", "Juridiskā adrese", { required: true })}
              </div>
            )}
          </section>

          <section className={s.section} aria-labelledby="pickup">
            <h2 id="pickup" className={s.sectionTitle}>
              Saņemšana
            </h2>
            <div className={s.infoBox}>
              <p className={s.infoTitle}>Saņemšana veikalā – bezmaksas</p>
              <p>{pickup.address}</p>
              <p className={s.muted}>{pickup.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}</p>
              <p className={s.muted}>Pasūtījumu sagatavosim pēc apmaksas un paziņosim, kad tas būs gatavs.</p>
            </div>
          </section>

          <section className={s.section} aria-labelledby="payment">
            <h2 id="payment" className={s.sectionTitle}>
              Apmaksa
            </h2>
            <div className={s.infoBox}>
              <p className={s.infoTitle}>Rēķins ar bankas pārskaitījumu</p>
              <p className={s.muted}>
                Rēķinu (PDF) saņemsiet e-pastā uzreiz pēc pasūtīšanas. Apmaksas termiņš – {site.paymentDueDays}{" "}
                dienas.
              </p>
            </div>
          </section>

          {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
          <div className={s.honeypot} aria-hidden>
            <label>
              Mājaslapa
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>
        </div>

        <aside className={s.summary} aria-labelledby="order-summary">
          <h2 id="order-summary" className={s.summaryTitle}>
            Jūsu pasūtījums
          </h2>
          <ul className={s.items}>
            {lines.map((l) => (
              <li key={l.variantId}>
                <span>
                  {l.name}
                  <span className={s.muted}>
                    {" "}
                    · {l.variantLabel} × {l.qty}
                  </span>
                </span>
                <span className={s.amount}>{formatPrice(l.priceCents * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className={s.rows}>
            <div>
              <dt>
                Starpsumma ({count} {plural(count, "prece", "preces")})
              </dt>
              <dd>{formatPrice(totals.netCents + totals.vatCents)}</dd>
            </div>
            {totals.depositCents && (
              <div>
                <dt>Depozīts (bez PVN)</dt>
                <dd>{formatPrice(totals.depositCents)}</dd>
              </div>
            )}
            <div>
              <dt>Saņemšana veikalā</dt>
              <dd>Bezmaksas</dd>
            </div>
            <div>
              <dt>t. sk. PVN {Math.round(site.vatRate * 100)}%</dt>
              <dd>{formatPrice(totals.vatCents)}</dd>
            </div>
          </dl>
          <p className={s.total}>
            <span>Kopā</span>
            <span>{formatPrice(totals.grossCents)}</span>
          </p>

          {hasAlcohol && (
            <label className={errors.ageConfirmed ? `${s.check} ${s.checkError}` : s.check}>
              <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} />
              <span>
                Apstiprinu, ka man ir vismaz {site.minimumAge} gadu, un saņemot uzrādīšu personu apliecinošu
                dokumentu.
                {errors.ageConfirmed && <span className={s.error}>{errors.ageConfirmed}</span>}
              </span>
            </label>
          )}

          <button type="submit" className={s.submit} disabled={pending}>
            {pending ? "Noformējam…" : "Pasūtīt un saņemt rēķinu"}
          </button>
        </aside>
      </div>
    </form>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;

type FieldProps = InputProps & {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

function Field({ label, value, error, onChange, ...props }: FieldProps) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className={s.error}>
          {error}
        </span>
      )}
    </div>
  );
}
