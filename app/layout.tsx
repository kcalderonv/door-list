import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { siteUrl } from "./site";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  title: { default: "Door List | Eventos y encuentros", template: "%s | Door List" },
  description: "Conoce los detalles de eventos y encuentros en Door List.",
  openGraph: { type: "website", locale: "es_PE", siteName: "Door List", title: "Door List | Eventos y encuentros", description: "Conoce los detalles de eventos y encuentros en Door List." },
  twitter: { card: "summary", title: "Door List | Eventos y encuentros", description: "Conoce los detalles de eventos y encuentros en Door List." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={`${sans.variable} ${display.variable}`}><body>{children}</body></html>;
}
