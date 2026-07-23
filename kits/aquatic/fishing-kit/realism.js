import {
  defineEvent,
  defineResource
} from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, next]) => [key, clone(next)]));
  }
  return value;
}

function mergeDeep(base, override) {
  const output = clone(base);
  for (const [key, value] of Object.entries(override ?? {})) {
    if (value === undefined) continue;
    if (value && typeof value === "object" && !Array.isArray(value) && output[key] && typeof output[key] === "object" && !Array.isArray(output[key])) {
      output[key] = mergeDeep(output[key], value);
    } else {
      output[key] = clone(value);
    }
  }
  return output;
}

export const fishingQualityProfiles = Object.freeze({
  low: Object.freeze({
    id: "low",
    pixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
    scatterDensity: 0.25,
    water: "simple",
    cloudDensity: 0.45,
    post: false
  }),
  medium: Object.freeze({
    id: "medium",
    pixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    scatterDensity: 0.55,
    water: "standard",
    cloudDensity: 0.7,
    post: "minimal"
  }),
  high: Object.freeze({
    id: "high",
    pixelRatio: 1.75,
    shadows: true,
    shadowMapSize: 2048,
    scatterDensity: 0.85,
    water: "realistic",
    cloudDensity: 0.9,
    post: "standard"
  }),
  ultra: Object.freeze({
    id: "ultra",
    pixelRatio: 2,
    shadows: true,
    shadowMapSize: 4096,
    scatterDensity: 1,
    water: "realistic",
    cloudDensity: 1,
    post: "full"
  }),
  adaptive: Object.freeze({
    id: "adaptive",
    adaptive: true,
    targetMs: 16.6,
    min: "medium",
    max: "high"
  })
});

export const fishingRealismPresets = Object.freeze({
  cozyBeachRealistic: Object.freeze({
    id: "cozy-beach-realistic",
    renderer: {
      toneMapping: "aces",
      exposure: 1.05,
      outputColorSpace: "srgb",
      physicallyCorrectLights: true
    },
    lighting: {
      sun: { elevation: 28, azimuth: -42, intensity: 3.2, color: "#fff1c4" },
      hemisphere: { sky: "#bfe7ff", ground: "#b88f62", intensity: 1.05 },
      exposure: 1.05,
      toneMapping: "aces",
      shadows: { enabled: true, mapSize: 2048, distance: 120 },
      environment: { type: "procedural-sky-pmrem", intensity: 0.95 }
    },
    atmosphere: {
      preset: "coastal-morning",
      haze: 0.022,
      horizon: "#ffd7a5",
      zenith: "#7fc4f1",
      fogColor: "#c7dfdf",
      cloudLayers: [
        { type: "cumulus", density: 0.42, altitude: 28, speed: 0.028, scale: 1 },
        { type: "wisps", density: 0.18, altitude: 42, speed: 0.07, scale: 1.8 }
      ]
    },
    water: {
      model: "coastal-clear",
      transparent: true,
      clarity: 0.78,
      turbidity: 0.18,
      fresnel: 0.65,
      rippleScale: 0.32,
      waveDirection: [0.4, -0.1],
      caustics: true,
      foam: { enabled: true, shoreline: true, contact: true },
      depthTint: "#1f7f8f",
      shallowTint: "#85e7d6",
      opacity: 0.48
    },
    terrainMaterials: {
      sand: { albedo: "#d6bd82", roughness: 0.92, ao: 0.86, displacementScale: 0.02 },
      wetSand: { albedo: "#8f7b55", roughness: 0.58, ao: 0.9, darkening: 0.32, reflectance: 0.18 },
      rock: { albedo: "#77786f", roughness: 0.8, ao: 0.72, slopeBlend: 0.66 },
      seabed: { albedo: "#4b958b", roughness: 0.84, ao: 0.82, waterTint: "#1f7f8f" }
    },
    scatter: {
      seed: "cozy-beach-realistic",
      density: 0.85,
      maxPerChunk: 46,
      types: [
        { id: "beach-grass", material: "dry-grass", minSlope: 0, maxSlope: 0.38, wetnessMax: 0.42, weight: 0.34 },
        { id: "reeds", material: "reed", shoreline: true, wetnessMin: 0.44, weight: 0.16 },
        { id: "pebbles", material: "stone", minSlope: 0.05, maxSlope: 0.72, weight: 0.24 },
        { id: "shells", material: "shell", shoreline: true, wetnessMin: 0.2, weight: 0.15 },
        { id: "driftwood", material: "wood", shoreline: true, weight: 0.06 }
      ]
    },
    wildlife: {
      fish: { material: "freshwater-shimmer", depthFade: true, tailMotion: true },
      lure: { material: "metal-glint", contactRings: true },
      line: { material: "tension-highlight", sag: true }
    },
    camera: {
      handheld: 0.035,
      focusSmoothing: 0.18,
      fightPulse: 0.06
    },
    post: {
      vignette: 0.08,
      bloom: 0.06,
      colorGrade: "coastal-natural"
    }
  })
});

function normalizeQuality(input) {
  if (typeof input === "string") return input;
  return input?.id ?? "adaptive";
}

function resolveQuality(profileName, budget) {
  const requested = normalizeQuality(profileName);
  if (requested !== "adaptive") {
    return fishingQualityProfiles[requested] ?? fishingQualityProfiles.high;
  }

  const current = budget.currentTier ?? "high";
  const average = number(budget.averageMs, fishingQualityProfiles.adaptive.targetMs);
  if (average > fishingQualityProfiles.adaptive.targetMs * 1.2) {
    return fishingQualityProfiles.medium;
  }
  if (average < fishingQualityProfiles.adaptive.targetMs * 0.86 && current !== fishingQualityProfiles.adaptive.max) {
    return fishingQualityProfiles.high;
  }
  return fishingQualityProfiles[current] ?? fishingQualityProfiles.high;
}

function sunVector(sun) {
  const elevation = number(sun?.elevation, 28) * Math.PI / 180;
  const azimuth = number(sun?.azimuth, -42) * Math.PI / 180;
  const horizontal = Math.cos(elevation);
  return {
    x: Math.sin(azimuth) * horizontal,
    y: Math.sin(elevation),
    z: Math.cos(azimuth) * horizontal
  };
}

function createDefinitions() {
  const resources = {
    RenderPipelineState: defineResource("render-pipeline-state"),
    SceneLightingState: defineResource("scene-lighting-state"),
    AtmosphereState: defineResource("atmosphere-state"),
    WaterRenderState: defineResource("water-render-state"),
    ScatterState: defineResource("scatter-state"),
    VisualMaterialState: defineResource("visual-material-state"),
    WildlifeVisualState: defineResource("wildlife-visual-state"),
    CameraRealismState: defineResource("camera-realism-state"),
    PostProcessingState: defineResource("post-processing-state"),
    PerformanceBudgetState: defineResource("performance-budget-state"),
    RealismSnapshot: defineResource("realism-snapshot")
  };

  const events = {
    QualityChanged: defineEvent("QualityChanged"),
    RealismBudgetChanged: defineEvent("RealismBudgetChanged")
  };

  return { components: {}, resources, events };
}

function makeSnapshot(config, resources, qualityProfile) {
  const lighting = resources.lighting ?? config.lighting;
  return {
    preset: config.id,
    quality: qualityProfile,
    renderer: resources.pipeline,
    lighting: {
      ...lighting,
      sunDirection: sunVector(lighting?.sun)
    },
    atmosphere: resources.atmosphere,
    water: resources.water,
    scatter: resources.scatter,
    terrainMaterials: resources.materials?.terrain ?? config.terrainMaterials,
    wildlife: resources.wildlife,
    camera: resources.camera,
    post: resources.post
  };
}

function createRealismSystem(definitions, config, requestedQuality) {
  const {
    RenderPipelineState,
    SceneLightingState,
    AtmosphereState,
    WaterRenderState,
    ScatterState,
    VisualMaterialState,
    WildlifeVisualState,
    CameraRealismState,
    PostProcessingState,
    PerformanceBudgetState,
    RealismSnapshot
  } = definitions.resources;
  const { QualityChanged, RealismBudgetChanged } = definitions.events;

  return function realismSystem(world) {
    const delta = number(world.__nexusClock?.delta, 1 / 60);
    const renderer = world.__nexusRenderer;
    const measuredMs = number(renderer?.lastFrameMs, delta * 1000);
    const budget = world.getResource(PerformanceBudgetState) ?? {};
    budget.averageMs = number(budget.averageMs, measuredMs) * 0.92 + measuredMs * 0.08;
    const quality = resolveQuality(requestedQuality, budget);
    const previousTier = budget.currentTier;
    budget.currentTier = quality.id;
    budget.frameTargetMs = fishingQualityProfiles.adaptive.targetMs;

    if (previousTier && previousTier !== budget.currentTier) {
      world.emit(QualityChanged, { from: previousTier, to: budget.currentTier, averageMs: budget.averageMs });
      world.emit(RealismBudgetChanged, { tier: budget.currentTier, averageMs: budget.averageMs });
    }

    const pipeline = {
      quality: quality.id,
      requestedQuality: normalizeQuality(requestedQuality),
      pixelRatio: quality.pixelRatio,
      toneMapping: config.renderer?.toneMapping ?? config.lighting?.toneMapping ?? "aces",
      exposure: number(config.renderer?.exposure, number(config.lighting?.exposure, 1.05)),
      outputColorSpace: config.renderer?.outputColorSpace ?? "srgb",
      passes: {
        opaqueTerrain: true,
        scatter: true,
        water: true,
        transparent: true,
        post: Boolean(quality.post),
        hudSafeComposition: true
      },
      shadows: {
        enabled: quality.shadows && config.lighting?.shadows?.enabled !== false,
        mapSize: Math.min(number(config.lighting?.shadows?.mapSize, quality.shadowMapSize), quality.shadowMapSize),
        distance: number(config.lighting?.shadows?.distance, 120)
      }
    };
    const lighting = mergeDeep(config.lighting, {
      exposure: pipeline.exposure,
      toneMapping: pipeline.toneMapping,
      shadows: pipeline.shadows
    });
    const atmosphere = mergeDeep(config.atmosphere, {
      cloudDensityScale: quality.cloudDensity
    });
    const water = mergeDeep(config.water, {
      quality: quality.water
    });
    const scatter = mergeDeep(config.scatter, {
      effectiveDensity: number(config.scatter?.density, 0.85) * quality.scatterDensity
    });
    const materials = {
      terrain: config.terrainMaterials,
      water: config.water,
      fish: config.wildlife?.fish,
      lure: config.wildlife?.lure,
      line: config.wildlife?.line
    };

    world.setResource(RenderPipelineState, pipeline);
    world.setResource(SceneLightingState, lighting);
    world.setResource(AtmosphereState, atmosphere);
    world.setResource(WaterRenderState, water);
    world.setResource(ScatterState, scatter);
    world.setResource(VisualMaterialState, materials);
    world.setResource(WildlifeVisualState, config.wildlife);
    world.setResource(CameraRealismState, config.camera);
    world.setResource(PostProcessingState, config.post);
    world.setResource(PerformanceBudgetState, budget);

    const snapshot = makeSnapshot(config, {
      pipeline,
      lighting,
      atmosphere,
      water,
      scatter,
      materials,
      wildlife: config.wildlife,
      camera: config.camera,
      post: config.post
    }, quality);
    world.__nexusRealismSnapshot = snapshot;
    world.setResource(RealismSnapshot, snapshot);
  };
}

export function createFishingRealismKit(options = {}) {
  const definitions = createDefinitions();
  const preset = typeof options.preset === "string"
    ? fishingRealismPresets[options.preset] ?? fishingRealismPresets.cozyBeachRealistic
    : options.preset ?? fishingRealismPresets.cozyBeachRealistic;
  const config = mergeDeep(preset, {
    ...(options.config ?? {}),
    renderer: options.renderer,
    lighting: options.lighting,
    atmosphere: options.atmosphere,
    water: options.water,
    terrainMaterials: options.terrainMaterials,
    scatter: options.scatter,
    wildlife: options.wildlife,
    camera: options.camera,
    post: options.post
  });
  const requestedQuality = options.quality ?? "adaptive";

  const kit = defineRuntimeKit({
    id: options.id ?? "fishing-realism",
    components: definitions.components,
    resources: definitions.resources,
    events: definitions.events,
    systems: [
      { phase: "resolve", name: "RealismPipelineSystem", system: createRealismSystem(definitions, config, requestedQuality) }
    ],
    materials: [
      { id: "coastal-pbr", type: "terrain", descriptor: config.terrainMaterials },
      { id: "clear-coastal-water", type: "water", descriptor: config.water },
      { id: "freshwater-shimmer", type: "fish", descriptor: config.wildlife?.fish }
    ],
    initWorld({ world }) {
      world.setResource(definitions.resources.PerformanceBudgetState, {
        currentTier: normalizeQuality(requestedQuality) === "adaptive" ? "high" : normalizeQuality(requestedQuality),
        averageMs: fishingQualityProfiles.adaptive.targetMs,
        frameTargetMs: fishingQualityProfiles.adaptive.targetMs
      });
      const initialQuality = resolveQuality(requestedQuality, world.getResource(definitions.resources.PerformanceBudgetState));
      const snapshot = makeSnapshot(config, {
        pipeline: {
          quality: initialQuality.id,
          requestedQuality: normalizeQuality(requestedQuality),
          pixelRatio: initialQuality.pixelRatio,
          toneMapping: config.renderer?.toneMapping ?? config.lighting?.toneMapping ?? "aces",
          exposure: number(config.renderer?.exposure, number(config.lighting?.exposure, 1.05)),
          shadows: config.lighting?.shadows
        },
        lighting: config.lighting,
        atmosphere: config.atmosphere,
        water: config.water,
        scatter: config.scatter,
        materials: { terrain: config.terrainMaterials },
        wildlife: config.wildlife,
        camera: config.camera,
        post: config.post
      }, initialQuality);
      world.__nexusRealismSnapshot = snapshot;
      world.setResource(definitions.resources.RealismSnapshot, snapshot);
    },
    metadata: {
      realism: true,
      preset: config.id,
      quality: normalizeQuality(requestedQuality)
    }
  });

  return {
    ...kit,
    definitions,
    config,
    quality: requestedQuality,
    bindings: {
      fishing() {
        return {
          __nexusRealismBinding: true,
          resources: definitions.resources,
          snapshotResource: definitions.resources.RealismSnapshot,
          pipelineResource: definitions.resources.RenderPipelineState,
          waterResource: definitions.resources.WaterRenderState,
          scatterResource: definitions.resources.ScatterState
        };
      }
    }
  };
}
