import { CatalogConverter } from "./converter";

export const metadata = {
  title: "Catalogue Atelier — Arieya",
  description: "Convert product catalogues between CSV, JSON, and XML in your browser.",
};

export default function CataloguePage() {
  return <main className="converter-page">
    <header className="site-header wrap">
      <a className="wordmark" href="/" aria-label="Arieya home">ARIEYA</a>
      <a className="button button--small" href="/#pilot">Join the pilot <span>↗</span></a>
    </header>
    <section className="converter-hero wrap">
      <span className="eyebrow">The Catalogue Atelier · Free browser tool</span>
      <h1>One catalogue.<br />Your format.</h1>
      <p>Convert your product file between CSV, JSON, and XML. Preview the cleaned catalogue, then download a portable copy.</p>
      <CatalogConverter />
      <small className="converter-privacy">Your file stays in this browser. It is not uploaded to Arieya.</small>
    </section>
    <footer className="site-footer wrap"><div><a className="wordmark" href="/">ARIEYA</a><p>Help people find the right thing.</p></div><nav aria-label="Footer navigation"><a href="/">Home</a><a href="/stylist">Try the advisor</a><a href="/#pilot">Merchant pilot</a></nav><small>© {new Date().getFullYear()} Arieya</small></footer>
  </main>;
}
