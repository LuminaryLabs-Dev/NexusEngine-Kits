import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import {
  createNexusEngineKitInstaller,
  createAllNexusEngineKits,
  listKitIds
} from "../../installer/index.js";

const engine = createRealtimeGame({ kits: [createCoreSimulationKit()] });
const installer = createNexusEngineKitInstaller();
const one = await installer.installKit(engine, "generic-resource-loop-kit", {
  resources: [{ id: "energy", max: 10, initial: 8 }]
});
assert.equal(one.installed, true);
assert.equal(one.skipped, false);
assert.equal(engine.kits.some((kit) => kit.id === "generic-resource-loop-kit"), true);
assert.equal(typeof engine.n.resourceMeter.spend, "function");
assert.equal(engine.n.resourceMeter.spend("energy", 3).value, 5);
assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");

const duplicate = await installer.installKit(engine, "generic-resource-loop-kit");
assert.equal(duplicate.installed, false);
assert.equal(duplicate.duplicate, true);

const candidateBlocked = await installer.installKit(engine, "completion-ledger-kit");
assert.equal(candidateBlocked.installed, false);
assert.equal(candidateBlocked.skipped, true);
assert.equal(candidateBlocked.reason, "status-not-allowed");

const candidateInstaller = createNexusEngineKitInstaller({ allowStatuses: ["official", "candidate"] });
const candidate = await candidateInstaller.installKit(engine, "completion-ledger-kit");
assert.equal(candidate.installed, true);
assert.equal(engine.n.completionLedger.complete("installer-smoke").ok, true);

const domain = await installer.installDomain(engine, "input");
assert.equal(domain.domainId, "input");
assert.equal(domain.results.length, 4);
assert.ok(domain.results.every((result) => result.skipped && result.reason === "status-not-allowed"));

const all = createAllNexusEngineKits();
assert.equal(listKitIds().length, 120);
assert.deepEqual(all.map((kit) => kit.id), ["generic-resource-loop-kit"]);

console.log("installer smoke ok", { installed: engine.kits.length, catalog: listKitIds().length, defaultReady: all.length });
