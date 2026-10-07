import type { Product } from "@/lib/core";
import { formatMoney } from "@/lib/core";

export function ProductCard({
  product,
  reason,
  compact = false,
  trackingToken,
}: {
  product: Product;
  reason: string;
  compact?: boolean;
  trackingToken?: string;
}) {
  const style = product.imageUrl
    ? { backgroundImage: `url(${JSON.stringify(product.imageUrl)})` }
    : undefined;

  return (
    <article className={`product-card ${compact ? "product-card--compact" : ""}`}>
      <div
        className={`product-image product-image--${product.imagePosition} ${product.imageUrl ? "product-image--external" : !product.variantId.startsWith("demo-") ? "product-image--placeholder" : ""}`}
        style={style}
        role="img"
        aria-label={`${product.title}, ${product.description}`}
      />
      <div className="product-content">
        <span className={`match-label ${product.available ? "" : "match-label--unavailable"}`}>
          <span aria-hidden="true">{product.available ? "✦" : "!"}</span>{" "}
          {product.available ? product.variantId.startsWith("demo-") ? "Sample · Available" : "Listed available" : "Unavailable"}
        </span>
        <div className="product-heading">
          <h3>{product.title}</h3>
          <strong>{formatMoney(product.priceMinor, product.currency)}</strong>
        </div>
        <p>{reason}</p>
        <a
          className="text-link"
          href={`${product.url}${trackingToken ? `${product.url.includes("?") ? "&" : "?"}edita_share=${encodeURIComponent(trackingToken)}` : ""}`}
          aria-label={`View ${product.title}`}
        >
          View piece <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
