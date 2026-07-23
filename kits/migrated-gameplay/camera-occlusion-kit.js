import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(vector) {
  const length = Math.hypot(number(vector.x), number(vector.y), number(vector.z)) || 1;
  return {
    x: number(vector.x) / length,
    y: number(vector.y) / length,
    z: number(vector.z) / length
  };
}

function pushOutOfSphere(position, sphere) {
  const center = sphere.center ?? sphere.position ?? { x: 0, y: 0, z: 0 };
  const radius = number(sphere.radius, 1);
  const dx = number(position.x) - number(center.x);
  const dy = number(position.y) - number(center.y);
  const dz = number(position.z) - number(center.z);
  const distance = Math.hypot(dx, dy, dz) || 0.001;
  if (distance >= radius) return null;
  const direction = normalize({ x: dx, y: dy + 0.08, z: dz });
  return {
    x: number(center.x) + direction.x * radius,
    y: number(center.y) + direction.y * radius,
    z: number(center.z) + direction.z * radius
  };
}

function terrainLineClearance(camera, lookAt, groundHeightAt, clearance, samples) {
  let intrusion = 0;
  for (let index = 1; index <= samples; index += 1) {
    const t = index / (samples + 1);
    const x = lookAt.x + (camera.x - lookAt.x) * t;
    const y = lookAt.y + (camera.y - lookAt.y) * t;
    const z = lookAt.z + (camera.z - lookAt.z) * t;
    const ground = groundHeightAt(x, z) + clearance;
    intrusion = Math.max(intrusion, ground - y);
  }
  return intrusion;
}

export function createCameraOcclusionKit(options = {}) {
  const resources = {
    CameraOcclusionInput: defineResource("camera-occlusion-input"),
    CameraOcclusionState: defineResource("camera-occlusion-state")
  };

  function occlusionSystem(world) {
    const input = world.getResource(resources.CameraOcclusionInput) ?? {};
    const state = world.getResource(resources.CameraOcclusionState);
    const cameraState = options.cameraStateResource ? world.getResource(options.cameraStateResource) : null;
    if (!state || !cameraState?.position || !cameraState?.lookAt) return;

    const delta = world.__nexusClock?.delta ?? 1 / 60;
    const minGroundClearance = number(input.minGroundClearance, number(options.minGroundClearance, 4.5));
    const lineClearance = number(input.lineClearance, number(options.lineClearance, 2.25));
    const samples = Math.max(2, Math.floor(number(input.samples, number(options.samples, 7))));
    const maxLiftPerSecond = number(input.maxLiftPerSecond, number(options.maxLiftPerSecond, 34));
    const groundHeightAt = input.groundHeightAt ?? options.groundHeightAt ?? (() => -Infinity);
    const obstructions = input.obstructions ?? options.obstructions ?? [];

    const previous = cameraState.position;
    let next = { ...previous };
    const reasons = [];
    let obstructionScore = 0;

    const groundFloor = groundHeightAt(next.x, next.z) + minGroundClearance;
    if (next.y < groundFloor) {
      const lift = Math.min(groundFloor - next.y, maxLiftPerSecond * delta);
      next.y += lift;
      obstructionScore = Math.max(obstructionScore, clamp(lift / Math.max(minGroundClearance, 1), 0, 1));
      reasons.push("terrain-floor");
    }

    const lineIntrusion = terrainLineClearance(next, cameraState.lookAt, groundHeightAt, lineClearance, samples);
    if (lineIntrusion > 0) {
      const lift = Math.min(lineIntrusion, maxLiftPerSecond * delta);
      next.y += lift;
      cameraState.lookAt.y += lift * 0.18;
      obstructionScore = Math.max(obstructionScore, clamp(lineIntrusion / Math.max(lineClearance * 2, 1), 0, 1));
      reasons.push("terrain-line");
    }

    for (const obstruction of obstructions) {
      if (obstruction.type !== "sphere") continue;
      const pushed = pushOutOfSphere(next, obstruction);
      if (!pushed) continue;
      next = {
        x: pushed.x,
        y: Math.max(pushed.y, next.y),
        z: pushed.z
      };
      obstructionScore = Math.max(obstructionScore, 0.7);
      reasons.push(obstruction.id ?? "sphere");
    }

    cameraState.position = next;
    cameraState.occlusionAdjusted = reasons.length > 0;
    cameraState.occlusionScore = obstructionScore;
    state.adjusted = reasons.length > 0;
    state.cameraSafe = next.y >= groundHeightAt(next.x, next.z) + minGroundClearance - 0.05;
    state.lastReasons = reasons;
    state.obstructionScore = obstructionScore;
    state.step += 1;
  }

  return defineRuntimeKit({
    id: options.id ?? "camera-occlusion-kit",
    resources,
    systems: [{ phase: "resolve", name: "CameraOcclusionSystem", system: occlusionSystem }],
    initWorld({ world }) {
      world.setResource(resources.CameraOcclusionInput, {
        lineClearance: options.lineClearance ?? 2.25,
        minGroundClearance: options.minGroundClearance ?? 4.5,
        obstructions: options.obstructions ?? []
      });
      world.setResource(resources.CameraOcclusionState, {
        adjusted: false,
        cameraSafe: true,
        lastReasons: [],
        obstructionScore: 0,
        step: 0
      });
    },
    metadata: {
      cameraSafety: true,
      domain: "camera",
      renderAgnostic: true,
      reusable: true
    }
  });
}
