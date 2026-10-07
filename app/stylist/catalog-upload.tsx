"use client";
import { useRef, useState } from "react";
import { parseCatalogFile, type CatalogFormat } from "@/lib/catalog-format";

export function CatalogUpload({ count, disabled, currency, onChange }: { count: number; disabled: boolean; currency: string; onChange: (count: number, currency: string) => void }) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(file: File | null) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (file && file.size > 2_000_000) throw new Error("Choose a catalogue file under 2 MB.");
      const extension = file?.name.toLowerCase().split(".").pop();
      if (file && extension !== "csv" && extension !== "json" && extension !== "xml") throw new Error("Choose a CSV, JSON, or XML file.");
      const products = file ? parseCatalogFile(await file.text(), extension as CatalogFormat, currency) : null;
      const response = await fetch("/api/v1/catalog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ products }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not upload catalogue.");
      onChange(data.productCount, data.currency);
      setNotice(file ? `${data.productCount} products ready. Your question allowance stays the same.` : "Sample catalogue restored.");
    } catch (error) { setNotice(error instanceof SyntaxError ? "That file could not be read. Check its format and try again." : error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <details id="catalogue" className="catalog-upload">
    <summary>{count ? `Your catalogue · ${count} products` : "Bring your own product catalogue"}</summary>
    <p>Upload up to 500 products as CSV, JSON, or XML. Arieya keeps the catalogue in this browser’s trial and uses its product facts to find relevant matches.</p>
    <div className="catalog-upload__actions">
      <a className="text-link" href="/catalogue">Convert a catalogue ↗</a>
      <label className="button button--secondary button--small">{busy ? "Saving…" : "Upload catalogue"}<input ref={input} type="file" accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml" disabled={disabled || busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
      {count > 0 && <button type="button" className="button--ghost" disabled={disabled || busy} onClick={() => void upload(null)}>Remove my catalogue</button>}
    </div>
    <p role="status">{notice}</p>
    <small>Include product title, price, currency, availability, and a public HTTPS product link. Product facts are not inferred.</small>
  </details>;
}
