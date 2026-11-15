import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tu entrada",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
  referrer: "no-referrer",
};

export default function TicketLayout({ children }: { children: React.ReactNode }) {
  return <main className="registration-page">
    <header className="registration-header"><Link className="brand" href="/" aria-label="Door List, ir al inicio">door list<span className="brand-dot">.</span></Link><span>Tu próximo encuentro.</span></header>
    {children}
    <footer className="footer">Buenos momentos, mejores encuentros.</footer>
  </main>;
}
