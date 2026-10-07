import { parseCatalog } from "./catalog";
import type { Product } from "./core";

export type CatalogFormat = "csv" | "json" | "xml";

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
  const headers = rows.shift()!.map((value) => value.trim().replace(/^\uFEFF/, ""));
  if (headers.some((value) => !value)) throw new Error("Every CSV column needs a heading.");
  return rows.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}

function xmlRows(input: string) {
  const document = new DOMParser().parseFromString(input, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("That XML file could not be read.");
  const elements = Array.from(document.getElementsByTagName("*"));
  const products = elements.filter((element) => ["product", "item", "entry"].includes(element.localName.toLowerCase()));
  if (!products.length) throw new Error("The XML needs product, item, or entry elements.");
  return products.map((product) => Object.fromEntries(Array.from(product.children).map((child) => [child.localName, child.textContent?.trim() || ""])));
}

export function parseCatalogFile(input: string, format: CatalogFormat, defaultCurrency = "GBP"): Product[] {
  let rows: unknown;
  if (format === "csv") rows = csvRows(input);
  else if (format === "xml") rows = xmlRows(input);
  else {
    const parsed = JSON.parse(input);
    rows = Array.isArray(parsed) ? parsed : parsed?.products || parsed?.items || parsed?.data?.products;
  }
  return parseCatalog(rows, defaultCurrency);
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
