"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { EventName, Product, Recommendation } from "@/lib/core";
import { CatalogUpload } from "./catalog-upload";
import { formatMoney } from "@/lib/core";
import type { DemoCatalogId } from "@/lib/demo-catalogs";

type Turn = { role: "user" | "assistant"; content: string; result?: ChatResult };
type ChatResult = Recommendation & {
  modelPath: "gemini" | "fallback" | "deterministic";
  model?: string | null;
  latencyMs?: number;
  remaining?: number | null;
};
type Message = Turn & { id: string };

const initialGreeting: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi, I’m Arieya. Tell me what you have in mind, and we’ll find a thoughtful place to start.",
};

const curatedPrompts = [
  { label: "A thoughtful gift for someone special", tag: "A good place to start" },
  { label: "Something lovely for everyday", tag: "Made to be worn" },
  { label: "Help me find something distinctive", tag: "Quietly distinctive" },
  { label: "I have a special occasion coming up", tag: "For a moment" },
  { label: "A useful everyday upgrade", tag: "For me" },
  { label: "Help me narrow down the collection", tag: "A little guidance" },
];

const quickRefinements = [
  "Show me a more affordable option",
  "Something more understated",
  "Start with a different category",
];

export function Stylist({
  tenant,
  merchantName,
  storeUrl,
  initialPrompt,
  initialSeen,
  initialProduct,
  fromEdit,
  demoCategory,
  demoCatalogName,
}: {
  tenant: string;
  merchantName: string;
  storeUrl: string;
  initialPrompt: string;
  initialSeen: string[];
  initialProduct?: Product | null;
  fromEdit?: string;
  demoCategory?: DemoCatalogId;
  demoCatalogName?: string;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [catalogCount, setCatalogCount] = useState(0);
  const [currency, setCurrency] = useState("GBP");
  const inFlight = useRef(false);
  const storageKey = `edita-chat-${tenant}-${fromEdit || demoCategory || "trial"}`;
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState(initialPrompt);
  const [history, setHistory] = useState<Turn[]>([]);
  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const [loading, setLoading] = useState(false);
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [catalogueProducts, setCatalogueProducts] = useState<Product[] | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [seen, setSeen] = useState(initialSeen);
  const catalogueDialogRef = useRef<HTMLDialogElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const impressions = useRef(new Set<string>());
  const startedConversation = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams({ store: tenant });
    if (demoCategory) params.set("demoCategory", demoCategory);
    fetch(`/api/v1/trial?${params}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRemaining(data.remaining); setCatalogCount(data.productCount); setCurrency(data.currency);
      setReady(true);
    }).catch((error) => setNotice(error.message || "Could not open this collection. Reload to try again."));
  }, [demoCategory, tenant]);

  // Initialize session and restore or initialize product view
  useEffect(() => {
    const id = sessionStorage.getItem("edita-session") || crypto.randomUUID();
    sessionStorage.setItem("edita-session", id);
    setSessionId(id);

    if (initialProduct) {
      // If user came specifically to view a product from the collection
      const productGreeting: Message = {
        id: `feature-${initialProduct.id}`,
        role: "assistant",
        content: `You are viewing ${initialProduct.title}, listed at ${formatMoney(initialProduct.priceMinor, initialProduct.currency)}. What matters most to you about this product?`,
        result: {
          reply: `You are viewing the ${initialProduct.title}.`,
          products: [initialProduct],
          status: "exact",
          constraints: {
            category: initialProduct.category,
            material: initialProduct.material,
            color: initialProduct.color,
            gemstone: initialProduct.gemstone || undefined,
            exclusions: [],
          },
          relaxedConstraints: [],
          relaxations: [],
          modelPath: "deterministic",
        },
      };
      setMessages([productGreeting]);
      setHistory([{ role: "assistant", content: productGreeting.content, result: productGreeting.result }]);
      setSeen((current) => [...new Set([...current, initialProduct.id])]);
      return;
    }

    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "[]") as Message[];
      if (Array.isArray(saved) && saved.length > 0) {
        setMessages(saved);
        startedConversation.current = saved.some((item) => item.role === "user");
        setHistory(saved.map(({ role, content, result }) => ({ role, content, result })).slice(-8));
      }
    } catch {
      /* ignore invalid local state */
    }
  }, [initialProduct, storageKey]);

  // Persist messages with full results
  useEffect(() => {
    if (messages.length > 1) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-12)));
      } catch {
        /* ignore */
      }
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (messages.length > 1 || loading) (loading ? messagesEndRef : latestMessageRef).current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: loading ? "end" : "start" });
  }, [loading, messages]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const card = entry.target as HTMLElement;
        const id = card.dataset.impressionId;
        const productId = card.dataset.productId;
        if (!id || !productId || impressions.current.has(id)) continue;
        impressions.current.add(id);
        trackEvent("product_impression", productId);
        observer.unobserve(card);
      }
    }, { threshold: 0.25 });
    document.querySelectorAll<HTMLElement>("[data-product-card]").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [messages]);

  async function send(raw: string) {
    const prompt = raw.trim();
    if (!prompt || !sessionId || !ready || inFlight.current || remaining === 0) return;
    inFlight.current = true;
    if (!startedConversation.current) {
      startedConversation.current = true;
      trackEvent("conversation_started");
    }
    trackEvent("message_submitted");

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: prompt };
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setLoading(true);
    setNotice("");

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant,
          sessionId,
          message: prompt,
          history: history.map(({ role, content }) => ({ role, content })).slice(-8),
          seenProductIds: seen.slice(-20),
          currency,
          fromEdit,
          demoCategory,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429 && tenant === "edita-demo") setRemaining(0);
        throw new Error(data.error || "Could not answer. Please try again.");
      }
      const result = data as ChatResult;
      setRemaining(result.remaining ?? null);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        result,
      };

      setMessages((current) => [...current, assistantMessage]);

      const turns: Turn[] = [
        ...history,
        { role: "user" as const, content: prompt },
        { role: "assistant" as const, content: result.reply, result },
      ].slice(-8);
      setHistory(turns);
      setSeen((current) => [...new Set([...current, ...result.products.map((product) => product.id)])].slice(-20));
    } catch (error) {
      setMessage(prompt);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Connection interrupted. Please try again.",
        },
      ]);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  async function createShare(messageId: string, result: ChatResult) {
    if (!result.products.length) return;
    setNotice("");
    try {
      const response = await fetch("/api/v1/edits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant,
          sessionId,
          fromEdit,
          demoCategory,
          intentSummary: (messages[messages.findIndex((item) => item.id === messageId) - 1]?.content || initialPrompt || "A catalogue edit.").slice(0, 240),
          productIds: result.products.map((product) => product.id),
          selectionReasons: Object.fromEntries(
            result.products.map((product) => [
              product.id,
              "Selected from your consultation based on verified catalog constraints.",
            ]),
          ),
        }),
      });
      if (!response.ok) return setNotice("The edit could not be generated.");
      const data = await response.json();
      localStorage.setItem(`edita-management-${data.token}`, data.managementToken);
      setShareUrls((current) => ({ ...current, [messageId]: data.url }));
      setNotice("Unlisted share link created. Anyone with the link can view it.");
    } catch {
      setNotice("Could not generate share link.");
    }
  }

  async function browseCatalogue() {
    const dialog = catalogueDialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    if (catalogueProducts !== null || catalogueLoading) return;
    setCatalogueLoading(true);
    setCatalogueError("");
    const params = new URLSearchParams();
    if (tenant !== "edita-demo") params.set("store", tenant);
    if (demoCategory) params.set("demoCategory", demoCategory);
    if (fromEdit) params.set("from", fromEdit);
    try {
      const query = params.toString();
      const response = await fetch(`/api/v1/catalog${query ? `?${query}` : ""}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the catalogue.");
      if (!Array.isArray(data.products)) throw new Error("The catalogue response was incomplete.");
      setCatalogueProducts(data.products);
    } catch (error) {
      setCatalogueError(error instanceof Error ? error.message : "Could not load the catalogue.");
    } finally {
      setCatalogueLoading(false);
    }
  }

  const visibleCatalogueProducts = (catalogueProducts || []).filter((product) =>
    [product.title, product.description, product.category, product.material, product.color, product.gemstone, ...Object.values(product.attributes || {})]
      .filter(Boolean).join(" ").toLowerCase().includes(catalogueQuery.trim().toLowerCase()),
  );

  function trackEvent(name: EventName, productId?: string) {
    if (!sessionId) return;
    void fetch("/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenant, eventId: crypto.randomUUID(), sessionId, name, productId }),
      keepalive: true,
    }).catch(() => {});
  }

  function addToCart(product: Product) {
    trackEvent("product_clicked", product.id);
    setNotice(`${product.title} · ${formatMoney(product.priceMinor, product.currency)}. Sample product; no checkout is connected.`);
  }

  function clearConversation() {
    sessionStorage.removeItem(storageKey);

    setHistory([]);
    setMessages([initialGreeting]);
    setSeen(initialSeen);
    setShareUrls({});
    setNotice("");
    startedConversation.current = false;
    if (inputRef.current) inputRef.current.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(message);
  }

  const isInitialState = messages.length <= 1 && !initialProduct;

  return <div className="advisor-shell">
    <aside className="advisor-sidebar">
      <div className="sidebar-heading"><a className="wordmark" href="/">ARIEYA</a><span>Your shopping companion</span></div>
      <button className="new-chat" disabled={loading} onClick={clearConversation}><span>＋</span> A fresh conversation</button>
      <div className="sidebar-context"><span className="eyebrow">Your collection</span><p><i className="status-dot" /> {fromEdit ? "Shared shortlist" : demoCatalogName ? `${demoCatalogName} sample catalogue` : catalogCount ? `${catalogCount} products` : tenant === "edita-demo" ? "The jewellery sample catalogue" : `${merchantName}’s catalogue`}</p><small>{demoCatalogName ? `${catalogCount} sample products for this preview.` : catalogCount ? `Discover ${merchantName}’s catalogue.` : tenant === "edita-demo" ? "A curated sample collection." : "This store is preparing its product catalogue."}</small></div>
      <button className="browse-catalogue" type="button" onClick={() => void browseCatalogue()} disabled={!ready || catalogueLoading} aria-haspopup="dialog"><span>{fromEdit ? "View shared products" : "Browse products"}</span><b>↗</b></button>
      {tenant === "edita-demo" && !fromEdit && !demoCategory && <CatalogUpload count={catalogCount} currency={currency} disabled={loading || !ready} onChange={(count, nextCurrency) => { setCatalogCount(count); setCurrency(nextCurrency); setCatalogueProducts(null); setCatalogueError(""); setCatalogueQuery(""); clearConversation(); }} />}
      <div className="sidebar-bottom">{remaining !== null ? <><span className="eyebrow">A little room to explore</span><div className="quota-dots" aria-hidden="true">{[1,2,3].map(n => <i key={n} className={n <= remaining ? "available" : ""} />)}</div><p role="status">{ready ? `${remaining} of 3 questions remaining` : "Starting your preview…"}</p><small>Your limit stays the same when you start a new conversation.</small></> : <><span className="eyebrow">A considered collection</span><p role="status">Explore {merchantName}’s catalogue.</p></>}<a href={storeUrl || "/#pilot"}>{storeUrl ? "Visit the store" : "For your store"}<span>↗</span></a></div>
    </aside>
    <div className="advisor-main">
      <header className="advisor-header"><span><i className="status-dot" /> A thoughtful place to start</span><a href={demoCategory ? "/demo" : storeUrl || "/"}>{demoCategory ? "Choose another collection" : tenant !== "edita-demo" ? `Visit ${merchantName}` : "Back to Arieya"} <span>↗</span></a></header>
      <section className={`advisor-content ${isInitialState ? "advisor-content--welcome" : ""}`}>
        {isInitialState && <div className="advisor-welcome"><span className="welcome-mark">a<span>✧</span></span><span className="eyebrow">A more human way to find what fits</span><h1>Tell me what<br /><em>you have in mind.</em></h1><p>A need. A feeling. A moment.<br />We’ll explore the catalogue together.</p><div className="starter-grid">{curatedPrompts.slice(0,3).map(item => <button key={item.label} disabled={loading || !ready || remaining === 0} onClick={() => void send(item.label)}><span>{item.tag}</span><strong>{item.label}</strong><b>↗</b></button>)}</div><small className="welcome-note">{remaining === null ? "A guided experience · No signup" : "A guided preview · Three questions · No signup"}</small></div>}
        <div className="message-stream" aria-live="polite">{messages.map((item, index) => {
          if (item.id === "welcome" && isInitialState) return null;
          return <article key={item.id} ref={index === messages.length - 1 ? latestMessageRef : null} className={`message message--${item.role}`}>
            {item.role === "user" ? <p className="user-bubble">{item.content}</p> : <><div className="message-author"><span className="mini-mark">a</span><strong>Arieya</strong>{item.result && <span className="result-label">{item.result.status === "no_match" ? "Let’s try another direction" : item.result.status === "handoff" ? "A question for the store" : "Chosen around your brief"}</span>}</div><p className="advisor-reply">{item.content}</p>
              {item.result && <>
                <div className="active-constraints">{item.result.constraints.category && <span>{item.result.constraints.category}</span>}{item.result.constraints.maxPriceMinor !== undefined && <span>Up to {formatMoney(item.result.constraints.maxPriceMinor,item.result.constraints.currency || currency)}</span>}{item.result.constraints.material && <span>{item.result.constraints.material}</span>}{item.result.constraints.gemstone && <span>{item.result.constraints.gemstone}</span>}{item.result.constraints.exclusions.map(exclusion => <span key={exclusion}>No {exclusion}</span>)}</div>
                {item.result.products.length > 0 && <><div className="advisor-products">{item.result.products.map(product => <article className="advisor-product" key={product.id} data-product-card data-product-id={product.id} data-impression-id={item.id + ":" + product.id}><div className={`product-image product-image--${product.imagePosition} ${product.imageUrl ? "product-image--external" : !product.variantId.startsWith("demo-") ? "product-image--placeholder" : ""}`} style={product.imageUrl ? {backgroundImage:`url(${JSON.stringify(product.imageUrl)})`} : undefined} role="img" aria-label={product.title} /><div className="advisor-product__body"><span className="eyebrow">{product.variantId.startsWith("demo-") ? "Sample collection" : "From the catalogue"}</span><div className="product-heading"><h3>{product.title}</h3><strong>{formatMoney(product.priceMinor,product.currency)}</strong></div><p>{product.description}</p><small>{[product.category, product.material, product.gemstone, ...Object.values(product.attributes || {}).slice(0, 2)].filter(Boolean).join(" · ")}</small>{product.url.startsWith("https://") ? <a className="product-action" href={product.url} onClick={() => trackEvent("product_clicked", product.id)} target="_blank" rel="noopener noreferrer">View at the store <span>↗</span></a> : <button className="product-action" onClick={() => addToCart(product)}>Explore this sample <span>↗</span></button>}</div></article>)}</div>
                  <div className="share-prompt"><div><strong>A second opinion?</strong><p>Share these pieces with someone you trust.</p></div>{shareUrls[item.id] ? <a className="button button--secondary button--small" href={shareUrls[item.id]}>Open your shortlist ↗</a> : <button className="button button--secondary button--small" onClick={() => void createShare(item.id,item.result!)}>Create a share link ↗</button>}</div>
                  <div className="refinements"><span>Fine-tune your choice</span>{quickRefinements.slice(0,3).map(refinement => <button key={refinement} disabled={loading || remaining === 0} onClick={() => void send(refinement)}>{refinement} <b>↗</b></button>)}</div>
                </>}
                {item.result.relaxations.length > 0 && <div className="refinements">{item.result.relaxations.map(option => <button key={option.key} disabled={loading || remaining === 0} onClick={() => void send(option.message)}>{option.label} ↗</button>)}</div>}
                {item.result.status === "handoff" && <div className="handoff-panel">Please confirm product-specific policies directly with the store. <a href={storeUrl || "/#pilot"}>{storeUrl ? "Visit the store ↗" : "About the merchant pilot ↗"}</a></div>}
              </>}
            </>}
          </article>;
        })}
        {loading && <div className="message"><div className="message-author"><span className="mini-mark">a</span><strong>Arieya</strong></div><p className="loading-copy"><span className="typing"><i /><i /><i /></span> Finding a considered fit…</p></div>}
        <div ref={messagesEndRef} style={{scrollMarginBottom:24}} /></div>
        {remaining === 0 && <div className="trial-complete"><strong>Thank you for spending a little time with Arieya.</strong><p>Your three-question preview is complete. You can still share your shortlist, or tell us about your store.</p><a className="text-link" href="/#pilot">Join the merchant pilot ↗</a></div>}
      </section>
      <div className="advisor-composer-wrap">{notice && <p className="composer-notice" role="status">{notice}</p>}<form className="advisor-composer" onSubmit={submit}><span aria-hidden="true">✧</span><label className="sr-only" htmlFor="advisor-input">Your message to Arieya</label><input ref={inputRef} id="advisor-input" value={message} onChange={event=>setMessage(event.target.value)} disabled={loading || !ready || remaining === 0} maxLength={500} autoComplete="off" placeholder={remaining===0 ? "Your trial is complete. Thank you for trying Arieya." : "Tell me what you have in mind…"} /><button type="submit" disabled={loading || !ready || !sessionId || !message.trim() || remaining === 0} aria-label="Send message">↑</button></form><div className="composer-footnote"><span>Catalogue-backed recommendations</span>{remaining !== null && <span>{remaining} {remaining === 1 ? "question" : "questions"} left</span>}</div></div>
    </div>
    <dialog ref={catalogueDialogRef} className="catalogue-dialog" aria-labelledby="catalogue-dialog-title" onClose={() => setCatalogueQuery("")}>
      <header className="catalogue-dialog__header">
        <div><span className="eyebrow">{demoCatalogName || "Your collection"}</span><h2 id="catalogue-dialog-title">Products in the catalogue</h2><p>{catalogueProducts ? `${catalogueProducts.length} products · ${catalogueProducts.filter((product) => product.available).length} available` : "Loading your products…"}</p></div>
        <button className="catalogue-dialog__close" type="button" aria-label="Close catalogue" onClick={() => catalogueDialogRef.current?.close()}>×</button>
      </header>
      {catalogueProducts && <label className="catalogue-dialog__search"><span className="sr-only">Search products</span><input type="search" value={catalogueQuery} onChange={(event) => setCatalogueQuery(event.target.value)} placeholder="Search products, categories, or details…" /></label>}
      <p className="sr-only" role="status" aria-live="polite">{catalogueProducts ? `${visibleCatalogueProducts.length} products shown.` : ""}</p>
      <div className="catalogue-dialog__list">
        {catalogueLoading && <p className="catalogue-dialog__empty">Loading products…</p>}
        {catalogueError && <p className="catalogue-dialog__empty" role="alert">{catalogueError}</p>}
        {!catalogueLoading && !catalogueError && catalogueProducts && visibleCatalogueProducts.length === 0 && <p className="catalogue-dialog__empty">No products match that search.</p>}
        {visibleCatalogueProducts.map((product) => <article className="catalogue-item" key={product.id}>
          <div className={`catalogue-item__image product-image product-image--${product.imagePosition} ${product.imageUrl ? "product-image--external" : !product.variantId.startsWith("demo-") ? "product-image--placeholder" : ""}`} style={product.imageUrl ? { backgroundImage: `url(${JSON.stringify(product.imageUrl)})` } : undefined} role="img" aria-label={product.title} />
          <div className="catalogue-item__body">
            <div className="catalogue-item__heading"><h3>{product.title}</h3><strong>{formatMoney(product.priceMinor, product.currency)}</strong></div>
            <small>{[product.category, product.material, product.color].filter(Boolean).join(" · ")}</small>
            <p>{product.description}</p>
            <span className={`catalogue-item__availability ${product.available ? "is-available" : ""}`}>{product.available ? "Available" : "Unavailable"}</span>
          </div>
        </article>)}
      </div>
    </dialog>
  </div>;
}
