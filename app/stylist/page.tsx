import type { Product } from "@/lib/core";
import { getCatalog, getEdit } from "@/lib/store";
import { getTenantById, getTenantByPublicKey } from "@/lib/merchant";
import { getDemoCatalog } from "@/lib/demo-catalogs";
import { Stylist } from "./stylist";
import { notFound } from "next/navigation";

export default async function StylistPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : "";
  const found = from ? await getEdit(from) : null;
  const edit = found && !found.deletedAt && new Date(found.expiresAt) > new Date() ? found : null;
  const requestedStore = typeof params.store === "string" ? params.store : "";
  const demoCatalog = !requestedStore && (!edit || edit.tenantId === "tenant_demo") ? getDemoCatalog(params.demoCategory) : null;
  const tenant = requestedStore
    ? await getTenantByPublicKey(requestedStore)
    : edit && edit.tenantId !== "tenant_demo" ? await getTenantById(edit.tenantId) : null;
  if (requestedStore && !tenant) notFound();
  const store = tenant || { id: "tenant_demo", publicKey: "edita-demo", name: "Arieya", storeUrl: "", currency: "GBP", approvedOrigins: [], status: "preview" };
  const productId = typeof params.product === "string" ? params.product : "";

  let featuredProduct: Product | null = null;
  if (productId) {
    const catalog = demoCatalog?.products || await getCatalog(store.id);
    featuredProduct =
      catalog.find((p) => p.id === productId) || null;
  }

  return (
    <main className="stylist-page">
      <Stylist
        tenant={store.publicKey}
        merchantName={store.name}
        storeUrl={store.storeUrl}
        fromEdit={edit?.token}
        initialPrompt={edit?.intentSummary || (typeof params.prompt === "string" ? params.prompt.slice(0, 500) : "")}
        initialSeen={edit?.productIds || (featuredProduct ? [featuredProduct.id] : [])}
        initialProduct={featuredProduct}
        demoCategory={demoCatalog?.id}
        demoCatalogName={demoCatalog?.name}
      />
    </main>
  );
}
