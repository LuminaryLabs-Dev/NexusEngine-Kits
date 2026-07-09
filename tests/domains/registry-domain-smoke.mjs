import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createRegistryDomainKits } from "../../domains/registry/index.js";

const kits = createRegistryDomainKits();
assert.deepEqual(kits.map((kit) => kit.id), [
  "kit-registry-domain-kit",
  "capability-graph-domain-kit",
  "composition-planning-domain-kit"
]);

const engine = createRealtimeGame({ kits: [createCoreSimulationKit(), ...kits] });
assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");
assert.equal(typeof engine.n.kitRegistry.search, "function");
assert.equal(typeof engine.n.capabilityGraph.createInstallOrder, "function");
assert.equal(typeof engine.n.compositionPlanning.createInstallPlan, "function");

console.log("registry domain smoke ok");
