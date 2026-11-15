/** Called from a user action in the browser; keeps generated data on-device. */
export function downloadCsv(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Give mobile browsers time to start reading the Blob before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
