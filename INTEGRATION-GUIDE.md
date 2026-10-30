# Arieya Integration Guide

Add the Arieya shopping advisor to any website, app, or custom platform. This guide covers every supported integration method — from a single script tag to full server-side API access.

---

## Quick start — one line of code

Drop this script tag into any HTML page. Replace `YOUR_STORE_KEY` with the public key from your [Merchant Studio](/merchant) dashboard.

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

A floating "Need help choosing?" button appears in the bottom-right corner. When a shopper clicks it, a full-screen Arieya advisor overlay opens with your catalogue. Product links send shoppers to your own product pages.

---

## Table of contents

1. [SDK configuration](#sdk-configuration)
2. [Floating button (default)](#floating-button)
3. [Inline embed](#inline-embed)
4. [Programmatic API](#programmatic-api)
5. [Events and postMessage bridge](#events-and-postmessage-bridge)
6. [Platform guides](#platform-guides)
   - [Shopify](#shopify)
   - [WordPress / WooCommerce](#wordpress--woocommerce)
   - [Hostinger Website Builder](#hostinger-website-builder)
   - [Squarespace](#squarespace)
   - [Wix](#wix)
   - [Static HTML](#static-html)
7. [Server-side integration](#server-side-integration)
   - [Node.js / Express](#nodejs--express)
   - [Python / Flask / Django](#python--flask--django)
   - [Ruby / PHP / Go](#ruby--php--go)
8. [API reference](#api-reference)
9. [Security and CORS](#security-and-cors)
10. [Troubleshooting](#troubleshooting)

---

## SDK configuration

The SDK reads configuration from **data attributes** on the script tag, or from a global `window.AreyaConfig` object set before the script loads.

### Data attributes

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
  data-mode="floating"
  data-position="bottom-right"
  data-theme="light"
  data-accent-color="#2d5016"
  data-launcher-text="Need help choosing?"
></script>
```

### JavaScript config object

```html
<script>
  window.AreyaConfig = {
    storeKey: 'YOUR_STORE_KEY',
    mode: 'floating',        // 'floating' | 'inline'
    target: '#advisor',       // CSS selector for inline mode
    position: 'bottom-right', // 'bottom-right' | 'bottom-left'
    theme: 'light',           // 'light' | 'dark'
    accentColor: '#2d5016',   // optional brand accent
    launcherText: 'Need help choosing?',
    host: 'https://www.arieya.site',
  };
</script>
<script src="https://www.arieya.site/arieya-sdk.js"></script>
```

### Configuration options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `storeKey` | `string` | *required* | Your store's public key from the Merchant Studio. |
| `mode` | `'floating' \| 'inline'` | `'floating'` | Floating button + overlay, or embed directly in a container. |
| `target` | `string` | — | CSS selector for the container element (inline mode only). |
| `position` | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Launcher button position (floating mode only). |
| `theme` | `'light' \| 'dark'` | `'light'` | Visual theme for the launcher button. |
| `accentColor` | `string` | `'#2d5016'` | Brand accent colour for the launcher. |
| `launcherText` | `string` | `'Need help choosing?'` | Text shown on the floating launcher button. |
| `host` | `string` | `'https://www.arieya.site'` | Arieya host origin (override for self-hosted). |

---

## Floating button

The default mode. A small branded button appears on the page. Clicking it opens a full-viewport overlay containing the Arieya advisor.

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

The overlay covers the full viewport on mobile and opens as a large centred modal on desktop. Press **Escape** or click the close button to dismiss.

### Customise the button

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
  data-position="bottom-left"
  data-launcher-text="Find the perfect gift"
  data-accent-color="#8B4513"
></script>
```

---

## Inline embed

Render the advisor directly inside a page element — ideal for a dedicated "Shop with an advisor" page.

```html
<div id="arieya-advisor" style="width: 100%; height: 720px;"></div>

<script>
  window.AreyaConfig = {
    storeKey: 'YOUR_STORE_KEY',
    mode: 'inline',
    target: '#arieya-advisor',
  };
</script>
<script src="https://www.arieya.site/arieya-sdk.js"></script>
```

---

## Programmatic API

After the SDK loads, a global `window.Arieya` object is available.

```js
// Open the advisor overlay (floating mode)
Arieya.open();

// Close the advisor overlay
Arieya.close();

// Listen for events
Arieya.on('product-click', (data) => {
  console.log('Shopper clicked:', data.title, data.url, data.price);
});

Arieya.on('recommendation', (data) => {
  console.log('Recommended', data.count, 'products. Status:', data.status);
});

Arieya.on('ready', () => {
  console.log('Advisor loaded and ready');
});

Arieya.on('close', () => {
  console.log('Shopper closed the advisor');
});
```

### Open with a pre-filled prompt

```js
// Trigger the advisor with a specific question
Arieya.open({ prompt: 'Show me gifts under £100' });
```

### Attach to a custom button

```html
<button onclick="Arieya.open()">Ask our shopping advisor</button>

<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
  data-mode="floating"
></script>
```

---

## Events and postMessage bridge

The SDK communicates with the hosted advisor via the browser `postMessage` API. You can also listen for these messages directly:

| Event | Payload | Fires when |
| --- | --- | --- |
| `arieya:ready` | `{}` | The advisor iframe has loaded. |
| `arieya:product-click` | `{ url, title, priceMinor, currency }` | A shopper clicks a product card. |
| `arieya:recommendation` | `{ count, status }` | The advisor returns a recommendation. |
| `arieya:close` | `{}` | The shopper closes the advisor. |

### Direct postMessage listener

```js
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://www.arieya.site') return;
  if (event.data?.type === 'arieya:product-click') {
    // Track in your analytics
    gtag('event', 'arieya_product_click', {
      product_url: event.data.url,
      product_title: event.data.title,
    });
  }
});
```

---

## Platform guides

### Shopify

Arieya works with any Shopify store — no app installation needed.

#### Option A: Theme snippet (recommended)

1. In your Shopify admin, go to **Online Store → Themes → Edit code**.
2. Open `layout/theme.liquid`.
3. Add the SDK script just before the closing `</body>` tag:

```liquid
<!-- Arieya Shopping Advisor -->
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="{{ shop.metafields.arieya.store_key | default: 'YOUR_STORE_KEY' }}"
  data-accent-color="{{ settings.colors_accent_1 | default: '#2d5016' }}"
></script>
```

4. Replace `YOUR_STORE_KEY` with your public key from the [Merchant Studio](https://www.arieya.site/merchant).
5. Save the theme.

#### Option B: Shopify Custom Liquid section

1. In the theme editor, add a **Custom Liquid** section to your homepage template.
2. Paste:

```liquid
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

#### Option C: Dedicated advisor page

1. Go to **Online Store → Pages** and create a new page called "Shopping Advisor".
2. Set the page template to a custom template (or use the default).
3. In the theme editor for that page, add a **Custom Liquid** section:

```liquid
<div id="arieya-advisor" style="width:100%;min-height:80vh"></div>
<script>
  window.AreyaConfig = {
    storeKey: 'YOUR_STORE_KEY',
    mode: 'inline',
    target: '#arieya-advisor',
  };
</script>
<script src="https://www.arieya.site/arieya-sdk.js"></script>
```

#### Option D: Direct API from Shopify backend (Node.js)

If you have a custom Shopify app or use the Shopify Functions API, call the Arieya API directly. See the [Node.js integration](#nodejs--express) section below.

#### Shopify catalogue sync tip

Export your Shopify products as CSV from **Products → Export** and upload the CSV in the [Merchant Studio](https://www.arieya.site/merchant). Arieya requires: title, price, availability, and a product page URL.

---

### WordPress / WooCommerce

#### Option A: Plugin-free embed

1. Go to **Appearance → Theme File Editor** (or use a child theme).
2. Open `footer.php`.
3. Before the closing `</body>` tag, add:

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

4. Save.

#### Option B: Gutenberg block

1. Edit any page and add a **Custom HTML** block.
2. For a floating button, paste:

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

3. For an inline embed, paste:

```html
<div id="arieya-advisor" style="width:100%;height:720px"></div>
<script>
  window.AreyaConfig = {
    storeKey: 'YOUR_STORE_KEY',
    mode: 'inline',
    target: '#arieya-advisor',
  };
</script>
<script src="https://www.arieya.site/arieya-sdk.js"></script>
```

#### Option C: WooCommerce product pages only

Add the script conditionally in your theme's `functions.php`:

```php
add_action('wp_footer', function() {
    if (is_woocommerce() || is_product() || is_shop()) {
        echo '<script src="https://www.arieya.site/arieya-sdk.js" data-store-key="YOUR_STORE_KEY"></script>';
    }
});
```

---

### Hostinger Website Builder

1. In the Hostinger builder, click the page where you want the advisor.
2. Add a **Code** element (or use the site-wide **Custom code** setting under SEO).
3. Paste:

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

4. For a dedicated advisor page, add an **HTML embed** element and paste the inline mode snippet.
5. Publish.

---

### Squarespace

1. Go to **Settings → Developer Tools → Code Injection**.
2. In the **Footer** field, paste:

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

3. For page-specific placement, edit a page, add a **Code Block**, and paste the inline embed snippet.
4. Save.

---

### Wix

1. Go to **Settings → Custom Code** (or use Wix Editor's "Add apps" → "Embed HTML").
2. Add a **new custom code** snippet set to load in the **Body - end**:

```html
<script
  src="https://www.arieya.site/arieya-sdk.js"
  data-store-key="YOUR_STORE_KEY"
></script>
```

3. For a dedicated page, use the **HTML iframe** widget and set the URL to:
   `https://www.arieya.site/stylist?store=YOUR_STORE_KEY`

4. Publish.

---

### Static HTML

Add the script before `</body>` in any HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>My Store</title>
</head>
<body>
  <!-- Your website content -->

  <!-- Arieya Shopping Advisor -->
  <script
    src="https://www.arieya.site/arieya-sdk.js"
    data-store-key="YOUR_STORE_KEY"
  ></script>
</body>
</html>
```

---

## Server-side integration

Use the Arieya API directly for deeper integrations — headless commerce, custom UIs, chatbots, mobile apps, or backend-driven recommendation flows.

### Base URL

```
https://www.arieya.site/api/v1
```

### Authentication

All public shopper APIs authenticate via the store's **public key** (passed as `tenant` in the request body). There are no API secrets for the shopper-facing endpoints — rate limiting, origin checks, and session management protect against abuse.

---

### Node.js / Express

#### Install

No SDK package needed — use the built-in `fetch` API.

```js
// arieya.js — Arieya API client for Node.js

const ARIEYA_HOST = 'https://www.arieya.site';

/**
 * Get product recommendations from Arieya.
 * @param {Object} options
 * @param {string} options.storeKey - Your store's public key
 * @param {string} options.message - The shopper's message
 * @param {string} options.sessionId - A unique session identifier
 * @param {Array} [options.history] - Previous conversation turns
 * @param {Array} [options.seenProductIds] - Already-shown product IDs
 * @param {string} [options.currency] - Currency code (GBP, USD, EUR)
 * @returns {Promise<Object>} Recommendation result
 */
async function getRecommendations({
  storeKey,
  message,
  sessionId,
  history = [],
  seenProductIds = [],
  currency,
}) {
  const response = await fetch(`${ARIEYA_HOST}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant: storeKey,
      message,
      sessionId,
      history: history.slice(-8),
      seenProductIds: seenProductIds.slice(-20),
      currency,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Arieya API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Record a shopper event.
 * @param {Object} options
 * @param {string} options.storeKey - Your store's public key
 * @param {string} options.sessionId - Session identifier
 * @param {string} options.name - Event name
 * @param {string} [options.productId] - Related product ID
 */
async function trackEvent({ storeKey, sessionId, name, productId }) {
  await fetch(`${ARIEYA_HOST}/api/v1/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant: storeKey,
      sessionId,
      events: [{ name, productId }],
    }),
  });
}

module.exports = { getRecommendations, trackEvent };
```

#### Express example

```js
const express = require('express');
const { getRecommendations, trackEvent } = require('./arieya');

const app = express();
app.use(express.json());

const STORE_KEY = process.env.ARIEYA_STORE_KEY;

// Proxy endpoint for your frontend
app.post('/api/advisor/chat', async (req, res) => {
  try {
    const { message, sessionId, history } = req.body;
    const result = await getRecommendations({
      storeKey: STORE_KEY,
      message,
      sessionId,
      history,
      currency: 'GBP',
    });

    // result.products contains matched items with title, price, url
    // result.status is 'exact' | 'curated' | 'relaxed' | 'no_match' | 'handoff'
    // result.reply is the advisor message
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Track product clicks from your frontend
app.post('/api/advisor/click', async (req, res) => {
  const { sessionId, productId } = req.body;
  await trackEvent({
    storeKey: STORE_KEY,
    sessionId,
    name: 'product_clicked',
    productId,
  });
  res.json({ ok: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

### Python / Flask / Django

#### Arieya client module

```python
# arieya.py — Arieya API client for Python

import requests
from typing import Optional

ARIEYA_HOST = "https://www.arieya.site"


def get_recommendations(
    store_key: str,
    message: str,
    session_id: str,
    history: Optional[list] = None,
    seen_product_ids: Optional[list] = None,
    currency: Optional[str] = None,
) -> dict:
    """
    Get product recommendations from Arieya.

    Args:
        store_key: Your store's public key from Merchant Studio.
        message: The shopper's message or query.
        session_id: A unique session identifier for the conversation.
        history: Previous conversation turns as [{"role": "user"|"assistant", "content": "..."}].
        seen_product_ids: Product IDs already shown to avoid repeats.
        currency: Currency code (GBP, USD, EUR).

    Returns:
        dict with keys: reply, products, status, constraints, relaxations, etc.
    """
    response = requests.post(
        f"{ARIEYA_HOST}/api/v1/chat",
        json={
            "tenant": store_key,
            "message": message,
            "sessionId": session_id,
            "history": (history or [])[-8:],
            "seenProductIds": (seen_product_ids or [])[-20:],
            "currency": currency,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def track_event(
    store_key: str,
    session_id: str,
    name: str,
    product_id: Optional[str] = None,
):
    """Record a shopper event for analytics."""
    requests.post(
        f"{ARIEYA_HOST}/api/v1/events",
        json={
            "tenant": store_key,
            "sessionId": session_id,
            "events": [{"name": name, "productId": product_id}],
        },
        timeout=10,
    )
```

#### Flask example

```python
from flask import Flask, request, jsonify
from arieya import get_recommendations, track_event
import os
import uuid

app = Flask(__name__)
STORE_KEY = os.environ["ARIEYA_STORE_KEY"]


@app.route("/api/advisor/chat", methods=["POST"])
def advisor_chat():
    data = request.json
    try:
        result = get_recommendations(
            store_key=STORE_KEY,
            message=data["message"],
            session_id=data.get("sessionId", str(uuid.uuid4())),
            history=data.get("history", []),
            currency="GBP",
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route("/api/advisor/click", methods=["POST"])
def advisor_click():
    data = request.json
    track_event(
        store_key=STORE_KEY,
        session_id=data["sessionId"],
        name="product_clicked",
        product_id=data.get("productId"),
    )
    return jsonify({"ok": True})
```

#### Django example

```python
# views.py
import json
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .arieya import get_recommendations, track_event


@csrf_exempt
def advisor_chat(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    data = json.loads(request.body)
    try:
        result = get_recommendations(
            store_key=settings.ARIEYA_STORE_KEY,
            message=data["message"],
            session_id=data.get("sessionId", str(uuid.uuid4())),
            history=data.get("history", []),
            currency="GBP",
        )
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=502)


# urls.py
# path('api/advisor/chat', views.advisor_chat),
```

---

### Ruby / PHP / Go

#### Ruby (with net/http)

```ruby
require 'net/http'
require 'json'
require 'uri'

module Arieya
  HOST = 'https://www.arieya.site'

  def self.recommend(store_key:, message:, session_id:, history: [], currency: nil)
    uri = URI("#{HOST}/api/v1/chat")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
    request.body = {
      tenant: store_key,
      message: message,
      sessionId: session_id,
      history: history.last(8),
      currency: currency,
    }.to_json

    response = http.request(request)
    JSON.parse(response.body)
  end
end

# Usage:
# result = Arieya.recommend(store_key: 'abc', message: 'Show me rings', session_id: SecureRandom.uuid)
# result['products'].each { |p| puts "#{p['title']} — #{p['priceMinor']}" }
```

#### PHP

```php
<?php
function arieya_recommend(string $storeKey, string $message, string $sessionId, array $history = [], ?string $currency = null): array {
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
            'currency' => $currency,
        ]),
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200) {
        throw new RuntimeException("Arieya API error: $status");
    }

    return json_decode($response, true);
}

// Usage:
// $result = arieya_recommend('YOUR_STORE_KEY', 'Show me earrings under £80', session_id());
// foreach ($result['products'] as $product) { echo $product['title'] . "\n"; }
```

#### Go

```go
package arieya

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const host = "https://www.arieya.site"

type ChatRequest struct {
	Tenant   string            `json:"tenant"`
	Message  string            `json:"message"`
	SessionID string           `json:"sessionId"`
	History  []map[string]string `json:"history,omitempty"`
	Currency string            `json:"currency,omitempty"`
}

type Product struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	PriceMinor int    `json:"priceMinor"`
	Currency   string `json:"currency"`
	URL        string `json:"url"`
	Available  bool   `json:"available"`
}

type Recommendation struct {
	Reply    string    `json:"reply"`
	Products []Product `json:"products"`
	Status   string    `json:"status"`
}

func Recommend(req ChatRequest) (*Recommendation, error) {
	body, _ := json.Marshal(req)
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(host+"/api/v1/chat", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("arieya API error: %d", resp.StatusCode)
	}

	var result Recommendation
	json.NewDecoder(resp.Body).Decode(&result)
	return &result, nil
}
```

---

## API reference

### POST `/api/v1/chat`

Send a shopper message and receive product recommendations.

**Request body:**

```json
{
  "tenant": "YOUR_STORE_KEY",
  "message": "Show me an elegant gift under £120",
  "sessionId": "unique-session-id",
  "history": [
    { "role": "user", "content": "I need a birthday gift" },
    { "role": "assistant", "content": "I found 3 matches..." }
  ],
  "seenProductIds": ["product-1", "product-2"],
  "currency": "GBP"
}
```

**Response:**

```json
{
  "reply": "I found 3 verified matches. Each one is available and within the constraints you gave me.",
  "products": [
    {
      "id": "solace-amber-pendant",
      "title": "Solace Amber Pendant",
      "description": "A slim warm-gold pendant...",
      "category": "necklace",
      "priceMinor": 11800,
      "currency": "GBP",
      "available": true,
      "material": "gold vermeil",
      "url": "https://store.example.com/products/solace-pendant",
      "imageUrl": "https://store.example.com/images/pendant.jpg"
    }
  ],
  "status": "exact",
  "constraints": {
    "category": null,
    "maxPriceMinor": 12000,
    "exclusions": []
  },
  "relaxations": [],
  "modelPath": "gemini",
  "latencyMs": 1200
}
```

**Status values:**

| Status | Meaning |
| --- | --- |
| `exact` | All constraints matched exactly. |
| `curated` | No specific constraints; best-fit curation. |
| `no_match` | No products satisfy all constraints. Includes `relaxations` suggestions. |
| `handoff` | Query involves policies (shipping, returns) — handed to merchant. |

### POST `/api/v1/events`

Record shopper analytics events.

```json
{
  "tenant": "YOUR_STORE_KEY",
  "sessionId": "unique-session-id",
  "events": [
    { "name": "product_clicked", "productId": "solace-amber-pendant" },
    { "name": "product_impression", "productId": "halo-champagne-ring" }
  ]
}
```

### GET `/api/v1/catalog?store=YOUR_STORE_KEY`

Retrieve the public product catalogue for display.

### GET `/api/v1/trial?store=YOUR_STORE_KEY`

Check trial/session status and product count.

---

## Security and CORS

- **Origin validation**: When a merchant registers, they set an approved website origin. API requests from other origins are rejected.
- **Rate limiting**: All endpoints are rate-limited per IP. The chat endpoint allows 30 requests per window per visitor.
- **Session isolation**: Each store has its own tenant ID. Catalogues, analytics, and sessions are fully isolated.
- **No secrets in the browser**: The public store key is safe to include in client-side code. It only grants read access to the public catalogue and chat API.
- **HTTPS required**: All API requests must use HTTPS. Product page URLs in catalogues must also be HTTPS.

### Approved origins

When you register in the Merchant Studio, your store URL's origin is automatically approved. If you need to add additional origins (e.g., a staging site), update your store settings in the Merchant Studio.

---

## Troubleshooting

### The advisor doesn't load

1. Check that your `data-store-key` matches the public key shown in your Merchant Studio.
2. Verify the page's origin matches your store's approved origin in Store settings.
3. Check the browser console for CORS or network errors.

### Products aren't showing

1. Ensure you have uploaded a catalogue in the Merchant Studio with at least one available product.
2. Check that product URLs are valid HTTPS links.

### Rate limiting

The demo trial allows 3 questions. Merchant-configured stores have higher limits. If you see 429 errors, check your rate limit configuration.

### The SDK script doesn't load

Verify that no Content Security Policy (CSP) on your site blocks scripts from `https://www.arieya.site`. Add it to your `script-src` directive:

```
Content-Security-Policy: script-src 'self' https://www.arieya.site; frame-src https://www.arieya.site;
```

---

*For help with your integration, contact the Arieya team through the [pilot form](https://www.arieya.site/#pilot).*
