import type { Metadata } from "next";
import { PricingTable } from "../components/pricing-table";
import { PilotForm } from "../pilot-form";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "Pricing & Plans | Arieya — Conversational Discovery for Online Retail",
  description: "Simple, transparent pricing for AI shopper discovery. Predictable monthly and annual tiers, zero revenue fees, and Lemon Squeezy global tax compliance.",
};

const comparisonCategories = [
  {
    category: "Shopper Experience & Advisor AI",
    features: [
      {
        name: "Monthly Discovery Sessions",
        hint: "A shopper conversation exploring products",
        starter: "1,500 / mo",
        growth: "6,000 / mo",
        pro: "25,000 / mo",
        enterprise: "Custom / Unlimited",
      },
      {
        name: "Deterministic Stock & Price Guardrails",
        hint: "Never recommends out-of-stock items or fake prices",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Included",
      },
      {
        name: "Interactive Product Cards & Direct Links",
        hint: "Presents instant product cards that link directly to your store",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Included",
      },
      {
        name: "Gemini AI Soft-Intent Extraction",
        hint: "Detects subtle nuances like mood, dress code, and gifts",
        starter: "—",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Fine-Tuned",
      },
      {
        name: "Stylist Voice & Brand Tone Tuning",
        hint: "Customise how the advisor speaks to mirror your brand persona",
        starter: "Standard",
        growth: "✓ Custom Tone",
        pro: "✓ Bespoke Persona",
        enterprise: "✓ Multi-Persona",
      },
      {
        name: "Curated Edit Sharing",
        hint: "Shoppers can generate shareable links of their personalised picks",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ White-Label",
      },
    ],
  },
  {
    category: "Catalogue & Inventory Management",
    features: [
      {
        name: "Catalogue SKU Allowance",
        hint: "Maximum active products synced in your advisor",
        starter: "500 SKUs",
        growth: "2,500 SKUs",
        pro: "10,000 SKUs",
        enterprise: "Unlimited",
      },
      {
        name: "Feed Formats Supported",
        hint: "Upload product feeds in standard formats",
        starter: "CSV, JSON, XML",
        growth: "CSV, JSON, XML",
        pro: "CSV, JSON, XML",
        enterprise: "Any format / API",
      },
      {
        name: "Catalogue Atelier Importer & Validator",
        hint: "Sanitises feeds, validates prices, and verifies HTTPS URLs",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Custom ETL",
      },
      {
        name: "Automated Catalogue Sync API",
        hint: "Programmatic webhook or REST sync to keep inventory fresh",
        starter: "Manual feed",
        growth: "Daily sync",
        pro: "✓ Real-time API",
        enterprise: "✓ Direct DB / Webhook",
      },
      {
        name: "Multi-Currency Support",
        hint: "Displays prices in your store's native currency",
        starter: "GBP, USD, EUR",
        growth: "GBP, USD, EUR",
        pro: "All currencies",
        enterprise: "Multi-currency geo",
      },
    ],
  },
  {
    category: "Storefront & Workspaces",
    features: [
      {
        name: "Storefront Workspaces",
        hint: "Independent catalogues and advisor settings per website",
        starter: "1 store",
        growth: "Up to 3 stores",
        pro: "Up to 10 stores",
        enterprise: "Unlimited stores",
      },
      {
        name: "Floating Launcher Script",
        hint: "One script tag that adds an interactive launcher widget",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Included",
      },
      {
        name: "Direct Iframe & Full-Page Embed",
        hint: "Embed directly within dedicated landing pages",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Included",
      },
      {
        name: "Custom CSS & Theme Overrides",
        hint: "Style fonts, colors, radii, and buttons to match your store",
        starter: "Basic presets",
        growth: "✓ Custom Palette",
        pro: "✓ Full CSS injection",
        enterprise: "✓ Bespoke Design Team",
      },
    ],
  },
  {
    category: "Analytics & Commercial Intelligence",
    features: [
      {
        name: "Shopper Discovery Dashboard",
        hint: "Track total sessions, opened products, and click-through rates",
        starter: "30-day window",
        growth: "90-day window",
        pro: "1-year window",
        enterprise: "Full historical / BI",
      },
      {
        name: "Top Product Clicks & Demand Tracking",
        hint: "Identify which catalogue items shoppers show highest interest in",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Included",
      },
      {
        name: "Weekly Search Trend Reports",
        hint: "Email digest of shopper queries, trends, and unanswered requests",
        starter: "—",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "✓ Custom Delivery",
      },
      {
        name: "Attributed Order Tracking",
        hint: "Track which advisor recommendations converted into completed sales",
        starter: "—",
        growth: "—",
        pro: "✓ Included",
        enterprise: "✓ Multi-Touch",
      },
    ],
  },
  {
    category: "Security, Compliance & Support",
    features: [
      {
        name: "Lemon Squeezy Merchant of Record",
        hint: "Instant VAT & global sales tax compliance handled for you",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "Custom Billing",
      },
      {
        name: "Revenue Share / Cut on Sales",
        hint: "We never take a percentage cut of your store revenue",
        starter: "0% (Never)",
        growth: "0% (Never)",
        pro: "0% (Never)",
        enterprise: "0% (Never)",
      },
      {
        name: "Multi-Tenant Data Isolation",
        hint: "Strict row-level PostgreSQL isolation prevents data leaks",
        starter: "✓ Included",
        growth: "✓ Included",
        pro: "✓ Included",
        enterprise: "Dedicated VPC / DB",
      },
      {
        name: "Merchant Support Level",
        hint: "Response time and support channels",
        starter: "Standard email",
        growth: "Priority email (24h)",
        pro: "Dedicated Slack + Concierge",
        enterprise: "24/7 Phone & Slack SLA",
      },
      {
        name: "Uptime Service Level Agreement",
        hint: "Guaranteed platform availability",
        starter: "99.5% standard",
        growth: "99.8% priority",
        pro: "99.9% guaranteed",
        enterprise: "99.95% contractual SLA",
      },
    ],
  },
];

const pricingFaqs = [
  {
    q: "How are shopper discovery sessions counted?",
    a: "A discovery session begins when a shopper asks a question or explores recommendations through your advisor widget. Back-and-forth follow-ups within the same browsing session count as a single session. We do not count empty widget opens or accidental clicks.",
  },
  {
    q: "Do you take a percentage cut of my store's sales?",
    a: "No. Never. Arieya operates on a transparent SaaS subscription model. Whether your advisor generates $5,000 or $500,000 in monthly sales, your fee remains strictly fixed at your chosen tier with 0% revenue commission.",
  },
  {
    q: "What happens if my store exceeds its monthly session allowance?",
    a: "We never cut off your shoppers mid-conversation or leave your store with a broken widget. When you reach 80% and 100% of your tier, we send you an automated email notification. You can easily upgrade your plan in one click, or extra sessions are billed at a predictable, modest overage rate without disruption.",
  },
  {
    q: "How does the annual billing discount work?",
    a: "When you choose Annual billing, you save 20% on all plans—the equivalent of more than two months free every year. For example, the Growth plan drops from $5.99/mo to $4.79/mo (billed annually at $57.48/year, saving over $14 annually).",
  },
  {
    q: "How does the 14-day catalogue preview trial work?",
    a: "When you register in Merchant Studio, you can immediately upload your product feed (CSV, JSON, or XML) and test 3 interactive test questions on your own live inventory. No credit card is required to preview the advisor on your products.",
  },
  {
    q: "Which e-commerce platforms does Arieya integrate with?",
    a: "Arieya works universally on any website. You can paste our single-line JavaScript snippet into Shopify, WooCommerce, Wix, Squarespace, Magento, Webflow, or custom headless React/Next.js storefronts. Setup takes under 5 minutes.",
  },
];

export default function PricingPage() {
  return (
    <main className="landing pricing-page" id="top">
      {/* Site Header */}
      <SiteHeader />

      {/* Pricing Hero */}
      <section className="pricing-hero wrap">
        <div className="pricing-hero-badge">Transparent, Predictable Commerce</div>
        <h1>Invest in discovery<br />that converts.</h1>
        <p>
          No transaction cuts or unexpected charges. Select a predictable monthly or annual plan tailored to your catalogue size and shopper volume.
        </p>
      </section>

      {/* Main Interactive Pricing Section */}
      <section className="wrap">
        <PricingTable showComparisonLink={false} />
      </section>

      {/* Line-by-Line Comparison Matrix */}
      <section className="comparison-section wrap" id="comparison">
        <div className="comparison-heading">
          <span className="eyebrow">Comprehensive Feature Breakdown</span>
          <h2>Compare plans in detail.</h2>
          <p>Everything you need to know about our data guarantees, AI intelligence, and platform allowances.</p>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="th-feature">Feature & Capability</th>
                <th className="th-plan">Starter<small>$19 / mo</small></th>
                <th className="th-plan th-plan--highlight">Growth<small>$49 / mo · Most Popular</small></th>
                <th className="th-plan">Pro<small>$129 / mo</small></th>
                <th className="th-plan">Enterprise<small>Custom</small></th>
              </tr>
            </thead>
            <tbody>
              {comparisonCategories.map((cat, cIdx) => (
                <tr key={cat.category} className="tr-category">
                  <td colSpan={5} className="td-category-header">
                    <span>0{cIdx + 1}</span> {cat.category}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Full Category Blocks */}
          <div className="comparison-groups">
            {comparisonCategories.map((cat, cIdx) => (
              <div key={cat.category} className="comparison-group">
                <div className="comparison-group-title">
                  <span>0{cIdx + 1}</span>
                  <h3>{cat.category}</h3>
                </div>

                <div className="comparison-rows">
                  {cat.features.map((feat) => (
                    <div key={feat.name} className="comparison-row">
                      <div className="comp-feat-col">
                        <strong>{feat.name}</strong>
                        {feat.hint && <small>{feat.hint}</small>}
                      </div>
                      <div className="comp-val-col comp-val--starter">
                        <span className="mobile-plan-label">Starter:</span>
                        <span>{feat.starter}</span>
                      </div>
                      <div className="comp-val-col comp-val--growth comp-val--highlight">
                        <span className="mobile-plan-label">Growth:</span>
                        <strong>{feat.growth}</strong>
                      </div>
                      <div className="comp-val-col comp-val--pro">
                        <span className="mobile-plan-label">Pro:</span>
                        <span>{feat.pro}</span>
                      </div>
                      <div className="comp-val-col comp-val--enterprise">
                        <span className="mobile-plan-label">Enterprise:</span>
                        <span>{feat.enterprise}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing FAQ Section */}
      <section className="pricing-faq-section wrap">
        <div className="landing-section-heading">
          <span className="eyebrow">Frequently Asked Questions</span>
          <h2>Clarity on billing and setup.</h2>
          <p>Common questions from independent ateliers and scaling retail brands.</p>
        </div>

        <div className="pricing-faq-grid">
          {pricingFaqs.map((faq) => (
            <details key={faq.q} className="pricing-faq-item">
              <summary>
                <span>{faq.q}</span>
                <i aria-hidden="true">+</i>
              </summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Lead Pilot Form Section */}
      <section className="landing-pilot wrap" id="pilot">
        <div className="landing-pilot-copy">
          <span className="eyebrow">Founding-store pilot · Enterprise & Custom</span>
          <h2>Bring your catalogue.<br />We’ll help you begin.</h2>
          <p>
            Whether you want a standard boutique setup or a bespoke enterprise deployment across multi-brand storefronts, let us know your requirements.
          </p>
          <ul>
            <li>Your existing website and product pages</li>
            <li>No card to request a pilot or consult</li>
            <li>Pricing agreed before any paid service</li>
          </ul>
        </div>
        <div className="landing-pilot-form">
          <h3>Request an onboarding review</h3>
          <PilotForm />
        </div>
      </section>

      {/* Site Footer */}
      <footer className="site-footer wrap">
        <div><a className="wordmark" href="#top">ARIEYA</a><p>Make choosing easier.</p></div>
        <nav aria-label="Footer navigation">
          <a href="/#showcase">The experience</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/pricing">Pricing</a>
          <a href="/guide">Integration guide</a>
          <a href="/catalogue">Catalogue Atelier</a>
          <a href="/merchant">Merchant studio</a>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </nav>
        <small>© {new Date().getFullYear()} Arieya</small>
      </footer>
    </main>
  );
}
