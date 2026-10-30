"use client";

import { useState } from "react";

export type BillingCycle = "monthly" | "annual";

interface PricingTableProps {
  showComparisonLink?: boolean;
}

export function PricingTable({ showComparisonLink = true }: PricingTableProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const isAnnual = cycle === "annual";

  return (
    <div className="pricing-container">
      {/* Billing Cycle Toggle */}
      <div className="pricing-toggle-wrap">
        <div className="pricing-toggle" role="group" aria-label="Billing frequency selection">
          <button
            type="button"
            className={`pricing-toggle-btn ${!isAnnual ? "is-active" : ""}`}
            onClick={() => setCycle("monthly")}
            aria-pressed={!isAnnual}
          >
            Monthly billing
          </button>
          <button
            type="button"
            className={`pricing-toggle-btn ${isAnnual ? "is-active" : ""}`}
            onClick={() => setCycle("annual")}
            aria-pressed={isAnnual}
          >
            Annual billing
            <span className="pricing-save-pill">Save 20% · 2 Mo Free</span>
          </button>
        </div>
        <p className="pricing-toggle-note">
          {isAnnual
            ? "✦ Annual plans billed annually · Save up to $24 per year"
            : "No long-term contracts · Switch or cancel anytime in 1 click"}
        </p>
      </div>

      {/* 3-Tier Grid */}
      <div className="landing-pricing-grid">
        {/* Starter Plan */}
        <article className="landing-plan-card landing-plan-card--standard">
          <div className="plan-header">
            <span className="eyebrow">Starter Atelier</span>
            <h3 className="plan-title">Starter</h3>
            <p className="plan-desc">For independent ateliers and boutique shops launching guided discovery.</p>
          </div>

          <div className="landing-plan-price">
            <span className="plan-currency">$</span>
            <strong>{isAnnual ? "3.19" : "3.99"}</strong>
            <span className="plan-period">
              /month
              <small className="plan-approx">{isAnnual ? "billed $38.28/yr · $3.19/mo" : "billed monthly"}</small>
            </span>
          </div>

          <div className="plan-divider" />

          <ul className="landing-plan-features">
            <li>
              <span className="feature-glyph">✦</span>
              <div><b>1,500</b> discovery sessions / month</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Up to <b>500</b> catalogue products</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div><b>1</b> storefront workspace</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Zero-dependency script & iframe embed</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Deterministic stock & constraint guardrails</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>30-day shopper interest analytics</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Standard email support</div>
            </li>
          </ul>

          <div className="plan-action">
            <a href="/merchant" className="landing-plan-btn landing-plan-btn--secondary">
              Start 14-day free trial <span>↗</span>
            </a>
            <span className="plan-guarantee">No card required to preview</span>
          </div>
        </article>

        {/* Growth Plan (Featured & Elevated) */}
        <article className="landing-plan-card landing-plan-card--featured">
          <div className="featured-badge-anchor">
            <span className="merchant-plan-badge">
              ✦ Most Popular · Best Value
            </span>
          </div>

          <div className="plan-header">
            <span className="eyebrow">Growth Boutique</span>
            <h3 className="plan-title">Growth</h3>
            <p className="plan-desc">For established retail brands ready to elevate discovery and boost conversion.</p>
          </div>

          <div className="landing-plan-price">
            <span className="plan-currency">$</span>
            <strong>{isAnnual ? "4.79" : "5.99"}</strong>
            <span className="plan-period">
              /month
              <small className="plan-approx">{isAnnual ? "billed $57.48/yr · $4.79/mo" : "billed monthly"}</small>
            </span>
          </div>

          <div className="plan-divider plan-divider--featured" />

          <ul className="landing-plan-features">
            <li>
              <span className="feature-glyph">✦</span>
              <div><b>6,000</b> discovery sessions / month</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Up to <b>2,500</b> catalogue products</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Up to <b>3</b> storefront workspaces</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div><b>Gemini AI</b> soft-intent understanding</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Custom brand styling & stylist voice</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Weekly search trends & demand analytics</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Priority merchant support & onboarding</div>
            </li>
          </ul>

          <div className="plan-action">
            <a href="/merchant" className="landing-plan-btn landing-plan-btn--featured">
              Start with Growth <span>↗</span>
            </a>
            <span className="plan-guarantee">14-day catalogue preview included</span>
          </div>
        </article>

        {/* Pro Plan */}
        <article className="landing-plan-card landing-plan-card--standard">
          <div className="plan-header">
            <span className="eyebrow">Pro Maison</span>
            <h3 className="plan-title">Pro</h3>
            <p className="plan-desc">For high-traffic retailers, multi-brand storefronts, and digital agencies.</p>
          </div>

          <div className="landing-plan-price">
            <span className="plan-currency">$</span>
            <strong>{isAnnual ? "7.99" : "9.99"}</strong>
            <span className="plan-period">
              /month
              <small className="plan-approx">{isAnnual ? "billed $95.88/yr · $7.99/mo" : "billed monthly"}</small>
            </span>
          </div>

          <div className="plan-divider" />

          <ul className="landing-plan-features">
            <li>
              <span className="feature-glyph">✦</span>
              <div><b>25,000</b> discovery sessions / month</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Up to <b>10,000</b> catalogue products</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Up to <b>10</b> storefront workspaces</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Automated catalogue sync API</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Attributed order tracking & conversion tags</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Concierge onboarding & CSS review</div>
            </li>
            <li>
              <span className="feature-glyph">✦</span>
              <div>Dedicated Slack channel & 99.9% uptime SLA</div>
            </li>
          </ul>

          <div className="plan-action">
            <a href="/merchant" className="landing-plan-btn landing-plan-btn--secondary">
              Select Pro <span>↗</span>
            </a>
            <span className="plan-guarantee">Full API access & multi-store setup</span>
          </div>
        </article>
      </div>

      {/* Enterprise Custom Atelier Banner */}
      <div className="enterprise-banner">
        <div className="enterprise-copy">
          <span className="eyebrow">Enterprise Atelier · Custom Architecture</span>
          <h3>Operating a luxury conglomerate or enterprise catalogue?</h3>
          <p>
            For luxury brands, department stores, and multi-brand retailers with custom catalogues, bespoke model weights, dedicated infrastructure, and enterprise SLAs.
          </p>
          <div className="enterprise-pillars">
            <div className="enterprise-pillar">
              <strong>Unlimited SKUs & Sessions</strong>
              <small>Custom high-throughput compute infrastructure</small>
            </div>
            <div className="enterprise-pillar">
              <strong>Bespoke AI Fine-Tuning</strong>
              <small>Custom embeddings tuned to your proprietary ontology</small>
            </div>
            <div className="enterprise-pillar">
              <strong>ERP & Omnichannel Sync</strong>
              <small>Direct connectors for Shopify Plus, SAP & Salesforce</small>
            </div>
            <div className="enterprise-pillar">
              <strong>Dedicated Account Team</strong>
              <small>Named technical lead, bespoke CSS & 99.95% SLA</small>
            </div>
          </div>
        </div>
        <div className="enterprise-action">
          <div className="enterprise-badge">Bespoke Contract</div>
          <div className="enterprise-price">Custom Pricing</div>
          <p>Tailored to your monthly catalogue volume and global regional latency requirements.</p>
          <a href="#pilot" className="landing-plan-btn landing-plan-btn--dark">
            Schedule consultation <span>↗</span>
          </a>
        </div>
      </div>

      {showComparisonLink && (
        <div className="pricing-breakdown-anchor">
          <a href="/pricing" className="pricing-breakdown-link">
            Looking for a complete line-by-line feature breakdown?
            <strong>View full comparison matrix <span>→</span></strong>
          </a>
        </div>
      )}
    </div>
  );
}
