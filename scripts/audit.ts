import assert from "node:assert/strict";
import { auditCatalog, CATALOG, parseConstraints, recommend } from "../lib/core.ts";

const catalogAudit = auditCatalog(CATALOG);
assert.equal(catalogAudit.launchBlocked, false);
const categories = ["ring", "necklace", "bracelet", "earrings"];
const budgets = [50, 80, 100, 120, 150];
const exclusions = ["not emerald", "not silver", "not flashy", "not pearl", "not bold"];
const moods = ["elegant", "warm"];
let prompts = 0;
for (const category of categories) for (const budget of budgets) for (const exclusion of exclusions) for (const mood of moods) {
  const prompt = `${mood} ${category} under £${budget}, ${exclusion}`;
  const constraints = parseConstraints(prompt);
  const result = recommend(prompt);
  assert.ok(result.products.length <= 4);
  if (result.status === "no_match") assert.equal(result.products.length, 0);
  for (const product of result.products) {
    assert.equal(product.available, true);
    assert.equal(product.category, constraints.category);
    assert.ok(product.priceMinor <= (constraints.maxPriceMinor || Infinity));
    assert.ok(CATALOG.some((known) => known.id === product.id));
  }
  prompts += 1;
}
console.log(`Catalog: ${CATALOG.length} products, ${catalogAudit.issues.length} issues`);
console.log(`Evaluation: ${prompts} prompts passed with no fabricated products or hard-constraint violations`);
