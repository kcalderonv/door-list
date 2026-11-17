"use client";

import { useState } from "react";

export default function CopyTicketLink({ path }: { path: string }) {
  const [result, setResult] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  async function copyLink() {
    setIsCopying(true);
    setResult("");
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setResult("Enlace copiado. Guárdalo en un lugar privado.");
    } catch {
      setResult("No se pudo copiar el enlace. Cópialo desde la barra de direcciones y guárdalo en un lugar privado.");
    } finally {
      setIsCopying(false);
    }
  }

  return <div className="ticket-copy">
    <button className="ticket-copy-button" type="button" onClick={copyLink} disabled={isCopying}>
      {isCopying ? "Copiando…" : "Copiar enlace"}
    </button>
    <p className="ticket-copy-result" role="status" aria-atomic="true">{result}</p>
  </div>;
}
