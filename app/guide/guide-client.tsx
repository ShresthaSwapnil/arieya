"use client";

import { useState } from "react";

type Platform =
  | "shopify"
  | "woocommerce"
  | "hostinger"
  | "squarespace"
  | "wix"
  | "html"
  | "nodejs"
  | "python"
  | "php"
  | "go";

interface PlatformInfo {
  id: Platform;
  name: string;
  category: "E-Commerce" | "Website Builder" | "Web Standard" | "Backend API";
  badge: string;
  description: string;
  snippet: string;
  language: string;
  steps: string[];
}

const platforms: Record<Platform, PlatformInfo> = {
  shopify: {
    id: "shopify",
    name: "Shopify",
    category: "E-Commerce",
    badge: "Most Popular",
    description: "Add Arieya to any Shopify theme without installing a heavy app store plugin.",
    language: "liquid",
    snippet: `<!-- Arieya Shopping Advisor in Shopify layout/theme.liquid -->
<!-- Paste immediately before the closing </body> tag -->
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
  data-accent-color="{{ settings.colors_accent_1 | default: '#2d5016' }}"
  data-launcher-text="Need help choosing?"
></script>`,
    steps: [
      "In Shopify Admin, navigate to Online Store → Themes.",
      "Click 'Actions' (three dots) → 'Edit code'.",
      "Open the layout/theme.liquid file.",
      "Scroll to the bottom and paste the snippet just before the closing </body> tag.",
      "Replace YOUR_STORE_KEY with your store public key from the Merchant Studio.",
      "Save the theme. The floating advisor button will appear on your storefront immediately.",
    ],
  },
  woocommerce: {
    id: "woocommerce",
    name: "WooCommerce / WordPress",
    category: "E-Commerce",
    badge: "WordPress",
    description: "Embed on your whole store or conditionally on shop/product pages only.",
    language: "html",
    snippet: `<!-- Option A: Add to your theme's footer.php before </body> -->
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>

<!-- Option B: Add conditionally via functions.php in your child theme -->
<?php
add_action('wp_footer', function() {
    if (is_woocommerce() || is_product() || is_shop()) {
        echo '<script src="https://www.arieya.site/arieya-sdk.js" data-store-key="YOUR_STORE_KEY"></script>';
    }
});
?>`,
    steps: [
      "Go to WordPress Admin → Appearance → Theme File Editor (or use your child theme).",
      "Select footer.php and paste the snippet before the closing </body> tag.",
      "Alternatively, add a Gutenberg 'Custom HTML' block on any dedicated shopping guide page.",
      "Replace YOUR_STORE_KEY with your public key.",
      "Save and refresh your site.",
    ],
  },
  hostinger: {
    id: "hostinger",
    name: "Hostinger Website Builder",
    category: "Website Builder",
    badge: "No Code",
    description: "Drop the script tag into site-wide SEO code settings or a custom code element.",
    language: "html",
    snippet: `<!-- Hostinger Website Builder -> Custom Code -> Body end -->
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>`,
    steps: [
      "Open the Hostinger Website Builder for your store.",
      "Click the Settings gear icon in the left menu → Custom Code.",
      "Scroll to the 'Body end' section.",
      "Paste the script snippet and replace YOUR_STORE_KEY with your store key.",
      "Click Save and publish your website.",
    ],
  },
  squarespace: {
    id: "squarespace",
    name: "Squarespace",
    category: "Website Builder",
    badge: "Site-wide",
    description: "Inject the script tag into the global footer via Developer Settings.",
    language: "html",
    snippet: `<!-- Squarespace -> Settings -> Developer Tools -> Code Injection -> Footer -->
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>`,
    steps: [
      "In Squarespace, navigate to Settings → Advanced / Developer Tools → Code Injection.",
      "Locate the Footer code area.",
      "Paste the script snippet and add your store public key.",
      "Click Save in the top left.",
    ],
  },
  wix: {
    id: "wix",
    name: "Wix",
    category: "Website Builder",
    badge: "Custom Code",
    description: "Use Wix Settings Custom Code or embed an inline advisor iframe widget.",
    language: "html",
    snippet: `<!-- Wix Settings -> Custom Code -> Add Custom Code -> Body - end -->
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>`,
    steps: [
      "From your Wix Dashboard, go to Settings → Custom Code.",
      "Click '+ Add Custom Code'.",
      "Paste the snippet into the code box.",
      "Select 'All pages' and place code in 'Body - end'.",
      "Click Apply.",
    ],
  },
  html: {
    id: "html",
    name: "HTML / Vanilla JS",
    category: "Web Standard",
    badge: "Universal",
    description: "Standard HTML embed with customizable attributes and programmatic JavaScript API.",
    language: "html",
    snippet: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>My Online Store</title>
</head>
<body>
  <!-- Your Store Content -->

  <!-- 1. Floating Launcher Button Mode -->
  <script
    src="https://www.arieya.site/arieya-sdk.js"
    data-store-key="YOUR_STORE_KEY"
    data-position="bottom-right"
    data-launcher-text="Need help choosing?"
    data-accent-color="#2d5016"
  ></script>

  <!-- 2. Or Programmatic JavaScript Control -->
  <script>
    // Open programmatically when user clicks a custom button:
    // Arieya.open({ prompt: "Gifts under £100" });

    // Listen to shopper product clicks:
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://www.arieya.site') return;
      if (event.data?.type === 'arieya:product-click') {
        console.log('Product clicked:', event.data.title, event.data.url);
      }
    });
  </script>
</body>
</html>`,
    steps: [
      "Add the script tag before your </body> tag in any HTML page or framework.",
      "Configure data-position ('bottom-right' or 'bottom-left') and data-launcher-text as desired.",
      "Optionally use the global Arieya object in JavaScript: Arieya.open() or Arieya.close().",
    ],
  },
  nodejs: {
    id: "nodejs",
    name: "Node.js / Express",
    category: "Backend API",
    badge: "Headless REST",
    description: "Query the Arieya advisor from backend microservices or headless Next.js / Express apps.",
    language: "javascript",
    snippet: `// Express / Node.js API Route or Proxy
import express from "express";

const app = express();
app.use(express.json());

const ARIEYA_STORE_KEY = process.env.ARIEYA_STORE_KEY;

// Query the Arieya Advisor
app.post("/api/advisor/chat", async (req, res) => {
  try {
    const { message, sessionId, history } = req.body;

    const response = await fetch("https://www.arieya.site/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant: ARIEYA_STORE_KEY,
        message,
        sessionId,
        history: (history || []).slice(-8),
        currency: "GBP",
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json(err);
    }

    const data = await response.json();
    // data.products: array of verified catalogue matches
    // data.reply: conversational explanation
    // data.status: 'exact' | 'curated' | 'relaxed' | 'no_match' | 'handoff'
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});`,
    steps: [
      "Ensure fetch is available (Node.js 18+ has native fetch).",
      "Pass tenant with your store public key.",
      "Pass sessionId (unique shopper UUID) and message.",
      "Receive deterministic product recommendations linked to your catalogue.",
    ],
  },
  python: {
    id: "python",
    name: "Python (Flask / Django)",
    category: "Backend API",
    badge: "requests",
    description: "Clean Python helper function using requests for AI-assisted product discovery.",
    language: "python",
    snippet: `# arieya_client.py
import requests

ARIEYA_HOST = "https://www.arieya.site"

def ask_advisor(store_key: str, message: str, session_id: str, history: list = None, currency: str = "GBP") -> dict:
    """
    Get grounded product recommendations from Arieya.
    """
    payload = {
        "tenant": store_key,
        "message": message,
        "sessionId": session_id,
        "history": (history or [])[-8:],
        "currency": currency,
    }
    
    response = requests.post(
        f"{ARIEYA_HOST}/api/v1/chat",
        json=payload,
        timeout=30
    )
    response.raise_for_status()
    return response.json()

# Example Usage
if __name__ == "__main__":
    result = ask_advisor(
        store_key="edita-demo",
        message="Show me an elegant gift under £120",
        session_id="session-uuid-1234"
    )
    print("Advisor Reply:", result.get("reply"))
    for product in result.get("products", []):
        print(f"- {product['title']} ({product['currency']} {product['priceMinor']/100}): {product['url']}")`,
    steps: [
        "Install requests: pip install requests.",
        "Import ask_advisor into your Flask, Django, or FastAPI controllers.",
        "Store your public key safely in environment variables.",
    ],
  },
  php: {
    id: "php",
    name: "PHP",
    category: "Backend API",
    badge: "cURL",
    description: "Direct cURL call compatible with WordPress plugins, Laravel, and standard PHP.",
    language: "php",
    snippet: `<?php
function arieya_chat(string $storeKey, string $message, string $sessionId, array $history = []): array {
    $ch = curl_init('https://www.arieya.site/api/v1/chat');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_POSTFIELDS => json_encode([
            'tenant' => $storeKey,
            'message' => $message,
            'sessionId' => $sessionId,
            'history' => array_slice($history, -8),
            'currency' => 'GBP',
        ]),
    ]);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200) {
        throw new Exception("Arieya API returned error $status: $response");
    }
    return json_decode($response, true);
}
?>`,
    steps: [
      "Use in any PHP framework or custom WooCommerce integration.",
      "Send tenant, message, and unique sessionId.",
      "Render returned product cards directly into PHP views.",
    ],
  },
  go: {
    id: "go",
    name: "Go",
    category: "Backend API",
    badge: "net/http",
    description: "High-performance struct-typed API client in Go.",
    language: "go",
    snippet: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type ChatRequest struct {
	Tenant    string              \`json:"tenant"\`
	Message   string              \`json:"message"\`
	SessionID string              \`json:"sessionId"\`
	History   []map[string]string \`json:"history,omitempty"\`
	Currency  string              \`json:"currency,omitempty"\`
}

type Recommendation struct {
	Reply    string \`json:"reply"\`
	Status   string \`json:"status"\`
	Products []struct {
		ID         string \`json:"id"\`
		Title      string \`json:"title"\`
		PriceMinor int    \`json:"priceMinor"\`
		URL        string \`json:"url"\`
	} \`json:"products"\`
}

func QueryArieya(storeKey, message, sessionID string) (*Recommendation, error) {
	reqBody, _ := json.Marshal(ChatRequest{
		Tenant:    storeKey,
		Message:   message,
		SessionID: sessionID,
		Currency:  "GBP",
	})

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post("https://www.arieya.site/api/v1/chat", "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result Recommendation
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}`,
    steps: [
      "Import in your Go backend or API gateway.",
      "Call QueryArieya to resolve product queries directly.",
    ],
  },
};

export function GuideClient() {
  const [activePlatform, setActivePlatform] = useState<Platform>("shopify");
  const [copied, setCopied] = useState<string | null>(null);
  const [embedMode, setEmbedMode] = useState<"floating" | "inline">("floating");

  // Interactive Live Preview State
  const [testStoreKey, setTestStoreKey] = useState("edita-demo");
  const [testPosition, setTestPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [previewActive, setPreviewActive] = useState(false);

  function copyCode(text: string, id: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const currentPlatform = platforms[activePlatform];

  return (
    <div className="guide-container">
      {/* Platform Selector Bar */}
      <section className="guide-platform-section">
        <div className="guide-section-intro">
          <span className="eyebrow">Select your platform or stack</span>
          <h2>Platform-specific setup instructions</h2>
          <p>
            Choose your storefront technology below for exact, copy-pasteable snippets and configuration guides.
          </p>
        </div>

        <div className="guide-platform-tabs" role="tablist" aria-label="E-commerce Platforms">
          {(Object.keys(platforms) as Platform[]).map((key) => {
            const p = platforms[key];
            const isActive = activePlatform === key;
            return (
              <button
                type="button"
                role="tab"
                key={p.id}
                aria-selected={isActive}
                className={`guide-tab-button ${isActive ? "is-active" : ""}`}
                onClick={() => setActivePlatform(p.id)}
              >
                <span className="guide-tab-name">{p.name}</span>
                <span className="guide-tab-badge">{p.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Active Platform Panel */}
        <div className="guide-platform-detail" role="tabpanel">
          <div className="guide-detail-header">
            <div>
              <span className="eyebrow">{currentPlatform.category}</span>
              <h3>{currentPlatform.name} Integration</h3>
              <p>{currentPlatform.description}</p>
            </div>
            <button
              type="button"
              className="button button--small button--secondary"
              onClick={() => copyCode(currentPlatform.snippet, "platform-code")}
            >
              {copied === "platform-code" ? "Copied ✓" : "Copy Code ↗"}
            </button>
          </div>

          <div className="guide-code-block-wrap">
            <pre className="guide-code-block">
              <code>{currentPlatform.snippet}</code>
            </pre>
          </div>

          <div className="guide-steps-list">
            <h4>Implementation steps:</h4>
            <ol>
              {currentPlatform.steps.map((step, idx) => (
                <li key={idx}>
                  <span>{String(idx + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Embed Modes Comparison */}
      <section className="guide-modes-section">
        <div className="guide-section-intro">
          <span className="eyebrow">Two ways to present Arieya</span>
          <h2>Floating Launcher vs. Inline Page</h2>
          <p>
            Arieya can float as an omnipresent shopping assistant across your store, or occupy a dedicated full-page advisor experience.
          </p>
        </div>

        <div className="guide-modes-switch">
          <button
            type="button"
            className={`guide-mode-toggle ${embedMode === "floating" ? "is-active" : ""}`}
            onClick={() => setEmbedMode("floating")}
          >
            Floating Launcher (Default)
          </button>
          <button
            type="button"
            className={`guide-mode-toggle ${embedMode === "inline" ? "is-active" : ""}`}
            onClick={() => setEmbedMode("inline")}
          >
            Dedicated Inline Container
          </button>
        </div>

        {embedMode === "floating" ? (
          <div className="guide-mode-card">
            <div className="guide-mode-copy">
              <span className="eyebrow">Every page · Omnipresent</span>
              <h3>Floating Branded Launcher</h3>
              <p>
                A discreet button appears in the corner of your storefront. When shoppers click, Arieya opens as a full-viewport modal overlay on mobile and a focused window on desktop.
              </p>
              <ul>
                <li>✓ Focus-trapped accessible dialog with Escape key dismiss</li>
                <li>✓ Smooth backdrop transitions</li>
                <li>✓ Zero impact on your store layout or footer</li>
                <li>✓ Direct clicks send shoppers to your actual product URLs</li>
              </ul>
            </div>
            <div className="guide-mode-snippet">
              <div className="guide-snippet-head">
                <span>HTML Snippet</span>
                <button
                  type="button"
                  className="button button--small button--secondary"
                  onClick={() =>
                    copyCode(
                      `<script src="https://www.arieya.site/arieya-sdk.js" data-store-key="YOUR_STORE_KEY"></script>`,
                      "floating-snippet"
                    )
                  }
                >
                  {copied === "floating-snippet" ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <pre>
                <code>{`<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
  data-position="bottom-right"
  data-launcher-text="Need help choosing?"
  data-accent-color="#2d5016"
></script>`}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="guide-mode-card">
            <div className="guide-mode-copy">
              <span className="eyebrow">Dedicated Route · e.g. /find-your-fit</span>
              <h3>Inline Container Embed</h3>
              <p>
                Embed the advisor directly inside any page container element (e.g. on your own <code>/advisor</code> or <code>/gift-finder</code> page).
              </p>
              <ul>
                <li>✓ Fits naturally into your site navigation and header</li>
                <li>✓ Custom container width and height</li>
                <li>✓ Great for targeted marketing campaigns and email links</li>
              </ul>
            </div>
            <div className="guide-mode-snippet">
              <div className="guide-snippet-head">
                <span>HTML & Container</span>
                <button
                  type="button"
                  className="button button--small button--secondary"
                  onClick={() =>
                    copyCode(
                      `<div id="arieya-container" style="width:100%;height:750px"></div>\n<script>\n  window.AreyaConfig = { storeKey: 'YOUR_STORE_KEY', mode: 'inline', target: '#arieya-container' };\n</script>\n<script src="https://www.arieya.site/arieya-sdk.js"></script>`,
                      "inline-snippet"
                    )
                  }
                >
                  {copied === "inline-snippet" ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <pre>
                <code>{`<!-- 1. The target element -->
<div id="arieya-advisor" style="width:100%;height:720px;border-radius:12px;overflow:hidden"></div>

<!-- 2. Configure inline mode -->
<script>
  window.AreyaConfig = {
    storeKey: 'YOUR_STORE_KEY',
    mode: 'inline',
    target: '#arieya-advisor'
  };
</script>
<script src="https://www.arieya.site/arieya-sdk.js"></script>`}</code>
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* Interactive Simulator / Live Test */}
      <section className="guide-tester-section">
        <div className="guide-section-intro">
          <span className="eyebrow">Interactive Simulator</span>
          <h2>Test the advisor on this page right now</h2>
          <p>
            Experience how the SDK overlay feels. Enter your store public key (or use the sample <code>edita-demo</code>) and click Launch.
          </p>
        </div>

        <div className="guide-tester-box">
          <div className="guide-tester-controls">
            <label>
              <span>Store Public Key:</span>
              <input
                type="text"
                value={testStoreKey}
                onChange={(e) => setTestStoreKey(e.target.value)}
                placeholder="edita-demo"
              />
            </label>
            <label>
              <span>Button Position:</span>
              <select
                value={testPosition}
                onChange={(e) => setTestPosition(e.target.value as "bottom-right" | "bottom-left")}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </label>
            <button
              type="button"
              className="button"
              onClick={() => {
                setPreviewActive(true);
              }}
            >
              Launch Advisor Overlay <span>↗</span>
            </button>
          </div>
          <small className="guide-tester-note">
            Press <strong>Escape</strong> or the <strong>×</strong> button to close the preview when launched.
          </small>
        </div>

        {/* Live Modal Overlay Simulation */}
        {previewActive && (
          <div
            className="guide-modal-backdrop"
            onClick={() => setPreviewActive(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="guide-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="guide-modal-close"
                onClick={() => setPreviewActive(false)}
                aria-label="Close Preview"
              >
                ×
              </button>
              <iframe
                src={`/stylist?store=${encodeURIComponent(testStoreKey)}&embed=true`}
                title="Arieya Advisor Live Simulation"
                className="guide-modal-iframe"
                allow="clipboard-write"
              />
            </div>
          </div>
        )}
      </section>

      {/* Events & PostMessage Bridge */}
      <section className="guide-events-section">
        <div className="guide-section-intro">
          <span className="eyebrow">Bi-Directional Communication</span>
          <h2>The postMessage Event Bridge</h2>
          <p>
            When Arieya runs on your store, it communicates directly with your host window via postMessage. Listen for these events in your custom analytics or tag managers.
          </p>
        </div>

        <div className="guide-events-grid">
          <div className="guide-events-table-wrap">
            <table className="guide-events-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Payload Fields</th>
                  <th>Trigger Moment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>arieya:ready</code></td>
                  <td><code>{"{}"}</code></td>
                  <td>The advisor iframe has loaded and initialized.</td>
                </tr>
                <tr>
                  <td><code>arieya:product-click</code></td>
                  <td><code>{"{ url, title, priceMinor, currency }"}</code></td>
                  <td>Shopper clicked on a recommended product card.</td>
                </tr>
                <tr>
                  <td><code>arieya:recommendation</code></td>
                  <td><code>{"{ count, status }"}</code></td>
                  <td>The engine finished matching and returned products.</td>
                </tr>
                <tr>
                  <td><code>arieya:close</code></td>
                  <td><code>{"{}"}</code></td>
                  <td>Shopper clicked the close button to exit the advisor.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="guide-events-listener-card">
            <div className="guide-snippet-head">
              <span>JavaScript Event Listener</span>
              <button
                type="button"
                className="button button--small button--secondary"
                onClick={() =>
                  copyCode(
                    `window.addEventListener('message', (event) => {\n  if (event.origin !== 'https://www.arieya.site') return;\n  \n  if (event.data?.type === 'arieya:product-click') {\n    const product = event.data;\n    console.log('Shopper clicked product:', product.title, product.priceMinor);\n    // Custom analytics tracking:\n    // gtag('event', 'advisor_click', { product: product.title });\n  }\n});`,
                    "events-listener"
                  )
                }
              >
                {copied === "events-listener" ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <pre>
              <code>{`// Listen to Arieya events on your store
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://www.arieya.site') return;

  switch (event.data?.type) {
    case 'arieya:product-click':
      console.log('Shopper clicked product:', event.data.title, event.data.url);
      // Track in Google Analytics or Meta Pixel:
      // gtag('event', 'select_item', { item_name: event.data.title });
      break;

    case 'arieya:recommendation':
      console.log('Returned', event.data.count, 'recommendations. Status:', event.data.status);
      break;

    case 'arieya:close':
      console.log('Shopper closed advisor');
      break;
  }
});`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* REST API Reference */}
      <section className="guide-api-section">
        <div className="guide-section-intro">
          <span className="eyebrow">Headless & Backend Developers</span>
          <h2>Direct REST API Endpoints</h2>
          <p>
            If you are not embedding client-side widgets, you can invoke the Arieya discovery engine directly from your server.
          </p>
        </div>

        <div className="guide-api-cards">
          <article className="guide-api-card">
            <div className="guide-api-badge">
              <span className="badge-method">POST</span>
              <code>/api/v1/chat</code>
            </div>
            <h4>Submit shopper query & retrieve grounded recommendations</h4>
            <pre>
              <code>{`// Request Body (JSON)
{
  "tenant": "YOUR_STORE_PUBLIC_KEY",
  "message": "I'm looking for an anniversary gift under £150",
  "sessionId": "shopper-uuid-string",
  "history": [
    { "role": "user", "content": "Show me rings" },
    { "role": "assistant", "content": "Here are 2 rings..." }
  ],
  "currency": "GBP"
}`}</code>
            </pre>
            <div className="guide-api-response">
              <span className="eyebrow">Response (JSON)</span>
              <pre>
                <code>{`{
  "reply": "I found 3 verified matches...",
  "products": [
    {
      "id": "solace-amber-pendant",
      "title": "Solace Amber Pendant",
      "category": "necklace",
      "priceMinor": 11800,
      "currency": "GBP",
      "available": true,
      "url": "https://yourstore.com/products/pendant"
    }
  ],
  "status": "exact",
  "modelPath": "gemini"
}`}</code>
              </pre>
            </div>
          </article>

          <article className="guide-api-card">
            <div className="guide-api-badge">
              <span className="badge-method">POST</span>
              <code>/api/v1/events</code>
            </div>
            <h4>Record impressions and clicks for merchant analytics</h4>
            <pre>
              <code>{`// Request Body (JSON)
{
  "tenant": "YOUR_STORE_PUBLIC_KEY",
  "sessionId": "shopper-uuid-string",
  "events": [
    { "name": "product_impression", "productId": "solace-amber-pendant" },
    { "name": "product_clicked", "productId": "solace-amber-pendant" }
  ]
}`}</code>
            </pre>
          </article>
        </div>
      </section>
    </div>
  );
}
