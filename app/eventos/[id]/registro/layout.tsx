import Link from "next/link";

export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return <main className="registration-page">
    <header className="registration-header"><Link className="brand" href="/" aria-label="Door List, ir al inicio">door list<span className="brand-dot">.</span></Link><span>Nos vemos ahí.</span></header>
    {children}
    <footer className="footer">Buenos momentos, mejores encuentros.</footer>
  </main>;
}
