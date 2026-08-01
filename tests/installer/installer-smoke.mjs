import assert from "node:assert/strict";
import { createEngine } from "nexusengine";
import { createSimulationKit } from "nexusengine/domains/simulation";
import {
  createNexusEngineKitInstaller,
  createAllNexusEngineKits,
  listKitIds
} from "../../installer/index.js";

const engine = createEngine({
  tick: { maxDelta: 1 },
  kits: [createSimulationKit()]
});
const installer = createNexusEngineKitInstaller();
const fishing = await installer.installKit(engine, "fishing-kit");
assert.equal(fishing.installed, true, JSON.stringify(fishing.report?.errors ?? []));
assert.equal(typeof fishing.kit.invokes.setPanel, "function");
assert.equal(typeof engine.n.simulation.getSnapshot, "function");

const duplicate = await installer.installKit(engine, "fishing-kit");
assert.equal(duplicate.installed, false);
assert.equal(duplicate.duplicate, true);

const unresolved = await installer.installDomain(engine, "input");
assert.equal(unresolved.report.ok, true);
assert.equal(unresolved.report.installed.length, 0);
assert.equal(unresolved.report.plan.skipped.filter((issue) => issue.type === "status-not-allowed").length, 3);

const retiredToCore = [
  "action-input-kit",
  "asset-descriptor-kit",
  "capability-graph-domain-kit",
  "completion-ledger-kit",
  "composition-planning-domain-kit",
  "generic-action-window-kit",
  "generic-pressure-loop-kit",
  "generic-resource-loop-kit",
  "kit-registry-domain-kit",
  "persistence-domain-service-kit",
  "persistence-dsk",
  "protokit-core",
  "spatial-scene-graph-dsk",
  "spatial-scene-graph-kit",
  "transform-domain-service-kit"
];
for (const id of retiredToCore) assert.equal(listKitIds().includes(id), false, `${id} must not remain in the external catalog`);

const all = createAllNexusEngineKits();
assert.equal(listKitIds().length, 134);
assert.equal(all.some((kit) => kit.id === "fishing"), true);
assert.equal(listKitIds().includes("mcp-domain-kit"), false);
assert.equal(listKitIds().includes("object-placement-contract-kit"), false);

console.log("installer smoke ok", { installed: engine.kits.length, catalog: listKitIds().length, defaultReady: all.length });
