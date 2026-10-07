"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/core";
import { formatMoney } from "@/lib/core";
import { formatCatalog, parseCatalogFile, type CatalogFormat } from "@/lib/catalog-format";

type Store = { id: string; publicKey: string; name: string; storeUrl: string; currency: string };
type Account = { userId: string; name: string; email: string; tenantId: string; stores: Store[] };
type Dashboard = {
  user: { name: string; email: string }; store: Store; stores: Store[]; products: Product[];
  metrics: { products: number; available_products: number; conversations: number; product_impressions: number; product_clicks: number };
  topProducts: { product_id: string; title: string; clicks: number }[];
};
type Panel = "overview" | "catalogue" | "install" | "settings";
const panelNames: Record<Panel, string> = { overview: "Overview", catalogue: "Catalogue", install: "Website setup", settings: "Store settings" };
const panelMarks: Record<Panel, string> = { overview: "◫", catalogue: "▦", install: "↗", settings: "⚙" };
const formatNames: Record<CatalogFormat, string> = { csv: "CSV", json: "JSON", xml: "XML" };

export default function MerchantPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState<Panel>("overview");
  const [exportFormat, setExportFormat] = useState<CatalogFormat>("csv");
  const [mode, setMode] = useState<"register" | "login">("register");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadDashboard() {
    const response = await fetch("/api/merchant/dashboard", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load the dashboard.");
    setDashboard(data);
  }

  async function loadAccount() {
    try {
      const response = await fetch("/api/merchant/auth", { cache: "no-store" });
      if (response.status === 401) { setAccount(null); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Merchant accounts need a configured database.");
      setAccount(data);
      await loadDashboard();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not connect to your account."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadAccount(); }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/merchant/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, action: mode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete the request.");
      setAccount(data); await loadDashboard();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not complete the request."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await fetch("/api/merchant/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setAccount(null); setDashboard(null); setMessage("");
  }

  async function changeStore(tenantId: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/merchant/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "switch", tenantId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not switch stores.");
      await loadAccount();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not switch stores."); }
    finally { setBusy(false); }
  }

  async function uploadCatalogue(file?: File) {
    if (!file || !dashboard) return;
    setBusy(true); setMessage("");
    try {
      if (file.size > 2_000_000) throw new Error("Choose a catalogue file under 2 MB.");
      const extension = file.name.toLowerCase().split(".").pop();
      if (extension !== "csv" && extension !== "json" && extension !== "xml") throw new Error("Choose a CSV, JSON, or XML file.");
      const products = parseCatalogFile(await file.text(), extension as CatalogFormat, dashboard.store.currency);
      const response = await fetch("/api/merchant/catalog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ products }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save the catalogue.");
      setMessage(`${data.productCount} products are now in ${dashboard.store.name}’s catalogue.`);
      await loadDashboard();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read this catalogue file."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  function exportCatalogue() {
    if (!dashboard?.products.length) return;
    const mime = exportFormat === "csv" ? "text/csv" : exportFormat === "json" ? "application/json" : "application/xml";
    const blob = new Blob([formatCatalog(dashboard.products, exportFormat)], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `arieya-${dashboard.store.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "store"}-catalogue.${exportFormat}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`Catalogue exported as ${formatNames[exportFormat]}.`);
  }

  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/merchant/store", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save store settings.");
      setMessage("Store details saved."); await loadAccount();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save store settings."); }
    finally { setBusy(false); }
  }

  async function addStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/merchant/stores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not add this store.");
      setMessage("New store added."); await loadAccount();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add this store."); }
    finally { setBusy(false); }
  }

  const appOrigin = typeof window === "undefined" ? process.env.NEXT_PUBLIC_APP_ORIGIN || "" : window.location.origin;
  const snippet = dashboard ? `<iframe src="${appOrigin}/stylist?store=${dashboard.store.publicKey}" title="Shop with Arieya" loading="lazy" style="width:100%;height:720px;border:0" allow="clipboard-write"></iframe>` : "";
  const clickRate = dashboard?.metrics.product_impressions ? Math.round(dashboard.metrics.product_clicks / dashboard.metrics.product_impressions * 100) : 0;

  if (loading) return <main className="merchant-page"><header className="site-header wrap merchant-topbar"><a className="wordmark" href="/" aria-label="Arieya home">ARIEYA</a></header><div className="merchant-loading">Opening your store studio…</div></main>;

  if (!account || !dashboard) return <main className="merchant-page"><header className="site-header wrap merchant-topbar"><a className="wordmark" href="/" aria-label="Arieya home">ARIEYA</a><nav aria-label="Main navigation"><a href="/#showcase">The experience</a><a href="/#difference">Why Arieya</a></nav><div className="landing-header-actions"><a className="button button--small" href="/#pilot">Join the pilot <span>↗</span></a></div></header><section className="merchant-auth"><div className="merchant-auth-copy"><span className="eyebrow">Arieya for stores</span><h1>Your catalogue,<br />made easier to explore.</h1><p>Give shoppers a calmer way to find what they want. Bring your product file, preview the advisor, and see which products earn attention.</p><div className="merchant-auth-points"><span>CSV, JSON, XML</span><span>Works with your website</span><span>One private space per store</span></div></div><form className="merchant-auth-card" onSubmit={submitAuth}><div className="merchant-tabs"><button type="button" className={mode === "register" ? "is-active" : ""} onClick={() => setMode("register")}>Create account</button><button type="button" className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")}>Sign in</button></div><span className="eyebrow">{mode === "register" ? "Start your store workspace" : "Welcome back"}</span><h2>{mode === "register" ? "Set up your account." : "Continue to your store."}</h2>{mode === "register" && <><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label><label>Store name<input name="storeName" autoComplete="organization" required minLength={2} maxLength={100} /></label><label>Store website<input name="storeUrl" type="url" placeholder="https://yourstore.com" required /></label><label>Catalogue currency<select name="currency" defaultValue="GBP"><option value="GBP">GBP · £</option><option value="USD">USD · $</option><option value="EUR">EUR · €</option></select></label></>}<label>Email<input name="email" type="email" autoComplete="email" required maxLength={200} /></label><label>Password<input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={12} maxLength={200} /><small>Use at least 12 characters.</small></label>{message && <p className="merchant-notice" role="status">{message}</p>}<button className="merchant-button" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create my workspace ↗" : "Sign in ↗"}</button><small>Your store’s catalogue and activity stay isolated in its own workspace.</small></form></section></main>;

  return <main className="merchant-page">
    <header className="site-header wrap merchant-topbar">
      <a className="wordmark" href="/" aria-label="Arieya home">ARIEYA</a>
      <div className="merchant-topbar-context"><span className="status-dot" /><div><small>Store workspace</small><strong>{dashboard.store.name}</strong></div></div>
      <div className="landing-header-actions">
        <a className="button button--secondary button--small" href={`/stylist?store=${dashboard.store.publicKey}`} target="_blank" rel="noreferrer">Shopper preview <span>↗</span></a>
        <div className="merchant-account"><span aria-hidden="true">{account.name.trim().charAt(0).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.email}</small></div></div>
        <button className="button button--small merchant-signout" onClick={() => void signOut()}>Sign out</button>
      </div>
    </header>
    <div className="merchant-workspace">
      <aside className="merchant-nav">
        <div className="merchant-nav-brand"><span>a</span><div><strong>ARIEYA</strong><small>MERCHANT STUDIO</small></div></div>
        <label className="merchant-store-switcher"><span>YOUR STORES</span><select aria-label="Active store" value={dashboard.store.id} disabled={busy} onChange={(event) => void changeStore(event.target.value)}>{dashboard.stores.map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}</select><small>Private workspace</small></label>
        <span className="merchant-nav-section">Workspace</span>
        <nav className="merchant-nav-list" aria-label="Store workspace">{(["overview", "catalogue", "install", "settings"] as Panel[]).map((item) => <button type="button" key={item} aria-current={panel === item ? "page" : undefined} className={panel === item ? "is-active" : ""} onClick={() => { setPanel(item); setMessage(""); }}><span className="merchant-nav-icon" aria-hidden="true">{panelMarks[item]}</span><span>{panelNames[item]}</span>{item === "catalogue" && <small>{dashboard.metrics.products}</small>}</button>)}</nav>
        <div className="merchant-nav-note"><span className="status-dot" /><div><strong>Preview workspace</strong><small>Only you can access this store</small></div></div>
      </aside>
      <section className="merchant-content">
        <div className="merchant-page-heading"><div><span className="eyebrow">{dashboard.store.name} · Founding preview</span><h1>{panel === "overview" ? "A clearer view of discovery." : panel === "catalogue" ? "Your product catalogue." : panel === "install" ? "Bring Arieya to your site." : "Store settings."}</h1><p>{panel === "overview" ? "See how shoppers explore your collection and where they click." : panel === "catalogue" ? "Import products from the systems you already use." : panel === "install" ? "Add a full-page shopping advisor to any website." : "Keep your store details and product currency current."}</p></div>{panel === "overview" && <button className="merchant-button merchant-button--small" onClick={() => setPanel("catalogue")}>Add catalogue ↗</button>}</div>

      {message && <p className="merchant-flash" role="status">{message}</p>}

      {panel === "overview" && <><div className="merchant-metrics"><article><span>Available products</span><strong>{dashboard.metrics.available_products}</strong><small>of {dashboard.metrics.products} in your catalogue</small></article><article><span>Shopper conversations</span><strong>{dashboard.metrics.conversations}</strong><small>last 30 days</small></article><article><span>Product clicks</span><strong>{dashboard.metrics.product_clicks}</strong><small>from advisor recommendations</small></article><article><span>Product click rate</span><strong>{clickRate}%</strong><small>{dashboard.metrics.product_impressions} product views · last 30 days</small></article></div><div className="merchant-overview-grid"><article className="merchant-card merchant-card--wide"><div className="merchant-card-heading"><div><span className="eyebrow">Shopper interest · 30 days</span><h2>Products shoppers opened</h2></div><button className="merchant-text-button" onClick={() => setPanel("catalogue")}>View catalogue ↗</button></div>{dashboard.topProducts.length ? <div className="merchant-top-products">{dashboard.topProducts.map((product, index) => <div key={product.product_id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{product.title}</strong><b>{product.clicks} clicks</b></div>)}</div> : <div className="merchant-empty"><span>✧</span><p>Product interest will appear here when shoppers start exploring.</p><button className="merchant-text-button" onClick={() => setPanel("install")}>Add the advisor to your website ↗</button></div>}</article><article className="merchant-card merchant-next-step"><span className="eyebrow">A simple next step</span><h2>{dashboard.metrics.products ? "Preview your advisor." : "Bring your catalogue."}</h2><p>{dashboard.metrics.products ? "Open the shopper experience with your own products." : "Upload a product feed and see Arieya use your real catalogue."}</p><button className="merchant-button" onClick={() => setPanel(dashboard.metrics.products ? "install" : "catalogue")}>{dashboard.metrics.products ? "Set up your website ↗" : "Upload catalogue ↗"}</button></article></div></>}

      {panel === "catalogue" && <section className="merchant-card merchant-catalogue">
        <div className="merchant-card-heading"><div><span className="eyebrow">{dashboard.metrics.products} products · {dashboard.metrics.available_products} available</span><h2>Catalogue Atelier</h2></div><label className="merchant-button merchant-file-button">{busy ? "Importing…" : "Import catalogue ↗"}<input ref={fileRef} type="file" accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml" disabled={busy} onChange={(event) => void uploadCatalogue(event.target.files?.[0])} /></label></div>
        <p className="merchant-intro">Upload a CSV, JSON, or XML product feed. Arieya validates each product and keeps it in this store’s private catalogue.</p>
        <div className="merchant-catalogue-toolbar"><span>{dashboard.products.length} {dashboard.products.length === 1 ? "product" : "products"}</span><div className="merchant-export-controls"><label><span>Export as</span><select aria-label="Export format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as CatalogFormat)}><option value="csv">CSV</option><option value="json">JSON</option><option value="xml">XML</option></select></label><button className="merchant-outline-button" type="button" disabled={!dashboard.products.length} onClick={exportCatalogue}>Download {formatNames[exportFormat]} ↓</button></div></div>
        {dashboard.products.length ? <div className="merchant-product-grid">{dashboard.products.map((product) => <article className="merchant-product-card" key={product.id}>
          <a className="merchant-product-card-image" href={product.url} target="_blank" rel="noreferrer" aria-label={`View ${product.title} on your store`}>{product.imageUrl ? <img src={product.imageUrl} alt={product.title} loading="lazy" /> : <span aria-hidden="true">{product.title.charAt(0).toUpperCase()}</span>}<i aria-hidden="true">↗</i></a>
          <div className="merchant-product-card-body"><div className="merchant-product-card-meta"><span>{product.category}</span><span className={product.available ? "is-available" : "is-unavailable"}><i />{product.available ? "Available" : "Out of stock"}</span></div><h3>{product.title}</h3>{product.description && <p>{product.description}</p>}<div className="merchant-product-card-footer"><strong>{formatMoney(product.priceMinor, product.currency)}</strong><a href={product.url} target="_blank" rel="noreferrer">View product ↗</a></div></div>
        </article>)}</div> : <div className="merchant-empty"><span>01</span><p>Your product catalogue is empty. Start with 30 or more products for a richer shopping experience.</p><label className="merchant-button merchant-file-button">Choose catalogue<input type="file" accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml" disabled={busy} onChange={(event) => void uploadCatalogue(event.target.files?.[0])} /></label></div>}
        <small className="merchant-format-note">Maximum file size 2 MB · 1–500 products · HTTPS product links required</small>
      </section>}

      {panel === "install" && <div className="merchant-install-grid"><article className="merchant-card"><span className="eyebrow">Hosted advisor · any website</span><h2>One snippet. Your full-page experience.</h2><p>Place this iframe where you want Arieya to appear. It opens a complete, tenant-specific shopper experience and sends shoppers back to your own product pages.</p><pre>{snippet}</pre><div className="merchant-install-actions"><button className="merchant-button" onClick={() => { void navigator.clipboard.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }}>{copied ? "Copied" : "Copy snippet ↗"}</button><a className="merchant-outline-button" href={`/stylist?store=${dashboard.store.publicKey}`} target="_blank" rel="noreferrer">Preview advisor</a></div></article><article className="merchant-card merchant-install-check"><span className="eyebrow">Before you publish</span><h2>Check the essentials.</h2><ul><li><span>{dashboard.metrics.available_products ? "✓" : "01"}</span><div><strong>Import your catalogue</strong><small>{dashboard.metrics.available_products ? `${dashboard.metrics.available_products} available products` : "CSV, JSON, or XML · recommended: 30+ products"}</small></div></li><li><span>02</span><div><strong>Confirm product URLs</strong><small>Each card opens the product page you supplied.</small></div></li><li><span>03</span><div><strong>Choose a placement</strong><small>Set the iframe height and position to suit your page.</small></div></li></ul><a href={dashboard.store.storeUrl} target="_blank" rel="noreferrer">Visit {dashboard.store.name} ↗</a></article></div>}

      {panel === "settings" && <div className="merchant-settings-grid"><form className="merchant-card merchant-settings-form" onSubmit={saveStore}><span className="eyebrow">Store profile</span><h2>Details shoppers recognize.</h2><label>Store name<input name="name" defaultValue={dashboard.store.name} required minLength={2} maxLength={100} /></label><label>Store website<input name="storeUrl" type="url" defaultValue={dashboard.store.storeUrl} required /></label><label>Catalogue currency<select name="currency" defaultValue={dashboard.store.currency}><option value="GBP">GBP · £</option><option value="USD">USD · $</option><option value="EUR">EUR · €</option></select></label><button className="merchant-button" disabled={busy}>Save store details ↗</button></form><form className="merchant-card merchant-settings-form" onSubmit={addStore}><span className="eyebrow">Another storefront</span><h2>Each store gets its own space.</h2><p>Separate catalogues, recommendations, and shopper activity for each website.</p><label>Store name<input name="name" required minLength={2} maxLength={100} placeholder="Aurora Home" /></label><label>Store website<input name="storeUrl" type="url" required placeholder="https://yourstore.com" /></label><label>Catalogue currency<select name="currency" defaultValue="GBP"><option value="GBP">GBP · £</option><option value="USD">USD · $</option><option value="EUR">EUR · €</option></select></label><button className="merchant-outline-button" disabled={busy}>Add another store ↗</button></form></div>}

      <footer className="merchant-footnote">Metrics cover product discovery and recommendation clicks. Checkout and sales attribution are not connected yet.</footer>
      </section></div></main>;
}
