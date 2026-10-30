"use client";

import { ChangeEvent, useRef, useState } from "react";
import { formatCatalog, parseCatalogFile, type CatalogFormat } from "@/lib/catalog-format";
import type { Product } from "@/lib/core";
import { formatMoney } from "@/lib/core";

const labels: Record<CatalogFormat, string> = { csv: "CSV", json: "JSON", xml: "XML" };

export function CatalogConverter() {
  const [products, setProducts] = useState<Product[]>([]);
  const [format, setFormat] = useState<CatalogFormat>("csv");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProducts([]);
    setNotice("");
    try {
      if (file.size > 2_000_000) throw new Error("Choose a file under 2 MB.");
      const extension = file.name.toLowerCase().split(".").pop();
      if (extension !== "csv" && extension !== "json" && extension !== "xml") throw new Error("Choose a CSV, JSON, or XML product file.");
      const rows = parseCatalogFile(await file.text(), extension, "USD");
      setProducts(rows);
      setNotice(file.name + " · " + rows.length + " products ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "This catalogue could not be read.");
    } finally {
      event.target.value = "";
    }
  }

  function download() {
    if (!products.length) return;
    const mime = format === "csv" ? "text/csv" : format === "json" ? "application/json" : "application/xml";
    const blob = new Blob([formatCatalog(products, format)], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "arieya-catalogue." + format;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="converter-tool">
    <div className="converter-step"><span>01</span><div><strong>Choose a catalogue</strong><small>Up to 2 MB · CSV, JSON, or XML</small></div></div>
    <label className="converter-drop">
      <input ref={input} type="file" accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml" onChange={load} />
      <span className="converter-upload-icon">↑</span>
      <strong>{products.length ? "Choose a different file" : "Choose a file from your device"}</strong>
      <small>or drop it here</small>
    </label>
    <p className="converter-status" role="status">{notice || "Works best with product title, price, currency, availability, and product link."}</p>
    {products.length > 0 && <div className="converter-ready">
      <div><span className="eyebrow">Catalogue checked</span><strong>{products.length} products</strong><small>{products.filter((product) => product.available).length} marked available · {products[0].currency}</small></div>
      <label><span>Convert to</span><select value={format} onChange={(event) => setFormat(event.target.value as CatalogFormat)}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <button className="button" type="button" onClick={download}>Download {labels[format]} <span>↓</span></button>
    </div>}
    {products.length > 0 && <div className="converter-preview"><span className="eyebrow">First products</span>{products.slice(0, 3).map((product) => <div key={product.id}><strong>{product.title}</strong><small>{product.category} · {formatMoney(product.priceMinor, product.currency)}</small></div>)}</div>}
    <div className="converter-fields"><span>Standardized product details</span><p>Product ID · title · description · category · price · currency · stock · product URL · image · attributes</p></div>
    <p className="converter-note">We keep product facts as you supplied them. Rows without a valid price, stock status, or public HTTPS product link need to be corrected before conversion.</p>
  </div>;
}
