import assert from "node:assert/strict";
import {
  createCoreObjectKit,
  createRealtimeGame
} from "nexusengine";
import { createProceduralObjectsDomainKits } from "../../domains/procedural-objects/index.js";
import { createProceduralCreatureBodyKit } from "../../kits/procedural-creatures/procedural-creature-body-kit/index.js";
import { createSeedKit } from "../../kits/foundation/seed-kit/index.js";

const engine = createRealtimeGame({
  kits: [
    createCoreObjectKit(),
    createSeedKit({ seed: "procedural-object-domain-smoke" }),
    ...createProceduralObjectsDomainKits(),
    createProceduralCreatureBodyKit()
  ]
});

const body = engine.n.proceduralObjectBody.create({
  id: "rock-1",
  objectType: "procedural-rock",
  bounds: { min: [-1, 0, -1], max: [1, 2, 1] },
  geometry: {
    provider: "rock-domain",
    descriptorId: "rock-1:geometry"
  },
  parts: [{ id: "rock-body", kind: "rock-body" }],
  recipe: { profile: "rounded-boulder" }
});

assert.equal(body.object.schema, "nexus-object-descriptor/1");
engine.n.coreObject.register(body.object);
assert.equal(engine.n.coreObject.get("rock-1").objectType, "procedural-rock");

const material = engine.n.proceduralObjectMaterial.create({
  objectId: "rock-1",
  family: "pbr-rock",
  palette: { base: "#666666" }
});
assert.equal(material.objectId, "rock-1");

const lod = engine.n.proceduralObjectLod.create({
  objectId: "rock-1",
  sources: [
    { level: 0, descriptorId: "rock-1:mesh:0", triangleBudget: 12000 },
    { level: 1, descriptorId: "rock-1:mesh:1", triangleBudget: 3000 },
    { level: 2, descriptorId: "rock-1:impostor", triangleBudget: 2, type: "impostor" }
  ],
  distances: [24, 60],
  captureSourceLevel: 0
});
assert.equal(engine.n.proceduralObjectLod.select("rock-1", 70).level, 2);

const capture = engine.n.proceduralObjectCaptureProfile.create({
  objectId: "rock-1",
  pivot: body.object.pivot,
  groundAnchor: body.object.groundAnchor
});
assert.equal(capture.framing.mode, "per-view-projected-bounds");
assert.equal(capture.views.azimuthCount, 8);

const creature = engine.n.proceduralCreatureBody.create({
  id: "raptor-object-contract",
  archetype: "theropod"
});
assert.equal(creature.objectDescriptor.schema, "nexus-object-descriptor/1");
assert.equal(creature.objectDescriptor.objectType, "procedural-creature");
assert.equal(
  engine.n.proceduralCreatureBody.getObjectDescriptor("raptor-object-contract").contentHash,
  creature.objectDescriptor.contentHash
);

console.log("procedural objects domain smoke passed");
