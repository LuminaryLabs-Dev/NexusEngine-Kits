import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import {
  createNexusEngineKitInstaller,
  createAllNexusEngineKits,
  listKitIds
} from "../../installer/index.js";

const engine = createRealtimeGame({
  tick: { maxDelta: 1 },
  kits: [createCoreSimulationKit({
    resourceMeters: [{ id: "energy", max: 10, initial: 8 }]
  })]
});
const installer = createNexusEngineKitInstaller();
const one = await installer.installKit(engine, "generic-resource-loop-kit", {
  resources: [{ id: "energy", max: 10, initial: 8 }]
});
assert.equal(one.installed, false);
assert.equal(one.skipped, true);
assert.equal(one.reason, "status-not-allowed");
assert.equal(typeof engine.n.resourceMeter.spend, "function");
assert.equal(engine.n.resourceMeter.spend("energy", 3).value, 5);
assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");

const compatibilityEngine = createRealtimeGame({ tick: { maxDelta: 1 } });
const compatibilityInstaller = createNexusEngineKitInstaller({
  allowStatuses: ["official", "deprecated"]
});
const compatibility = await compatibilityInstaller.installKit(
  compatibilityEngine,
  "generic-resource-loop-kit",
  { resources: [{ id: "legacy", max: 10, initial: 8 }] }
);
assert.equal(compatibility.installed, true);
assert.equal(compatibilityEngine.n.resourceMeter.spend("legacy", 3).value, 5);
const duplicate = await compatibilityInstaller.installKit(
  compatibilityEngine,
  "generic-resource-loop-kit"
);
assert.equal(duplicate.installed, false);
assert.equal(duplicate.duplicate, true);

const registryBundle = await installer.installBundle(engine, "registry-control-plane");
assert.equal(registryBundle.report.ok, true);
assert.equal(registryBundle.report.installed.length, 3);
assert.equal(typeof engine.n.kitRegistry.search, "function");
assert.deepEqual(registryBundle.report.plan.installOrder, [
  "kit-registry-domain-kit",
  "capability-graph-domain-kit",
  "composition-planning-domain-kit"
]);

const candidateBlocked = await installer.installKit(engine, "completion-ledger-kit");
assert.equal(candidateBlocked.installed, false);
assert.equal(candidateBlocked.skipped, true);
assert.equal(candidateBlocked.reason, "status-not-allowed");

const candidateInstaller = createNexusEngineKitInstaller({ allowStatuses: ["official", "candidate"] });
const candidate = await candidateInstaller.installKit(engine, "completion-ledger-kit");
assert.equal(candidate.installed, true);
assert.equal(engine.n.completionLedger.complete("installer-smoke").ok, true);

const unresolved = await installer.installDomain(engine, "input");
assert.equal(unresolved.report.ok, true);
assert.equal(unresolved.report.installed.length, 0);
assert.equal(unresolved.report.plan.skipped.filter((issue) => issue.type === "status-not-allowed").length, 4);

const all = createAllNexusEngineKits();
assert.equal(listKitIds().length, 150);
assert.equal(all.some((kit) => kit.id === "generic-resource-loop-kit"), false);
assert.equal(all.some((kit) => kit.id === "fishing"), true);
assert.equal(all.some((kit) => kit.id === "mcp-domain-kit"), false);

console.log("installer smoke ok", { installed: engine.kits.length, catalog: listKitIds().length, defaultReady: all.length });
