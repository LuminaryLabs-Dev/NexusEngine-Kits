import { defineDomainServiceKit } from "nexusengine";
import {
  SMALL_THEROPOD_PRESET,
  createTheropodPreset
} from "../../../presets/procedural-creatures/theropod.js";

export {
  SMALL_THEROPOD_PRESET,
  createTheropodPreset
} from "../../../presets/procedural-creatures/theropod.js";

export const PROCEDURAL_CREATURE_BODY_KIT_VERSION = "0.1.0";

const clone = (value) => value == null ? value : structuredClone(value);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => {
  const next = finite(value, fallback);
  return next > 0 ? next : fallback;
};
const integer = (value, fallback, min = 1) => Math.max(min, Math.floor(finite(value, fallback)));

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashText(value) {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeColor(value, fallback) {
  const raw = typeof value === "number" ? `#${value.toString(16).padStart(6, "0")}` : String(value ?? fallback);
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : fallback;
}

function colorToRgb(value) {
  const hex = normalizeColor(value, "#ffffff").slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255
  ];
}

function mixColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function normalize(vector, fallback = [0, 1, 0]) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < 1e-8) return [...fallback];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function normalizeRecipe(input = {}, seedFallback = "procedural-creature") {
  const preset = createTheropodPreset(input.preset ?? input);
  const topology = preset.topology ?? {};
  const proportions = preset.proportions ?? {};
  const material = preset.material ?? {};
  const animation = preset.animation ?? {};
  const collision = preset.collision ?? {};
  const id = String(input.id ?? preset.instanceId ?? preset.id ?? "procedural-creature");
  return {
    id,
    seed: String(input.seed ?? preset.seed ?? `${seedFallback}:${id}`),
    archetype: String(input.archetype ?? preset.archetype ?? "theropod"),
    topology: {
      radialSegments: integer(topology.radialSegments, 10, 6),
      tailSegments: integer(topology.tailSegments, 7, 3),
      triangulated: true,
      surfaceMode: topology.surfaceMode ?? "joined-descriptor-parts"
    },
    proportions: {
      bodyLength: positive(proportions.bodyLength, 1.42),
      hipHeight: positive(proportions.hipHeight, 0.68),
      chestHeight: positive(proportions.chestHeight, 0.86),
      headHeight: positive(proportions.headHeight, 1.06),
      headForward: positive(proportions.headForward, 1.02),
      tailLength: positive(proportions.tailLength, 1.8),
      legLength: positive(proportions.legLength, 0.78),
      armLength: positive(proportions.armLength, 0.44),
      bodyScale: positive(proportions.bodyScale, 0.82)
    },
    material: {
      skin: normalizeColor(material.skin, "#78ad52"),
      underbelly: normalizeColor(material.underbelly, "#b8a15d"),
      roughness: Math.max(0, Math.min(1, finite(material.roughness, 0.8))),
      metalness: Math.max(0, Math.min(1, finite(material.metalness, 0)))
    },
    animation: {
      strideSwing: finite(animation.strideSwing, 0.86),
      hipBob: finite(animation.hipBob, 0.075),
      tailFollow: finite(animation.tailFollow, 0.1),
      headCounter: finite(animation.headCounter, 0.08),
      turnLean: finite(animation.turnLean, 0.1)
    },
    collision: {
      shape: collision.shape ?? "capsule",
      radius: positive(collision.radius, 0.32),
      halfHeight: positive(collision.halfHeight, 0.42),
      centerY: finite(collision.centerY, 0.62)
    },
    metadata: clone(input.metadata ?? preset.metadata ?? {})
  };
}

function createSkeleton(recipe) {
  const bones = [];
  const add = (id, parentId, position) => {
    bones.push({ id, parentId, position: [...position], rotation: [0, 0, 0, 1] });
    return id;
  };

  add("root", null, [0, 0, 0]);
  add("pelvis", "root", [0, 0.66, -0.2]);
  add("chest", "pelvis", [0, 0.18, 0.5]);
  add("neck", "chest", [0, 0.14, 0.38]);
  add("head", "neck", [0, 0.08, 0.36]);

  let tailParent = "pelvis";
  for (let index = 0; index < recipe.topology.tailSegments; index += 1) {
    const id = `tail-${index}`;
    add(id, tailParent, [0, -0.035, -recipe.proportions.tailLength / recipe.topology.tailSegments]);
    tailParent = id;
  }

  for (const side of [-1, 1]) {
    const suffix = side < 0 ? "L" : "R";
    add(`thigh-${suffix}`, "pelvis", [side * 0.28, -0.08, 0.02]);
    add(`shin-${suffix}`, `thigh-${suffix}`, [side * 0.035, -recipe.proportions.legLength * 0.5, 0.1]);
    add(`foot-${suffix}`, `shin-${suffix}`, [-side * 0.015, -recipe.proportions.legLength * 0.36, 0.22]);
    add(`upperArm-${suffix}`, "chest", [side * 0.27, 0.02, 0.24]);
    add(`foreArm-${suffix}`, `upperArm-${suffix}`, [side * 0.07, -recipe.proportions.armLength * 0.46, 0.18]);
  }

  return {
    rootBoneId: "root",
    bones,
    boneIndex: Object.fromEntries(bones.map((bone, index) => [bone.id, index]))
  };
}

function appendTube(target, stations, radialSegments, colors) {
  const base = target.positions.length / 3;
  for (let stationIndex = 0; stationIndex < stations.length; stationIndex += 1) {
    const station = stations[stationIndex];
    const previous = stations[Math.max(0, stationIndex - 1)];
    const next = stations[Math.min(stations.length - 1, stationIndex + 1)];
    const tangent = normalize(subtract([next.x, next.y, next.z], [previous.x, previous.y, previous.z]), [0, 0, 1]);
    const up = Math.abs(tangent[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0];
    const right = normalize(cross(up, tangent), [1, 0, 0]);
    const binormal = normalize(cross(tangent, right), [0, 1, 0]);
    const radiusX = positive(station.rx ?? station.radius, 0.01);
    const radiusY = positive(station.ry ?? station.radius, 0.01);

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const angle = radialIndex / radialSegments * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const offset = [
        right[0] * cosine * radiusX + binormal[0] * sine * radiusY,
        right[1] * cosine * radiusX + binormal[1] * sine * radiusY,
        right[2] * cosine * radiusX + binormal[2] * sine * radiusY
      ];
      target.positions.push(station.x + offset[0], station.y + offset[1], station.z + offset[2]);
      target.normals.push(...normalize(offset, [0, 1, 0]));
      const underside = Math.max(0, -offset[1] / Math.max(radiusY, 0.001));
      target.colors.push(...mixColor(colors.skin, colors.underbelly, underside * finite(station.belly, 0.55)));
      target.skinIndices.push(station.boneA, station.boneB ?? station.boneA, 0, 0);
      const weightB = Math.max(0, Math.min(1, finite(station.weightB, 0)));
      target.skinWeights.push(1 - weightB, weightB, 0, 0);
    }
  }

  for (let stationIndex = 0; stationIndex < stations.length - 1; stationIndex += 1) {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const a = base + stationIndex * radialSegments + radialIndex;
      const b = base + stationIndex * radialSegments + (radialIndex + 1) % radialSegments;
      const c = base + (stationIndex + 1) * radialSegments + radialIndex;
      const d = base + (stationIndex + 1) * radialSegments + (radialIndex + 1) % radialSegments;
      target.indices.push(a, b, c, b, d, c);
    }
  }
}

function createTheropodDescriptor(recipe) {
  const skeleton = createSkeleton(recipe);
  const bone = skeleton.boneIndex;
  const target = { positions: [], normals: [], colors: [], skinIndices: [], skinWeights: [], indices: [] };
  const colors = { skin: colorToRgb(recipe.material.skin), underbelly: colorToRgb(recipe.material.underbelly) };
  const radial = recipe.topology.radialSegments;
  const bodyLengthScale = recipe.proportions.bodyLength / 1.42;
  const heightScale = recipe.proportions.hipHeight / 0.68;
  const headForwardScale = recipe.proportions.headForward / 1.02;

  appendTube(target, [
    { x: 0, y: 0.64 * heightScale, z: -0.55 * bodyLengthScale, rx: 0.22, ry: 0.2, boneA: bone.pelvis },
    { x: 0, y: 0.7 * heightScale, z: -0.34 * bodyLengthScale, rx: 0.39, ry: 0.31, boneA: bone.pelvis },
    { x: 0, y: 0.76 * heightScale, z: -0.08 * bodyLengthScale, rx: 0.45, ry: 0.34, boneA: bone.pelvis, boneB: bone.chest, weightB: 0.2 },
    { x: 0, y: 0.82 * heightScale, z: 0.2 * bodyLengthScale, rx: 0.4, ry: 0.31, boneA: bone.pelvis, boneB: bone.chest, weightB: 0.62 },
    { x: 0, y: 0.88 * heightScale, z: 0.43 * bodyLengthScale, rx: 0.31, ry: 0.27, boneA: bone.chest },
    { x: 0, y: 0.94 * heightScale, z: 0.62 * bodyLengthScale, rx: 0.22, ry: 0.22, boneA: bone.chest, boneB: bone.neck, weightB: 0.35 },
    { x: 0, y: 1.0 * heightScale, z: 0.78 * bodyLengthScale, rx: 0.16, ry: 0.17, boneA: bone.neck },
    { x: 0, y: 1.04 * heightScale, z: 0.9 * headForwardScale, rx: 0.18, ry: 0.17, boneA: bone.neck, boneB: bone.head, weightB: 0.45 },
    { x: 0, y: 1.08 * heightScale, z: 1.06 * headForwardScale, rx: 0.29, ry: 0.23, boneA: bone.head },
    { x: 0, y: 1.06 * heightScale, z: 1.27 * headForwardScale, rx: 0.23, ry: 0.18, boneA: bone.head },
    { x: 0, y: 1.03 * heightScale, z: 1.49 * headForwardScale, rx: 0.16, ry: 0.12, boneA: bone.head },
    { x: 0, y: 1.01 * heightScale, z: 1.62 * headForwardScale, rx: 0.09, ry: 0.075, boneA: bone.head }
  ], radial, colors);

  const tailStations = [];
  for (let index = 0; index <= recipe.topology.tailSegments; index += 1) {
    const t = index / recipe.topology.tailSegments;
    tailStations.push({
      x: 0,
      y: 0.66 * heightScale - t * 0.22,
      z: -0.5 * bodyLengthScale - t * recipe.proportions.tailLength,
      radius: 0.23 * (1 - t) + 0.025,
      boneA: index === 0 ? bone.pelvis : bone[`tail-${Math.min(recipe.topology.tailSegments - 1, index - 1)}`],
      boneB: index >= recipe.topology.tailSegments ? bone[`tail-${recipe.topology.tailSegments - 1}`] : bone[`tail-${index}`],
      weightB: index === 0 ? 0 : 0.55
    });
  }
  appendTube(target, tailStations, Math.max(6, radial - 2), colors);

  const legScale = recipe.proportions.legLength / 0.78;
  const armScale = recipe.proportions.armLength / 0.44;
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? "L" : "R";
    appendTube(target, [
      { x: side * 0.27, y: 0.7 * heightScale, z: -0.05, radius: 0.15, boneA: bone.pelvis, boneB: bone[`thigh-${suffix}`], weightB: 0.4 },
      { x: side * 0.32, y: 0.43 * legScale, z: 0.04, radius: 0.13, boneA: bone[`thigh-${suffix}`] },
      { x: side * 0.33, y: 0.18 * legScale, z: 0.11, radius: 0.09, boneA: bone[`thigh-${suffix}`], boneB: bone[`shin-${suffix}`], weightB: 0.55 },
      { x: side * 0.3, y: -0.02 * legScale, z: 0.21, radius: 0.065, boneA: bone[`shin-${suffix}`] },
      { x: side * 0.29, y: -0.13 * legScale, z: 0.42, rx: 0.085, ry: 0.045, boneA: bone[`shin-${suffix}`], boneB: bone[`foot-${suffix}`], weightB: 0.7 },
      { x: side * 0.29, y: -0.14 * legScale, z: 0.65, rx: 0.07, ry: 0.035, boneA: bone[`foot-${suffix}`] }
    ], Math.max(6, radial - 2), colors);

    appendTube(target, [
      { x: side * 0.24, y: 0.9 * heightScale, z: 0.42, radius: 0.07, boneA: bone.chest, boneB: bone[`upperArm-${suffix}`], weightB: 0.5 },
      { x: side * 0.34, y: 0.72 * armScale, z: 0.58, radius: 0.055, boneA: bone[`upperArm-${suffix}`] },
      { x: side * 0.38, y: 0.58 * armScale, z: 0.75, radius: 0.038, boneA: bone[`upperArm-${suffix}`], boneB: bone[`foreArm-${suffix}`], weightB: 0.6 },
      { x: side * 0.4, y: 0.51 * armScale, z: 0.9, radius: 0.025, boneA: bone[`foreArm-${suffix}`] }
    ], Math.max(6, radial - 3), colors);
  }

  const scale = recipe.proportions.bodyScale;
  const descriptor = {
    id: recipe.id,
    kind: "procedural-creature-body",
    version: PROCEDURAL_CREATURE_BODY_KIT_VERSION,
    archetype: recipe.archetype,
    recipe: clone(recipe),
    transform: { scale: [scale, scale, scale] },
    geometry: {
      primitive: "triangles",
      positions: target.positions,
      normals: target.normals,
      colors: target.colors,
      indices: target.indices,
      skinIndices: target.skinIndices,
      skinWeights: target.skinWeights
    },
    skeleton,
    material: {
      type: "pbr-skin",
      vertexColors: true,
      roughness: recipe.material.roughness,
      metalness: recipe.material.metalness,
      regions: [
        { id: "skin", color: recipe.material.skin },
        { id: "underbelly", color: recipe.material.underbelly }
      ]
    },
    attachments: {
      eyes: [
        { id: "eye-L", boneId: "head", position: [-0.13, 0.08, 0.31] },
        { id: "eye-R", boneId: "head", position: [0.13, 0.08, 0.31] }
      ],
      jaw: { id: "jaw", boneId: "head", position: [0, -0.09, 0.36] },
      tailTip: { id: "tail-tip", boneId: `tail-${recipe.topology.tailSegments - 1}`, position: [0, 0, -0.25] },
      feet: [
        { id: "foot-L", boneId: "foot-L", position: [0, 0, 0.23] },
        { id: "foot-R", boneId: "foot-R", position: [0, 0, 0.23] }
      ]
    },
    collision: {
      ...clone(recipe.collision),
      radius: recipe.collision.radius * scale,
      halfHeight: recipe.collision.halfHeight * scale,
      centerY: recipe.collision.centerY * scale
    },
    animationChannels: {
      root: ["translation", "rotation"],
      pelvis: ["translation", "rotation"],
      chest: ["rotation"],
      head: ["rotation"],
      limbs: ["rotation"],
      tail: ["rotation"]
    },
    bounds: {
      min: [-0.52 * scale, -0.16 * scale, (-0.5 - recipe.proportions.tailLength) * scale],
      max: [0.52 * scale, 1.32 * scale, 1.66 * headForwardScale * scale]
    },
    topology: {
      vertices: target.positions.length / 3,
      triangles: target.indices.length / 3,
      bones: skeleton.bones.length,
      connectedParts: 6,
      watertight: false
    }
  };
  descriptor.contentHash = hashText(stableStringify({ recipe, topology: descriptor.topology }));
  return descriptor;
}

function createPoseDescriptor(descriptor, state = {}) {
  const recipe = descriptor.recipe;
  const speed = Math.max(0, finite(state.speed, 0));
  const time = finite(state.time, 0);
  const turn = Math.max(-1, Math.min(1, finite(state.turn, 0)));
  const jump = Math.max(0, Math.min(1, finite(state.jump, 0)));
  const resistance = Math.max(0, Math.min(1, finite(state.resistance, 0)));
  const stride = Math.sin(time * Math.max(8, speed * 0.9));
  const bones = {};
  bones.pelvis = {
    position: [0, 0.66 + Math.abs(stride) * recipe.animation.hipBob + jump * 0.08, -0.2],
    rotationEuler: [0, 0, -turn * recipe.animation.turnLean]
  };
  bones.chest = { rotationEuler: [0, 0, -turn * recipe.animation.turnLean * 0.55] };
  bones.head = { rotationEuler: [resistance * recipe.animation.headCounter - Math.abs(stride) * 0.025, -turn * 0.14, 0] };
  bones["thigh-L"] = { rotationEuler: [stride * recipe.animation.strideSwing, 0, 0] };
  bones["thigh-R"] = { rotationEuler: [-stride * recipe.animation.strideSwing, 0, 0] };
  bones["shin-L"] = { rotationEuler: [Math.max(0, -stride) * 0.55, 0, 0] };
  bones["shin-R"] = { rotationEuler: [Math.max(0, stride) * 0.55, 0, 0] };
  bones["upperArm-L"] = { rotationEuler: [-stride * 0.28 - 0.18, 0, 0] };
  bones["upperArm-R"] = { rotationEuler: [stride * 0.28 - 0.18, 0, 0] };
  for (let index = 0; index < recipe.topology.tailSegments; index += 1) {
    const k = index / Math.max(1, recipe.topology.tailSegments - 1);
    bones[`tail-${index}`] = {
      rotationEuler: [
        Math.sin(time * 4.6 - index * 0.35) * 0.025,
        -turn * (0.18 + k * 0.38) + Math.sin(time * 3.4 - index * 0.5) * (recipe.animation.tailFollow + k * 0.035),
        0
      ]
    };
  }
  return {
    id: `${descriptor.id}:pose`,
    creatureId: descriptor.id,
    kind: "procedural-creature-pose",
    state: { speed, time, turn, jump, resistance, stride },
    bones
  };
}

function createApi(config, seedApi) {
  const initialRecipes = Array.isArray(config.creatures) ? config.creatures.map(clone) : [];
  const records = new Map();
  const worldSeed = () => String(config.seed ?? seedApi?.getWorldSeed?.() ?? "procedural-creatures");

  function create(options = {}) {
    const recipe = normalizeRecipe(options, worldSeed());
    if (recipe.archetype !== "theropod") {
      throw new RangeError(`Unsupported procedural creature archetype: ${recipe.archetype}`);
    }
    const descriptor = createTheropodDescriptor(recipe);
    records.set(recipe.id, { recipe, descriptor });
    return clone(descriptor);
  }

  function requireRecord(id) {
    const key = String(id ?? "");
    const record = records.get(key);
    if (!record) throw new RangeError(`Unknown procedural creature body: ${key}`);
    return record;
  }

  function getSnapshot() {
    return {
      version: PROCEDURAL_CREATURE_BODY_KIT_VERSION,
      status: "ready",
      records: [...records.values()]
        .sort((left, right) => left.recipe.id.localeCompare(right.recipe.id))
        .map(({ recipe, descriptor }) => ({
          recipe: clone(recipe),
          contentHash: descriptor.contentHash,
          topology: clone(descriptor.topology)
        }))
    };
  }

  function reset() {
    records.clear();
    for (const recipe of initialRecipes) create(recipe);
    return getSnapshot();
  }

  function loadSnapshot(snapshot = {}) {
    if (snapshot.version !== PROCEDURAL_CREATURE_BODY_KIT_VERSION || snapshot.status !== "ready") {
      throw new TypeError("Unsupported procedural creature body snapshot.");
    }
    records.clear();
    for (const record of snapshot.records ?? []) {
      const descriptor = create(record.recipe);
      if (record.contentHash && descriptor.contentHash !== record.contentHash) {
        throw new Error(`Procedural creature body hash mismatch for ${record.recipe?.id}.`);
      }
    }
    return getSnapshot();
  }

  const api = {
    create,
    has(id) { return records.has(String(id)); },
    get(id) { return clone(requireRecord(id).descriptor); },
    getRecipe(id) { return clone(requireRecord(id).recipe); },
    list() { return [...records.values()].map(({ descriptor }) => clone(descriptor)); },
    remove(id) { return records.delete(String(id)); },
    createPose(id, state = {}) { return createPoseDescriptor(requireRecord(id).descriptor, state); },
    getSnapshot,
    getState: getSnapshot,
    loadSnapshot,
    reset
  };
  reset();
  return Object.freeze(api);
}

export function createProceduralCreatureBodyKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "procedural-creature-body-kit",
    domain: "procedural-creature-body",
    domainPath: "n:procedural-creatures:body",
    parentDomainPath: "n:procedural-creatures",
    apiName: config.apiName ?? "proceduralCreatureBody",
    stability: config.stability ?? "candidate",
    version: PROCEDURAL_CREATURE_BODY_KIT_VERSION,
    services: ["body-recipe", "topology", "skeleton", "skinning", "attachments", "collision-shape", "pose-descriptor"],
    requires: config.requires ?? ["random:stream"],
    provides: [
      "creature:body-descriptor",
      "creature:skeleton-descriptor",
      "creature:skinning-descriptor",
      "creature:attachment-descriptor",
      "creature:collision-shape-descriptor"
    ],
    createApi({ engine }) {
      return createApi(config, engine.n?.seedStream);
    },
    install({ engine }) {
      engine.proceduralCreatureBody = engine.n.proceduralCreatureBody;
    },
    metadata: {
      status: "candidate",
      scope: "renderer-agnostic-procedural-creature-body",
      deterministic: true,
      rendererAgnostic: true,
      owns: ["body recipes", "topology descriptors", "skeleton descriptors", "skinning descriptors", "attachment descriptors", "collision recommendations"],
      doesNotOwn: ["renderer meshes", "GPU buffers", "active locomotion state", "AI", "game rules", "physics resolution"],
      sourcePreset: SMALL_THEROPOD_PRESET.id
    }
  });
}

export default createProceduralCreatureBodyKit;
