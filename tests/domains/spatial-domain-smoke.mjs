import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createNexusEngineKitInstaller } from "../../installer/index.js";

function createEngine() {
  return {
    kits: [],
    n: {},
    tickCount: 3,
    installKit(kit) {
      this.kits.push(kit);
      kit.initWorld?.({ engine: this, world: {}, kit, options: {} });
      return kit;
    }
  };
}

const installer = createNexusEngineKitInstaller({ allowStatuses: ["official", "candidate"] });
const engine = createEngine();
const report = await installer.installDomain(engine, "spatial");

assert.equal(report.domainId, "spatial");
assert.equal(report.results.length, 5);
assert.equal(report.results.filter((result) => result.installed).length, 1);
assert.equal(report.results.filter((result) => result.skipped).length, 4);
assert.equal(engine.kits.some((kit) => kit.id === "completion-ledger-kit"), true);
assert.equal(typeof engine.n.completionLedger.complete, "function");
assert.equal(engine.n.completionLedger.complete("spatial-domain-smoke").ok, true);
assert.equal(engine.n.completionLedger.has("spatial-domain-smoke"), true);

const placementEngine = createRealtimeGame();
const placementInstall = await installer.installKit(placementEngine, "object-placement-contract-kit");
assert.equal(placementInstall.installed, true);
assert.equal(placementEngine.kits.some((kit) => kit.id === "object-placement-contract-kit"), true);

const bridge = placementEngine.n.objectPlacement.create({
  objectId: "bridge",
  localBounds: { min: [-2, 0, -0.5], max: [2, 1, 0.5] },
  anchors: [
    { id: "west", position: [-2, 0.5, 0], normal: [-1, 0, 0] },
    { id: "east", position: [2, 0.5, 0], normal: [1, 0, 0] }
  ],
  transform: { position: [3, 4, 5] }
});
const groundedBridge = placementEngine.n.objectPlacement.ground(bridge, {
  point: [0, 0, 0],
  normal: [0, 1, 0]
});
const support = placementEngine.n.objectPlacement.worldAnchor(groundedBridge, groundedBridge.supportAnchorId);
assert.ok(Math.abs(support.position[1]) < 1e-9);
assert.equal(placementEngine.n.objectPlacement.validate(groundedBridge, {
  contactPlane: { point: [0, 0, 0], normal: [0, 1, 0] }
}).valid, true);

const target = placementEngine.n.objectPlacement.create({
  objectId: "abutment",
  localBounds: { min: [-1, 0, -1], max: [1, 2, 1] },
  anchors: [{ id: "socket", position: [1, 1, 0], normal: [1, 0, 0] }]
});
const alignedBridge = placementEngine.n.objectPlacement.align(
  groundedBridge,
  target,
  { sourceAnchorId: "west", targetAnchorId: "socket" }
);
const alignedSource = placementEngine.n.objectPlacement.worldAnchor(alignedBridge, "west");
const alignedTarget = placementEngine.n.objectPlacement.worldAnchor(target, "socket");
assert.deepEqual(
  alignedSource.position.map((value) => Math.round(value * 1e9) / 1e9),
  alignedTarget.position.map((value) => Math.round(value * 1e9) / 1e9)
);

const fittedBridge = placementEngine.n.objectPlacement.fit(bridge, {
  min: [-1, 0, -1],
  max: [1, 1, 1]
});
assert.equal(placementEngine.n.objectPlacement.validate(fittedBridge, {
  containerBounds: { min: [-1, 0, -1], max: [1, 1, 1] }
}).valid, true);

const duplicateIds = engine.kits
  .map((kit) => kit.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
assert.deepEqual(duplicateIds, []);

console.log("spatial domain smoke ok", { kits: engine.kits.length });
