import Link from "next/link";
import s from "./not-found.module.scss";

export default function NotFound() {
  return (
    <div className={s.root}>
      <h1 className={s.title}>Lapa nav atrasta</h1>
      <p>Iespējams, produkts vairs nav pieejams vai saite ir mainījusies.</p>
      <Link href="/katalogs" className={s.button}>
        Uz katalogu
      </Link>
    </div>
  );
}
