export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** UTF-8 BOM and CRLF rows keep Spanish text readable in Excel. */
export function createCsv(
  headers: readonly string[],
  rows: Iterable<readonly CsvCell[]>,
): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    if (row.length !== headers.length) {
      throw new Error("CSV row must match the header column count");
    }
    lines.push(row.map(escapeCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
