"use client";

import { useState } from "react";

export function HowItWorksFlow() {
  const [copied, setCopied] = useState(false);
  const [truthToggle, setTruthToggle] = useState(true);
  const [budgetToggle, setBudgetToggle] = useState(true);
  const [categoriesToggle, setCategoriesToggle] = useState(true);

  const snippet = `<script\n  src="https://www.arieya.site/arieya-sdk.js"\n  data-store-key="YOUR_STORE_KEY"\n></script>`;

  function copyCode() {
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="workflow-section wrap" id="how-it-works" aria-labelledby="workflow-title">
      {/* Header Intro */}
      <div className="workflow-intro">
        <span className="eyebrow">Zero Hallucinations · 1-Line Setup</span>
        <h2 id="workflow-title">Turn Your Catalogue Into A Full Shopping Advisor In 3m</h2>
        <p>
          Most AI tools hallucinate products, invent prices, or break your store layout. Arieya grounds
          every recommendation strictly in your real catalogue, enforces hard commercial bounds,
          and drops onto any website with a single lightweight script tag.
        </p>
      </div>

      {/* Main Flow Canvas */}
      <div className="workflow-canvas">
        {/* SVG Connector Lines for Desktop */}
        <svg
          className="workflow-connectors"
          viewBox="0 0 1100 780"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Line 1 -> Line 2 */}
          <path
            d="M 320 120 L 390 120"
            stroke="#8b6528"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            opacity="0.9"
          />
          {/* Line 2 -> Line 3 */}
          <path
            d="M 700 120 L 760 120"
            stroke="#8b6528"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            opacity="0.9"
          />
          {/* Line 3 down to Action Pill */}
          <path
            d="M 910 240 L 910 320 L 800 320"
            stroke="#8b6528"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            opacity="0.9"
          />
          {/* Action Pill to Phone Centerpiece */}
          <path
            d="M 680 320 L 600 320 L 600 360"
            stroke="#8b6528"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            opacity="0.9"
          />
          {/* Auxiliary Card (1-Line SDK) to Centerpiece */}
          <path
            d="M 320 540 L 400 540"
            stroke="#8b6528"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            opacity="0.9"
          />
        </svg>

        {/* Top Row: 3 Input / Configuration Cards */}
        <div className="workflow-top-row">
          {/* Card 1: Feed Import */}
          <article className="workflow-card workflow-card--feed">
            <div className="workflow-card-head">
              <span className="workflow-badge">STEP 01</span>
              <span className="workflow-step-title">CATALOGUE FEED</span>
            </div>
            <div className="workflow-feed-box">
              <div className="workflow-feed-file">
                <i className="workflow-icon" aria-hidden="true">
                  📄
                </i>
                <div>
                  <strong>products_catalog.csv</strong>
                  <small>32 verified products · GBP £</small>
                </div>
              </div>
              <div className="workflow-feed-meta">
                <span>0 duplicates</span>
                <span>100% available</span>
                <span>HTTPS links</span>
              </div>
            </div>
            <div className="workflow-card-footer">
              <span className="workflow-pill-tag">CSV · JSON · Shopify</span>
              <span className="workflow-pill-btn">SYNCED ✓</span>
            </div>
          </article>

          {/* Card 2: Rules & Guardrails */}
          <article className="workflow-card workflow-card--rules">
            <div className="workflow-card-head">
              <span className="workflow-badge">STEP 02</span>
              <span className="workflow-step-title">GUARDRAIL RULES</span>
            </div>
            <div className="workflow-toggles-list">
              <div className="workflow-toggle-item">
                <div>
                  <strong>Catalogue-Only Truth</strong>
                  <small>Zero invented products or fake claims</small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={truthToggle}
                  aria-label="Toggle Catalogue-Only Truth"
                  className={`workflow-switch ${truthToggle ? "is-active" : ""}`}
                  onClick={() => setTruthToggle(!truthToggle)}
                >
                  <span />
                </button>
              </div>

              <div className="workflow-toggle-item">
                <div>
                  <strong>Strict Price Bounds</strong>
                  <small>Never exceed user budget ceiling</small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={budgetToggle}
                  aria-label="Toggle Strict Price Bounds"
                  className={`workflow-switch ${budgetToggle ? "is-active" : ""}`}
                  onClick={() => setBudgetToggle(!budgetToggle)}
                >
                  <span />
                </button>
              </div>

              <div className="workflow-toggle-item">
                <div>
                  <strong>Dynamic Category Aliases</strong>
                  <small>Singular/plural auto-recognition</small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={categoriesToggle}
                  aria-label="Toggle Dynamic Category Aliases"
                  className={`workflow-switch ${categoriesToggle ? "is-active" : ""}`}
                  onClick={() => setCategoriesToggle(!categoriesToggle)}
                >
                  <span />
                </button>
              </div>
            </div>
          </article>

          {/* Card 3: Shopper Query */}
          <article className="workflow-card workflow-card--query">
            <div className="workflow-card-head">
              <span className="workflow-badge">STEP 03</span>
              <span className="workflow-step-title">SHOPPER QUERY</span>
            </div>
            <div className="workflow-query-box">
              <div className="workflow-chat-bubble">
                <span className="workflow-shopper-label">Shopper says:</span>
                <p>
                  &ldquo;Looking for an anniversary gift in warm gold under £120, but not
                  earrings.&rdquo;
                </p>
              </div>
              <div className="workflow-tags-extracted">
                <span className="workflow-tag">✦ warm gold</span>
                <span className="workflow-tag">✦ &lt; £120</span>
                <span className="workflow-tag">✕ no earrings</span>
              </div>
            </div>
            <div className="workflow-card-footer">
              <span className="workflow-pill-tag">Natural Speech</span>
              <span className="workflow-pill-btn workflow-pill-btn--active">MATCH ENGINE ↗</span>
            </div>
          </article>
        </div>

        {/* Action Node Pill */}
        <div className="workflow-action-pill-wrap">
          <div className="workflow-action-pill">
            <span className="workflow-lightning">⚡</span>
            <strong>Deterministic Matching & Scoring</strong>
          </div>
        </div>

        {/* Bottom Showcase: Centerpiece Phone Mockup + Auxiliary SDK Card */}
        <div className="workflow-bottom-row">
          {/* Auxiliary Card: 1-Line SDK Drop-in */}
          <article className="workflow-card workflow-card--sdk">
            <div className="workflow-card-head">
              <span className="workflow-badge">EMBED</span>
              <span className="workflow-step-title">1-LINE STOREFRONT SDK</span>
            </div>
            <p className="workflow-sdk-desc">
              Paste immediately before <code>&lt;/body&gt;</code> in Shopify, WooCommerce, or HTML.
            </p>
            <pre className="workflow-code-mini">
              <code>{snippet}</code>
            </pre>
            <div className="workflow-sdk-actions">
              <button type="button" className="workflow-button" onClick={copyCode}>
                {copied ? "COPIED ✓" : "COPY SCRIPT ↗"}
              </button>
              <span className="workflow-pill-tag">Shopify · Woo · Wix · HTML</span>
            </div>
          </article>

          {/* Centerpiece Phone/Viewport Mockup */}
          <div className="workflow-phone-mockup">
            <div className="workflow-phone-screen">
              {/* Phone Header */}
              <div className="workflow-screen-top">
                <span className="workflow-live-dot" />
                <span className="workflow-screen-title">Live Store Advisor · Solace Studio</span>
                <span className="workflow-screen-close">×</span>
              </div>

              {/* Chat Stream Preview */}
              <div className="workflow-chat-scroll">
                <div className="workflow-user-msg">
                  <p>Looking for an anniversary gift in warm gold under £120, not earrings</p>
                </div>

                <div className="workflow-advisor-reply">
                  <div className="workflow-advisor-avatar">a✧</div>
                  <div className="workflow-advisor-body">
                    <p>
                      I found 2 verified matches in warm gold vermeil within your £120 budget:
                    </p>

                    <div className="workflow-product-mini-cards">
                      {/* Product 1 */}
                      <div className="workflow-mini-product">
                        <div
                          className="workflow-mini-thumb product-image product-image--left"
                          aria-hidden="true"
                        />
                        <div className="workflow-mini-info">
                          <span className="workflow-mini-category">NECKLACE · WARM GOLD</span>
                          <strong>Solace Amber Pendant</strong>
                          <div className="workflow-mini-price-row">
                            <b>£118.00</b>
                            <span className="workflow-in-stock">Available</span>
                          </div>
                          <span className="workflow-link-action">View on store ↗</span>
                        </div>
                      </div>

                      {/* Product 2 */}
                      <div className="workflow-mini-product">
                        <div
                          className="workflow-mini-thumb product-image product-image--center"
                          aria-hidden="true"
                        />
                        <div className="workflow-mini-info">
                          <span className="workflow-mini-category">RING · CHAMPAGNE TOPAZ</span>
                          <strong>Halo Champagne Ring</strong>
                          <div className="workflow-mini-price-row">
                            <b>£110.00</b>
                            <span className="workflow-in-stock">Available</span>
                          </div>
                          <span className="workflow-link-action">View on store ↗</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Input Bar */}
              <div className="workflow-screen-composer">
                <span>Ask a follow-up or refinement...</span>
                <button type="button" aria-label="Send query">
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
