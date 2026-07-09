import assert from "node:assert/strict";
import {
  createNexusRealtimeKitInstaller,
  createAllNexusRealtimeKits,
  listKitIds
} from "../../installer/index.js";

const engine = {
  kits: [],
  n: {},
  tickCount: 1,
  installKit(kit) {
    this.kits.push(kit);
    kit.initWorld?.({ engine: this, world: {}, kit, options: {} });
    return kit;
  }
};

const installer = createNexusRealtimeKitInstaller();
const one = await installer.installKit(engine, "completion-ledger-kit");
assert.equal(one.installed, true);
assert.equal(engine.kits[0].id, "completion-ledger-kit");
assert.equal(engine.kits[0].metadata.realBehavior, true);
assert.equal(typeof engine.n.completionLedger.complete, "function");
assert.equal(engine.n.completionLedger.complete("installer-smoke").ok, true);
assert.equal(engine.n.completionLedger.has("installer-smoke"), true);

const duplicate = await installer.installKit(engine, "completion-ledger-kit");
assert.equal(duplicate.installed, false);
assert.equal(duplicate.duplicate, true);

const domain = await installer.installDomain(engine, "input");
assert.equal(domain.domainId, "input");
assert.ok(domain.results.length >= 1);

const all = createAllNexusRealtimeKits();
assert.equal(all.length, listKitIds().length);

console.log("installer smoke ok", { kits: engine.kits.length, catalog: all.length });
