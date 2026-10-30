import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Arieya",
  description: "Privacy policy and data protection practices for Arieya shoppers and merchants.",
};

export default function PrivacyPage() {
  return (
    <main className="wrap section" style={{ maxWidth: 840, paddingBlock: "80px" }}>
      <header style={{ marginBottom: "50px", borderBottom: "1px solid var(--hairline)", paddingBottom: "30px" }}>
        <a className="wordmark" href="/" aria-label="Arieya home" style={{ display: "inline-block", marginBottom: "20px" }}>ARIEYA</a>
        <span className="eyebrow">Privacy & Security</span>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: "10px 0" }}>Privacy Policy</h1>
        <small style={{ color: "var(--muted)" }}>Last updated: October 2026 · GDPR & CCPA compliant</small>
      </header>

      <article style={{ display: "flex", flexDirection: "column", gap: "28px", fontSize: "14px", lineHeight: "1.8" }}>
        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>1. Introduction & Scope</h2>
          <p>
            Arieya (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting the privacy of merchants who use our platform and shoppers who interact with our conversational shopping advisors. This Privacy Policy outlines what information we collect, how it is used, and your rights under data protection laws including the UK GDPR and EU General Data Protection Regulation.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>2. Merchant Account Information</h2>
          <p>
            When merchants register on Arieya, we collect your name, business email address, store website, and encrypted password hash (using scrypt). We process this data to manage your account, authenticate sessions, and deliver our services.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>3. Shopper Data & Zero-PII Policy</h2>
          <p>
            We deliberately minimize data collected from end-shoppers. When a shopper interacts with an embedded Arieya stylist:
          </p>
          <ul style={{ paddingLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>We do <strong>not</strong> track personal identity, browser fingerprints, or cross-site browsing history.</li>
            <li>We assign an anonymous, ephemeral session identifier to maintain conversation context.</li>
            <li>We record aggregated discovery metrics (queries, product impressions, recommendation clicks) to provide discovery insights to the store merchant.</li>
            <li>We do <strong>not</strong> collect payment card information, home addresses, or checkout credentials. When a shopper clicks a product, they are redirected to the merchant&rsquo;s own secure store.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>4. Payment Processing by Lemon Squeezy</h2>
          <p>
            Payment transactions for Arieya subscriptions are handled by <strong>Lemon Squeezy</strong>, acting as our Merchant of Record. We do not store or process your credit card numbers on Arieya servers. Lemon Squeezy processes your payment information in compliance with PCI-DSS standards. Please review <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--gold-light)", textDecoration: "underline" }}>Lemon Squeezy&rsquo;s Privacy Policy</a> for further details.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>5. Data Retention & Deletion</h2>
          <p>
            Analytics events are retained for up to 13 months before being permanently purged by our automated daily retention worker. Expired session tokens and rate limits are cleared automatically. Merchants may export or schedule complete deletion of their store catalogues and workspace data at any time.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>6. Your Rights</h2>
          <p>
            Under GDPR, CCPA, and applicable laws, you have the right to access, rectify, or request erasure of your personal data. To exercise these rights, please contact our Data Protection Officer at <a href="mailto:privacy@arieya.site" style={{ color: "var(--gold-light)", textDecoration: "underline" }}>privacy@arieya.site</a>.
          </p>
        </section>
      </article>

      <footer style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
        <a href="/" style={{ color: "var(--gold-light)" }}>← Back to Arieya Home</a>
        <span>© {new Date().getFullYear()} Arieya</span>
      </footer>
    </main>
  );
}
