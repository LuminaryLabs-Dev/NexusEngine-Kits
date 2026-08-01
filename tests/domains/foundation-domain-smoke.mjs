import assert from "node:assert/strict";
import { createEngine } from "nexusengine";
import { createFoundationDomainKits } from "../../domains/foundation/index.js";

const officialKits = createFoundationDomainKits({
  "seed-kit": { seed: "foundation-domain" }
});
assert.deepEqual(officialKits.map((kit) => kit.id), ["seed-kit"]);

const engine = createEngine({ kits: officialKits });
assert.equal(engine.n.seedStream.getWorldSeed(), "foundation-domain");
assert.equal(engine.n.seedStream.next("domain"), createEngine({
  kits: createFoundationDomainKits({ "seed-kit": { seed: "foundation-domain" } })
}).n.seedStream.next("domain"));

const expandedStatuses = createFoundationDomainKits({}, {
  allowStatuses: ["official", "deprecated"]
});
assert.deepEqual(expandedStatuses.map((kit) => kit.id), ["seed-kit"]);

console.log("foundation domain smoke ok", {
  official: officialKits.length,
  expanded: expandedStatuses.length
});
