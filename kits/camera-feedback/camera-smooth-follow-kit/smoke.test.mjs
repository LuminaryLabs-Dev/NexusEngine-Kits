import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCameraSmoothFollowKit } from "./index.js";

const engine = createRealtimeGame({ kits: [createCameraSmoothFollowKit()] });
const service = engine.n.cameraSmoothFollow;
const controller = service.create({
  id: "test-camera",
  positionSmoothTime: 0.22,
  lookSmoothTime: 0.14,
  rotationSharpness: 12,
  maximumDeltaTime: 1 / 30,
  teleportThreshold: 20
});

let transform = controller.reset({
  position: [0, 2, -6],
  lookPoint: [0, 1, 4],
  reason: "smoke"
});
assert.equal(transform.reset, true);
assert.deepEqual(transform.position, [0, 2, -6]);
assert.equal(Math.hypot(...transform.quaternion).toFixed(6), "1.000000");

transform = controller.update({
  targetPosition: [10, 2, -6],
  targetLookPoint: [10, 1, 4],
  deltaTime: 1 / 60
});
assert.equal(transform.reset, false);
assert.ok(transform.position[0] > 0 && transform.position[0] < 10, "position must damp instead of snapping");
assert.ok(transform.lookPoint[0] > 0 && transform.lookPoint[0] < 10, "look point must damp instead of snapping");

for (let index = 0; index < 180; index += 1) {
  transform = controller.update({
    targetPosition: [10, 2, -6],
    targetLookPoint: [10, 1, 4],
    deltaTime: 1 / 60
  });
}
assert.ok(Math.abs(transform.position[0] - 10) < 0.01);
assert.ok(Math.abs(transform.lookPoint[0] - 10) < 0.01);
assert.ok(Math.abs(Math.hypot(...transform.quaternion) - 1) < 1e-6);

transform = controller.update({
  targetPosition: [11, 2, -6],
  targetLookPoint: [11, 1, 4],
  deltaTime: 1
});
assert.equal(transform.deltaTime, 1 / 30, "camera timestep must be capped");

transform = controller.update({
  targetPosition: [100, 2, -6],
  targetLookPoint: [100, 1, 4],
  deltaTime: 1 / 60
});
assert.equal(transform.reset, true, "teleport threshold must reset");
assert.deepEqual(transform.positionVelocity, [0, 0, 0]);
assert.deepEqual(transform.lookVelocity, [0, 0, 0]);

const snapshot = service.getSnapshot();
const restoredEngine = createRealtimeGame({ kits: [createCameraSmoothFollowKit()] });
restoredEngine.n.cameraSmoothFollow.loadSnapshot(snapshot);
const restored = restoredEngine.n.cameraSmoothFollow.get("test-camera").getSnapshot();
assert.deepEqual(restored.state.position, controller.getSnapshot().state.position);
assert.deepEqual(restored.state.quaternion, controller.getSnapshot().state.quaternion);

console.log("camera smooth follow smoke passed", restored.state);
