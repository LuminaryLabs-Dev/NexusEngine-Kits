import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createNexusEngineKitInstaller } from "../../installer/index.js";
import { createSimulationDomainKits } from "../../domains/simulation/index.js";

const engine = createRealtimeGame({ kits: [createCoreSimulationKit()] });
const installer = createNexusEngineKitInstaller();
const report = await installer.installDomain(engine, "simulation", {
  "generic-resource-loop-kit": {
    resources: [{ id: "oxygen", max: 100, initial: 75, ratePerSecond: -5 }]
  }
});

assert.equal(report.domainId, "simulation");
assert.equal(report.results.length, 4);
assert.deepEqual(report.results.filter((result) => result.installed).map((result) => result.kit.id), ["generic-resource-loop-kit"]);
assert.equal(report.results.filter((result) => result.skipped).length, 3);
assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");
assert.equal(typeof engine.n.resourceMeter.getSnapshot, "function");
engine.tick(1);
assert.equal(engine.n.resourceMeter.get("oxygen").value, 70);

const synchronous = createSimulationDomainKits({
  "generic-resource-loop-kit": { resources: [{ id: "charge", initial: 20 }] }
});
assert.deepEqual(synchronous.map((kit) => kit.id), ["generic-resource-loop-kit"]);

console.log("simulation domain smoke ok", { installed: 1, skipped: 3 });
