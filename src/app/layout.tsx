import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { site } from "@/config/site";
import "./globals.scss";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} – vīni un stiprie dzērieni`,
    template: `%s | ${site.name}`,
  },
  description:
    "Vīni, stiprie dzērieni un bezalkoholiskie dzērieni ar saņemšanu veikalā Rīgā.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="lv" className={`${inter.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
