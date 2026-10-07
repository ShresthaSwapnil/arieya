import type { Product } from "./core.ts";

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function moneyMinor(value: unknown, currency: string) {
  const amount = typeof value === "number" ? String(value) : String(value ?? "").trim();
  const normalized = amount.replace(/\s/g, "").replace(/(GBP|USD|EUR|£|\$|€)/ig, "");
  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  const decimal = comma > dot ? "," : ".";
  let numeric = normalized;
  if (comma >= 0 && dot >= 0) numeric = decimal === "," ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/,/g, "");
  else if (comma >= 0) numeric = /,\d{1,2}$/.test(normalized) ? normalized.replace(",", ".") : normalized.replace(/,/g, "");
  const major = Number(numeric);
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const result = Math.round(major * 10 ** digits);
  if (!Number.isFinite(major) || result < 1 || result > 100_000_000) return null;
  return result;
}

const entries = (value: unknown) => Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/[|;,]/).map((item) => item.trim()).filter(Boolean) : [];

// Import explicit product facts; unknown text fields remain searchable catalogue attributes.
export function parseCatalog(input: unknown, defaultCurrency = "GBP"): Product[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 500) throw new Error("Upload 1–500 products.");
  const ids = new Set<string>();
  const currencies = new Set<string>();
  return input.map((raw, index) => {
    const fail = (field: string): never => { throw new Error("Product " + (index + 1) + ": invalid " + field + "."); };
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("product");
    const source = raw as Record<string, unknown>;
    const normalized = new Map(Object.entries(source).map(([name, value]) => [key(name), value]));
    const read = (...names: string[]) => names.map((name) => normalized.get(key(name))).find((value) => value !== undefined && value !== null && value !== "");
    const text = (value: unknown, field: string, max: number, optional = false) => {
      if (optional && (value === undefined || value === null || value === "")) return "";
      return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : fail(field);
    };
    const title = text(read("title", "name", "product_name", "item_name", "g:title"), "title", 240);
    const rawId = read("id", "product_id", "sku", "handle", "g:id");
    const id = rawId == null ? (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "product") + "-" + (index + 1) : text(String(rawId), "id", 100);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) return fail("unique id");
    ids.add(id);

    const rawPrice = read("price", "price_amount", "g:price");
    const priceText = String(rawPrice ?? "");
    const symbolCurrency = /£/.test(priceText) ? "GBP" : /€/.test(priceText) ? "EUR" : /\$/.test(priceText) ? "USD" : priceText.match(/\b(GBP|USD|EUR)\b/i)?.[1]?.toUpperCase();
    const currencyValue = String(read("currency", "currency_code", "price_currency") || symbolCurrency || defaultCurrency).toUpperCase();
    if (!["GBP", "USD", "EUR"].includes(currencyValue)) return fail("currency (use GBP, USD, or EUR)");
    try { new Intl.NumberFormat("en", { style: "currency", currency: currencyValue }); } catch { return fail("currency code"); }
    const rawMinor = read("priceMinor", "price_minor");
    const priceMinor = rawMinor === undefined ? moneyMinor(rawPrice, currencyValue) : Number(rawMinor);
    if (priceMinor === null || !Number.isSafeInteger(priceMinor) || priceMinor < 1 || priceMinor > 100_000_000) return fail("price");
    currencies.add(currencyValue);
    if (currencies.size > 1) return fail("currency (use one currency per catalogue)");

    const stock = read("available", "availability", "stock_status", "in_stock");
    const available = typeof stock === "boolean" ? stock : typeof stock === "number" ? stock > 0 : typeof stock === "string"
      ? ["true", "yes", "1", "available", "in stock", "instock", "active"].includes(stock.trim().toLowerCase())
        ? true
        : ["false", "no", "0", "unavailable", "out of stock", "outofstock", "inactive"].includes(stock.trim().toLowerCase())
          ? false
          : fail("availability")
      : fail("availability");
    const url = text(read("url", "link", "product_url", "permalink", "g:link"), "url", 1000);
    if (!safeProductUrl(url)) return fail("url (public HTTPS product link)");
    const imageUrl = text(read("imageUrl", "image", "image_link", "image_url", "picture", "g:image_link"), "imageUrl", 1000, true);
    if (imageUrl && !safeProductUrl(imageUrl)) return fail("imageUrl (public HTTPS image link)");

    const reserved = new Set(["id", "productid", "sku", "handle", "title", "name", "productname", "itemname", "description", "body", "bodyhtml", "category", "producttype", "type", "price", "priceamount", "priceminor", "currency", "currencycode", "pricecurrency", "available", "availability", "stockstatus", "instock", "url", "link", "producturl", "permalink", "image", "imageurl", "imagelink", "picture", "material", "color", "gemstone", "styles", "occasions", "tags", "attributes", "variantid"]);
    let attributes: Record<string, string> = {};
    const rawAttributes = read("attributes");
    if (typeof rawAttributes === "string") {
      try { const parsed = JSON.parse(rawAttributes); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) attributes = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string").slice(0, 24)); } catch { return fail("attributes JSON"); }
    } else if (rawAttributes && typeof rawAttributes === "object" && !Array.isArray(rawAttributes)) {
      attributes = Object.fromEntries(Object.entries(rawAttributes).filter((entry): entry is [string, string] => typeof entry[1] === "string").slice(0, 24));
    }
    for (const [name, value] of Object.entries(source)) {
      if (reserved.has(key(name)) || !["string", "number", "boolean"].includes(typeof value) || !String(value).trim() || name.length > 60 || String(value).length > 240) continue;
      attributes[name] = String(value).trim();
    }
    return {
      id, variantId: text(read("variantId", "variant_id"), "variantId", 100, true) || id,
      title, description: text(read("description", "body", "body_html", "g:description"), "description", 2000, true),
      category: text(read("category", "product_type", "type", "g:product_type"), "category", 100, true) || "general",
      priceMinor, currency: currencyValue, available,
      material: text(read("material"), "material", 100, true) || undefined,
      color: text(read("color"), "color", 100, true) || undefined,
      gemstone: text(read("gemstone"), "gemstone", 100, true) || null,
      styles: entries(read("styles")), occasions: entries(read("occasions")), priority: 0, imagePosition: "center",
      ...(Object.keys(attributes).length ? { attributes } : {}),
      ...(imageUrl ? { imageUrl } : {}), url,
    };
  });
}

export function safeProductUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") &&
      !/^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(url.hostname) &&
      !/\.(?:localhost|local|internal)$/i.test(url.hostname);
  } catch { return false; }
}
