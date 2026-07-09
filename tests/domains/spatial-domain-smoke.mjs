import assert from "node:assert/strict";
import { createNexusEngineKitInstaller } from "../../installer/index.js";

const engine = {
  kits: [],
  n: {},
  tickCount: 3,
  installKit(kit) {
    this.kits.push(kit);
    kit.initWorld?.({ engine: this, world: {}, kit, options: {} });
    return kit;
  }
};

const installer = createNexusEngineKitInstaller();
const report = await installer.installDomain(engine, "spatial");

assert.equal(report.domainId, "spatial");
assert.equal(report.results.length, 5);
assert.equal(engine.kits.some((kit) => kit.id === "completion-ledger-kit"), true);
assert.equal(typeof engine.n.completionLedger.complete, "function");
assert.equal(engine.n.completionLedger.complete("spatial-domain-smoke").ok, true);
assert.equal(engine.n.completionLedger.has("spatial-domain-smoke"), true);

const duplicateIds = engine.kits
  .map((kit) => kit.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
assert.deepEqual(duplicateIds, []);

console.log("spatial domain smoke ok", { kits: engine.kits.length });
