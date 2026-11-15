import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { getInvoiceLogo } from "@/server/invoice-logos";
import { INVOICE_LOGOS, LOGO_TYPES, MAX_LOGO_BYTES, type InvoiceLogo } from "@/lib/invoice-logos";
import { INVOICE_MESSAGES } from "@/lib/invoice-messages";
import { ConfirmButton } from "../../ConfirmButton";
import { resetLogo, uploadInvoiceLogo } from "../actions";
import { InvoiceTabs } from "../Tabs";
import a from "../../admin.module.scss";
import s from "../invoices.module.scss";

export const metadata: Metadata = { title: "Rēķinu logotipi" };

/** Replace or reset the logos a manual invoice can carry. */
export default async function InvoiceLogos({ searchParams }: PageProps<"/admin/rekini/logotipi">) {
  await requireAdmin();
  const zina = (await searchParams).zina;
  const message = typeof zina === "string" ? INVOICE_MESSAGES[zina] : undefined;
  const logos = Object.keys(INVOICE_LOGOS) as InvoiceLogo[];
  const images = await Promise.all(logos.map(getInvoiceLogo));

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.title}>Rēķini</h1>
      </div>
      <InvoiceTabs active="logos" />

      {message && (
        <p className={message.error ? `${a.message} ${a.messageError}` : a.message} role="status">
          {message.text}
        </p>
      )}

      <p className={a.hint}>
        PNG vai JPEG līdz {MAX_LOGO_BYTES / 1024} KB; ieteicams caurspīdīgs fons un vismaz 400 px platumā. Rēķinā logotips
        tiek ietilpināts 180 × 56 pt laukumā. PDF tiek veidots katru reizi no jauna, tāpēc jaunais logotips parādās arī
        jau izrakstītajos rēķinos ar šo logotipu.
      </p>

      <div className={s.logoGrid}>
        {logos.map((logo, i) => {
          const custom = !!images[i].updatedAt;
          return (
            <section key={logo} className={a.section}>
              <h2>{INVOICE_LOGOS[logo]}</h2>
              <div className={s.logoPreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/admin/rekini/logotipi/${logo}?v=${images[i].updatedAt ?? "default"}`} alt={`${INVOICE_LOGOS[logo]} logotips`} />
              </div>
              <span className={a.muted}>{custom ? "Augšupielādēts" : "Noklusējuma attēls"}</span>
              <form action={uploadInvoiceLogo.bind(null, logo)} className={s.logoUpload}>
                <input type="file" name="file" accept={LOGO_TYPES.join(",")} required aria-label={`Jauns ${INVOICE_LOGOS[logo]} logotips`} />
                <button type="submit" className={a.buttonSecondary}>
                  Augšupielādēt
                </button>
              </form>
              {custom && (
                <form action={resetLogo.bind(null, logo)}>
                  <ConfirmButton confirm={`Atjaunot noklusējuma ${INVOICE_LOGOS[logo]} logotipu?`} className={a.linkButton}>
                    Atjaunot noklusējumu
                  </ConfirmButton>
                </form>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
