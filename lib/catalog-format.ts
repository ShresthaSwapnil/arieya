import { parseCatalog, safeProductUrl } from "./catalog.ts";
import type { Product } from "./core.ts";

export type CatalogFormat = "csv" | "json" | "xml";

export type ConversionReport = {
  products: Product[];
  notes: string[];
  customFields: string[];
};

export function normalizeStoreUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let raw = value.trim();
  if (!raw || raw.length > 500 || /\s/.test(raw)) return null;
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw.replace(/^\/+/, "")}`;
  }
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return null;
    if (!isLocal && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(url.hostname)) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function csvRows(input: string) {
  const firstLine = input.split(/\r?\n/, 1)[0] || "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV needs a header row and at least one product.");
  const rawHeaders = rows.shift()!.map((value, idx) => value.trim().replace(/^\uFEFF/, "") || `field_${idx + 1}`);
  return rows.map((values) => Object.fromEntries(rawHeaders.map((header, i) => [header, values[i] ?? ""])));
}

function xmlRows(input: string) {
  const document = new DOMParser().parseFromString(input, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("That XML file could not be read.");
  const elements = Array.from(document.getElementsByTagName("*"));
  let products = elements.filter((element) => ["product", "item", "entry", "row", "record"].includes(element.localName.toLowerCase()));
  if (!products.length && document.documentElement?.children.length) {
    products = Array.from(document.documentElement.children);
  }
  if (!products.length) throw new Error("The XML needs product, item, or entry elements.");
  return products.map((product) => Object.fromEntries(Array.from(product.children).map((child) => [child.localName, child.textContent?.trim() || ""])));
}

const normKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function ensureHttpsUrl(rawUrl: string, fallbackBase: string, fallbackPath: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed) {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed.replace(/^http:\/\//i, "https://")
      : trimmed.startsWith("/")
        ? `${fallbackBase.replace(/\/$/, "")}${trimmed}`
        : `https://${trimmed.replace(/^\/+/, "")}`;
    if (safeProductUrl(withProto)) return withProto;
  }
  return `${fallbackBase.replace(/\/$/, "")}/products/${fallbackPath}`;
}

export function convertCatalogFile(
  input: string,
  format: CatalogFormat,
  options?: { defaultCurrency?: string; storeUrl?: string },
): ConversionReport {
  let rawRows: unknown;
  if (format === "csv") rawRows = csvRows(input);
  else if (format === "xml") rawRows = xmlRows(input);
  else {
    const parsed = JSON.parse(input);
    rawRows = Array.isArray(parsed)
      ? parsed
      : parsed?.products || parsed?.items || parsed?.data?.products || parsed?.data || (parsed && typeof parsed === "object" ? [parsed] : []);
  }

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("No product rows were found in this file.");
  }

  const targetCurrency = ["USD", "GBP", "EUR"].includes((options?.defaultCurrency || "USD").toUpperCase())
    ? (options?.defaultCurrency || "USD").toUpperCase()
    : "USD";

  let safeBase = "https://example.com";
  if (options?.storeUrl) {
    const candidate = /^https?:\/\//i.test(options.storeUrl)
      ? options.storeUrl.replace(/^http:\/\//i, "https://")
      : `https://${options.storeUrl}`;
    if (safeProductUrl(candidate)) safeBase = candidate.replace(/\/$/, "");
  }

  const notes = new Set<string>();
  const customFieldsSet = new Set<string>();
  const usedIds = new Set<string>();

  const standardKeys = new Set([
    "id", "productid", "sku", "handle", "gid", "code", "itemid",
    "title", "name", "productname", "itemname", "gtitle", "product", "label", "heading",
    "description", "body", "bodyhtml", "gdescription", "shortdescription", "summary", "details",
    "category", "producttype", "type", "gproducttype", "categories", "department", "collection",
    "price", "priceamount", "gprice", "variantprice", "regularprice", "saleprice", "amount", "cost", "retailprice", "priceminor",
    "currency", "currencycode", "pricecurrency",
    "available", "availability", "stockstatus", "instock", "status", "published", "stock", "quantity", "inventory", "inventoryquantity", "qty",
    "url", "link", "producturl", "permalink", "glink", "pageurl", "href",
    "image", "imageurl", "imagelink", "gimagelink", "picture", "imagesrc", "thumbnail", "photo",
    "material", "color", "colour", "gemstone", "stone", "styles", "style", "tags", "occasions", "occasion", "attributes", "variantid",
  ]);

  const normalizedRows = rawRows.slice(0, 500).map((raw, index) => {
    const source = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
    const byNorm = new Map<string, unknown>();
    for (const [k, v] of Object.entries(source)) {
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        byNorm.set(normKey(k), v);
      }
    }
    const read = (...names: string[]) => {
      for (const name of names) {
        const val = byNorm.get(normKey(name));
        if (val !== undefined && val !== null && String(val).trim() !== "") return val;
      }
      return undefined;
    };

    // 1. Title
    let rawTitle = read("title", "name", "product_name", "item_name", "g:title", "product", "label", "heading", "handle", "sku");
    if (!rawTitle) {
      const firstString = Object.values(source).find((v) => typeof v === "string" && v.trim().length > 1 && !/^https?:\/\//i.test(v.trim()));
      rawTitle = firstString || `Product ${index + 1}`;
      notes.add("Filled missing product titles automatically.");
    }
    const title = String(rawTitle).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240) || `Product ${index + 1}`;

    // 2. Unique ID
    const rawId = read("id", "product_id", "sku", "handle", "g:id", "code", "item_id");
    let baseId = String(rawId ?? title)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `product-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId.slice(0, 74)}-${suffix++}`;
    }
    usedIds.add(id);

    // 3. Currency (Always normalize to targetCurrency, default USD)
    const rawCurrency = String(read("currency", "currency_code", "price_currency") || "").trim().toUpperCase();
    if (rawCurrency && rawCurrency !== targetCurrency) {
      notes.add(`Normalized currency (${rawCurrency}) to ${targetCurrency}.`);
    }

    // 4. Price
    const rawMinor = read("priceMinor", "price_minor");
    const rawPrice = read("price", "price_amount", "g:price", "variant_price", "regular_price", "sale_price", "amount", "cost", "retail_price");
    let priceInput: string | number = "10.00";
    if (rawMinor !== undefined && Number.isFinite(Number(rawMinor)) && Number(rawMinor) >= 1) {
      priceInput = (Number(rawMinor) / 100).toFixed(2);
    } else if (rawPrice !== undefined) {
      const cleaned = String(rawPrice).replace(/[^0-9.,]/g, "").trim();
      const num = Number(cleaned.replace(/,/g, ""));
      if (Number.isFinite(num) && num >= 0.01 && num <= 999_999) {
        priceInput = num.toFixed(2);
      } else {
        notes.add("Defaulted missing or zero prices to $10.00 — review in table.");
      }
    } else {
      notes.add("Defaulted missing prices to $10.00 — review in table.");
    }

    // 5. Availability
    const rawStock = read("available", "availability", "stock_status", "in_stock", "status", "published", "stock", "quantity", "inventory", "inventory_quantity", "qty");
    let available = true;
    if (typeof rawStock === "boolean") {
      available = rawStock;
    } else if (typeof rawStock === "number") {
      available = rawStock > 0;
    } else if (typeof rawStock === "string") {
      const s = rawStock.trim().toLowerCase();
      if (["false", "no", "0", "unavailable", "out of stock", "outofstock", "inactive", "draft", "archived", "sold out", "soldout", "discontinued"].includes(s)) {
        available = false;
      } else if (/^-?\d+$/.test(s)) {
        available = Number(s) > 0;
      } else {
        available = true;
      }
    }

    // 6. Product URL
    const rawUrl = String(read("url", "link", "product_url", "permalink", "g:link", "page_url", "href") || "");
    const url = ensureHttpsUrl(rawUrl, safeBase, id);
    if (!rawUrl.trim()) {
      notes.add("Generated placeholder product URLs for rows without a link.");
    }

    // 7. Image URL
    const rawImage = String(read("imageUrl", "image", "image_link", "image_url", "picture", "g:image_link", "image_src", "thumbnail", "photo") || "").trim();
    let imageUrl = "";
    if (rawImage) {
      const candidateImg = /^https?:\/\//i.test(rawImage)
        ? rawImage.replace(/^http:\/\//i, "https://")
        : `https://${rawImage.replace(/^\/+/, "")}`;
      if (safeProductUrl(candidateImg)) imageUrl = candidateImg;
    }

    // 8. Category & Description
    const category = String(read("category", "product_type", "type", "g:product_type", "categories", "department", "collection") || "general")
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 100) || "general";
    const description = String(read("description", "body", "body_html", "g:description", "short_description", "summary", "details") || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    // 9. Optional & Custom Attributes
    const material = String(read("material") || "").trim().slice(0, 100);
    const color = String(read("color", "colour") || "").trim().slice(0, 100);
    const gemstone = String(read("gemstone", "stone") || "").trim().slice(0, 100);
    if (material) customFieldsSet.add("material");
    if (color) customFieldsSet.add("color");
    if (gemstone) customFieldsSet.add("gemstone");
    const styles = read("styles", "style", "tags");
    const occasions = read("occasions", "occasion");

    const attributes: Record<string, string> = {};
    const rawAttrs = read("attributes");
    if (typeof rawAttrs === "string") {
      try {
        const parsed = JSON.parse(rawAttrs);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === "string" && v.trim()) {
              attributes[k] = v.trim().slice(0, 240);
              customFieldsSet.add(k);
            }
          }
        }
      } catch { /* ignore invalid JSON in attributes cell */ }
    } else if (rawAttrs && typeof rawAttrs === "object" && !Array.isArray(rawAttrs)) {
      for (const [k, v] of Object.entries(rawAttrs as Record<string, unknown>)) {
        if (v !== undefined && v !== null && String(v).trim()) {
          attributes[k] = String(v).trim().slice(0, 240);
          customFieldsSet.add(k);
        }
      }
    }

    for (const [k, v] of Object.entries(source)) {
      const nk = normKey(k);
      if (!nk || standardKeys.has(nk) || /^field\d+$/.test(nk)) continue;
      if (["string", "number", "boolean"].includes(typeof v) && String(v).trim() && k.length <= 60) {
        attributes[k] = String(v).trim().slice(0, 240);
        customFieldsSet.add(k);
      }
    }

    return {
      id,
      title,
      description,
      category,
      price: priceInput,
      currency: targetCurrency,
      available,
      url,
      ...(imageUrl ? { imageUrl } : {}),
      ...(material ? { material } : {}),
      ...(color ? { color } : {}),
      ...(gemstone ? { gemstone } : {}),
      ...(styles ? { styles } : {}),
      ...(occasions ? { occasions } : {}),
      ...(Object.keys(attributes).length ? { attributes } : {}),
    };
  });

  if (rawRows.length > 500) {
    notes.add(`Trimmed file from ${rawRows.length} rows to the 500-product maximum.`);
  }

  const products = parseCatalog(normalizedRows, targetCurrency);
  return {
    products,
    notes: Array.from(notes),
    customFields: Array.from(customFieldsSet),
  };
}

export function parseCatalogFile(input: string, format: CatalogFormat, defaultCurrency = "USD"): Product[] {
  return convertCatalogFile(input, format, { defaultCurrency }).products;
}

const fields = ["id", "title", "description", "category", "price", "currency", "available", "url", "imageUrl", "material", "color", "gemstone", "styles", "occasions", "attributes"] as const;
function portable(product: Product) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: product.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return { ...product, price: product.priceMinor / 10 ** digits, priceMinor: undefined };
}
const valueFor = (product: Product, field: (typeof fields)[number]) => field === "price" ? portable(product).price : product[field as keyof Product];
const csvCell = (value: unknown) => {
  const text = Array.isArray(value) ? value.join("|") : value && typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return /[",\r\n;]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};
const xmlText = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function formatCatalog(products: Product[], format: CatalogFormat) {
  if (format === "json") return JSON.stringify(products.map(portable), null, 2);
  if (format === "csv") return [fields.join(","), ...products.map((product) => fields.map((field) => csvCell(valueFor(product, field))).join(","))].join("\r\n");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<catalogue>\n' + products.map((product) =>
    "  <product>\n" + fields.map((field) => {
      const value = valueFor(product, field);
      const text = value && typeof value === "object" ? JSON.stringify(value) : value;
      return "    <" + field + ">" + xmlText(text) + "</" + field + ">";
    }).join("\n") + "\n  </product>",
  ).join("\n") + "\n</catalogue>";
}
