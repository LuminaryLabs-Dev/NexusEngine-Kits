import assert from "node:assert/strict";
import { createEngine } from "nexusengine";
import { createSimulationKit } from "nexusengine/domains/simulation";
import { createNexusEngineKitInstaller } from "../../installer/index.js";
import { createSimulationDomainKits } from "../../domains/simulation/index.js";

const engine = createEngine({
  tick: { maxDelta: 1 },
  kits: [createSimulationKit({
    resourceMeters: [{ id: "oxygen", max: 100, initial: 75, ratePerSecond: -5 }]
  })]
});
const installer = createNexusEngineKitInstaller();
const report = await installer.installDomain(engine, "simulation");

assert.equal(report.domainId, "simulation");
assert.equal(report.results.length, 2);
assert.deepEqual(report.results.filter((result) => result.installed), []);
assert.equal(report.results.filter((result) => result.skipped).length, 2);
assert.equal(typeof engine.n.simulation.getSnapshot, "function");
assert.equal(typeof engine.n.simulation.resources.getSnapshot, "function");
engine.tick(1);
assert.equal(engine.n.simulation.resources.get("oxygen").value, 70);

assert.deepEqual(createSimulationDomainKits(), []);
const candidates = createSimulationDomainKits({}, { allowStatuses: ["official", "candidate"] });
assert.deepEqual(candidates.map((kit) => kit.id), ["seeded-world-patch-controller-kit"]);

console.log("simulation domain smoke ok", { installed: 0, skipped: 2 });
