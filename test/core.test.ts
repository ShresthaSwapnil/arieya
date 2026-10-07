import assert from "node:assert/strict";
import test from "node:test";
import { auditCatalog, CATALOG, guardModelReply, parseConstraints, recommend } from "../lib/core.ts";

test("commercial constraints are deterministic", () => {
  const parsed = parseConstraints("A gold ring under £120, not emerald and not flashy");
  assert.equal(parsed.category, "ring");
  assert.equal(parsed.maxPriceMinor, 12000);
  assert.deepEqual(parsed.exclusions, ["emerald", "flashy"]);
  const result = recommend("A gold ring under £120, not emerald and not flashy");
  assert.ok(result.products.every((product) => product.category === "ring" && product.priceMinor <= 12000));
  assert.ok(result.products.every((product) => product.gemstone !== "emerald crystal" && !product.styles.includes("flashy")));
});

test("no match returns no padding and an explicit relaxation", () => {
  const result = recommend("A pearl ring under £50");
  assert.equal(result.status, "no_match");
  assert.equal(result.products.length, 0);
  assert.ok(result.relaxations.length > 0);
});

test("risky support topics hand off without product cards", () => {
  const result = recommend("Where is my late order and can I get a refund?");
  assert.equal(result.status, "handoff");
  assert.equal(result.products.length, 0);
});

test("200-query adversarial set never fabricates or violates hard constraints", () => {
  const categories = ["ring", "necklace", "bracelet", "earrings"];
  const budgets = [50, 80, 100, 120, 150];
  const exclusions = ["not emerald", "not silver", "not flashy", "not pearl", "not bold"];
  const moods = ["elegant", "warm"];
  let count = 0;
  for (const category of categories) for (const budget of budgets) for (const exclusion of exclusions) for (const mood of moods) {
    const prompt = `${mood} ${category} under £${budget}, ${exclusion}`;
    const constraints = parseConstraints(prompt);
    const result = recommend(prompt);
    assert.ok(result.products.length <= 4);
    if (result.status === "no_match") assert.equal(result.products.length, 0);
    for (const product of result.products) {
      assert.ok(CATALOG.some((known) => known.id === product.id));
      assert.equal(product.available, true);
      assert.equal(product.category, constraints.category);
      assert.ok(product.priceMinor <= (constraints.maxPriceMinor || Infinity));
      assert.ok(!constraints.exclusions.some((term) => [product.material, product.color, product.gemstone || "", ...product.styles].join(" ").includes(term)));
    }
    count += 1;
  }
  assert.equal(count, 200);
});

test("catalog audit blocks duplicate commerce identifiers", () => {
  const audit = auditCatalog([...CATALOG, CATALOG[0]]);
  assert.equal(audit.launchBlocked, true);
  assert.ok(audit.issues.some((issue) => issue.message === "Duplicate product ID"));
});

test("model prose guard rejects unverified commercial claims", () => {
  assert.equal(guardModelReply("These options stay warm and refined. Want something more minimal?"), "These options stay warm and refined. Want something more minimal?");
  assert.equal(guardModelReply("This is £96 and guaranteed in stock."), null);
  assert.equal(guardModelReply("See https://example.com for delivery."), null);
});

test("follow-ups retain constraints, explicit changes replace only the chosen field", () => {
  const history = [{ role: "user", content: "An elegant gold ring under £120, not pearl" }];
  const refined = recommend("More modern", CATALOG, [], [], "GBP", history);
  assert.equal(refined.constraints.category, "ring");
  assert.equal(refined.constraints.maxPriceMinor, 12000);
  assert.ok(refined.products.every((p) => p.category === "ring" && p.priceMinor <= 12000 && p.gemstone !== "pearl"));
  const changed = recommend("Show options under £100", CATALOG, [], [], "GBP", history);
  assert.equal(changed.constraints.maxPriceMinor, 10000);
  assert.equal(changed.products.length, 0);
  const relaxed = recommend("Show any category", CATALOG, [], [], "GBP", history);
  assert.equal(relaxed.constraints.category, undefined);
  assert.equal(relaxed.constraints.maxPriceMinor, 12000);
});

test("zero budgets, cents and non-GBP currency ceilings are preserved", async () => {
  const { formatMoney } = await import("../lib/core.ts");
  assert.equal(recommend("under £0").products.length, 0);
  assert.equal(parseConstraints("under $12.34").maxPriceMinor, 1234);
  assert.equal(parseConstraints("below EUR 20.99").maxPriceMinor, 2099);
  assert.equal(formatMoney(1234, "GBP"), "£12.34");
  assert.equal(recommend("under $150").products.length, 0);
});

test("catalogue import rejects malformed data, script links and mixed currencies", async () => {
  const { parseCatalog } = await import("../lib/catalog.ts");
  const product = { ...CATALOG[0], url: "https://example.com/product" };
  assert.equal(parseCatalog([product])[0].title, product.title);
  for (const patch of [{ url: "javascript:alert(1)" }, { imageUrl: "https://127.0.0.1/private" }, { priceMinor: -1 }, { available: "maybe" }, { currency: "ABC" }]) {
    assert.throws(() => parseCatalog([{ ...product, ...patch }]));
  }
  assert.equal(parseCatalog([{ ...product, available: "true" }])[0].available, true);
  assert.equal(parseCatalog([{ ...product, material: "platinum" }])[0].material, "platinum");
  assert.throws(() => parseCatalog([product, product]));
  assert.throws(() => parseCatalog([product, { ...product, id: "other", currency: "USD" }]));
  assert.throws(() => parseCatalog(null));
});

test("trial quota stays atomic under concurrent requests and catalogues stay isolated", async () => {
  const { createTrial, getTrial, claimQuestion, consumeLimit, saveTrialCatalog } = await import("../lib/trial.ts");
  const first = await createTrial();
  const second = await createTrial();
  await saveTrialCatalog(first.trial.id_hash, [CATALOG[0]]);
  const request = (token: string) => new Request("http://localhost", { headers: { cookie: `edita-trial=${token}` } });
  assert.equal((await getTrial(request(first.token)))?.catalog?.length, 1);
  assert.equal((await getTrial(request(second.token)))?.catalog, null);
  const claimed = await Promise.all(Array.from({ length: 12 }, () => claimQuestion(first.trial.id_hash)));
  assert.deepEqual(claimed.filter((value) => value !== null).sort(), [1, 2, 3]);
  await saveTrialCatalog(first.trial.id_hash, null);
  assert.equal(await claimQuestion(first.trial.id_hash), null);
  const limited = await Promise.all(Array.from({ length: 12 }, () => consumeLimit(`test-${first.token}`, 3)));
  assert.equal(limited.filter(Boolean).length, 3);
});
