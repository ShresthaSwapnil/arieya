"use client";

import { FormEvent, Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/core";
import { formatMoney } from "@/lib/core";
import { convertCatalogFile, formatCatalog, type CatalogFormat } from "@/lib/catalog-format";
import { SiteHeader } from "@/app/components/site-header";

type Store = { id: string; publicKey: string; name: string; storeUrl: string; currency: string };
type Account = { userId: string; name: string; email: string; tenantId: string; stores: Store[] };
type Dashboard = {
  user: { name: string; email: string };
  store: Store;
  stores: Store[];
  products: Product[];
  metrics: {
    products: number;
    available_products: number;
    conversations: number;
    product_impressions: number;
    product_clicks: number;
  };
  topProducts: { product_id: string; title: string; clicks: number }[];
  billing?: {
    plan: string;
    status: string;
    sessionAllowance: number;
    sessionsUsed: number;
    renewsAt: string | null;
    endsAt: string | null;
    trialEndsAt: string | null;
    cardBrand: string | null;
    cardLastFour: string | null;
    portalUrl: string | null;
    isSubscribed: boolean;
  };
};

type Panel = "catalogue" | "install" | "overview" | "billing" | "settings";

const formatNames: Record<CatalogFormat, string> = { csv: "CSV", json: "JSON", xml: "XML" };

function normalizeDomainInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/^\/+/, "").replace(/\/$/, "")}`;
}

function displayDomain(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function collectCustomFields(products: Product[]): string[] {
  const keys = new Set<string>();
  for (const p of products) {
    if (p.material) keys.add("material");
    if (p.color) keys.add("color");
    if (p.imageUrl) keys.add("imageUrl");
    if (p.attributes) {
      for (const k of Object.keys(p.attributes)) {
        if (k.trim()) keys.add(k.trim());
      }
    }
  }
  return Array.from(keys);
}

function getProductFieldValue(product: Product, field: string): string {
  if (field === "material") return product.material || "";
  if (field === "color") return product.color || "";
  if (field === "imageUrl") return product.imageUrl || "";
  if (field === "gemstone") return product.gemstone || "";
  return product.attributes?.[field] || "";
}

function setProductFieldValue(product: Product, field: string, value: string): Product {
  const trimmed = value;
  if (field === "material") return { ...product, material: trimmed || undefined };
  if (field === "color") return { ...product, color: trimmed || undefined };
  if (field === "imageUrl") return { ...product, imageUrl: trimmed || undefined };
  if (field === "gemstone") return { ...product, gemstone: trimmed || null };
  const nextAttrs = { ...(product.attributes || {}) };
  if (trimmed) nextAttrs[field] = trimmed;
  else delete nextAttrs[field];
  return { ...product, attributes: Object.keys(nextAttrs).length ? nextAttrs : undefined };
}

function removeProductField(product: Product, field: string): Product {
  if (field === "material") {
    const next = { ...product };
    delete next.material;
    return next;
  }
  if (field === "color") {
    const next = { ...product };
    delete next.color;
    return next;
  }
  if (field === "imageUrl") {
    const next = { ...product };
    delete next.imageUrl;
    return next;
  }
  if (field === "gemstone") {
    return { ...product, gemstone: null };
  }
  if (!product.attributes) return product;
  const nextAttrs = { ...product.attributes };
  delete nextAttrs[field];
  return { ...product, attributes: Object.keys(nextAttrs).length ? nextAttrs : undefined };
}

/* ─── Native Modal Dialog Helper (Modern Web Guidance compliant) ─── */
function NativeModal({
  open,
  onClose,
  title,
  eyebrow,
  narrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  narrow?: boolean;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback for browsers without native dialog closedBy="any" support
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
    };
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
    }
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`merchant-dialog ${narrow ? "merchant-dialog--narrow" : ""}`}
      {...({ closedby: "any" } as any)}
    >
      <div className="merchant-modal-header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={titleId} className="merchant-dialog-title">{title}</h2>
        </div>
        <button type="button" className="merchant-modal-close" onClick={onClose} aria-label="Close dialog">
          ×
        </button>
      </div>
      <div className="merchant-modal-body">{children}</div>
    </dialog>
  );
}

/* ═══════════════════════════════════════════ Main Content ═══════════════════════════════════════════ */

function MerchantPageContent() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "success" | "error">("info");
  const [panel, setPanel] = useState<Panel>("catalogue");
  const [hasChosenInitialPanel, setHasChosenInitialPanel] = useState(false);
  const [exportFormat, setExportFormat] = useState<CatalogFormat>("csv");
  const [mode, setMode] = useState<"register" | "login">("register");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable Catalogue Studio State
  const [workingProducts, setWorkingProducts] = useState<Product[]>([]);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [conversionNotes, setConversionNotes] = useState<string[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogView, setCatalogView] = useState<"table" | "cards">("table");

  // Modals state
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [addingProductOpen, setAddingProductOpen] = useState(false);
  const [addingFieldOpen, setAddingFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function notify(text: string, type: "info" | "success" | "error" = "info") {
    setMessage(text);
    setMessageType(type);
  }

  const syncWorkingCatalog = useCallback((products: Product[]) => {
    setWorkingProducts(products);
    setExtraColumns(collectCustomFields(products));
    setIsDirty(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/merchant/dashboard", { cache: "no-store" });
    const data = (await response.json()) as Dashboard & { error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load the dashboard.");
    setDashboard(data);
    syncWorkingCatalog(data.products || []);
    return data;
  }, [syncWorkingCatalog]);

  const loadAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/merchant/auth", { cache: "no-store" });
      if (!response.ok) {
        setAccount(null);
        setDashboard(null);
        return;
      }
      const data = await response.json();
      if (!data?.authenticated || !data.userId) {
        setAccount(null);
        setDashboard(null);
        return;
      }
      setAccount(data);
      const dash = await loadDashboard();
      if (!hasChosenInitialPanel) {
        setPanel(dash.products.length === 0 ? "catalogue" : "overview");
        setHasChosenInitialPanel(true);
      }
    } catch {
      setAccount(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, hasChosenInitialPanel]);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "login") setMode("login");
    else setMode("register");
    if (searchParams.get("billing") === "success") {
      notify("Subscription confirmed! Your store has been upgraded.", "success");
      setPanel("billing");
      setHasChosenInitialPanel(true);
    } else if (searchParams.get("billing") === "simulated") {
      notify(`Simulation mode: ${searchParams.get("plan") || "selected"} plan previewed.`, "info");
      setPanel("billing");
      setHasChosenInitialPanel(true);
    }
    void loadAccount();
  }, [searchParams, loadAccount]);

  function handleModeChange(nextMode: "register" | "login") {
    setMode(nextMode);
    setMessage("");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", nextMode === "login" ? "/merchant?mode=login" : "/merchant");
    }
  }

  /* ── Auth Submit (auto-normalizes domain.com & defaults currency to USD) ── */
  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const rawValues = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    if (mode === "register") {
      rawValues.storeUrl = normalizeDomainInput(rawValues.storeUrl || "");
      rawValues.currency = "USD";
    }
    try {
      const response = await fetch("/api/merchant/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...rawValues, action: mode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete the request.");
      setAccount(data);
      const dash = await loadDashboard();
      setPanel(dash.products.length === 0 ? "catalogue" : "overview");
      setHasChosenInitialPanel(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not complete the request.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/merchant/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      /* ignore */
    } finally {
      setAccount(null);
      setDashboard(null);
      setMessage("");
      setBusy(false);
      window.location.href = "/merchant?mode=login";
    }
  }

  async function changeStore(tenantId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/merchant/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "switch", tenantId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not switch stores.");
      await loadAccount();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not switch stores.", "error");
    } finally {
      setBusy(false);
    }
  }

  /* ── Smart File Upload & Auto-Converter (CSV, JSON, XML) ── */
  async function handleFileConvertAndLoad(file?: File) {
    if (!file || !dashboard) return;
    setBusy(true);
    setMessage("");
    setConversionNotes([]);
    try {
      if (file.size > 2_000_000) throw new Error("Choose a file under 2 MB.");
      const extension = file.name.toLowerCase().split(".").pop();
      if (extension !== "csv" && extension !== "json" && extension !== "xml") {
        throw new Error("Choose a CSV, JSON, or XML file.");
      }
      const text = await file.text();
      const report = convertCatalogFile(text, extension as CatalogFormat, {
        defaultCurrency: "USD",
        storeUrl: dashboard.store.storeUrl,
      });

      // Automatically save the converted products to the store so the user doesn't lose work,
      // and keep them editable in the spreadsheet table right away!
      const response = await fetch("/api/merchant/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ products: report.products, overwrite: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save converted catalogue.");

      setConversionNotes(report.notes);
      await loadDashboard();
      setCatalogView("table");
      notify(
        `Converted & imported ${data.productCount} products from ${file.name} (USD). You can edit any field, add columns, or convert formats below.`,
        "success",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not convert this file.", "error");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ── Save All Table Edits to Database ── */
  async function saveWorkingCatalog(productsToSave = workingProducts, customSuccessMessage?: string) {
    if (!dashboard) return;
    setBusy(true);
    setMessage("");
    try {
      if (productsToSave.length === 0) {
        const res = await fetch("/api/merchant/catalog", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clearAll: true }),
        });
        if (!res.ok) throw new Error("Could not clear catalogue.");
        await loadDashboard();
        notify(customSuccessMessage || "Catalogue cleared.", "success");
        return;
      }

      const storeBase = dashboard.store.storeUrl || "https://example.com";
      const sanitized = productsToSave.map((p, idx) => {
        const rawUrl = (p.url || "").trim();
        const url = /^https?:\/\//i.test(rawUrl)
          ? rawUrl.replace(/^http:\/\//i, "https://")
          : rawUrl
            ? `https://${rawUrl.replace(/^\/+/, "")}`
            : `${storeBase.replace(/\/$/, "")}/products/${p.id || idx + 1}`;
        return {
          ...p,
          title: p.title.trim() || `Product ${idx + 1}`,
          category: (p.category || "general").trim() || "general",
          priceMinor: Math.max(1, Math.round(Number(p.priceMinor) || 1000)),
          currency: "USD",
          url,
        };
      });

      const response = await fetch("/api/merchant/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ products: sanitized, overwrite: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save catalogue changes.");
      await loadDashboard();
      notify(customSuccessMessage || `Saved ${data.productCount} products to ${dashboard.store.name}.`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save changes.", "error");
    } finally {
      setBusy(false);
    }
  }

  /* ── Inline Table Cell Editing ── */
  function updateWorkingRow(productId: string, updater: (p: Product) => Product) {
    setWorkingProducts((prev) => prev.map((item) => (item.id === productId ? updater(item) : item)));
    setIsDirty(true);
  }

  async function deleteWorkingRow(productId: string, title: string) {
    const next = workingProducts.filter((p) => p.id !== productId);
    setWorkingProducts(next);
    await saveWorkingCatalog(next, `Removed "${title}" from your catalogue.`);
  }

  /* ── Add a New Product ── */
  async function handleAddNewProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "general").trim() || "general";
    const priceNum = Number(form.get("price") || "25");
    const priceMinor = Math.max(1, Math.round((Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 25) * 100));
    const description = String(form.get("description") || "").trim();
    const rawUrl = String(form.get("url") || "").trim();
    const idBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
    const id = `${idBase}-${Date.now().toString(36).slice(-4)}`;
    const storeBase = dashboard.store.storeUrl || "https://example.com";
    const url = rawUrl ? normalizeDomainInput(rawUrl) : `${storeBase.replace(/\/$/, "")}/products/${id}`;

    const newProduct: Product = {
      id,
      variantId: id,
      title,
      description,
      category,
      priceMinor,
      currency: "USD",
      available: form.get("available") !== "false",
      styles: [],
      occasions: [],
      priority: 0,
      imagePosition: "center",
      url,
    };

    const next = [newProduct, ...workingProducts];
    setAddingProductOpen(false);
    await saveWorkingCatalog(next, `Added "${title}" to your catalogue.`);
  }

  /* ── Add or Delete a Field / Column across the Catalogue ── */
  function handleAddField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = newFieldName.trim().replace(/[^a-zA-Z0-9_ -]/g, "").trim();
    if (!clean) return;
    if (!extraColumns.includes(clean)) {
      setExtraColumns((prev) => [...prev, clean]);
    }
    setNewFieldName("");
    setAddingFieldOpen(false);
    notify(`Added field "${clean}" to your table. Fill in values below and click Save Changes.`, "info");
  }

  async function handleDeleteFieldColumn(field: string) {
    const nextProducts = workingProducts.map((p) => removeProductField(p, field));
    setExtraColumns((prev) => prev.filter((col) => col !== field));
    setWorkingProducts(nextProducts);
    await saveWorkingCatalog(nextProducts, `Deleted field "${field}" from catalogue.`);
  }

  /* ── Convert & Export Current Table to CSV, JSON, or XML ── */
  function exportCatalogue(targetFormat: CatalogFormat = exportFormat) {
    if (!workingProducts.length || !dashboard) return;
    const mime = targetFormat === "csv" ? "text/csv" : targetFormat === "json" ? "application/json" : "application/xml";
    const normalizedForExport = workingProducts.map((p) => ({ ...p, currency: "USD" }));
    const blob = new Blob([formatCatalog(normalizedForExport, targetFormat)], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `arieya-${dashboard.store.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "store"}-catalogue.${targetFormat}`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify(`Converted & downloaded ${workingProducts.length} products as ${formatNames[targetFormat]}.`, "success");
  }

  /* ── Store Settings & Billing Handlers ── */
  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    values.storeUrl = normalizeDomainInput(values.storeUrl || "");
    values.currency = "USD";
    try {
      const response = await fetch("/api/merchant/store", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save store settings.");
      notify("Store details saved.", "success");
      await loadAccount();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save store settings.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function addStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    values.storeUrl = normalizeDomainInput(values.storeUrl || "");
    values.currency = "USD";
    try {
      const response = await fetch("/api/merchant/stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add this store.");
      notify("New store workspace created.", "success");
      await loadAccount();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add this store.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout(planId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/merchant/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Checkout error.", "error");
      setBusy(false);
    }
  }

  async function handlePortal() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/merchant/billing/portal");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open billing portal.");
      if (data.portalUrl) window.open(data.portalUrl, "_blank");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not open billing portal.", "error");
    } finally {
      setBusy(false);
    }
  }

  const appOrigin = typeof window === "undefined" ? process.env.NEXT_PUBLIC_APP_ORIGIN || "" : window.location.origin;
  const snippet = dashboard ? `<script src="https://www.arieya.site/arieya-sdk.js" data-store-key="${dashboard.store.publicKey}"></script>` : "";
  const iframeSnippet = dashboard
    ? `<iframe src="${appOrigin}/stylist?store=${dashboard.store.publicKey}&embed=true" title="Shop with Arieya" loading="lazy" style="width:100%;height:720px;border:0;border-radius:12px;" allow="clipboard-write"></iframe>`
    : "";
  const clickRate = dashboard?.metrics.product_impressions
    ? Math.round((dashboard.metrics.product_clicks / dashboard.metrics.product_impressions) * 100)
    : 0;

  const filteredProducts = workingProducts.filter((p) => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const hasCatalog = (dashboard?.metrics.products ?? 0) > 0;
  const hasConversations = (dashboard?.metrics.conversations ?? 0) > 0;
  const hasImpressions = (dashboard?.metrics.product_impressions ?? 0) > 0;

  /* ═══ LOADING ═══ */
  if (loading) {
    return (
      <main className="merchant-page merchant-page--auth">
        <SiteHeader />
        <div className="merchant-loading">Opening your store studio…</div>
      </main>
    );
  }

  /* ═══ AUTH SCREEN (SIGN UP / SIGN IN) ═══ */
  if (!account || !dashboard) {
    return (
      <main className="merchant-page merchant-page--auth">
        <SiteHeader />
        <section className="merchant-auth">
          <div className="merchant-auth-copy">
            <span className="eyebrow">Arieya Merchant Studio</span>
            <h1>Turn your catalogue into a guided shopping advisor.</h1>
            <p>
              Upload your product file (CSV, JSON, or XML), edit or convert fields right in your browser, and add a conversational shopping advisor to your store in 3 simple steps.
            </p>
            <div className="merchant-auth-steps-preview">
              <div><strong>1. Upload & Convert</strong><span>Drop any CSV, JSON, or XML feed — auto-mapped to USD.</span></div>
              <div><strong>2. Edit Fields Inline</strong><span>Add, edit, or delete products and columns in a live table.</span></div>
              <div><strong>3. Paste 1-Line Embed</strong><span>Add the advisor launcher to your site in under 2 minutes.</span></div>
            </div>
          </div>

          <form className="merchant-auth-card" onSubmit={submitAuth}>
            <div className="merchant-tabs">
              <button
                type="button"
                className={mode === "register" ? "is-active" : ""}
                onClick={() => handleModeChange("register")}
              >
                Create account
              </button>
              <button
                type="button"
                className={mode === "login" ? "is-active" : ""}
                onClick={() => handleModeChange("login")}
              >
                Sign in
              </button>
            </div>

            <span className="eyebrow">
              {mode === "register" ? "Start your store workspace" : "Welcome back"}
            </span>
            <h2>
              {mode === "register" ? "Set up your account." : "Sign in to your store."}
            </h2>

            {mode === "register" ? (
              <div className="merchant-auth-fields">
                <div className="merchant-auth-row">
                  <label htmlFor="reg-name">
                    Your name
                    <input
                      id="reg-name"
                      name="name"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Elena Rostova"
                    />
                  </label>
                  <label htmlFor="reg-store-name">
                    Store name
                    <input
                      id="reg-store-name"
                      name="storeName"
                      autoComplete="organization"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Atelier V"
                    />
                  </label>
                </div>

                <label htmlFor="reg-store-url">
                  Store website domain
                  <div className="merchant-domain-input-wrap">
                    <span className="merchant-domain-prefix" aria-hidden="true">https://</span>
                    <input
                      id="reg-store-url"
                      name="storeUrl"
                      type="text"
                      inputMode="url"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="yourstore.com"
                      required
                    />
                  </div>
                  <small>Just enter your domain (e.g. <code>abc.com</code>) — no need to type <code>https://www.</code></small>
                </label>

                <div className="merchant-auth-row">
                  <label htmlFor="reg-email">
                    Work email
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      spellCheck={false}
                      required
                      maxLength={200}
                      placeholder="you@store.com"
                    />
                  </label>
                  <label htmlFor="reg-password">
                    Password
                    <div className="merchant-password-wrap">
                      <input
                        id="reg-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={200}
                        placeholder="Min 12 characters"
                      />
                      <button
                        type="button"
                        className="merchant-password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>
                </div>

                <div className="merchant-disclaimer">
                  <span aria-hidden="true">ℹ</span>
                  <p>Arieya will independently filter your product based on USD as default.</p>
                </div>
              </div>
            ) : (
              <div className="merchant-auth-fields">
                <label htmlFor="login-email">
                  Email
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    required
                    maxLength={200}
                    placeholder="you@store.com"
                  />
                </label>
                <label htmlFor="login-password">
                  Password
                  <div className="merchant-password-wrap">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      minLength={12}
                      maxLength={200}
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      className="merchant-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </div>
            )}

            {message && <p className="merchant-notice" role="status">{message}</p>}

            <button type="submit" className="merchant-button" disabled={busy}>
              {busy ? "Please wait…" : mode === "register" ? "Create my workspace ↗" : "Sign in ↗"}
            </button>
            <small>Your store’s catalogue and activity stay isolated in its own private workspace.</small>
          </form>
        </section>
      </main>
    );
  }

  const editingProduct = editingProductIndex !== null ? workingProducts[editingProductIndex] || null : null;

  /* ═══ AUTHENTICATED MERCHANT STUDIO ═══ */
  return (
    <main className="merchant-page">
      {/* ── Top Header ── */}
      <header className="site-header wrap merchant-topbar">
        <a className="wordmark" href="/" aria-label="Arieya home">ARIEYA</a>
        <div className="merchant-topbar-context">
          <span className="status-dot" />
          <div>
            <small>Store Workspace · {displayDomain(dashboard.store.storeUrl)}</small>
            <strong>{dashboard.store.name}</strong>
          </div>
        </div>
        <div className="landing-header-actions">
          <a
            className="button button--secondary button--small"
            href={`/stylist?store=${dashboard.store.publicKey}`}
            target="_blank"
            rel="noreferrer"
          >
            Test Shopper Advisor <span>↗</span>
          </a>
          <div className="merchant-account">
            <span aria-hidden="true">{account.name.trim().charAt(0).toUpperCase()}</span>
            <div>
              <strong>{account.name}</strong>
              <small>{account.email}</small>
            </div>
          </div>
          <button type="button" className="button button--small merchant-signout" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="merchant-workspace">
        {/* ── Clear, Structured Left Sidebar ── */}
        <aside className="merchant-nav">
          <label className="merchant-store-switcher">
            <span>ACTIVE STORE</span>
            <select
              aria-label="Active store"
              value={dashboard.store.id}
              disabled={busy}
              onChange={(e) => void changeStore(e.target.value)}
            >
              {dashboard.stores.map((store) => (
                <option value={store.id} key={store.id}>{store.name}</option>
              ))}
            </select>
            <small>{displayDomain(dashboard.store.storeUrl)} · USD ($)</small>
          </label>

          <span className="merchant-nav-section">Store Setup Flow</span>
          <nav className="merchant-nav-list" aria-label="Store workspace">
            <button
              type="button"
              aria-current={panel === "catalogue" ? "page" : undefined}
              className={panel === "catalogue" ? "is-active" : ""}
              onClick={() => { setPanel("catalogue"); setMessage(""); }}
            >
              <span className="merchant-nav-step-num">{hasCatalog ? "✓" : "1"}</span>
              <div className="merchant-nav-item-text">
                <span>Products &amp; Converter</span>
                <small>Import, convert &amp; edit fields</small>
              </div>
              <small className="merchant-nav-badge">{workingProducts.length}</small>
            </button>

            <button
              type="button"
              aria-current={panel === "install" ? "page" : undefined}
              className={panel === "install" ? "is-active" : ""}
              onClick={() => { setPanel("install"); setMessage(""); }}
            >
              <span className="merchant-nav-step-num">{hasImpressions ? "✓" : "2"}</span>
              <div className="merchant-nav-item-text">
                <span>Install on Website</span>
                <small>Copy embed code &amp; test</small>
              </div>
            </button>

            <button
              type="button"
              aria-current={panel === "overview" ? "page" : undefined}
              className={panel === "overview" ? "is-active" : ""}
              onClick={() => { setPanel("overview"); setMessage(""); }}
            >
              <span className="merchant-nav-step-num">3</span>
              <div className="merchant-nav-item-text">
                <span>Overview &amp; Analytics</span>
                <small>Chats, views &amp; clicks</small>
              </div>
            </button>
          </nav>

          <span className="merchant-nav-section" style={{ marginTop: 18 }}>Account &amp; Plan</span>
          <nav className="merchant-nav-list" aria-label="Account settings">
            <button
              type="button"
              aria-current={panel === "billing" ? "page" : undefined}
              className={panel === "billing" ? "is-active" : ""}
              onClick={() => { setPanel("billing"); setMessage(""); }}
            >
              <span className="merchant-nav-icon" aria-hidden="true">✦</span>
              <div className="merchant-nav-item-text">
                <span>Plans &amp; Billing</span>
                <small>From $3.99/mo · Usage</small>
              </div>
            </button>

            <button
              type="button"
              aria-current={panel === "settings" ? "page" : undefined}
              className={panel === "settings" ? "is-active" : ""}
              onClick={() => { setPanel("settings"); setMessage(""); }}
            >
              <span className="merchant-nav-icon" aria-hidden="true">⚙</span>
              <div className="merchant-nav-item-text">
                <span>Store Settings</span>
                <small>Domain &amp; extra stores</small>
              </div>
            </button>
          </nav>

          <div className="merchant-nav-note">
            <span className="status-dot" />
            <div>
              <strong>{dashboard.billing?.isSubscribed ? `${dashboard.billing.plan} Plan Active` : "Founding Preview"}</strong>
              <small>{dashboard.billing?.sessionsUsed ?? 0} / {dashboard.billing?.sessionAllowance ?? 500} monthly sessions</small>
            </div>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <section className="merchant-content">
          {/* ── Clear 3-Step Guided Flow Banner at Top ── */}
          <div className="merchant-flow-stepper" role="region" aria-label="Store setup steps">
            <button
              type="button"
              className={`merchant-flow-step ${panel === "catalogue" ? "is-current" : ""} ${hasCatalog ? "is-done" : ""}`}
              onClick={() => setPanel("catalogue")}
            >
              <span className="merchant-flow-badge">{hasCatalog ? "✓" : "1"}</span>
              <div>
                <strong>Step 1: Add Your Products</strong>
                <small>{hasCatalog ? `${workingProducts.length} products in catalogue` : "Upload & convert CSV, JSON, or XML"}</small>
              </div>
            </button>

            <div className="merchant-flow-arrow" aria-hidden="true">→</div>

            <a
              className={`merchant-flow-step ${hasConversations ? "is-done" : ""}`}
              href={`/stylist?store=${dashboard.store.publicKey}`}
              target="_blank"
              rel="noreferrer"
            >
              <span className="merchant-flow-badge">{hasConversations ? "✓" : "2"}</span>
              <div>
                <strong>Step 2: Test AI Advisor ↗</strong>
                <small>{hasConversations ? `${dashboard.metrics.conversations} test chats run` : "Preview how shoppers search your store"}</small>
              </div>
            </a>

            <div className="merchant-flow-arrow" aria-hidden="true">→</div>

            <button
              type="button"
              className={`merchant-flow-step ${panel === "install" ? "is-current" : ""} ${hasImpressions ? "is-done" : ""}`}
              onClick={() => setPanel("install")}
            >
              <span className="merchant-flow-badge">{hasImpressions ? "✓" : "3"}</span>
              <div>
                <strong>Step 3: Embed on Website</strong>
                <small>{hasImpressions ? "Live on your storefront" : `Add 1-line script to ${displayDomain(dashboard.store.storeUrl)}`}</small>
              </div>
            </button>
          </div>

          {/* ── Status / Feedback Banner ── */}
          {message && (
            <div className={`merchant-flash merchant-flash--${messageType}`} role="status">
              <span>{message}</span>
              <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">×</button>
            </div>
          )}

          {/* ════════════════ PANEL 1: PRODUCTS & CONVERTER (CATALOGUE) ════════════════ */}
          {panel === "catalogue" && (
            <div className="merchant-catalogue-studio">
              {/* Header + Primary Actions */}
              <div className="merchant-studio-header">
                <div>
                  <span className="eyebrow">Step 1 · Products &amp; Format Converter (USD Default)</span>
                  <h1>Manage &amp; Convert Your Catalogue</h1>
                  <p>
                    Upload any <strong>CSV, JSON, or XML</strong> file to auto-convert it for Arieya, edit any product or column directly in the table below, or export to another format.
                  </p>
                </div>
              </div>

              {/* Unified Converter & Action Cards */}
              <div className="merchant-converter-bar">
                <div className="merchant-converter-upload-box">
                  <div>
                    <strong>1. Import &amp; Auto-Convert File</strong>
                    <small>Drop any CSV, JSON, or XML. Automatically maps headers &amp; normalizes currency to USD ($).</small>
                  </div>
                  <label className="merchant-button merchant-file-button">
                    {busy ? "Converting…" : "↑ Upload CSV / JSON / XML"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml"
                      disabled={busy}
                      onChange={(e) => void handleFileConvertAndLoad(e.target.files?.[0])}
                    />
                  </label>
                </div>

                <div className="merchant-converter-export-box">
                  <div>
                    <strong>2. Format Converter (Export)</strong>
                    <small>Convert your current {workingProducts.length} products into CSV, JSON, or XML.</small>
                  </div>
                  <div className="merchant-export-controls">
                    <select
                      aria-label="Convert to format"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as CatalogFormat)}
                    >
                      <option value="csv">CSV (.csv)</option>
                      <option value="json">JSON (.json)</option>
                      <option value="xml">XML (.xml)</option>
                    </select>
                    <button
                      type="button"
                      className="merchant-outline-button"
                      disabled={!workingProducts.length}
                      onClick={() => exportCatalogue(exportFormat)}
                    >
                      Download {formatNames[exportFormat]} ↓
                    </button>
                  </div>
                </div>
              </div>

              {/* Conversion Notes if any */}
              {conversionNotes.length > 0 && (
                <div className="merchant-conversion-notes">
                  <strong>Auto-Conversion Summary:</strong>
                  <ul>
                    {conversionNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unsaved Changes Bar */}
              {isDirty && (
                <div className="merchant-dirty-bar" role="region" aria-label="Unsaved catalogue changes">
                  <div>
                    <strong>You have unsaved edits in the table</strong>
                    <small>Click Save Changes to update your live store advisor.</small>
                  </div>
                  <div className="merchant-dirty-actions">
                    <button
                      type="button"
                      className="merchant-outline-button merchant-button--small"
                      disabled={busy}
                      onClick={() => syncWorkingCatalog(dashboard.products)}
                    >
                      Discard edits
                    </button>
                    <button
                      type="button"
                      className="merchant-button merchant-button--small"
                      disabled={busy}
                      onClick={() => void saveWorkingCatalog()}
                    >
                      {busy ? "Saving…" : `Save Changes (${workingProducts.length} products) ✓`}
                    </button>
                  </div>
                </div>
              )}

              {/* Table Toolbar: Search, Add Product, Add Field, Delete All, View Switch */}
              <div className="merchant-table-toolbar">
                <div className="merchant-catalogue-search">
                  <input
                    type="search"
                    placeholder="Filter products by title, category…"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    aria-label="Filter products"
                  />
                  <span>
                    Showing <strong>{filteredProducts.length}</strong> of {workingProducts.length}
                  </span>
                </div>

                <div className="merchant-table-actions">
                  <button
                    type="button"
                    className="merchant-button merchant-button--small"
                    onClick={() => setAddingProductOpen(true)}
                  >
                    + Add Product
                  </button>
                  <button
                    type="button"
                    className="merchant-outline-button merchant-button--small"
                    onClick={() => setAddingFieldOpen(true)}
                  >
                    + Add Field / Column
                  </button>
                  {workingProducts.length > 0 && (
                    <button
                      type="button"
                      className="merchant-outline-button merchant-button--small merchant-btn-danger-outline"
                      onClick={() => setClearConfirmOpen(true)}
                    >
                      Clear All
                    </button>
                  )}
                  <div className="merchant-view-switch" role="group" aria-label="Catalogue view mode">
                    <button
                      type="button"
                      className={catalogView === "table" ? "is-active" : ""}
                      onClick={() => setCatalogView("table")}
                    >
                      Table Editor
                    </button>
                    <button
                      type="button"
                      className={catalogView === "cards" ? "is-active" : ""}
                      onClick={() => setCatalogView("cards")}
                    >
                      Cards
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable Spreadsheet Table OR Cards */}
              {workingProducts.length === 0 ? (
                <div className="merchant-empty-catalogue">
                  <div className="merchant-empty-icon">▦</div>
                  <h2>Your product catalogue is empty</h2>
                  <p>
                    Upload a <strong>CSV, JSON, or XML</strong> file above to automatically convert and import your products, or add your first product manually.
                  </p>
                  <div className="merchant-empty-actions">
                    <label className="merchant-button merchant-file-button">
                      ↑ Upload CSV / JSON / XML
                      <input
                        type="file"
                        accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml"
                        disabled={busy}
                        onChange={(e) => void handleFileConvertAndLoad(e.target.files?.[0])}
                      />
                    </label>
                    <button type="button" className="merchant-outline-button" onClick={() => setAddingProductOpen(true)}>
                      + Add Product Manually
                    </button>
                  </div>
                </div>
              ) : catalogView === "table" ? (
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Editable product catalogue table"
                  className="merchant-spreadsheet-wrap"
                >
                  <table className="merchant-spreadsheet">
                    <thead>
                      <tr>
                        <th style={{ width: 42 }}>#</th>
                        <th style={{ minWidth: 210 }}>Title</th>
                        <th style={{ minWidth: 120 }}>Category</th>
                        <th style={{ minWidth: 110 }}>Price (USD $)</th>
                        <th style={{ minWidth: 105 }}>Stock</th>
                        <th style={{ minWidth: 200 }}>Product URL</th>
                        <th style={{ minWidth: 220 }}>Description</th>
                        {extraColumns.map((col) => (
                          <th key={col} style={{ minWidth: 150 }}>
                            <div className="merchant-col-header">
                              <span>{col}</span>
                              <button
                                type="button"
                                className="merchant-col-delete"
                                title={`Delete "${col}" field from all products`}
                                aria-label={`Delete ${col} field`}
                                onClick={() => void handleDeleteFieldColumn(col)}
                              >
                                ×
                              </button>
                            </div>
                          </th>
                        ))}
                        <th style={{ width: 110, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product, idx) => {
                        const realIndex = workingProducts.findIndex((p) => p.id === product.id);
                        return (
                          <tr key={product.id}>
                            <td className="cell-num">{idx + 1}</td>
                            <td>
                              <input
                                className="cell-input cell-input--bold"
                                value={product.title}
                                aria-label={`Title for product ${idx + 1}`}
                                onChange={(e) =>
                                  updateWorkingRow(product.id, (p) => ({ ...p, title: e.target.value }))
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="cell-input"
                                value={product.category}
                                aria-label={`Category for ${product.title}`}
                                onChange={(e) =>
                                  updateWorkingRow(product.id, (p) => ({ ...p, category: e.target.value }))
                                }
                              />
                            </td>
                            <td>
                              <div className="cell-price-wrap">
                                <span>$</span>
                                <input
                                  className="cell-input cell-input--price"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  aria-label={`Price in USD for ${product.title}`}
                                  value={(product.priceMinor / 100).toFixed(2)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (Number.isFinite(val) && val >= 0) {
                                      updateWorkingRow(product.id, (p) => ({
                                        ...p,
                                        priceMinor: Math.max(1, Math.round(val * 100)),
                                      }));
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`cell-stock-pill ${product.available ? "is-in" : "is-out"}`}
                                onClick={() =>
                                  updateWorkingRow(product.id, (p) => ({ ...p, available: !p.available }))
                                }
                              >
                                {product.available ? "✓ In stock" : "Out of stock"}
                              </button>
                            </td>
                            <td>
                              <div className="cell-url-wrap">
                                <input
                                  className="cell-input"
                                  value={product.url}
                                  aria-label={`URL for ${product.title}`}
                                  onChange={(e) =>
                                    updateWorkingRow(product.id, (p) => ({ ...p, url: e.target.value }))
                                  }
                                />
                                <a
                                  href={product.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="cell-url-open"
                                  title="Open link"
                                  aria-label={`Open ${product.title} URL`}
                                >
                                  ↗
                                </a>
                              </div>
                            </td>
                            <td>
                              <input
                                className="cell-input"
                                value={product.description || ""}
                                placeholder="Add description…"
                                aria-label={`Description for ${product.title}`}
                                onChange={(e) =>
                                  updateWorkingRow(product.id, (p) => ({ ...p, description: e.target.value }))
                                }
                              />
                            </td>
                            {extraColumns.map((col) => (
                              <td key={col}>
                                <input
                                  className="cell-input"
                                  value={getProductFieldValue(product, col)}
                                  placeholder={`Add ${col}…`}
                                  aria-label={`${col} for ${product.title}`}
                                  onChange={(e) =>
                                    updateWorkingRow(product.id, (p) =>
                                      setProductFieldValue(p, col, e.target.value),
                                    )
                                  }
                                />
                              </td>
                            ))}
                            <td className="cell-actions">
                              <button
                                type="button"
                                className="merchant-product-action-btn"
                                onClick={() => setEditingProductIndex(realIndex)}
                                title="Edit all product fields"
                                aria-label={`Edit details for ${product.title}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="merchant-product-action-btn merchant-product-action-btn--danger"
                                onClick={() => void deleteWorkingRow(product.id, product.title)}
                                title="Delete product"
                                aria-label={`Delete ${product.title}`}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="merchant-product-grid">
                  {filteredProducts.map((product) => {
                    const realIndex = workingProducts.findIndex((p) => p.id === product.id);
                    return (
                      <article className="merchant-product-card" key={product.id}>
                        {product.imageUrl && (
                          <a
                            className="merchant-product-card-image"
                            href={product.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${product.title}`}
                          >
                            <img src={product.imageUrl} alt={product.title} loading="lazy" />
                          </a>
                        )}
                        <div className="merchant-product-card-body">
                          <div className="merchant-product-card-meta">
                            <span>{product.category}</span>
                            <span className={product.available ? "is-available" : "is-unavailable"}>
                              <i />
                              {product.available ? "In stock" : "Out of stock"}
                            </span>
                          </div>
                          <h3>{product.title}</h3>
                          {product.description && <p>{product.description}</p>}
                          <div className="merchant-product-card-footer">
                            <strong>{formatMoney(product.priceMinor, "USD")}</strong>
                            <div className="merchant-product-actions">
                              <button
                                type="button"
                                className="merchant-product-action-btn"
                                onClick={() => setEditingProductIndex(realIndex)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="merchant-product-action-btn merchant-product-action-btn--danger"
                                onClick={() => void deleteWorkingRow(product.id, product.title)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Bottom Save & Next Step Footer */}
              {workingProducts.length > 0 && (
                <div className="merchant-studio-footer">
                  <span>
                    {workingProducts.length} products in catalogue · Filtered in <strong>USD ($)</strong> by default
                  </span>
                  <div style={{ display: "flex", gap: 10 }}>
                    {isDirty && (
                      <button
                        type="button"
                        className="merchant-button merchant-button--small"
                        disabled={busy}
                        onClick={() => void saveWorkingCatalog()}
                      >
                        {busy ? "Saving…" : "Save Catalogue Changes ✓"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="merchant-outline-button merchant-button--small"
                      onClick={() => setPanel("install")}
                    >
                      Next: Install on Website →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ PANEL 2: WEBSITE INSTALL ════════════════ */}
          {panel === "install" && (
            <div className="merchant-install-grid">
              <article className="merchant-card">
                <span className="eyebrow">Step 2 &amp; 3 · Add Arieya to {displayDomain(dashboard.store.storeUrl)}</span>
                <h2>Option A: Floating Advisor Button (Recommended)</h2>
                <p>
                  Paste this single line right before the closing <code>&lt;/body&gt;</code> tag of your website. It adds a floating <em>“Need help choosing?”</em> button that opens your store’s advisor.
                </p>
                <pre>{snippet}</pre>
                <div className="merchant-install-actions">
                  <button
                    type="button"
                    className="merchant-button"
                    onClick={() => {
                      void navigator.clipboard.writeText(snippet).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1800);
                      });
                    }}
                  >
                    {copied ? "Copied to clipboard ✓" : "Copy 1-Line Script ↗"}
                  </button>
                  <a
                    className="merchant-outline-button"
                    href={`/stylist?store=${dashboard.store.publicKey}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Test Live Advisor ↗
                  </a>
                  <a
                    className="merchant-text-button"
                    href="/guide"
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", marginLeft: "auto", fontSize: "12px" }}
                  >
                    Shopify / Wix / WordPress Guide ↗
                  </a>
                </div>

                <hr className="merchant-divider" />

                <h3>Option B: Inline Iframe Embed</h3>
                <p>If you want to embed the advisor directly inside a page section instead of a floating button:</p>
                <pre style={{ marginTop: "8px" }}>{iframeSnippet}</pre>
              </article>

              <article className="merchant-card merchant-install-check">
                <span className="eyebrow">Launch Checklist</span>
                <h2>Ready to go live?</h2>
                <ul>
                  <li>
                    <span>{dashboard.metrics.available_products ? "✓" : "1"}</span>
                    <div>
                      <strong>Products imported ({dashboard.metrics.available_products} available)</strong>
                      <small>
                        {dashboard.metrics.available_products
                          ? "Your catalogue is active and ready for shopper queries."
                          : "Import your CSV, JSON, or XML in Step 1 first."}
                      </small>
                    </div>
                  </li>
                  <li>
                    <span>{hasConversations ? "✓" : "2"}</span>
                    <div>
                      <strong>Test 3 preview questions</strong>
                      <small>Open the advisor preview to see how Arieya recommends your products.</small>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Approved domain: {displayDomain(dashboard.store.storeUrl)}</strong>
                      <small>Change your domain anytime in Store Settings.</small>
                    </div>
                  </li>
                </ul>
                <a className="merchant-button" href={`/stylist?store=${dashboard.store.publicKey}`} target="_blank" rel="noreferrer">
                  Open Shopper Preview ↗
                </a>
              </article>
            </div>
          )}

          {/* ════════════════ PANEL 3: OVERVIEW & ANALYTICS ════════════════ */}
          {panel === "overview" && (
            <>
              <div className="merchant-studio-header" style={{ marginBottom: 18 }}>
                <div>
                  <span className="eyebrow">Store Performance · Last 30 Days</span>
                  <h1>Overview &amp; Shopper Activity</h1>
                  <p>Track how many shoppers use your advisor and which products they click through to view.</p>
                </div>
              </div>

              <div className="merchant-metrics">
                <article>
                  <span>Available products</span>
                  <strong>{dashboard.metrics.available_products}</strong>
                  <small>of {dashboard.metrics.products} in your catalogue</small>
                </article>
                <article>
                  <span>Shopper conversations</span>
                  <strong>{dashboard.metrics.conversations}</strong>
                  <small>last 30 days</small>
                </article>
                <article>
                  <span>Product clicks</span>
                  <strong>{dashboard.metrics.product_clicks}</strong>
                  <small>clicks to your store pages</small>
                </article>
                <article>
                  <span>Click-through rate</span>
                  <strong>{clickRate}%</strong>
                  <small>{dashboard.metrics.product_impressions} product views · 30 days</small>
                </article>
              </div>

              <div className="merchant-overview-grid">
                <article className="merchant-card merchant-card--wide">
                  <div className="merchant-card-heading">
                    <div>
                      <span className="eyebrow">Top Performing Products · 30 Days</span>
                      <h2>Products shoppers clicked</h2>
                    </div>
                    <button type="button" className="merchant-outline-button merchant-button--small" onClick={() => setPanel("catalogue")}>
                      Edit Catalogue ({workingProducts.length}) →
                    </button>
                  </div>
                  {dashboard.topProducts.length ? (
                    <div className="merchant-top-products">
                      {dashboard.topProducts.map((product, index) => (
                        <div key={product.product_id}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <strong>{product.title}</strong>
                          <b>{product.clicks} clicks</b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="merchant-empty">
                      <span>✧</span>
                      <p>No product clicks recorded yet. Test your advisor or embed the snippet on your website to start seeing shopper demand.</p>
                      <button type="button" className="merchant-button merchant-button--small" onClick={() => setPanel("install")}>
                        Get Website Embed Code →
                      </button>
                    </div>
                  )}
                </article>

                <article className="merchant-card merchant-next-step">
                  <span className="eyebrow">Quick Actions</span>
                  <h2>Manage your store</h2>
                  <p>Update product prices, add new items, or grab your website installation script.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                    <button type="button" className="merchant-button" onClick={() => setPanel("catalogue")}>
                      Open Catalogue &amp; Converter →
                    </button>
                    <button type="button" className="merchant-outline-button" onClick={() => setPanel("install")}>
                      Website Embed Instructions →
                    </button>
                  </div>
                </article>
              </div>
            </>
          )}

          {/* ════════════════ PANEL 4: PLANS & BILLING ════════════════ */}
          {panel === "billing" && (
            <div className="merchant-billing-wrap">
              <article className="merchant-card merchant-billing-status">
                <div className="merchant-card-heading">
                  <div>
                    <span className="eyebrow">Subscription · {dashboard.store.name}</span>
                    <h2>
                      {dashboard.billing?.plan
                        ? dashboard.billing.plan.charAt(0).toUpperCase() + dashboard.billing.plan.slice(1)
                        : "Founding"}{" "}
                      Plan
                    </h2>
                  </div>
                  <div className="merchant-billing-badge-wrap">
                    <span className={`merchant-badge merchant-badge--${dashboard.billing?.status || "preview"}`}>
                      {dashboard.billing?.status === "active"
                        ? "● Active"
                        : dashboard.billing?.status === "trialing"
                          ? "● Trial"
                          : "● Preview"}
                    </span>
                  </div>
                </div>
                <div className="merchant-billing-stats">
                  <div className="merchant-billing-stat">
                    <span>Sessions (30 days)</span>
                    <strong>
                      {dashboard.billing?.sessionsUsed ?? 0}{" "}
                      <small>/ {dashboard.billing?.sessionAllowance ?? 500}</small>
                    </strong>
                    <div className="merchant-progress-bar">
                      <div
                        className="merchant-progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              ((dashboard.billing?.sessionsUsed ?? 0) /
                                (dashboard.billing?.sessionAllowance || 500)) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                    <small>
                      {Math.max(
                        0,
                        (dashboard.billing?.sessionAllowance || 500) - (dashboard.billing?.sessionsUsed ?? 0),
                      )}{" "}
                      remaining
                    </small>
                  </div>
                  <div className="merchant-billing-stat">
                    <span>Next Renewal</span>
                    <strong>
                      {dashboard.billing?.renewsAt
                        ? new Date(dashboard.billing.renewsAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </strong>
                    <small>{dashboard.billing?.isSubscribed ? "Renews automatically" : "Upgrade to scale"}</small>
                  </div>
                  <div className="merchant-billing-stat">
                    <span>Payment</span>
                    <strong>
                      {dashboard.billing?.cardLastFour
                        ? `${dashboard.billing.cardBrand || "Card"} •••• ${dashboard.billing.cardLastFour}`
                        : "No card on file"}
                    </strong>
                    <small>Secured by Lemon Squeezy</small>
                  </div>
                </div>
                {dashboard.billing?.isSubscribed ? (
                  <div className="merchant-billing-actions">
                    <span>Manage invoices, billing, or cancellation via Lemon Squeezy.</span>
                    <button type="button" className="merchant-button" disabled={busy} onClick={() => void handlePortal()}>
                      Manage Subscription ↗
                    </button>
                  </div>
                ) : (
                  <div className="merchant-billing-actions">
                    <span>Founding preview quota active (500 sessions). Select a plan below to unlock higher traffic.</span>
                  </div>
                )}
              </article>

              <div className="merchant-card-heading" style={{ margin: "24px 0 12px" }}>
                <div>
                  <span className="eyebrow">Available Plans</span>
                  <h2>Select a tier for {dashboard.store.name}</h2>
                </div>
                <small style={{ color: "var(--merchant-muted)" }}>Save 20% with annual billing · Powered by Lemon Squeezy</small>
              </div>

              <div className="merchant-pricing-grid">
                <article className={`merchant-plan-card ${dashboard.billing?.plan === "starter" ? "is-current" : ""}`}>
                  <span className="eyebrow">Starter</span>
                  <div className="merchant-plan-price">
                    <strong>$3.99</strong>
                    <small>/month</small>
                  </div>
                  <p className="merchant-plan-annual-note">Annual: $3.19/mo · billed $38.28/yr</p>
                  <p className="merchant-plan-desc">For emerging boutiques and small shops launching guided discovery.</p>
                  <ul className="merchant-plan-features">
                    <li><b>1,500</b> shopper sessions / month</li>
                    <li>Up to <b>500</b> catalogue products</li>
                    <li>1 storefront workspace</li>
                    <li>Floating launcher &amp; iframe embed</li>
                    <li>30-day interest metrics</li>
                    <li>Standard email support</li>
                  </ul>
                  <button
                    type="button"
                    className={dashboard.billing?.plan === "starter" ? "merchant-outline-button" : "merchant-button"}
                    disabled={busy || dashboard.billing?.plan === "starter"}
                    onClick={() => void handleCheckout("starter")}
                  >
                    {dashboard.billing?.plan === "starter" ? "Current plan" : "Select Starter ↗"}
                  </button>
                </article>

                <article
                  className={`merchant-plan-card merchant-plan-card--highlight ${
                    dashboard.billing?.plan === "growth" ? "is-current" : ""
                  }`}
                >
                  <span className="merchant-plan-badge">Most Popular</span>
                  <span className="eyebrow">Growth</span>
                  <div className="merchant-plan-price">
                    <strong>$5.99</strong>
                    <small>/month</small>
                  </div>
                  <p className="merchant-plan-annual-note">Annual: $4.79/mo · billed $57.48/yr</p>
                  <p className="merchant-plan-desc">For established brands scaling discovery and conversion.</p>
                  <ul className="merchant-plan-features">
                    <li><b>6,000</b> shopper sessions / month</li>
                    <li>Up to <b>2,500</b> catalogue products</li>
                    <li>Up to <b>3</b> store workspaces</li>
                    <li>Gemini AI soft-intent extraction</li>
                    <li>Custom brand styling</li>
                    <li>Weekly discovery trends</li>
                    <li>Priority merchant support</li>
                  </ul>
                  <button
                    type="button"
                    className="merchant-button"
                    disabled={busy || dashboard.billing?.plan === "growth"}
                    onClick={() => void handleCheckout("growth")}
                  >
                    {dashboard.billing?.plan === "growth" ? "Current plan" : "Select Growth ↗"}
                  </button>
                </article>

                <article className={`merchant-plan-card ${dashboard.billing?.plan === "pro" ? "is-current" : ""}`}>
                  <span className="eyebrow">Pro</span>
                  <div className="merchant-plan-price">
                    <strong>$9.99</strong>
                    <small>/month</small>
                  </div>
                  <p className="merchant-plan-annual-note">Annual: $7.99/mo · billed $95.88/yr</p>
                  <p className="merchant-plan-desc">For high-traffic retailers and multi-brand storefronts.</p>
                  <ul className="merchant-plan-features">
                    <li><b>25,000</b> shopper sessions / month</li>
                    <li>Up to <b>10,000</b> catalogue products</li>
                    <li>Up to <b>10</b> store workspaces</li>
                    <li>Shopify / WooCommerce sync API</li>
                    <li>Attributed order tracking</li>
                    <li>Concierge onboarding &amp; CSS review</li>
                    <li>Dedicated Slack &amp; 99.9% SLA</li>
                  </ul>
                  <button
                    type="button"
                    className={dashboard.billing?.plan === "pro" ? "merchant-outline-button" : "merchant-button"}
                    disabled={busy || dashboard.billing?.plan === "pro"}
                    onClick={() => void handleCheckout("pro")}
                  >
                    {dashboard.billing?.plan === "pro" ? "Current plan" : "Select Pro ↗"}
                  </button>
                </article>
              </div>
            </div>
          )}

          {/* ════════════════ PANEL 5: STORE SETTINGS ════════════════ */}
          {panel === "settings" && (
            <div className="merchant-settings-grid">
              <form className="merchant-card merchant-settings-form" onSubmit={saveStore}>
                <span className="eyebrow">Store profile</span>
                <h2>Store details &amp; domain</h2>
                <p>Your store name and domain are used to authorize your website embed and link shoppers to your products.</p>
                <label htmlFor="settings-store-name">
                  Store name
                  <input
                    id="settings-store-name"
                    name="name"
                    defaultValue={dashboard.store.name}
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label htmlFor="settings-store-url">
                  Store website domain
                  <div className="merchant-domain-input-wrap">
                    <span className="merchant-domain-prefix" aria-hidden="true">https://</span>
                    <input
                      id="settings-store-url"
                      name="storeUrl"
                      type="text"
                      inputMode="url"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      defaultValue={displayDomain(dashboard.store.storeUrl)}
                      placeholder="yourstore.com"
                      required
                    />
                  </div>
                </label>
                <div className="merchant-disclaimer">
                  <span aria-hidden="true">ℹ</span>
                  <p>Arieya filters products in USD ($) by default.</p>
                </div>
                <button type="submit" className="merchant-button" disabled={busy}>
                  Save store details ✓
                </button>
              </form>

              <form className="merchant-card merchant-settings-form" onSubmit={addStore}>
                <span className="eyebrow">Multi-store workspace</span>
                <h2>Add another storefront</h2>
                <p>Create a separate workspace with its own isolated product catalogue, embed key, and analytics.</p>
                <label htmlFor="add-store-name">
                  New store name
                  <input
                    id="add-store-name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Aurora Home"
                  />
                </label>
                <label htmlFor="add-store-url">
                  Store website domain
                  <div className="merchant-domain-input-wrap">
                    <span className="merchant-domain-prefix" aria-hidden="true">https://</span>
                    <input
                      id="add-store-url"
                      name="storeUrl"
                      type="text"
                      inputMode="url"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                      placeholder="aurorahome.com"
                    />
                  </div>
                </label>
                <button type="submit" className="merchant-outline-button" disabled={busy}>
                  + Create store workspace
                </button>
              </form>
            </div>
          )}

          <footer className="merchant-footnote">
            Metrics cover product discovery and recommendation clicks. Products are matched and filtered in USD ($) by default.
          </footer>
        </section>
      </div>

      {/* ── Modal: Edit All Fields of a Single Product ── */}
      <NativeModal
        open={editingProduct !== null}
        onClose={() => setEditingProductIndex(null)}
        eyebrow="Edit Product Fields"
        title={editingProduct ? editingProduct.title : "Edit product"}
      >
        {editingProduct && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditingProductIndex(null);
              void saveWorkingCatalog(workingProducts, `Saved changes to "${editingProduct.title}".`);
            }}
          >
            <div className="merchant-auth-row">
              <label>
                Title
                <input
                  value={editingProduct.title}
                  onChange={(e) => updateWorkingRow(editingProduct.id, (p) => ({ ...p, title: e.target.value }))}
                  required
                  maxLength={240}
                />
              </label>
              <label>
                Category
                <input
                  value={editingProduct.category}
                  onChange={(e) => updateWorkingRow(editingProduct.id, (p) => ({ ...p, category: e.target.value }))}
                  maxLength={100}
                />
              </label>
            </div>

            <div className="merchant-auth-row">
              <label>
                Price (USD $)
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={(editingProduct.priceMinor / 100).toFixed(2)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (Number.isFinite(val) && val > 0) {
                      updateWorkingRow(editingProduct.id, (p) => ({ ...p, priceMinor: Math.round(val * 100) }));
                    }
                  }}
                  required
                />
              </label>
              <label>
                Availability
                <select
                  value={editingProduct.available ? "true" : "false"}
                  onChange={(e) =>
                    updateWorkingRow(editingProduct.id, (p) => ({ ...p, available: e.target.value === "true" }))
                  }
                >
                  <option value="true">In stock</option>
                  <option value="false">Out of stock</option>
                </select>
              </label>
            </div>

            <label>
              Product Page URL
              <input
                type="text"
                inputMode="url"
                spellCheck={false}
                value={editingProduct.url}
                onChange={(e) => updateWorkingRow(editingProduct.id, (p) => ({ ...p, url: e.target.value }))}
                required
              />
            </label>

            <label>
              Image URL (optional)
              <input
                type="text"
                inputMode="url"
                spellCheck={false}
                value={editingProduct.imageUrl || ""}
                placeholder="https://yourstore.com/images/product.jpg"
                onChange={(e) =>
                  updateWorkingRow(editingProduct.id, (p) => ({ ...p, imageUrl: e.target.value || undefined }))
                }
              />
            </label>

            <label>
              Description
              <textarea
                rows={3}
                value={editingProduct.description || ""}
                onChange={(e) => updateWorkingRow(editingProduct.id, (p) => ({ ...p, description: e.target.value }))}
              />
            </label>

            <div className="merchant-auth-row">
              <label>
                Material (optional)
                <input
                  value={editingProduct.material || ""}
                  onChange={(e) =>
                    updateWorkingRow(editingProduct.id, (p) => ({ ...p, material: e.target.value || undefined }))
                  }
                />
              </label>
              <label>
                Color (optional)
                <input
                  value={editingProduct.color || ""}
                  onChange={(e) =>
                    updateWorkingRow(editingProduct.id, (p) => ({ ...p, color: e.target.value || undefined }))
                  }
                />
              </label>
            </div>

            {extraColumns
              .filter((c) => !["material", "color", "imageUrl"].includes(c))
              .map((col) => (
                <label key={col}>
                  {col}
                  <input
                    value={getProductFieldValue(editingProduct, col)}
                    onChange={(e) =>
                      updateWorkingRow(editingProduct.id, (p) => setProductFieldValue(p, col, e.target.value))
                    }
                  />
                </label>
              ))}

            <div className="merchant-modal-footer">
              <button type="button" className="merchant-outline-button" onClick={() => setEditingProductIndex(null)}>
                Close
              </button>
              <button type="submit" className="merchant-button" disabled={busy}>
                {busy ? "Saving…" : "Save Product ✓"}
              </button>
            </div>
          </form>
        )}
      </NativeModal>

      {/* ── Modal: Add New Product ── */}
      <NativeModal
        open={addingProductOpen}
        onClose={() => setAddingProductOpen(false)}
        eyebrow="Add to Catalogue"
        title="Add a New Product"
      >
        <form onSubmit={(e) => void handleAddNewProduct(e)}>
          <div className="merchant-auth-row">
            <label>
              Product Title
              <input name="title" required placeholder="Classic Linen Blazer" autoFocus />
            </label>
            <label>
              Category
              <input name="category" placeholder="jackets" defaultValue="general" />
            </label>
          </div>
          <div className="merchant-auth-row">
            <label>
              Price (USD $)
              <input name="price" type="number" step="0.01" min="0.01" defaultValue="49.00" required />
            </label>
            <label>
              Stock Status
              <select name="available" defaultValue="true">
                <option value="true">In stock</option>
                <option value="false">Out of stock</option>
              </select>
            </label>
          </div>
          <label>
            Product URL (optional — defaults to your store domain)
            <input name="url" type="text" inputMode="url" spellCheck={false} placeholder={`${displayDomain(dashboard.store.storeUrl)}/products/item`} />
          </label>
          <label>
            Description
            <textarea name="description" rows={3} placeholder="Describe materials, fit, style, or occasion…" />
          </label>
          <div className="merchant-modal-footer">
            <button type="button" className="merchant-outline-button" onClick={() => setAddingProductOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="merchant-button" disabled={busy}>
              + Add Product
            </button>
          </div>
        </form>
      </NativeModal>

      {/* ── Modal: Add Field / Column ── */}
      <NativeModal
        open={addingFieldOpen}
        onClose={() => setAddingFieldOpen(false)}
        eyebrow="Custom Catalogue Column"
        title="Add a Field to Your Catalogue"
        narrow
      >
        <form onSubmit={handleAddField}>
          <p>
            Add a standard or custom attribute column (such as <code>material</code>, <code>color</code>, <code>brand</code>, <code>size</code>, or <code>imageUrl</code>) so you can edit it across all products.
          </p>
          <label>
            Field / Column Name
            <input
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g. material, color, size, brand"
              required
              autoFocus
            />
          </label>
          <div className="merchant-quick-field-pills">
            {["material", "color", "imageUrl", "brand", "size", "style"].map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setNewFieldName(preset)}
                className="merchant-field-pill"
              >
                + {preset}
              </button>
            ))}
          </div>
          <div className="merchant-modal-footer">
            <button type="button" className="merchant-outline-button" onClick={() => setAddingFieldOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="merchant-button">
              Add Column
            </button>
          </div>
        </form>
      </NativeModal>

      {/* ── Modal: Clear Entire Catalogue Confirmation ── */}
      <NativeModal
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        eyebrow="Confirm Reset"
        title="Clear all products from this store?"
        narrow
      >
        <p>
          This will remove all <strong>{workingProducts.length} products</strong> from{" "}
          <strong>{dashboard.store.name}</strong> so you can start fresh or import a new file.
        </p>
        <div className="merchant-modal-footer">
          <button type="button" className="merchant-outline-button" autoFocus onClick={() => setClearConfirmOpen(false)}>
            Keep Products
          </button>
          <button
            type="button"
            className="merchant-button merchant-button--danger"
            disabled={busy}
            onClick={() => {
              setClearConfirmOpen(false);
              void saveWorkingCatalog([], "All products cleared from catalogue.");
            }}
          >
            Clear All Products
          </button>
        </div>
      </NativeModal>
    </main>
  );
}

export default function MerchantPage() {
  return (
    <Suspense
      fallback={
        <main className="merchant-page merchant-page--auth">
          <SiteHeader />
          <div className="merchant-loading">Opening your store studio…</div>
        </main>
      }
    >
      <MerchantPageContent />
    </Suspense>
  );
}
