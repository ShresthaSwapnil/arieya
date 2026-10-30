import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Arieya",
  description: "Terms of service and subscription agreement for Arieya merchants and stores.",
};

export default function TermsPage() {
  return (
    <main className="wrap section" style={{ maxWidth: 840, paddingBlock: "80px" }}>
      <header style={{ marginBottom: "50px", borderBottom: "1px solid var(--hairline)", paddingBottom: "30px" }}>
        <a className="wordmark" href="/" aria-label="Arieya home" style={{ display: "inline-block", marginBottom: "20px" }}>ARIEYA</a>
        <span className="eyebrow">Legal & Compliance</span>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: "10px 0" }}>Terms of Service</h1>
        <small style={{ color: "var(--muted)" }}>Last updated: October 2026 · Effective immediately</small>
      </header>

      <article style={{ display: "flex", flexDirection: "column", gap: "28px", fontSize: "14px", lineHeight: "1.8" }}>
        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>1. Agreement to Terms</h2>
          <p>
            By registering for an account, installing the Arieya JavaScript Embed SDK or iframe, importing catalogue data, or subscribing to any paid plan on Arieya (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or other legal entity, you represent that you have the authority to bind such entity.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>2. Description of the Service</h2>
          <p>
            Arieya provides conversational product discovery and recommendation tooling for online merchants. Arieya is not an inventory management system, checkout provider, or merchant of record for your store&rsquo;s goods. All product orders, fulfilment, warranties, and shipping remain the sole responsibility of the merchant.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>3. Subscription Plans, Billing & Lemon Squeezy</h2>
          <p>
            Paid subscriptions for Arieya (including Starter, Growth, and Pro tiers) are billed in advance on a recurring monthly basis. Our order process and subscription billing are conducted by our online reseller and Merchant of Record, <strong>Lemon Squeezy</strong> (Lemon Squeezy, LLC). Lemon Squeezy handles all payment transactions, tax calculation, collection, and customer invoicing.
          </p>
          <p style={{ marginTop: "10px" }}>
            You may cancel your subscription at any time via the Merchant Studio billing portal or by contacting support. Cancellations take effect at the end of the current paid billing cycle. Refunds are issued in accordance with Lemon Squeezy&rsquo;s standard refund policy.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>4. Catalogue Content & Intellectual Property</h2>
          <p>
            Merchants retain full ownership and intellectual property rights in their uploaded product feeds, descriptions, imagery, and trade marks. You grant Arieya a non-exclusive, worldwide licence to index, format, and display your product information solely for the purpose of powering shopper discovery and recommendations on your approved domains.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>5. Usage Limits & Fair Use</h2>
          <p>
            Each plan includes an allocated number of shopper discovery sessions per month. If your store exceeds its allotted tier, Arieya will notify you and may throttle non-critical requests until you upgrade to a tier that suits your volume. We reserve the right to limit automated scraping, adversarial traffic, or abusive API usage.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>6. Limitation of Liability</h2>
          <p>
            Arieya is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To the maximum extent permitted by applicable law, Arieya and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues resulting from your use of the Service.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "24px", color: "var(--gold-light)", marginBottom: "12px" }}>7. Contact</h2>
          <p>
            For questions regarding these Terms or billing inquiries, please contact our support team at <a href="mailto:support@arieya.site" style={{ color: "var(--gold-light)", textDecoration: "underline" }}>support@arieya.site</a>.
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
