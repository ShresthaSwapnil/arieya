import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isOpaqueToken, type Product } from "@/lib/core";
import { getCatalog, getEdit } from "@/lib/store";
import { ShareView } from "./share-view";

export const metadata: Metadata = {
  title: "A Shareable Edit — Arieya",
  description: "An unlisted product shortlist shared with you.",
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default async function SharedEditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token)) notFound();
  const edit = await getEdit(token);
  if (!edit || edit.deletedAt || new Date(edit.expiresAt) <= new Date()) {
    return <main className="shared-page shared-page--empty"><a className="wordmark" href="/">ARIEYA</a><div><span className="eyebrow">Shareable Edit</span><h1>This edit is no longer available.</h1><p>It may have expired or been deleted by its creator.</p><a className="button button--primary" href="/">Return to Arieya</a></div></main>;
  }
  const catalog = edit.catalogSnapshot || await getCatalog(edit.tenantId);
  const products = edit.productIds.map((id) => catalog.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
  return (
    <main className="shared-page">
      <header><a className="wordmark" href="/">ARIEYA</a><span>Arieya · Unlisted edit</span></header>
      <section className="shared-heading"><span className="eyebrow">A product edit was shared with you</span><h1>For a confident choice.</h1><p>{edit.intentSummary}</p><small>{edit.catalogSnapshot ? "Uploaded catalogue snapshot. Confirm current prices and stock with the store." : "Sample catalogue prices and availability; no checkout is connected."}</small></section>
      <ShareView token={token} products={products} reasons={edit.selectionReasons} />
      <footer className="shared-footer"><span>Unlisted · Expires {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(edit.expiresAt))}</span><a href="/">Powered by Arieya</a></footer>
    </main>
  );
}
