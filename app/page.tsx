import { Demo } from "./demo";
import { PilotForm } from "./pilot-form";
import { HowItWorksFlow } from "./components/how-it-works-flow";
import { PricingTable } from "./components/pricing-table";
import { SiteHeader } from "./components/site-header";

export default function Home() {
  return <main className="landing" id="top">
    <SiteHeader />

    <section className="landing-hero wrap">
      <span className="eyebrow">A shopping advisor for online stores</span>
      <h1>Help people<br />find what fits.</h1>
      <p>Arieya helps shoppers describe what they want, then find matching products in your catalogue.</p>
      <a href="/demo" className="button">Start demo <span>↗</span></a>
    </section>

    <section className="landing-showcase wrap" id="showcase">
      <div className="landing-showcase-copy"><span className="eyebrow">The Arieya experience</span><h2>From a feeling.<br />To a better fit.</h2><p>A shopper shares the occasion, budget, or detail. Arieya suggests real products and links back to your store.</p><a className="text-link" href="/stylist">Explore the full-page advisor <span>↗</span></a></div>
      <div className="landing-showcase-visual"><div className="visual-orbit" aria-hidden="true" /><Demo /><div className="visual-caption">An example conversation with sample jewellery products</div></div>
    </section>

    {/* How It Works Flowchart */}
    <HowItWorksFlow />

    <section className="landing-difference wrap" id="difference">
      <div className="landing-section-heading"><span className="eyebrow">The problem — and the Arieya solution</span><h2>Where discovery stalls.</h2></div>
      <div className="landing-problem-grid">
        <article><span className="eyebrow">For shoppers</span><h3>Search asks for exact words.</h3><p>Filters can miss the occasion, feeling, or practical detail behind a product search.</p><div className="landing-solution"><small>ARIEYA SOLUTION</small><p>Let shoppers explain naturally and refine a relevant shortlist in conversation.</p></div></article>
        <article><span className="eyebrow">For merchants</span><h3>Good products get buried.</h3><p>Long lists make it harder to surface the right item and understand what shoppers explore.</p><div className="landing-solution"><small>ARIEYA SOLUTION</small><p>Match from your catalogue and review recommendation clicks during the pilot.</p></div></article>
      </div>
    </section>

    {/* Transparent Pricing Section */}
    <section className="landing-pricing wrap" id="pricing">
      <div className="landing-pricing-heading">
        <span className="eyebrow">Simple, Transparent Pricing</span>
        <h2>Invest in discovery that converts.</h2>
        <p>No revenue tax or hidden fees. Start free on the pilot preview, then choose a predictable plan as your store traffic grows.</p>
      </div>

      <PricingTable showComparisonLink={true} />

      <p className="landing-pricing-guarantee">
        <span>✦</span> Powered by Lemon Squeezy for secure, international billing and instant VAT/tax compliance across 135+ countries.
      </p>
    </section>

    <section className="landing-pilot wrap" id="pilot">
      <div className="landing-pilot-copy"><span className="eyebrow">Founding-store pilot · Aurora Jewel Studio first</span><h2>Bring your catalogue.<br />We’ll help you begin.</h2><p>For jewellery and other online stores with 30+ products. Get catalogue setup, a branded advisor preview, and a review of early shopper interest.</p><ul><li>Your existing website and product pages</li><li>No card to request a pilot</li><li>Pricing agreed before any paid service</li></ul></div>
      <div className="landing-pilot-form"><h3>Tell us about your store</h3><PilotForm /></div>
    </section>

    <footer className="site-footer wrap">
      <div><a className="wordmark" href="#top">ARIEYA</a><p>Make choosing easier.</p></div>
      <nav aria-label="Footer navigation">
        <a href="#showcase">The experience</a>
        <a href="#how-it-works">How it works</a>
        <a href="/pricing">Pricing</a>
        <a href="/guide">Integration guide</a>
        <a href="/catalogue">Catalogue Atelier</a>
        <a href="/merchant">Merchant studio</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
      </nav>
      <small>© {new Date().getFullYear()} Arieya</small>
    </footer>
  </main>;
}
