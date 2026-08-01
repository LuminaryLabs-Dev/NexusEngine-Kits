import assert from "node:assert/strict";
import { createEngine } from "nexusengine";
import { createNexusEngineKitInstaller } from "../../installer/index.js";

const installer = createNexusEngineKitInstaller({ allowStatuses: ["official", "candidate"] });
const engine = createEngine();
const report = await installer.installDomain(engine, "spatial");

assert.equal(report.domainId, "spatial");
assert.equal(report.results.length, 7);
assert.equal(report.results.filter((result) => result.installed).length, 3);
assert.equal(report.results.filter((result) => result.skipped).length, 4);
assert.deepEqual(report.report.plan.installOrder, [
  "gameplay-interaction-kit",
  "interaction-target-kit",
  "spatial-room-kit"
]);
assert.equal(engine.kits.some((kit) => kit.id === "completion-ledger-kit"), false);

const duplicateIds = engine.kits
  .map((kit) => kit.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
assert.deepEqual(duplicateIds, []);

console.log("spatial domain smoke ok", { kits: engine.kits.length });
