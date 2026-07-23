import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value) {
  const input = String(value ?? "");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random01(seed) {
  return (hashString(seed) % 100000) / 100000;
}

function distanceToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lengthSq, 0, 1);
  const x = ax + dx * t;
  const z = az + dz * t;
  return Math.hypot(px - x, pz - z);
}

function distanceToRoute(route, x, z) {
  if (!Array.isArray(route) || route.length < 2) return Infinity;
  let distance = Infinity;
  for (let index = 0; index < route.length - 1; index += 1) {
    const a = route[index];
    const b = route[index + 1];
    distance = Math.min(distance, distanceToSegment(x, z, number(a.x), number(a.z ?? a.y), number(b.x), number(b.z ?? b.y)));
  }
  return distance;
}

function pickKind(seed, routeDistance) {
  const roll = random01(seed);
  if (routeDistance < 10) return roll > 0.75 ? "glow-plant" : "fern";
  if (roll < 0.14) return "fallen-log";
  if (roll < 0.24) return "ruin-shard";
  if (roll < 0.48) return "fern";
  if (roll < 0.62) return "glow-plant";
  return "trunk";
}

function descriptorFor(config, query, chunkId, index, x, z, routeDistance) {
  const seed = `${config.seed}:${chunkId}:${index}`;
  const kind = pickKind(seed, routeDistance);
  const slope = query?.slopeAt ? query.slopeAt(x, z) : 0;
  const y = query?.heightAt ? query.heightAt(x, z) : 0;
  const scaleRoll = random01(`${seed}:scale`);
  const rotationY = random01(`${seed}:rot`) * Math.PI * 2;
  const nearRoute = routeDistance <= number(config.routeAccentWidth, 14);
  const scale = kind === "trunk"
    ? 0.85 + scaleRoll * 0.75
    : kind === "fallen-log"
      ? 0.8 + scaleRoll * 0.45
      : 0.65 + scaleRoll * 0.5;

  return {
    chunkId,
    id: `${chunkId}:${index}:${kind}`,
    kind,
    lod: routeDistance > 60 ? "far" : routeDistance > 28 ? "mid" : "near",
    nearRoute,
    position: { x, y, z },
    radius: kind === "trunk" ? 3.8 * scale : kind === "fallen-log" ? 5.5 * scale : 1.3 * scale,
    rotationY,
    routeDistance,
    scale,
    slope,
    tags: [
      "forest",
      nearRoute ? "route-readable" : "background",
      slope > 0.48 ? "slope-limited" : "walkable-edge"
    ],
    variant: `${kind}-${Math.floor(random01(`${seed}:variant`) * 4)}`
  };
}

function buildDescriptors(config, query, focus) {
  const chunkSize = number(config.chunkSize, 32);
  const activeRadius = Math.max(0, Math.floor(number(config.activeRadius, 2)));
  const centerX = Math.floor(number(focus.x) / chunkSize);
  const centerZ = Math.floor(number(focus.z ?? focus.y) / chunkSize);
  const descriptors = [];
  const route = config.route ?? [];
  const routeSafeWidth = number(config.routeSafeWidth, 7);
  const maxSlope = number(config.maxSlope, 0.58);
  const placementsPerChunk = Math.max(1, Math.floor(number(config.placementsPerChunk, 9)));

  for (let dz = -activeRadius; dz <= activeRadius; dz += 1) {
    for (let dx = -activeRadius; dx <= activeRadius; dx += 1) {
      const cx = centerX + dx;
      const cz = centerZ + dz;
      const chunkId = `${cx},${cz}`;
      for (let index = 0; index < placementsPerChunk; index += 1) {
        const seed = `${config.seed}:${chunkId}:${index}`;
        const x = cx * chunkSize + random01(`${seed}:x`) * chunkSize;
        const z = cz * chunkSize + random01(`${seed}:z`) * chunkSize;
        const routeDistance = distanceToRoute(route, x, z);
        if (routeDistance < routeSafeWidth) continue;
        const slope = query?.slopeAt ? query.slopeAt(x, z) : 0;
        if (slope > maxSlope) continue;
        descriptors.push(descriptorFor(config, query, chunkId, index, x, z, routeDistance));
      }
    }
  }

  descriptors.sort((a, b) => a.id.localeCompare(b.id));
  return descriptors;
}

export function createForestPlacementKit(options = {}) {
  const resources = {
    ForestPlacementInput: defineResource("forest-placement-input"),
    ForestPlacementState: defineResource("forest-placement-state"),
    ForestPlacementSnapshot: defineResource("forest-placement-snapshot")
  };
  const config = {
    activeRadius: options.activeRadius ?? 2,
    chunkSize: options.chunkSize ?? 32,
    maxSlope: options.maxSlope ?? 0.58,
    placementsPerChunk: options.placementsPerChunk ?? 9,
    route: options.route ?? [],
    routeAccentWidth: options.routeAccentWidth ?? 14,
    routeSafeWidth: options.routeSafeWidth ?? 7,
    seed: options.seed ?? options.id ?? "forest-placement"
  };

  function forestPlacementSystem(world) {
    const input = world.getResource(resources.ForestPlacementInput) ?? {};
    const state = world.getResource(resources.ForestPlacementState);
    if (!state) return;

    const focus = input.focus
      ?? (options.focusResource ? world.getResource(options.focusResource) : null)
      ?? { x: 0, z: 0 };
    const query = input.terrainQuery
      ?? (options.terrainQueryResource ? world.getResource(options.terrainQueryResource) : null)
      ?? null;
    const route = input.route ?? config.route;
    const nextConfig = { ...config, ...(input.config ?? {}), route };
    const chunkSize = number(nextConfig.chunkSize, 32);
    const focusChunk = `${Math.floor(number(focus.x) / chunkSize)},${Math.floor(number(focus.z ?? focus.y) / chunkSize)}`;
    const signature = JSON.stringify({
      activeRadius: nextConfig.activeRadius,
      focusChunk,
      placementsPerChunk: nextConfig.placementsPerChunk,
      routeLength: route.length,
      seed: nextConfig.seed
    });

    if (state.signature === signature) return;

    const descriptors = buildDescriptors(nextConfig, query, focus);
    state.descriptors = descriptors;
    state.focus = { x: number(focus.x), z: number(focus.z ?? focus.y) };
    state.signature = signature;
    state.version += 1;
    state.counts = descriptors.reduce((counts, descriptor) => {
      counts[descriptor.kind] = (counts[descriptor.kind] ?? 0) + 1;
      return counts;
    }, {});

    world.setResource(resources.ForestPlacementSnapshot, {
      counts: { ...state.counts },
      descriptors,
      focus: { ...state.focus },
      route: route.map((point) => ({ x: number(point.x), z: number(point.z ?? point.y) })),
      version: state.version
    });
  }

  return defineRuntimeKit({
    id: options.id ?? "forest-placement-kit",
    resources,
    systems: [{ phase: "resolve", name: "ForestPlacementSystem", system: forestPlacementSystem }],
    initWorld({ world }) {
      world.setResource(resources.ForestPlacementInput, {
        config: {},
        focus: options.focus ?? null,
        route: config.route
      });
      world.setResource(resources.ForestPlacementState, {
        counts: {},
        descriptors: [],
        focus: { x: 0, z: 0 },
        signature: "",
        version: 0
      });
      world.setResource(resources.ForestPlacementSnapshot, {
        counts: {},
        descriptors: [],
        focus: { x: 0, z: 0 },
        route: config.route.map((point) => ({ x: number(point.x), z: number(point.z ?? point.y) })),
        version: 0
      });
    },
    metadata: {
      domain: "world-placement",
      renderAgnostic: true,
      reusable: true,
      streaming: true
    }
  });
}
