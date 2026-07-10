import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createFoundationDomainKits } from "../../domains/foundation/index.js";

const officialKits = createFoundationDomainKits({
  "seed-kit": { seed: "foundation-domain" }
});
assert.deepEqual(officialKits.map((kit) => kit.id), ["seed-kit"]);

const engine = createRealtimeGame({
  kits: [createCoreSimulationKit(), ...officialKits]
});
assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");
assert.equal(engine.n.seedStream.getWorldSeed(), "foundation-domain");
assert.equal(engine.n.seedStream.next("domain"), createRealtimeGame({
  kits: createFoundationDomainKits({ "seed-kit": { seed: "foundation-domain" } })
}).n.seedStream.next("domain"));

const compatibilityKits = createFoundationDomainKits({}, {
  allowStatuses: ["official", "deprecated"]
});
assert.deepEqual(compatibilityKits.map((kit) => kit.id), ["protokit-core", "seed-kit"]);

console.log("foundation domain smoke ok", {
  official: officialKits.length,
  compatibility: compatibilityKits.length
});
