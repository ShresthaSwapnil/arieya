export type Category = string;

export type Product = {
  id: string;
  variantId: string;
  title: string;
  description: string;
  category: Category;
  priceMinor: number;
  currency: string;
  available: boolean;
  material?: string;
  color?: string;
  gemstone?: string | null;
  attributes?: Record<string, string>;
  styles: string[];
  occasions: string[];
  priority: number;
  imagePosition: "left" | "center" | "right";
  imageUrl?: string;
  url: string;
};

export type Constraints = {
  category?: string;
  maxPriceMinor?: number;
  minPriceMinor?: number;
  currency?: string;
  material?: string;
  color?: string;
  gemstone?: string;
  exclusions: string[];
};

export type Recommendation = {
  reply: string;
  products: Product[];
  status: "exact" | "curated" | "relaxed" | "no_match" | "handoff";
  constraints: Constraints;
  relaxedConstraints: string[];
  relaxations: { key: string; label: string; message: string }[];
};

export const EVENT_NAMES = [
  "stylist_opened",
  "conversation_started",
  "message_submitted",
  "recommendations_returned",
  "no_exact_match",
  "relaxation_selected",
  "product_impression",
  "product_clicked",
  "add_to_cart",
  "checkout_clicked",
  "purchase_attributed",
  "edit_created",
  "edit_shared",
  "edit_opened",
  "edit_reaction",
  "recipient_conversation_started",
  "recipient_product_clicked",
  "recipient_purchase_attributed",
  "handoff_shown",
  "handoff_clicked",
  "fallback_used",
  "response_rejected",
  "rate_limited",
  "catalog_sync_completed",
  "catalog_sync_failed",
  "knowledge_stale",
  "knowledge_conflict",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const TENANTS = {
  "edita-demo": {
    id: "tenant_demo",
    publicKey: "edita-demo",
    name: "Arieya",
    approvedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    contactUrl: "mailto:hello@example.com?subject=Stylist%20help",
    currency: "GBP" as const,
  },
};

export const CATALOG: Product[] = [
  {
    id: "solace-amber-pendant",
    variantId: "demo-v-101",
    title: "Solace Amber Pendant",
    description: "A slim warm-gold pendant with a softly glowing oval stone.",
    category: "necklace",
    priceMinor: 11800,
    currency: "GBP",
    available: true,
    material: "gold vermeil",
    color: "warm gold",
    gemstone: "amber crystal",
    styles: ["elegant", "understated", "warm", "delicate"],
    occasions: ["anniversary", "gift", "evening"],
    priority: 8,
    imagePosition: "left",
    url: "/stylist?product=solace-amber-pendant",
  },
  {
    id: "halo-champagne-ring",
    variantId: "demo-v-102",
    title: "Halo Champagne Ring",
    description: "A fluid gold-vermeil ring with a pale champagne centre stone.",
    category: "ring",
    priceMinor: 11000,
    currency: "GBP",
    available: true,
    material: "gold vermeil",
    color: "warm gold",
    gemstone: "champagne crystal",
    styles: ["elegant", "sculptural", "warm", "refined"],
    occasions: ["anniversary", "gift", "occasion"],
    priority: 9,
    imagePosition: "center",
    url: "/stylist?product=halo-champagne-ring",
  },
  {
    id: "pearl-line-bracelet",
    variantId: "demo-v-103",
    title: "Pearl Line Bracelet",
    description: "A fine warm-gold chain finished with one quiet cream pearl.",
    category: "bracelet",
    priceMinor: 9600,
    currency: "GBP",
    available: true,
    material: "gold vermeil",
    color: "warm gold",
    gemstone: "pearl",
    styles: ["elegant", "understated", "warm", "delicate"],
    occasions: ["anniversary", "gift", "everyday"],
    priority: 10,
    imagePosition: "right",
    url: "/stylist?product=pearl-line-bracelet",
  },
  {
    id: "juniper-studs",
    variantId: "demo-v-104",
    title: "Juniper Studs",
    description: "Compact gold-vermeil studs with deep green crystal centres.",
    category: "earrings",
    priceMinor: 8400,
    currency: "GBP",
    available: true,
    material: "gold vermeil",
    color: "warm gold",
    gemstone: "emerald crystal",
    styles: ["classic", "colourful", "compact"],
    occasions: ["gift", "everyday"],
    priority: 5,
    imagePosition: "center",
    url: "/stylist?product=juniper-studs",
  },
  {
    id: "silver-dawn-hoops",
    variantId: "demo-v-105",
    title: "Silver Dawn Hoops",
    description: "Small sterling-silver hoops with a clean polished finish.",
    category: "earrings",
    priceMinor: 7800,
    currency: "GBP",
    available: true,
    material: "sterling silver",
    color: "silver",
    gemstone: null,
    styles: ["minimal", "modern", "everyday"],
    occasions: ["gift", "everyday"],
    priority: 6,
    imagePosition: "right",
    url: "/stylist?product=silver-dawn-hoops",
  },
  {
    id: "blush-signet",
    variantId: "demo-v-106",
    title: "Blush Signet",
    description: "A softly rounded rose-gold signet made for everyday wear.",
    category: "ring",
    priceMinor: 12500,
    currency: "GBP",
    available: true,
    material: "rose gold vermeil",
    color: "rose gold",
    gemstone: null,
    styles: ["minimal", "warm", "modern"],
    occasions: ["anniversary", "gift", "everyday"],
    priority: 7,
    imagePosition: "center",
    url: "/stylist?product=blush-signet",
  },
  {
    id: "nocturne-collar",
    variantId: "demo-v-107",
    title: "Nocturne Collar",
    description: "A sculptural gold-vermeil collar with an assertive silhouette.",
    category: "necklace",
    priceMinor: 21000,
    currency: "GBP",
    available: true,
    material: "gold vermeil",
    color: "warm gold",
    gemstone: null,
    styles: ["bold", "statement", "flashy"],
    occasions: ["evening", "occasion"],
    priority: 3,
    imagePosition: "left",
    url: "/stylist?product=nocturne-collar",
  },
  {
    id: "pearl-halo-ring",
    variantId: "demo-v-108",
    title: "Pearl Halo Ring",
    description: "A warm-gold ring set with a single softly luminous pearl.",
    category: "ring",
    priceMinor: 14000,
    currency: "GBP",
    available: true,
    material: "gold vermeil",
    color: "warm gold",
    gemstone: "pearl",
    styles: ["elegant", "classic", "warm"],
    occasions: ["anniversary", "gift"],
    priority: 6,
    imagePosition: "center",
    url: "/stylist?product=pearl-halo-ring",
  },
];

const categoryAliases: [Category, RegExp][] = [
  ["necklace", /\b(necklace|necklaces|pendant|pendants|chain|chains)\b/i],
  ["ring", /\b(ring|rings|signet|signets)\b/i],
  ["bracelet", /\b(bracelet|bracelets|bangle|bangles)\b/i],
  ["earrings", /\b(earring|earrings|stud|studs|hoop|hoops)\b/i],
];

export function parseConstraints(message: string, products: Product[] = CATALOG): Constraints {
  const text = message.toLowerCase().replace(/,/g, "");
  const normalized = text.replace(/[^a-z0-9]+/g, " ").trim();
  const hasTerm = (term: string) => normalized.includes(term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const max = text.match(/(?:under|below|up to|maximum|max|less than)\s*(?:(?:£|€|\$)|(?:gbp|eur|usd)\s*)?(\d+(?:\.\d{1,2})?)/i);
  const min = text.match(/(?:over|above|at least|minimum|min)\s*(?:(?:£|€|\$)|(?:gbp|eur|usd)\s*)?(\d+(?:\.\d{1,2})?)/i);
  const catalogTerms = products.flatMap((product) => [product.category, product.material, product.color, product.gemstone, ...product.styles, ...product.occasions, ...Object.values(product.attributes || {})]).filter((value): value is string => Boolean(value && value.length > 2));
  const exclusionTerms = [...new Set(["rose gold", "warm gold", "sterling silver", "emerald", "champagne", "amber", "pearl", "silver", "gold", "flashy", "bold", "necklace", "ring", "bracelet", "earrings", ...catalogTerms])];
  const exclusions = exclusionTerms.filter((term) => ["not ", "no ", "without ", "not an ", "not a "].some((prefix) => normalized.includes(prefix + term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())));
  const positiveText = normalized.replace(/\b(?:not|no|without)\s+(?:an?\s+)?/g, "");
  const positiveHasTerm = (term: string) => positiveText.includes(term.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const category = categoryAliases.find(([, pattern]) => pattern.test(positiveText))?.[0]
    || [...new Set(products.map((product) => product.category).filter((value) => value && value !== "general" && value.length > 2 && positiveHasTerm(value)))][0];
  const material = [...new Set(products.map((product) => product.material).filter((value): value is string => Boolean(value)))].sort((a, b) => b.length - a.length).find(positiveHasTerm);
  const color = [...new Set(products.map((product) => product.color).filter((value): value is string => Boolean(value)))].sort((a, b) => b.length - a.length).find(positiveHasTerm);
  const gemstone = [...new Set(products.map((product) => product.gemstone).filter((value): value is string => Boolean(value)))].sort((a, b) => b.length - a.length).find(positiveHasTerm);

  return {
    category,
    maxPriceMinor: max ? Math.round(Number(max[1]) * 100) : undefined,
    minPriceMinor: min ? Math.round(Number(min[1]) * 100) : undefined,
    currency: /£|\bgbp\b/.test(text) ? "GBP" : /€|\beur\b/.test(text) ? "EUR" : /\$|\busd\b/.test(text) ? "USD" : undefined,
    material,
    color,
    gemstone,
    exclusions,
  };
}

export function conversationConstraints(message: string, history: { role: string; content: string }[] = [], products: Product[] = CATALOG): Constraints {
  let result: Constraints = { exclusions: [] };
  for (const text of [...history.filter((turn) => turn.role === "user").map((turn) => turn.content), message]) {
    const next = parseConstraints(text, products);
    if (/\b(?:start over|new search)\b/i.test(text)) result = { exclusions: [] };
    if (/\bany category\b/i.test(text)) delete result.category;
    if (/\b(?:any budget|no budget limit)\b/i.test(text)) { delete result.maxPriceMinor; delete result.minPriceMinor; }
    result = { ...result, ...Object.fromEntries(Object.entries(next).filter(([key, value]) => key !== "exclusions" && value !== undefined)), exclusions: [...new Set([...result.exclusions, ...next.exclusions])] };
  }
  return result;
}

function isExcluded(product: Product, exclusions: string[]) {
  const searchable = [
    product.category,
    product.material,
    product.color,
    product.gemstone || "",
    ...product.styles,
    ...product.occasions,
    ...Object.values(product.attributes || {}),
  ].join(" ");
  return exclusions.some((term) => searchable.includes(term));
}

function hardMatch(product: Product, constraints: Constraints) {
  return (
    product.available &&
    (!constraints.category || product.category === constraints.category) &&
    (constraints.maxPriceMinor === undefined || product.priceMinor <= constraints.maxPriceMinor) &&
    (constraints.minPriceMinor === undefined || product.priceMinor >= constraints.minPriceMinor) &&
    (!constraints.currency || product.currency === constraints.currency) &&
    (!constraints.material || product.material === constraints.material) &&
    (!constraints.color || product.color === constraints.color) &&
    (!constraints.gemstone || product.gemstone === constraints.gemstone) &&
    !isExcluded(product, constraints.exclusions)
  );
}

const riskyIntent = /\b(returns?|refunds?|delivery|shipping|late order|where is my order|allerg\w*|hypoallergenic|complaint|cancel order|warrant\w*)\b/i;

export function recommend(
  message: string,
  products: Product[] = CATALOG,
  seenProductIds: string[] = [],
  softIntent: string[] = [],
  requestCurrency?: string,
  history: { role: string; content: string }[] = [],
): Recommendation {
  if (riskyIntent.test(message)) {
    return {
      reply: "I can help with product discovery, but this needs the merchant team to confirm it.",
      products: [],
      status: "handoff",
      constraints: { exclusions: [] },
      relaxedConstraints: [],
      relaxations: [],
    };
  }

  if (/\b(?:platinum|titanium|diamonds?|rub(?:y|ies)|sapphire|solid gold|stainless steel|nickel.free)\b/i.test([...history.filter(t => t.role === "user").map(t => t.content), message].join(" "))) {
    return { reply: "This trial cannot verify that material or gemstone. Try the supported catalogue details or confirm directly with the store.", products: [], status: "no_match", constraints: { exclusions: [] }, relaxedConstraints: [], relaxations: [] };
  }
  const parsed = conversationConstraints(message, history, products);
  const constraints = { ...parsed, currency: parsed.currency || requestCurrency };
  const words = new Set([...(message.toLowerCase().match(/[a-z]+/g) || []), ...softIntent.flatMap((tag) => tag.toLowerCase().match(/[a-z0-9]+/g) || [])]);
  const candidates = products.filter((product) => hardMatch(product, constraints));

  if (!candidates.length) {
    const relaxations: Recommendation["relaxations"] = [];
    if (constraints.maxPriceMinor !== undefined) {
      const nextPrice = products
        .filter((product) =>
          hardMatch(product, { ...constraints, maxPriceMinor: undefined, exclusions: constraints.exclusions }),
        )
        .sort((a, b) => a.priceMinor - b.priceMinor)[0]?.priceMinor;
      if (nextPrice) {
        relaxations.push({
          key: "budget",
          label: `Raise budget to ${formatMoney(nextPrice, constraints.currency || "GBP")}`,
          message: `Show options under ${constraints.currency || "GBP"} ${nextPrice / 100}`,
        });
      }
    }
    if (constraints.gemstone) {
      const alternative = constraints.gemstone === "pearl" ? "champagne" : "pearl";
      relaxations.push({ key: "gemstone", label: "Try another gemstone", message: message.replace(new RegExp(constraints.gemstone.split(" ")[0], "i"), alternative) });
    }
    if (constraints.category) {
      relaxations.push({ key: "category", label: "Show another category", message: "Show any category" });
    }
    return {
      reply: `There isn’t an exact match because ${describeBlocker(constraints)}. Choose one change and I’ll look again.`,
      products: [],
      status: "no_match",
      constraints,
      relaxedConstraints: [],
      relaxations: relaxations.slice(0, 3),
    };
  }

  const ranked = candidates
    .map((product) => {
      const searchable = [product.title, product.description, product.category, product.material, product.color, product.gemstone, ...product.styles, ...product.occasions, ...Object.values(product.attributes || {})].join(" ").toLowerCase().match(/[a-z0-9]+/g) || [];
      const softMatches = [...product.styles, ...product.occasions].filter((tag) => words.has(tag)).length;
      const textMatches = searchable.filter((word) => word.length > 2 && words.has(word)).length;
      const intentMatches = softIntent.filter((tag) => [product.title, product.description, product.category, product.material, product.color, product.gemstone, ...product.styles, ...product.occasions, ...Object.values(product.attributes || {})].join(" ").toLowerCase().includes(tag.toLowerCase())).length;
      const warmBoost = /\bwarm(?:er)?\b/i.test(message) && product.color !== "silver" ? 4 : 0;
      const seenPenalty = seenProductIds.includes(product.id) ? 12 : 0;
      const priceFit = constraints.maxPriceMinor
        ? Math.max(0, 5 - Math.abs(constraints.maxPriceMinor - product.priceMinor) / 2000)
        : 0;
      return { product, score: softMatches * 4 + textMatches + intentMatches * 4 + warmBoost + product.priority + priceFit - seenPenalty };
    })
    .sort((a, b) => b.score - a.score || a.product.priceMinor - b.product.priceMinor)
    .map(({ product }) => product);

  const selected: Product[] = [];
  for (const product of ranked) {
    if (selected.length === 4) break;
    if (selected.length < 3 && selected.some((item) => item.category === product.category)) continue;
    selected.push(product);
  }
  for (const product of ranked) {
    if (selected.length === 4) break;
    if (!selected.includes(product)) selected.push(product);
  }

  return {
    reply: `I found ${selected.length} verified ${selected.length === 1 ? "match" : "matches"}. Each one is available and within the constraints you gave me.`,
    products: selected,
    status: parsed.category || parsed.maxPriceMinor || parsed.minPriceMinor || parsed.currency || parsed.material || parsed.color || parsed.gemstone || parsed.exclusions.length ? "exact" : "curated",
    constraints,
    relaxedConstraints: [],
    relaxations: [],
  };
}

function describeBlocker(constraints: Constraints) {
  if (constraints.maxPriceMinor !== undefined) return `nothing available fits the ${formatMoney(constraints.maxPriceMinor, constraints.currency || "GBP")} ceiling with the other requested details`;
  if (constraints.gemstone) return `no available product uses ${constraints.gemstone}`;
  if (constraints.category) return `no available ${constraints.category} satisfies every requested detail`;
  return "no available product satisfies every requested detail";
}

export function formatMoney(minor: number, currency: string) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10 ** digits;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: minor % scale ? digits : 0, maximumFractionDigits: digits }).format(minor / scale);
}

export function guardModelReply(value: unknown) {
  if (typeof value !== "string") return null;
  const reply = value.trim().replace(/\s+/g, " ");
  if (!reply || reply.length > 420) return null;
  if (/(?:https?:\/\/|www\.|£|\$|€|\b\d+(?:[.,]\d+)?\b|\b(?:return|refund|shipping|delivery|warranty|guarantee|discount|stock)\b)/i.test(reply)) return null;
  return reply;
}

export function auditCatalog(products: Product[]) {
  const seen = new Set<string>();
  const issues: { severity: "critical" | "warning"; productId: string; message: string }[] = [];
  for (const product of products) {
    if (seen.has(product.id)) issues.push({ severity: "critical", productId: product.id, message: "Duplicate product ID" });
    seen.add(product.id);
    if (!product.title || !product.variantId || !product.url) issues.push({ severity: "critical", productId: product.id, message: "Missing required commerce field" });
    if (!Number.isInteger(product.priceMinor) || product.priceMinor <= 0) issues.push({ severity: "critical", productId: product.id, message: "Invalid price" });
    if (!product.material || !product.color || !product.category) issues.push({ severity: "warning", productId: product.id, message: "Missing normalized merchandising attribute" });
  }
  return { launchBlocked: issues.some((issue) => issue.severity === "critical"), issues };
}

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value);
}

export function isOpaqueToken(value: string) {
  return /^[A-Za-z0-9_-]{22}$/.test(value) || value === "sample-edit";
}
