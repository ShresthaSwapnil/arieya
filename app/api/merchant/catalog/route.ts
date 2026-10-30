import { NextResponse } from "next/server";
import { parseCatalog, safeProductUrl } from "@/lib/catalog";
import { jsonError, rateLimit, readJson } from "@/lib/http";
import { merchantSession, saveMerchantCatalog } from "@/lib/merchant";
import { merchantToken, sameOrigin } from "@/lib/merchant-http";
import { clearCatalog, deleteProduct, overwriteCatalog, sql, updateProduct } from "@/lib/store";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request origin not allowed.", 403);
  try {
    if (!sql) return jsonError("Merchant accounts need a configured database.", 503);
    if (!await rateLimit(request, "merchant-catalog", 30)) return jsonError("Please try again in a minute.", 429);
    const account = await merchantSession(merchantToken(request));
    if (!account) return jsonError("Sign in to continue.", 401);
    const body = await readJson(request, 4_200_000) as Record<string, unknown>;
    const storeCurrency = account.stores.find((store) => store.id === account.tenantId)?.currency || "USD";
    const normalizedInput = Array.isArray(body.products)
      ? body.products.map((item) => (item && typeof item === "object" ? { ...item, currency: storeCurrency } : item))
      : body.products;
    let products;
    try { products = parseCatalog(normalizedInput, storeCurrency); }
    catch (error) { return jsonError(error instanceof Error ? error.message : "Invalid catalogue.", 400); }
    if (body.overwrite) {
      await overwriteCatalog(account.tenantId, products);
    } else {
      await saveMerchantCatalog(account.tenantId, products);
    }
    return NextResponse.json({ productCount: products.length, currency: products[0].currency });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") return jsonError("Catalogue must be under 2 MB.", 413);
    if (error instanceof Error && error.message === "INVALID_JSON") return jsonError("Invalid catalogue data.", 400);
    return jsonError("Could not save the catalogue.", 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request origin not allowed.", 403);
  try {
    if (!sql) return jsonError("Database required.", 503);
    if (!await rateLimit(request, "merchant-catalog-delete", 40)) return jsonError("Please try again in a minute.", 429);
    const account = await merchantSession(merchantToken(request));
    if (!account) return jsonError("Sign in to continue.", 401);
    const body = await readJson(request, 2_000) as Record<string, unknown>;
    if (body.clearAll === true) {
      await clearCatalog(account.tenantId);
      return NextResponse.json({ ok: true, cleared: true });
    }
    const productId = typeof body.productId === "string" && body.productId.length > 0 && body.productId.length <= 100 ? body.productId : null;
    if (!productId) return jsonError("Product ID is required.", 400);
    const deleted = await deleteProduct(account.tenantId, productId);
    if (!deleted) return jsonError("Product not found.", 404);
    return NextResponse.json({ ok: true, deletedProductId: productId });
  } catch { return jsonError("Could not delete the product.", 503); }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request origin not allowed.", 403);
  try {
    if (!sql) return jsonError("Database required.", 503);
    if (!await rateLimit(request, "merchant-catalog-update", 40)) return jsonError("Please try again in a minute.", 429);
    const account = await merchantSession(merchantToken(request));
    if (!account) return jsonError("Sign in to continue.", 401);
    const body = await readJson(request, 12_000) as Record<string, unknown>;
    const productId = typeof body.productId === "string" && body.productId.length > 0 && body.productId.length <= 100 ? body.productId : null;
    if (!productId) return jsonError("Product ID is required.", 400);
    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim().length > 0 && body.title.length <= 240) updates.title = body.title.trim();
    if (typeof body.description === "string" && body.description.length <= 2000) updates.description = body.description.trim();
    if (typeof body.category === "string" && body.category.length <= 100) updates.category = body.category.trim() || "general";
    if (typeof body.available === "boolean") updates.available = body.available;
    if (typeof body.priceMinor === "number" && Number.isSafeInteger(body.priceMinor) && body.priceMinor > 0 && body.priceMinor <= 100_000_000) updates.priceMinor = body.priceMinor;
    if (typeof body.material === "string" && body.material.length <= 100) updates.material = body.material.trim() || undefined;
    if (typeof body.color === "string" && body.color.length <= 100) updates.color = body.color.trim() || undefined;
    if (typeof body.url === "string" && body.url.trim().length > 0 && body.url.length <= 1000) {
      const candidateUrl = /^https?:\/\//i.test(body.url.trim()) ? body.url.trim().replace(/^http:\/\//i, "https://") : `https://${body.url.trim()}`;
      if (!safeProductUrl(candidateUrl)) return jsonError("Enter a valid public HTTPS product link.", 400);
      updates.url = candidateUrl;
    }
    if (typeof body.imageUrl === "string" && body.imageUrl.length <= 1000) {
      if (!body.imageUrl.trim()) {
        updates.imageUrl = undefined;
      } else {
        const candidateImg = /^https?:\/\//i.test(body.imageUrl.trim()) ? body.imageUrl.trim().replace(/^http:\/\//i, "https://") : `https://${body.imageUrl.trim()}`;
        if (!safeProductUrl(candidateImg)) return jsonError("Enter a valid public HTTPS image link.", 400);
        updates.imageUrl = candidateImg;
      }
    }
    if (body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes)) {
      const cleanAttrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.attributes as Record<string, unknown>)) {
        if (typeof k === "string" && k.trim().length > 0 && k.length <= 60 && typeof v === "string" && v.length <= 240) {
          if (v.trim()) cleanAttrs[k.trim()] = v.trim();
        }
      }
      updates.attributes = Object.keys(cleanAttrs).length ? cleanAttrs : undefined;
    }
    if (Object.keys(updates).length === 0) return jsonError("No valid fields to update.", 400);
    const updated = await updateProduct(account.tenantId, productId, updates as any);
    if (!updated) return jsonError("Product not found.", 404);
    return NextResponse.json({ ok: true, product: updated });
  } catch { return jsonError("Could not update the product.", 503); }
}
