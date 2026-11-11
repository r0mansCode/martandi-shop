import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import s from "./page.module.scss";

export const metadata: Metadata = {
  title: "Noformēt pasūtījumu",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className={s.page}>
      <CheckoutForm />
    </div>
  );
}
