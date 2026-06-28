import assert from "node:assert/strict";
import { createCompletionLedgerKit } from "./index.js";

const engine = { n: {}, tickCount: 7, nexusRealtimeKitInstallReports: [] };
const kit = createCompletionLedgerKit();

assert.equal(kit.id, "completion-ledger-kit");
assert.equal(kit.metadata.domain, "spatial");
assert.equal(kit.metadata.realBehavior, true);

kit.initWorld({ engine, world: {} });
assert.equal(typeof engine.n.completionLedger.complete, "function");

const first = engine.n.completionLedger.complete("door-opened");
assert.equal(first.ok, true);
assert.equal(engine.n.completionLedger.has("door-opened"), true);
assert.equal(engine.n.completionLedger.count("door-opened"), 1);

const duplicate = engine.n.completionLedger.complete("door-opened");
assert.equal(duplicate.ok, false);
assert.equal(duplicate.reason, "already-completed");
assert.equal(engine.n.completionLedger.count("door-opened"), 1);

const repeat = engine.n.completionLedger.complete("coin", { repeatable: true });
assert.equal(repeat.ok, true);
engine.n.completionLedger.complete("coin");
assert.equal(engine.n.completionLedger.count("coin"), 2);

const snapshot = engine.n.completionLedger.snapshot();
assert.equal(snapshot.records.length, 2);

engine.n.completionLedger.reset("door-opened");
assert.equal(engine.n.completionLedger.has("door-opened"), false);

engine.n.completionLedger.loadSnapshot(snapshot);
assert.equal(engine.n.completionLedger.has("door-opened"), true);
assert.equal(engine.n.completionLedger.count("coin"), 2);

kit.reset();
assert.equal(kit.snapshot().records.length, 0);

console.log("completion-ledger-kit behavior smoke ok");
