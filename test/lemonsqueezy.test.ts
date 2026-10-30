import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyWebhookSignature,
  getPlanFromVariant,
  getAllowanceForPlan,
  PLANS,
} from "../lib/lemonsqueezy.ts";

test("lemon squeezy: webhook signature verification validates genuine payloads", () => {
  const secret = "test_webhook_secret_key_1234567890";
  const payload = JSON.stringify({ meta: { event_name: "subscription_created" } });
  const validSignature = createHmac("sha256", secret).update(payload).digest("hex");

  assert.equal(verifyWebhookSignature(payload, validSignature, secret), true);
  assert.equal(verifyWebhookSignature(payload, "invalid_signature_hex", secret), false);
  assert.equal(verifyWebhookSignature(payload, null, secret), false);
  assert.equal(verifyWebhookSignature(payload, validSignature, ""), false);
});

test("lemon squeezy: plan variants map correctly to tiers and session allowances", () => {
  assert.equal(getPlanFromVariant("growth_variant_123"), "growth");
  assert.equal(getPlanFromVariant("pro_variant_456"), "pro");
  assert.equal(getPlanFromVariant("starter_variant_789"), "starter");

  assert.equal(getAllowanceForPlan("starter"), 1500);
  assert.equal(getAllowanceForPlan("growth"), 6000);
  assert.equal(getAllowanceForPlan("pro"), 25000);
  assert.equal(getAllowanceForPlan("founding"), 500);
});

test("lemon squeezy: plan tier configurations contain required commercial limits", () => {
  assert.equal(PLANS.starter.priceMonthlyGbp, 3.99);
  assert.equal(PLANS.growth.priceMonthlyGbp, 5.99);
  assert.equal(PLANS.pro.priceMonthlyGbp, 9.99);
  assert.equal(PLANS.starter.priceMonthlyUsd, 3.99);
  assert.equal(PLANS.growth.priceMonthlyUsd, 5.99);
  assert.equal(PLANS.pro.priceMonthlyUsd, 9.99);

  assert.equal(PLANS.starter.maxProducts, 500);
  assert.equal(PLANS.growth.maxProducts, 2500);
  assert.equal(PLANS.pro.maxProducts, 10000);

  assert.ok(PLANS.growth.features.length >= 5);
});
