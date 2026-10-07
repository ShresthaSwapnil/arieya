"use client";
import { useState } from "react";
import { CATALOG, formatMoney } from "@/lib/core";

const scenes = [
  { label: "Discover", prompt: "An anniversary gift under £120. Elegant, not flashy.", reply: "A little warmth, without the extra sparkle. These pieces from our sample collection fit your brief.", products: [CATALOG[0], CATALOG[2]] },
  { label: "Refine", prompt: "Lovely. Could we keep it under £100?", reply: "Of course. This delicate pearl bracelet keeps the warm gold feel, and stays within your new budget.", products: [CATALOG[2]] },
  { label: "Share", prompt: "I’d love a second opinion.", reply: "A good choice doesn’t have to be a solo decision. Share your shortlist with someone who knows them well.", products: [CATALOG[2]] },
];
export function Demo() {
  const [step, setStep] = useState(0);
  const scene = scenes[step];
  return <div className="demo-composition" aria-label="Arieya sample shopping conversation">
    <div className="sample-store"><div><span>THE EVERYDAY COLLECTION</span><span>Shop <span aria-hidden="true">↗</span></span></div><h3>Little things.<br /><em>Lasting meaning.</em></h3><div className="store-product-preview product-image product-image--left" role="img" aria-label="Sample warm gold pendant" /><span className="sample-store__caption">Thoughtfully chosen. Beautifully worn.</span></div>
    <div className="demo-chat">
      <div className="demo-chat__header"><span className="mini-mark">a</span><div><strong>Arieya</strong><span><i className="status-dot" /> Here to help you choose</span></div><span className="demo-symbol" aria-hidden="true">✧</span></div>
      <div className="demo-conversation" aria-live="polite"><p className="demo-user">{scene.prompt}</p><p className="demo-reply">{scene.reply}</p><div className="demo-picks">{scene.products.map(product => <a key={product.id} href={`/stylist?product=${product.id}`} className="demo-pick"><div className={`product-image product-image--${product.imagePosition}`} /><div><h4>{product.title}</h4><small>{product.material}</small><strong>{formatMoney(product.priceMinor, product.currency)} <span>↗</span></strong></div></a>)}</div>
        {step === 2 && <a className="demo-share-link" href="/e/sample-edit">Open a sample shared shortlist <span>↗</span></a>}
      </div>
      <a className="demo-composer" href={`/stylist?prompt=${encodeURIComponent(scene.prompt)}`}><span>Ask something of your own…</span><b>↑</b></a>
      <div className="demo-controls" aria-label="Sample conversation steps">{scenes.map((item,index) => <button type="button" key={item.label} onClick={() => setStep(index)} aria-pressed={step===index}><span>0{index+1}</span> {item.label}</button>)}</div>
    </div>
    <span className="demo-disclosure">Interactive preview · Sample products</span>
  </div>;
}
