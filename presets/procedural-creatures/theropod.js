export const THEROPOD_PRESET_VERSION = "0.1.0";

export const SMALL_THEROPOD_PRESET = Object.freeze({
  id: "small-theropod",
  archetype: "theropod",
  version: THEROPOD_PRESET_VERSION,
  topology: Object.freeze({
    radialSegments: 10,
    tailSegments: 7,
    triangulated: true,
    surfaceMode: "joined-descriptor-parts"
  }),
  proportions: Object.freeze({
    bodyLength: 1.42,
    hipHeight: 0.68,
    chestHeight: 0.86,
    headHeight: 1.06,
    headForward: 1.02,
    tailLength: 1.8,
    legLength: 0.78,
    armLength: 0.44,
    bodyScale: 0.82
  }),
  material: Object.freeze({
    skin: "#78ad52",
    underbelly: "#b8a15d",
    roughness: 0.8,
    metalness: 0
  }),
  animation: Object.freeze({
    strideSwing: 0.86,
    hipBob: 0.075,
    tailFollow: 0.1,
    headCounter: 0.08,
    turnLean: 0.1
  }),
  collision: Object.freeze({
    shape: "capsule",
    radius: 0.32,
    halfHeight: 0.42,
    centerY: 0.62
  })
});

export function createTheropodPreset(overrides = {}) {
  return {
    ...structuredClone(SMALL_THEROPOD_PRESET),
    ...overrides,
    topology: { ...SMALL_THEROPOD_PRESET.topology, ...(overrides.topology ?? {}) },
    proportions: { ...SMALL_THEROPOD_PRESET.proportions, ...(overrides.proportions ?? {}) },
    material: { ...SMALL_THEROPOD_PRESET.material, ...(overrides.material ?? {}) },
    animation: { ...SMALL_THEROPOD_PRESET.animation, ...(overrides.animation ?? {}) },
    collision: { ...SMALL_THEROPOD_PRESET.collision, ...(overrides.collision ?? {}) }
  };
}
