import assert from "node:assert/strict";
import { test } from "node:test";
import { downloadCsv } from "../lib/export/download.ts";

test("download action creates a UTF-8 CSV file with the requested filename and releases its resources", () => {
  const originalDocument = globalThis.document;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const originalTimeout = globalThis.setTimeout;
  const calls = [];
  let cleanup;
  let createdBlob;
  const link = {
    href: "", download: "",
    click() { calls.push("click"); }, remove() { calls.push("remove"); },
  };
  globalThis.document = {
    createElement(tag) { assert.equal(tag, "a"); return link; },
    body: { appendChild(item) { assert.equal(item, link); calls.push("append"); } },
  };
  URL.createObjectURL = blob => { createdBlob = blob; return "blob:local-csv"; };
  URL.revokeObjectURL = url => { assert.equal(url, "blob:local-csv"); calls.push("revoke"); };
  globalThis.setTimeout = (fn, delay) => { assert.equal(delay, 60000); cleanup = fn; };
  try {
    downloadCsv("\uFEFFnombre\r\nMaría\r\n", "asistentes-musica-2026-11-15.csv");
    assert.equal(link.href, "blob:local-csv");
    assert.equal(link.download, "asistentes-musica-2026-11-15.csv");
    assert.equal(createdBlob.type, "text/csv;charset=utf-8");
    assert.deepEqual(calls, ["append", "click", "remove"]);
    cleanup();
    assert.deepEqual(calls, ["append", "click", "remove", "revoke"]);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    globalThis.setTimeout = originalTimeout;
  }
});
