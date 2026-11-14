"use client";

import { startTransition, useActionState, useState } from "react";
import { saveHours } from "../actions";
import { initialFormState } from "@/lib/catalog-input";
import { closureText, groupHours, hoursLine, WEEKDAYS, type DayHours, type ShopHours } from "@/lib/shop-hours";
import a from "../admin.module.scss";
import s from "./hours.module.scss";

export function HoursForm({ initial, today }: { initial: ShopHours; today: string }) {
  const [state, formAction, pending] = useActionState(saveHours, initialFormState);
  const [hours, setHours] = useState(initial);
  const err = (key: string) => state.errors[key];

  const setDay = (i: number, patch: Partial<DayHours>) =>
    setHours((h) => ({ ...h, week: h.week.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));

  const notice = closureText(hours, today);
  const ended = hours.closedFrom !== "" && !notice;

  return (
    <form
      className={a.form}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData();
        data.set("hours", JSON.stringify(hours));
        startTransition(() => formAction(data));
      }}
    >
      <section className={a.section}>
        <h2>Darba laiks</h2>
        <p className={a.hint}>Tajā pašā laikā var saņemt pasūtījumus. Veikalā redzams kā: {hoursLine(groupHours(hours.week))}</p>
        <div className={s.week}>
          {WEEKDAYS.map((wd, i) => {
            const d = hours.week[i];
            return (
              <fieldset key={wd.short} className={s.day}>
                <legend className={s.dayName}>{wd.name}</legend>
                <label className={a.check}>
                  <input type="checkbox" checked={d.closed} onChange={(e) => setDay(i, { closed: e.target.checked })} />
                  Slēgts
                </label>
                <input
                  type="time"
                  aria-label={`${wd.name}: atver`}
                  className={err(`week.${i}.open`) ? `${a.input} ${a.invalid}` : a.input}
                  value={d.open}
                  disabled={d.closed}
                  onChange={(e) => setDay(i, { open: e.target.value })}
                />
                <span aria-hidden>–</span>
                <input
                  type="time"
                  aria-label={`${wd.name}: aizver`}
                  className={err(`week.${i}.close`) ? `${a.input} ${a.invalid}` : a.input}
                  value={d.close}
                  disabled={d.closed}
                  onChange={(e) => setDay(i, { close: e.target.value })}
                />
                {(err(`week.${i}.open`) || err(`week.${i}.close`)) && (
                  <span className={`${a.error} ${s.dayError}`}>{err(`week.${i}.open`) ?? err(`week.${i}.close`)}</span>
                )}
              </fieldset>
            );
          })}
        </div>
      </section>

      <section className={a.section}>
        <h2>Slēgšanas paziņojums</h2>
        <p className={a.hint}>
          Rādās veikalā līdz norādītā perioda beigām, pēc tam pazūd pats. Vienai dienai atstājiet „Līdz” tukšu.
        </p>
        <div className={a.row}>
          <label className={a.field}>
            <span>No</span>
            <input
              type="date"
              className={err("closedFrom") ? `${a.input} ${a.invalid}` : a.input}
              value={hours.closedFrom}
              onChange={(e) => setHours((h) => ({ ...h, closedFrom: e.target.value }))}
            />
            {err("closedFrom") && <span className={a.error}>{err("closedFrom")}</span>}
          </label>
          <label className={a.field}>
            <span>Līdz</span>
            <input
              type="date"
              className={err("closedTo") ? `${a.input} ${a.invalid}` : a.input}
              value={hours.closedTo}
              min={hours.closedFrom || undefined}
              onChange={(e) => setHours((h) => ({ ...h, closedTo: e.target.value }))}
            />
            {err("closedTo") && <span className={a.error}>{err("closedTo")}</span>}
          </label>
        </div>
        {notice && <p className={s.preview}>{notice}</p>}
        {ended && <p className={a.hint}>Šis periods jau beidzies, tāpēc veikalā netiek rādīts.</p>}
        {hours.closedFrom && (
          <div>
            <button
              type="button"
              className={a.linkButton}
              onClick={() => setHours((h) => ({ ...h, closedFrom: "", closedTo: "" }))}
            >
              Noņemt paziņojumu
            </button>
          </div>
        )}
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
