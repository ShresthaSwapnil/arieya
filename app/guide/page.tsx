import type { Metadata } from "next";
import { GuideClient } from "./guide-client";
import { HowItWorksFlow } from "@/app/components/how-it-works-flow";
import { SiteHeader } from "@/app/components/site-header";

export const metadata: Metadata = {
  title: "Integration & Developer Guide — Arieya",
  description:
    "Step-by-step setup guides for Shopify, WooCommerce, Hostinger, Squarespace, Wix, HTML, Node.js, Python, and REST APIs.",
};

export default function GuidePage() {
  return (
    <main className="landing guide-page" id="top">
      {/* Site Header */}
      <SiteHeader />

      {/* Guide Hero */}
      <section className="guide-hero wrap">
        <div className="guide-hero-copy">
          <span className="eyebrow">Developer & Merchant Documentation</span>
          <h1>Bring Arieya to your storefront.</h1>
          <p>
            Connect our conversational discovery advisor to your existing online store in minutes.
            Choose between a zero-dependency drop-in JavaScript SDK, a clean iframe, or headless REST API endpoints.
          </p>

          <div className="guide-hero-stats">
            <div>
              <strong>&lt; 8 KB</strong>
              <span>Vanilla JS SDK</span>
            </div>
            <div>
              <strong>1-Line</strong>
              <span>Drop-in installation</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Grounded in your catalogue</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Flowchart (How It Works & What It Does) */}
      <HowItWorksFlow />

      {/* Interactive Platform Tabs & Simulator */}
      <div className="wrap">
        <GuideClient />
      </div>

      {/* Footer */}
      <footer className="site-footer wrap">
        <div>
          <a className="wordmark" href="#top">
            ARIEYA
          </a>
          <p>Help people find the right thing.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="/">Home</a>
          <a href="/stylist">Try the advisor</a>
          <a href="/catalogue">Catalogue Atelier</a>
          <a href="/merchant">Merchant studio</a>
          <a href="/#pilot">Merchant pilot</a>
        </nav>
        <small>© {new Date().getFullYear()} Arieya</small>
      </footer>
    </main>
  );
}
