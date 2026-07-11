import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createSeedKit } from "../../foundation/seed-kit/index.js";
import { createProceduralCreatureBodyKit } from "./index.js";

const createGame = () => createRealtimeGame({
  kits: [
    createSeedKit({ seed: "procedural-creature-smoke" }),
    createProceduralCreatureBodyKit()
  ]
});

const first = createGame();
const descriptorA = first.n.proceduralCreatureBody.create({ id: "raptor-a", archetype: "theropod" });
assert.equal(descriptorA.kind, "procedural-creature-body");
assert.equal(descriptorA.archetype, "theropod");
assert.ok(descriptorA.geometry.positions.length > 0);
assert.ok(descriptorA.geometry.indices.length > 0);
assert.equal(descriptorA.geometry.skinIndices.length, descriptorA.geometry.skinWeights.length);
assert.ok(descriptorA.skeleton.bones.length > 10);
assert.equal(descriptorA.collision.shape, "capsule");

const pose = first.n.proceduralCreatureBody.createPose("raptor-a", { speed: 18, time: 1.25, turn: 0.4 });
assert.equal(pose.creatureId, "raptor-a");
assert.ok(pose.bones.pelvis);
assert.ok(pose.bones["tail-0"]);

const snapshot = first.n.proceduralCreatureBody.getSnapshot();
const second = createGame();
second.n.proceduralCreatureBody.loadSnapshot(snapshot);
const descriptorB = second.n.proceduralCreatureBody.get("raptor-a");
assert.equal(descriptorB.contentHash, descriptorA.contentHash);
assert.deepEqual(descriptorB.topology, descriptorA.topology);

first.n.proceduralCreatureBody.reset();
assert.equal(first.n.proceduralCreatureBody.list().length, 0);
console.log("procedural creature body smoke passed", {
  vertices: descriptorA.topology.vertices,
  triangles: descriptorA.topology.triangles,
  bones: descriptorA.topology.bones,
  hash: descriptorA.contentHash
});
