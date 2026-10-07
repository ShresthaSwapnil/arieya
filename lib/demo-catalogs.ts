import { CATALOG, type Product } from "./core.ts";

type Sample = Pick<Product, "title" | "description" | "category" | "priceMinor" | "material" | "color" | "styles" | "occasions" | "imageUrl"> & { key: string };

function products(collection: string, rows: Sample[]): Product[] {
  return rows.map(({ key, ...product }, index) => ({
    ...product,
    id: `${collection}-${key}`,
    variantId: `demo-${collection}-${key}`,
    currency: "GBP",
    available: true,
    gemstone: null,
    priority: rows.length - index,
    imagePosition: (["left", "center", "right"] as const)[index % 3],
    url: "/demo",
  }));
}

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;

export const DEMO_CATALOGS = [
  {
    id: "clothing",
    name: "Clothing",
    description: "Everyday layers, considered fabrics, and pieces for a moment.",
    prompt: "Help me find something comfortable for everyday under £150.",
    products: products("clothing", [
      { key: "knit", title: "Soft Form Merino Knit", description: "A fine merino crew neck with a relaxed shape for easy layering.", category: "knitwear", priceMinor: 8900, material: "merino wool", color: "oatmeal", styles: ["understated", "everyday", "warm"], occasions: ["everyday", "gift"], imageUrl: image("photo-1576566588028-4147f3842f27") },
      { key: "shirt", title: "Sunday Linen Shirt", description: "A breathable linen shirt with a softly tailored, easy fit.", category: "shirt", priceMinor: 7400, material: "linen", color: "ivory", styles: ["understated", "minimal", "relaxed"], occasions: ["everyday", "weekend"], imageUrl: image("photo-1598554747436-c9293d6a588f") },
      { key: "coat", title: "Quiet Line Trench", description: "A light cotton trench with clean lines and considered details.", category: "coat", priceMinor: 18900, material: "cotton", color: "stone", styles: ["classic", "elegant", "understated"], occasions: ["everyday", "travel"], imageUrl: image("photo-1539533018447-63fcce2678e3") },
      { key: "dress", title: "Evening Ease Dress", description: "A fluid occasion dress with a simple, graceful silhouette.", category: "dress", priceMinor: 16400, material: "viscose blend", color: "deep blue", styles: ["elegant", "modern", "delicate"], occasions: ["evening", "occasion"], imageUrl: image("photo-1566174053879-31528523f8ae") },
    ]),
  },
  {
    id: "jewellery",
    name: "Jewellery",
    description: "The Aurora Jewel Studio sample collection, ready to explore.",
    prompt: "Show me an understated gift under £150.",
    products: CATALOG,
  },
  {
    id: "home",
    name: "Home & living",
    description: "Thoughtful details for slower mornings and welcoming rooms.",
    prompt: "I want a warm detail for my home under £100.",
    products: products("home", [
      { key: "lamp", title: "Dune Table Lamp", description: "A softly sculpted ceramic lamp that brings a warm pool of light.", category: "lighting", priceMinor: 9200, material: "ceramic", color: "sand", styles: ["warm", "understated", "modern"], occasions: ["housewarming", "gift"], imageUrl: image("photo-1507473885765-e6ed057f782c") },
      { key: "linen", title: "Woven Linen Runner", description: "A relaxed, tactile table runner in natural woven linen.", category: "textiles", priceMinor: 4800, material: "linen", color: "natural", styles: ["understated", "warm", "classic"], occasions: ["everyday", "housewarming"], imageUrl: image("photo-1616486338812-3dadae4b4ace") },
      { key: "glass", title: "Ribbed Glass Pair", description: "Two softly ribbed glasses made for everyday table settings.", category: "glassware", priceMinor: 3600, material: "glass", color: "clear", styles: ["minimal", "modern", "everyday"], occasions: ["everyday", "gift"], imageUrl: image("photo-1514228742587-6b1558fcca3d") },
      { key: "tray", title: "Sculpted Oak Tray", description: "A solid oak tray for the small rituals of a well-loved home.", category: "home accessories", priceMinor: 6800, material: "oak", color: "natural wood", styles: ["classic", "warm", "understated"], occasions: ["housewarming", "gift"], imageUrl: image("photo-1600210492486-724fe5c67fb0") },
    ]),
  },
  {
    id: "skincare",
    name: "Skincare",
    description: "A gentle routine built around everyday care and considered ingredients.",
    prompt: "Help me build a gentle skincare routine under £100.",
    products: products("skincare", [
      { key: "cream", title: "Daily Barrier Cream", description: "A comforting daily moisturiser for soft, balanced-feeling skin.", category: "moisturizer", priceMinor: 3200, material: "ceramides", color: "fragrance-free", styles: ["gentle", "everyday", "minimal"], occasions: ["everyday", "gift"], imageUrl: image("photo-1608248543803-ba4f8c70ae0b") },
      { key: "cleanser", title: "Cloud Milk Cleanser", description: "A gentle milk cleanser that leaves skin feeling comfortable.", category: "cleanser", priceMinor: 2400, material: "oat extract", color: "gentle", styles: ["gentle", "understated", "everyday"], occasions: ["everyday"], imageUrl: image("photo-1556229010-6c3f2c9ca5f8") },
      { key: "serum", title: "Dewdrop Face Serum", description: "A lightweight hydrating serum for a fresh, dewy finish.", category: "serum", priceMinor: 3800, material: "hyaluronic acid", color: "hydrating", styles: ["modern", "lightweight", "everyday"], occasions: ["everyday", "gift"], imageUrl: image("photo-1601049541289-9b1b7bbbfe19") },
      { key: "oil", title: "Botanical Body Oil", description: "A silky body oil with a light botanical scent and quick-absorbing feel.", category: "body care", priceMinor: 2900, material: "botanical oils", color: "soft floral", styles: ["warm", "relaxing", "delicate"], occasions: ["evening", "gift"], imageUrl: image("photo-1608248543803-ba4f8c70ae0b") },
    ]),
  },
] as const;

export type DemoCatalogId = (typeof DEMO_CATALOGS)[number]["id"];

export function getDemoCatalog(id: unknown) {
  return typeof id === "string" ? DEMO_CATALOGS.find((catalog) => catalog.id === id) : undefined;
}
