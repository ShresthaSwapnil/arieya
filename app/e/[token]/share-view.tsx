"use client";

import { useState } from "react";
import type { Product } from "@/lib/core";
import { ProductCard } from "../../product-card";

export function ShareView({ token, products, reasons }: { token: string; products: Product[]; reasons: Record<string, string> }) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function react(value: string) {
    const sessionId = sessionStorage.getItem("edita-recipient-session") || crypto.randomUUID();
    sessionStorage.setItem("edita-recipient-session", sessionId);
    try {
    const response = await fetch(`/api/v1/edits/${token}/reactions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reaction: value, sessionId }),
    });
    if (response.ok) {
      setReaction(value);
      setStatus("Reaction saved.");
    } else {
      setStatus("That reaction could not be saved.");
    }
    } catch { setStatus("Connection interrupted. Please try again."); }
  }

  return (
    <>
      <div className="shared-products">
        {products.map((product) => <ProductCard key={product.id} product={product} reason={reasons[product.id] || "Selected from this edit."} trackingToken={token} />)}
      </div>
      <div className="shared-actions">
        <fieldset className="reaction-row">
          <legend>What do you think?</legend>
          {[["love", "♥ Love this"], ["not_for_me", "Not my style"], ["compare", "Compare"]].map(([value, label]) => (
            <button key={value} className={reaction === value ? "is-active" : ""} onClick={() => react(value)}>{label}</button>
          ))}
        </fieldset>
        <p className="sr-only" role="status">{status}</p>
        <a className="button button--primary" href={`/stylist?from=${encodeURIComponent(token)}`}>Continue the edit</a>
      </div>
    </>
  );
}
