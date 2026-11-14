import type { Metadata } from "next";
import { seller } from "@/config/seller";
import { site } from "@/config/site";
import s from "./page.module.scss";

export const metadata: Metadata = {
  title: "Privātuma politika",
  description: `Kā ${site.name} apstrādā pircēju personas datus.`,
};

// Short on purpose: the shop has no analytics, ads or customer accounts.
// Update the date below whenever the text changes.
export default function PrivacyPage() {
  return (
    <article className={s.root}>
      <h1 className={s.title}>Privātuma politika</h1>
      <p className={s.updated}>Spēkā no 2026. gada 14. novembra</p>

      <h2>Kas apstrādā jūsu datus</h2>
      <p>
        Personas datu pārzinis ir {seller.name}, reģ. Nr. {seller.regNo}, {seller.address}. Ar jautājumiem par
        saviem datiem rakstiet uz <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>

      <h2>Kādus datus vācam un kāpēc</h2>
      <p>Dati, ko norādāt, noformējot pasūtījumu:</p>
      <ul>
        <li>vārds, uzvārds, e-pasts un tālrunis;</li>
        <li>uzņēmuma pircējiem – nosaukums, reģistrācijas numurs, PVN numurs un juridiskā adrese;</li>
        <li>pasūtītās preces, summa un apstiprinājums, ka jums ir vismaz 18 gadu.</li>
      </ul>
      <p>
        Šos datus izmantojam tikai, lai izpildītu pasūtījumu: izrakstītu un nosūtītu rēķinu, informētu par
        pasūtījuma statusu un izsniegtu preces veikalā. Tiesiskais pamats ir līguma izpilde un grāmatvedības
        prasības. Mēs nesūtām reklāmas e-pastus un nepārdodam datus trešajām personām.
      </p>

      <h2>Sīkdatnes un pārlūka krātuve</h2>
      <p>
        Mēs neizmantojam analītikas, reklāmas vai sekošanas sīkdatnes. Jūsu pārlūkā saglabājam tikai iepirkumu
        grozu un atzīmi, ka paziņojums par privātumu ir aizvērts. Šī informācija paliek jūsu ierīcē, un to
        var izdzēst, notīrot pārlūka datus.
      </p>
      <p>
        Pasūtījuma noformēšanas brīdī jūsu IP adresi īslaicīgi izmantojam, lai aizsargātu veikalu pret
        automatizētiem pieprasījumiem. Tā netiek saglabāta pie pasūtījuma.
      </p>

      <h2>Kas vēl redz datus</h2>
      <p>Datus apstrādā tikai pakalpojumu sniedzēji, kas nepieciešami veikala darbībai:</p>
      <ul>
        <li>Amazon Web Services – vietnes mitināšana un datu glabāšana Eiropas Savienībā (Stokholmā);</li>
        <li>Resend – rēķinu un pasūtījuma statusa e-pastu nosūtīšana;</li>
        <li>Zoho Mail – mūsu e-pasta kastīte, ja mums rakstāt.</li>
      </ul>

      <h2>Cik ilgi glabājam</h2>
      <p>
        Pasūtījumus un rēķinus glabājam tik ilgi, cik to prasa Latvijas grāmatvedības normatīvie akti, pēc tam
        tos dzēšam.
      </p>

      <h2>Jūsu tiesības</h2>
      <p>
        Jums ir tiesības piekļūt saviem datiem, tos labot, prasīt dzēšanu vai apstrādes ierobežošanu, ciktāl
        tas nav pretrunā ar likumā noteikto glabāšanas pienākumu. Rakstiet uz{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>. Ja uzskatāt, ka jūsu dati tiek apstrādāti
        nelikumīgi, varat iesniegt sūdzību Datu valsts inspekcijā (
        <a href="https://www.dvi.gov.lv" rel="noopener">
          www.dvi.gov.lv
        </a>
        ).
      </p>
    </article>
  );
}
