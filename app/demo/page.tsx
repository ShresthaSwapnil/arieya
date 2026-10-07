import { DEMO_CATALOGS } from "@/lib/demo-catalogs";

export const metadata = {
  title: "Choose a sample collection — Arieya",
  description: "Try Arieya with sample collections across clothing, jewellery, home, and skincare.",
};

export default function DemoPage() {
  return <main className="landing demo-picker">
    <header className="site-header wrap">
      <a className="wordmark" href="/" aria-label="Arieya home">ARIEYA</a>
      <a className="button button--small" href="/#pilot">Join the pilot <span>↗</span></a>
    </header>
    <section className="demo-picker-hero wrap" aria-labelledby="demo-picker-title">
      <div className="demo-picker-intro">
        <span className="eyebrow">A guided preview · No signup</span>
        <h1 id="demo-picker-title">Choose a collection.</h1>
        <p>Pick what you’d shop for. Arieya will recommend from that sample catalogue.</p>
      </div>
      <div className="demo-category-grid">
        {DEMO_CATALOGS.map((catalog) => <a key={catalog.id} aria-label={`Try ${catalog.name}, ${catalog.products.length} sample products`} className={`demo-category-card demo-category-card--${catalog.id}`} href={`/stylist?demoCategory=${catalog.id}&prompt=${encodeURIComponent(catalog.prompt)}`}>
          <div aria-hidden="true" className={`demo-category-art product-image product-image--${catalog.products[0].imagePosition} ${catalog.products[0].imageUrl ? "product-image--external" : ""}`} style={catalog.products[0].imageUrl ? { backgroundImage: `url("${catalog.products[0].imageUrl}")` } : undefined} />
          <span className="demo-category-count">{catalog.products.length} sample products</span>
          <h2>{catalog.name}</h2>
          <p>{catalog.description}</p>
          <span className="demo-category-action">Try this collection <b>↗</b></span>
        </a>)}
      </div>
      <small className="demo-picker-note">Sample products and prices · No checkout connected</small>
    </section>
  </main>;
}
