"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { MAX_QTY, removeLine, setQty, useCart, type CartLine } from "@/lib/cart";
import { formatPrice, splitVat } from "@/lib/money";
import { plural } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { pickup, site } from "@/config/site";
import { CloseIcon, IdIcon } from "@/components/icons";
import s from "./CartView.module.scss";

const noopSubscribe = () => () => {};

// Only manual invoices for now; card payments come later.
const PAYMENT_METHODS: { id: PaymentMethod; title: string; note: string }[] = [
  {
    id: "bank_transfer",
    title: "Rēķins ar bankas pārskaitījumu",
    note: `Rēķinu nosūtīsim uz e-pastu. Apmaksas termiņš – ${site.paymentDueDays} dienas. Pasūtījumu sagatavosim pēc apmaksas saņemšanas.`,
  },
];

export function CartView() {
  const lines = useCart();
  // The cart lives in localStorage, so the server can't know it; render nothing until hydrated.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [payment, setPayment] = useState<PaymentMethod>("bank_transfer");

  if (!hydrated) return <div className={s.placeholder} />;

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const totals = splitVat(lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0));
  const hasAlcohol = lines.some((l) => l.isAlcohol);
  const items = `${count} ${plural(count, "prece", "preces")}`;

  if (lines.length === 0) {
    return (
      <div className={s.empty}>
        <h1 className={s.title}>Jūsu grozs</h1>
        <p>Grozs ir tukšs.</p>
        <Link href="/katalogs" className={s.emptyButton}>
          Uz katalogu
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className={s.header}>
        <h1 className={s.title}>Jūsu grozs</h1>
        <p className={s.subtitle}>{items} · saņemšana veikalā</p>
      </header>

      <div className={s.layout}>
        <div>
          <div className={s.notice}>
            <div className={s.noticeText}>
              <p>
                Saņemšana tikai veikalā – <strong>{pickup.address}</strong>
              </p>
              <p className={s.muted}>{pickup.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}</p>
            </div>
            <Link href="/katalogs" className={s.keepShopping}>
              Turpināt iepirkties
            </Link>
          </div>

          <ul className={s.lines}>
            {lines.map((line) => (
              <li key={line.variantId}>
                <CartRow line={line} />
              </li>
            ))}
          </ul>
        </div>

        <aside className={s.summary} aria-labelledby="cart-summary">
          <h2 id="cart-summary" className={s.summaryTitle}>
            Kopsavilkums
          </h2>

          <dl className={s.rows}>
            <div>
              <dt>Starpsumma ({items})</dt>
              <dd>{formatPrice(totals.grossCents)}</dd>
            </div>
            <div>
              <dt>Saņemšana veikalā</dt>
              <dd>Bezmaksas</dd>
            </div>
            <div>
              <dt>t. sk. PVN {Math.round(site.vatRate * 100)}%</dt>
              <dd>{formatPrice(totals.vatCents)}</dd>
            </div>
          </dl>

          <p className={s.balance}>
            <span>Kopā</span>
            <span>{formatPrice(totals.grossCents)}</span>
          </p>

          <fieldset className={s.payment}>
            <legend className={s.paymentLegend}>Apmaksas veids</legend>
            {PAYMENT_METHODS.map((m) => (
              <label key={m.id} className={s.method}>
                <input
                  type="radio"
                  name="payment"
                  value={m.id}
                  checked={payment === m.id}
                  onChange={() => setPayment(m.id)}
                />
                <span>
                  <span className={s.methodTitle}>{m.title}</span>
                  <span className={s.methodNote}>{m.note}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {hasAlcohol && (
            <p className={s.ageNote}>
              <IdIcon width={20} height={20} />
              Grozā ir alkoholiskie dzērieni. Saņemot jāuzrāda dokuments – tikai no {site.minimumAge} gadu
              vecuma.
            </p>
          )}

          {/* Placeholder: order creation and invoice generation aren't built yet. */}
          <button type="button" className={s.checkout}>
            Noformēt pasūtījumu
          </button>
        </aside>
      </div>
    </>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const href = `/produkts/${line.slug}`;

  return (
    <article className={s.line}>
      <Link href={href} className={s.tile} tabIndex={-1} aria-hidden>
        {line.image && <Image src={line.image} alt="" fill sizes="10rem" className={s.image} />}
      </Link>

      <div className={s.lineInfo}>
        <h3 className={s.lineName}>
          <Link href={href}>{line.name}</Link>
        </h3>
        <p className={s.muted}>{line.variantLabel}</p>
        {line.qty > 1 && <p className={s.muted}>{formatPrice(line.priceCents)} / gab.</p>}
      </div>

      <button
        type="button"
        className={s.remove}
        onClick={() => removeLine(line.variantId)}
        aria-label={`Izņemt ${line.name} no groza`}
      >
        <CloseIcon width={14} height={14} strokeWidth={2.5} />
      </button>

      <div className={s.stepper} role="group" aria-label={`Daudzums: ${line.name}`}>
        <button
          type="button"
          onClick={() => setQty(line.variantId, line.qty - 1)}
          disabled={line.qty <= 1}
          aria-label="Samazināt daudzumu"
        >
          −
        </button>
        <output aria-live="polite">{line.qty}</output>
        <button
          type="button"
          onClick={() => setQty(line.variantId, line.qty + 1)}
          disabled={line.qty >= MAX_QTY}
          aria-label="Palielināt daudzumu"
        >
          +
        </button>
      </div>

      <p className={s.linePrice}>{formatPrice(line.priceCents * line.qty)}</p>
    </article>
  );
}
