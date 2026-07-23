import {
  defineComponent,
  defineEvent,
  defineResource
} from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";
import { fishingShaders } from "./shaders.js";

export {
  createFishingCanvas2DRenderer,
  createFishingHeadlessRenderer,
  createFishingRenderer,
  createFishingThreeRenderer,
  createFishingWebGLRenderer
} from "./renderers.js";
export {
  fishingQualityProfiles,
  fishingRealismPresets,
  createFishingRealismKit
} from "./realism.js";
export { fishingShaders } from "./shaders.js";

function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(number(a?.x) - number(b?.x), number(a?.y) - number(b?.y));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function firstById(items, id) {
  return (items ?? []).find((item) => item.id === id) ?? (items ?? [])[0] ?? {};
}

function addEntity(world, componentEntries) {
  const entity = world.addEntity();
  for (const [component, value] of componentEntries) {
    world.setComponent(entity, component, value);
  }
  return entity;
}

export function createFishingTerrainBinding(terrainKit, options = {}) {
  const definitions = terrainKit?.definitions;
  const resources = definitions?.resources;
  if (!resources?.TerrainQuery || !resources?.TerrainSnapshot || !resources?.TerrainFocusState) {
    throw new TypeError("createFishingTerrainBinding expects a NexusEngine terrain kit.");
  }
  return Object.freeze({
    __nexusTerrainBinding: true,
    resources,
    components: definitions.components,
    events: definitions.events,
    waterLevel: number(options.waterLevel, terrainKit.config?.waterLevel),
    shorelineMaterial: options.shorelineMaterial ?? "wet-sand",
    queryResource: resources.TerrainQuery,
    snapshotResource: resources.TerrainSnapshot,
    focusResource: resources.TerrainFocusState
  });
}

function createDefinitions() {
  const components = {
    Position: defineComponent("position"),
    Velocity: defineComponent("velocity"),
    Fish: defineComponent("fish"),
    Lure: defineComponent("lure"),
    Line: defineComponent("line"),
    Rod: defineComponent("rod"),
    WaterZone: defineComponent("water-zone"),
    Catchable: defineComponent("catchable"),
    FishAI: defineComponent("fish-ai"),
    Tension: defineComponent("tension"),
    Renderable: defineComponent("renderable"),
    TerrainChunk: defineComponent("terrain-chunk"),
    Shoreline: defineComponent("shoreline"),
    WaterSurface: defineComponent("water-surface"),
    CloudLayer: defineComponent("cloud-layer"),
    CameraRig: defineComponent("camera-rig")
  };

  const resources = {
    FishingSession: defineResource("fishing-session"),
    InputState: defineResource("input-state"),
    WeatherState: defineResource("weather-state"),
    TideState: defineResource("tide-state"),
    CatchLog: defineResource("catch-log"),
    RenderSettings: defineResource("render-settings"),
    TerrainState: defineResource("terrain-state"),
    WaterSurfaceState: defineResource("water-surface-state"),
    SkyState: defineResource("sky-state"),
    CloudState: defineResource("cloud-state"),
    CameraRigState: defineResource("camera-rig-state"),
    ScreenAim: defineResource("screen-aim")
  };

  const events = {
    CastStarted: defineEvent("CastStarted"),
    LureEnteredZone: defineEvent("LureEnteredZone"),
    FishInterested: defineEvent("FishInterested"),
    BiteStarted: defineEvent("BiteStarted"),
    HookSet: defineEvent("HookSet"),
    TensionChanged: defineEvent("TensionChanged"),
    FishEscaped: defineEvent("FishEscaped"),
    FishCaught: defineEvent("FishCaught"),
    CameraMoved: defineEvent("CameraMoved"),
    TideShifted: defineEvent("TideShifted"),
    WeatherShifted: defineEvent("WeatherShifted")
  };

  return { components, resources, events };
}

function defaultContent() {
  return {
    species: [
      { id: "sun-bass", label: "Sun Bass", rarity: 1, fight: 0.7, stamina: 4, score: 80 },
      { id: "reed-trout", label: "Reed Trout", rarity: 1.2, fight: 0.9, stamina: 5, score: 120 },
      { id: "glass-koi", label: "Glass Koi", rarity: 2.4, fight: 1.25, stamina: 7, score: 260 }
    ],
    lures: [
      { id: "spinner", label: "Spinner", depth: 0.35, attraction: 1.1 },
      { id: "fly", label: "Dry Fly", depth: 0.12, attraction: 0.95 },
      { id: "crankbait", label: "Crankbait", depth: 0.65, attraction: 1.25 }
    ],
    waterZones: [
      { id: "reeds", kind: "reeds", position: { x: -12, y: -5 }, radius: 5, current: { x: 0.08, y: 0.02 } },
      { id: "deep-pool", kind: "deep", position: { x: 8, y: 2 }, radius: 7, current: { x: -0.04, y: 0.01 } },
      { id: "dock-shadow", kind: "shadow", position: { x: 0, y: 9 }, radius: 4, current: { x: 0.02, y: -0.05 } }
    ],
    objective: { label: "Land 3 fish", target: 3 }
  };
}

function defaultTerrain() {
  return {
    id: "cozy-beach",
    width: 46,
    depth: 58,
    resolution: 36,
    shorelineZ: -2,
    beachColor: "#d9b66f",
    wetSandColor: "#9d8051",
    seaFloorColor: "#3e8f86",
    rocks: [
      { x: -15, y: -7, radius: 1.6 },
      { x: 13, y: -4, radius: 1.2 },
      { x: 18, y: 8, radius: 1.8 }
    ],
    reeds: [
      { x: -16, y: 2, radius: 3.2 },
      { x: -11, y: 7, radius: 2.6 }
    ]
  };
}

function defaultWater() {
  return {
    transparent: true,
    clarity: 0.82,
    opacity: 0.42,
    level: 0,
    depthTint: "#1f7f8f",
    shallowTint: "#74d9cf",
    rippleStrength: 0.35,
    foam: 0.42
  };
}

function defaultSky() {
  return {
    timeOfDay: 0.38,
    horizon: "#ffd69b",
    zenith: "#71b7e8",
    sunColor: "#fff1bd",
    cloudDensity: 0.68,
    wind: { x: 0.025, y: 0.006 }
  };
}

function defaultCamera() {
  return {
    mode: "look-around",
    yaw: 0,
    pitch: 10,
    zoom: 1,
    pitchMin: -12,
    pitchMax: 28,
    yawMin: -35,
    yawMax: 35,
    target: { x: 0, y: 0, z: 8 },
    distance: 27,
    height: 5.4
  };
}

function terrainHeightAt(terrain = {}, x = 0, y = 0) {
  const shorelineZ = number(terrain.shorelineZ, -2);
  const beachSlope = Math.max(0, shorelineZ - y) * 0.11;
  const waterDepth = Math.max(0, y - shorelineZ) * -0.09;
  const ripple = Math.sin(number(x) * 0.34) * 0.09 + Math.cos(number(y) * 0.23) * 0.06;
  return beachSlope + waterDepth + ripple - 0.38;
}

function createInitialFish(content) {
  const species = content.species ?? [];
  return [
    { species: firstById(species, "sun-bass"), position: { x: -10, y: -2 }, home: { x: -10, y: -2 }, size: 1 },
    { species: firstById(species, "reed-trout"), position: { x: 7, y: 4 }, home: { x: 7, y: 4 }, size: 1.2 },
    { species: firstById(species, "glass-koi"), position: { x: 2, y: 9 }, home: { x: 2, y: 9 }, size: 1.45 },
    { species: firstById(species, "sun-bass"), position: { x: -3, y: -8 }, home: { x: -3, y: -8 }, size: 0.9 }
  ];
}

function createTerrainSystem(definitions) {
  const { TerrainState } = definitions.resources;

  return function fishingTerrainSystem(world) {
    const terrain = world.getResource(TerrainState) ?? {};
    const signature = JSON.stringify({
      width: terrain.width,
      depth: terrain.depth,
      shorelineZ: terrain.shorelineZ,
      sampleResolution: terrain.sampleResolution ?? 14
    });
    if (terrain.heightSignature === signature && Array.isArray(terrain.heightMap)) {
      return;
    }

    const resolution = Math.max(6, Math.floor(number(terrain.sampleResolution, 14)));
    const width = number(terrain.width, 46);
    const depth = number(terrain.depth, 58);
    const samples = [];
    for (let yIndex = 0; yIndex <= resolution; yIndex += 1) {
      const y = -depth * 0.5 + (yIndex / resolution) * depth;
      const row = [];
      for (let xIndex = 0; xIndex <= resolution; xIndex += 1) {
        const x = -width * 0.5 + (xIndex / resolution) * width;
        row.push(Number(terrainHeightAt(terrain, x, y).toFixed(4)));
      }
      samples.push(row);
    }
    terrain.heightSignature = signature;
    terrain.heightMap = samples;
    terrain.heightMapResolution = resolution;
    terrain.heightAtHint = "heightMap[y][x] samples the beach heightfield used by the beach-side renderer.";
    world.setResource(TerrainState, terrain);
  };
}

function createSceneControlSystem(definitions, terrainBinding = null) {
  const {
    InputState,
    CameraRigState,
    ScreenAim,
    TerrainState,
    WaterSurfaceState,
    SkyState,
    CloudState,
    TideState
  } = definitions.resources;
  const { CameraMoved, TideShifted } = definitions.events;

  return function fishingSceneControlSystem(world) {
    const input = world.getResource(InputState) ?? {};
    const rig = world.getResource(CameraRigState) ?? {};
    const terrain = world.getResource(TerrainState) ?? {};
    const water = world.getResource(WaterSurfaceState) ?? {};
    const sky = world.getResource(SkyState) ?? {};
    const clouds = world.getResource(CloudState) ?? {};
    const tide = world.getResource(TideState) ?? {};
    const delta = number(world.__nexusClock?.delta, 1 / 60);
    const nextYaw = clamp(number(input.lookX, number(input.aimX) * number(rig.yawMax, 35)), number(rig.yawMin, -35), number(rig.yawMax, 35));
    const nextPitch = clamp(number(input.lookY, number(rig.pitch, 10)), number(rig.pitchMin, -12), number(rig.pitchMax, 28));
    const nextZoom = clamp(number(input.zoom, number(rig.zoom, 1)), 0.75, 1.35);

    if (nextYaw !== rig.yaw || nextPitch !== rig.pitch || nextZoom !== rig.zoom) {
      rig.yaw = nextYaw;
      rig.pitch = nextPitch;
      rig.zoom = nextZoom;
      world.emit(CameraMoved, { yaw: rig.yaw, pitch: rig.pitch, zoom: rig.zoom });
    }

    const shorelineZ = number(terrain.config?.shorelineZ, number(terrain.shorelineZ, -2));
    const aim = {
      x: clamp(number(input.aimX) * 19, -22, 22),
      y: clamp(lerp(shorelineZ + 5, 23, (number(input.aimY) + 1) * 0.5), shorelineZ + 2, 28)
    };
    world.setResource(ScreenAim, {
      normalized: { x: number(input.aimX), y: number(input.aimY) },
      waterPoint: aim,
      camera: { yaw: rig.yaw, pitch: rig.pitch, zoom: rig.zoom }
    });
    if (terrainBinding?.focusResource) {
      world.setResource(terrainBinding.focusResource, {
        x: number(rig.target?.x, 0),
        z: number(rig.target?.z, aim.y),
        yaw: rig.yaw,
        pitch: rig.pitch,
        zoom: rig.zoom
      });
    }

    const tidePulse = Math.sin(number(world.__nexusClock?.elapsed, 0) * 0.08) * 0.045;
    const nextLevel = number(water.baseLevel, number(water.level, 0)) + tidePulse;
    if (Math.abs(nextLevel - number(water.level, 0)) > 0.0001) {
      water.level = nextLevel;
      tide.level = nextLevel;
      const previousEventLevel = Number.isFinite(Number(water.lastEventLevel)) ? Number(water.lastEventLevel) : nextLevel - 1;
      if (Math.abs(nextLevel - previousEventLevel) > 0.02) {
        water.lastEventLevel = nextLevel;
        world.emit(TideShifted, { level: nextLevel, label: tide.label });
      }
    }

    clouds.offset = {
      x: number(clouds.offset?.x) + number(sky.wind?.x, 0.02) * delta,
      y: number(clouds.offset?.y) + number(sky.wind?.y, 0.006) * delta
    };

    world.setResource(CameraRigState, rig);
    world.setResource(WaterSurfaceState, water);
    world.setResource(CloudState, clouds);
    world.setResource(TideState, tide);
  };
}

function createFishingInputSystem(definitions) {
  const { InputState, FishingSession } = definitions.resources;

  return function fishingInputSystem(world) {
    const input = world.getResource(InputState) ?? {};
    const session = world.getResource(FishingSession) ?? {};
    session.delta = number(world.__nexusClock?.delta, session.delta ?? 1 / 60);
    session.aim = {
      x: clamp(number(input.aimX, session.aim?.x ?? 0), -1, 1),
      y: clamp(number(input.aimY, session.aim?.y ?? 0), -1, 1)
    };
    session.castPower = clamp(number(input.castPower, session.castPower ?? 0.4), 0.1, 1);
    session.reel = Boolean(input.reel);
    session.rodAngle = clamp(number(input.rodAngle, session.rodAngle ?? 0), -1, 1);
    world.setResource(FishingSession, session);
  };
}

function createCastSystem(definitions, content) {
  const { Position, Velocity, Lure, Line, Tension, Renderable } = definitions.components;
  const { InputState, FishingSession, TideState, ScreenAim } = definitions.resources;
  const { CastStarted } = definitions.events;

  return function fishingCastSystem(world) {
    const input = world.getResource(InputState) ?? {};
    const session = world.getResource(FishingSession) ?? {};
    if (!input.castPressed || !["Explore", "Recover"].includes(session.phase)) {
      return;
    }

    if (session.activeLure && world.removeEntity(session.activeLure)) {
      session.activeLure = null;
    }

    const tide = world.getResource(TideState) ?? {};
    const screenAim = world.getResource(ScreenAim) ?? {};
    const lureConfig = firstById(content.lures, input.lureId ?? session.lureId ?? "spinner");
    const aimTarget = screenAim.waterPoint ?? {
      x: number(session.aim?.x) * 16,
      y: number(session.aim?.y, -0.2) * 12
    };
    const target = {
      x: number(aimTarget.x) * number(session.castPower, 0.5),
      y: number(aimTarget.y) * number(session.castPower, 0.5)
    };
    const lure = addEntity(world, [
      [Position, { ...target }],
      [Velocity, { x: number(tide.current?.x) * 2, y: number(tide.current?.y) * 2 }],
      [Lure, { id: lureConfig.id, depth: lureConfig.depth, attraction: lureConfig.attraction, age: 0, state: "drifting" }],
      [Line, { origin: { x: 0, y: 18 }, length: 20, slack: 0.25 }],
      [Tension, { current: 0.2, safeMin: 0.22, safeMax: 0.82, danger: false }],
      [Renderable, { kind: "lure", material: "lure-glow" }]
    ]);

    session.activeLure = lure;
    session.phase = "Drift";
    session.phaseElapsed = 0;
    session.lureId = lureConfig.id;
    world.setResource(FishingSession, session);
    world.emit(CastStarted, { lure, target, lureId: lureConfig.id });
  };
}

function createLureDriftSystem(definitions) {
  const { Position, Velocity, Lure, WaterZone } = definitions.components;
  const { FishingSession, TideState, WeatherState } = definitions.resources;
  const { LureEnteredZone } = definitions.events;

  return function fishingLureDriftSystem(world) {
    const session = world.getResource(FishingSession) ?? {};
    if (!session.activeLure || !world.hasComponent(session.activeLure, Lure)) {
      return;
    }

    const tide = world.getResource(TideState) ?? {};
    const weather = world.getResource(WeatherState) ?? {};
    const lure = world.getComponent(session.activeLure, Lure);
    const position = world.getComponent(session.activeLure, Position);
    const velocity = world.getComponent(session.activeLure, Velocity);
    const delta = number(session.delta, 1 / 60);
    lure.age = number(lure.age) + delta;
    velocity.x += number(tide.current?.x) * delta + number(weather.wind?.x) * 0.12 * delta;
    velocity.y += number(tide.current?.y) * delta + number(weather.wind?.y) * 0.12 * delta;
    velocity.x *= 0.982;
    velocity.y *= 0.982;
    position.x += velocity.x * delta * 4;
    position.y += velocity.y * delta * 4;

    for (const zoneEntity of world.query(WaterZone, Position)) {
      const zone = world.getComponent(zoneEntity, WaterZone);
      const zonePosition = world.getComponent(zoneEntity, Position);
      const inside = distance(position, zonePosition) <= number(zone.radius, 4);
      if (inside && lure.zoneId !== zone.id) {
        lure.zoneId = zone.id;
        velocity.x += number(zone.current?.x) * 2;
        velocity.y += number(zone.current?.y) * 2;
        world.emit(LureEnteredZone, { lure: session.activeLure, zone: zone.id });
      }
    }

    if (lure.age > 8 && session.phase === "Drift") {
      session.phase = "Recover";
      session.phaseElapsed = 0;
    }
  };
}

function createFishAISystem(definitions) {
  const { Position, Velocity, Fish, FishAI, Lure } = definitions.components;
  const { FishingSession } = definitions.resources;
  const { FishInterested, BiteStarted } = definitions.events;

  return function fishingFishAISystem(world) {
    const session = world.getResource(FishingSession) ?? {};
    const delta = number(session.delta, 1 / 60);
    const lurePosition = session.activeLure && world.hasComponent(session.activeLure, Lure)
      ? world.getComponent(session.activeLure, Position)
      : null;
    const lure = session.activeLure && world.hasComponent(session.activeLure, Lure)
      ? world.getComponent(session.activeLure, Lure)
      : null;

    for (const entity of world.query(Fish, FishAI, Position, Velocity)) {
      const fish = world.getComponent(entity, Fish);
      const ai = world.getComponent(entity, FishAI);
      const position = world.getComponent(entity, Position);
      const velocity = world.getComponent(entity, Velocity);

      if (fish.hooked) {
        continue;
      }

      const home = ai.home ?? position;
      let target = home;
      let speed = 0.9;

      if (lurePosition && session.phase === "Drift") {
        const d = distance(position, lurePosition);
        if (d < 9) {
          ai.interest = clamp(number(ai.interest) + delta * number(lure?.attraction, 1) * number(fish.curiosity, 1), 0, 1.4);
          target = lurePosition;
          speed = 1.4 + number(fish.fight, 1) * 0.3;
          if (ai.interest > 1 && !session.biteFish) {
            session.biteFish = entity;
            session.phase = "Bite";
            session.phaseElapsed = 0;
            world.emit(FishInterested, { fish: entity, lure: session.activeLure, species: fish.speciesId });
            world.emit(BiteStarted, { fish: entity, lure: session.activeLure, species: fish.speciesId, window: 1.25 });
          }
        } else {
          ai.interest = Math.max(0, number(ai.interest) - delta * 0.2);
        }
      }

      const dx = number(target.x) - number(position.x);
      const dy = number(target.y) - number(position.y);
      const length = Math.hypot(dx, dy) || 1;
      velocity.x += (dx / length) * speed * delta;
      velocity.y += (dy / length) * speed * delta;
      velocity.x *= 0.96;
      velocity.y *= 0.96;
      position.x += velocity.x * delta * 3;
      position.y += velocity.y * delta * 3;
    }
  };
}

function createHookSystem(definitions) {
  const { Fish, Lure } = definitions.components;
  const { InputState, FishingSession } = definitions.resources;
  const { HookSet, FishEscaped } = definitions.events;

  return function fishingHookSystem(world) {
    const input = world.getResource(InputState) ?? {};
    const session = world.getResource(FishingSession) ?? {};
    if (session.phase !== "Bite" || !session.biteFish) {
      return;
    }

    if (input.hookPressed && world.hasComponent(session.biteFish, Fish)) {
      const fish = world.getComponent(session.biteFish, Fish);
      fish.hooked = true;
      fish.stamina = number(fish.stamina, 4);
      session.hookedFish = session.biteFish;
      session.phase = "Fight";
      session.phaseElapsed = 0;
      if (session.activeLure && world.hasComponent(session.activeLure, Lure)) {
        world.getComponent(session.activeLure, Lure).state = "hooked";
      }
      world.emit(HookSet, { fish: session.hookedFish, lure: session.activeLure, strength: 1 });
      return;
    }

    if (number(session.phaseElapsed) > 1.25) {
      world.emit(FishEscaped, { fish: session.biteFish, reason: "missed-hook" });
      session.biteFish = null;
      session.phase = "Recover";
      session.phaseElapsed = 0;
    }
  };
}

function createFightSystem(definitions) {
  const { Position, Velocity, Fish, Lure, Tension } = definitions.components;
  const { FishingSession, InputState } = definitions.resources;
  const { TensionChanged, FishEscaped, FishCaught } = definitions.events;

  return function fishingFightSystem(world) {
    const session = world.getResource(FishingSession) ?? {};
    if (session.phase !== "Fight" || !session.hookedFish || !world.hasComponent(session.hookedFish, Fish)) {
      return;
    }

    const input = world.getResource(InputState) ?? {};
    const delta = number(session.delta, 1 / 60);
    const fish = world.getComponent(session.hookedFish, Fish);
    const fishPosition = world.getComponent(session.hookedFish, Position);
    const fishVelocity = world.getComponent(session.hookedFish, Velocity);
    const lure = session.activeLure && world.hasComponent(session.activeLure, Lure) ? world.getComponent(session.activeLure, Lure) : null;
    const tension = session.activeLure && world.hasComponent(session.activeLure, Tension)
      ? world.getComponent(session.activeLure, Tension)
      : { current: 0.4, safeMin: 0.22, safeMax: 0.82 };
    const pull = number(fish.fight, 1) * (0.34 + Math.sin(number(session.phaseElapsed) * 2.2) * 0.16);
    const reel = input.reel ? 0.52 : -0.18;
    const rod = Math.abs(number(input.rodAngle)) * -0.12;
    tension.current = clamp(number(tension.current, 0.35) + (pull + reel + rod - 0.42) * delta, 0, 1.35);
    tension.danger = tension.current < number(tension.safeMin, 0.2) || tension.current > number(tension.safeMax, 0.8);
    fish.stamina = Math.max(0, number(fish.stamina, 4) - (tension.danger ? 0.08 : 0.42) * delta * (input.reel ? 1.6 : 0.7));
    fishVelocity.x += Math.sin(number(session.phaseElapsed) * 3 + session.hookedFish) * delta * number(fish.fight, 1);
    fishVelocity.y += Math.cos(number(session.phaseElapsed) * 2 + session.hookedFish) * delta * number(fish.fight, 1);
    fishPosition.x += fishVelocity.x * delta;
    fishPosition.y += fishVelocity.y * delta;
    world.emit(TensionChanged, { fish: session.hookedFish, current: tension.current, danger: tension.danger });

    if (lure) {
      lure.state = "fighting";
    }

    if (tension.current >= 1.25 || number(session.phaseElapsed) > 16) {
      fish.hooked = false;
      world.emit(FishEscaped, { fish: session.hookedFish, reason: tension.current >= 1.25 ? "line-break" : "fight-timeout" });
      session.hookedFish = null;
      session.biteFish = null;
      session.phase = "Recover";
      session.phaseElapsed = 0;
      return;
    }

    if (fish.stamina <= 0) {
      const score = Math.round(number(fish.score, 100) * number(fish.size, 1));
      world.emit(FishCaught, { fish: session.hookedFish, species: fish.speciesId, label: fish.label, size: fish.size, score });
      world.removeEntity(session.hookedFish);
      if (session.activeLure) world.removeEntity(session.activeLure);
      session.activeLure = null;
      session.hookedFish = null;
      session.biteFish = null;
      session.phase = "Catch";
      session.phaseElapsed = 0;
    }
  };
}

function createScoringSystem(definitions) {
  const { CatchLog, FishingSession } = definitions.resources;
  const { FishCaught, FishEscaped } = definitions.events;

  return function fishingScoringSystem(world) {
    const log = world.getResource(CatchLog) ?? { catches: [], escaped: 0, score: 0 };
    const session = world.getResource(FishingSession) ?? {};
    for (const event of world.readEvents(FishCaught)) {
      log.catches = [...log.catches, event].slice(-8);
      log.score = number(log.score) + number(event.score);
      session.caught = number(session.caught) + 1;
      session.lastCatch = event;
    }
    for (const event of world.readEvents(FishEscaped)) {
      log.escaped = number(log.escaped) + 1;
      session.lastEscape = event;
    }
    if (number(session.caught) >= number(session.objective?.target, 3)) {
      session.status = "complete";
    }
    world.setResource(CatchLog, log);
    world.setResource(FishingSession, session);
  };
}

function createCleanupSystem(definitions) {
  const { InputState, FishingSession } = definitions.resources;

  return function fishingCleanupSystem(world) {
    const session = world.getResource(FishingSession) ?? {};
    const input = world.getResource(InputState) ?? {};
    const delta = number(session.delta, 1 / 60);
    session.phaseElapsed = number(session.phaseElapsed) + delta;
    if (["Catch", "Recover"].includes(session.phase) && session.phaseElapsed > 1.25) {
      session.phase = "Explore";
      session.phaseElapsed = 0;
    }
    input.castPressed = false;
    input.hookPressed = false;
    world.setResource(InputState, input);
    world.setResource(FishingSession, session);
  };
}

function createRenderSystem(definitions, terrainBinding = null, realismBinding = null) {
  const { Position, Fish, Lure, Tension, WaterZone } = definitions.components;
  const {
    FishingSession,
    CatchLog,
    WeatherState,
    TideState,
    RenderSettings,
    TerrainState,
    WaterSurfaceState,
    SkyState,
    CloudState,
    CameraRigState,
    ScreenAim
  } = definitions.resources;

  return function fishingRenderSystem(world) {
    const renderer = world.__nexusRenderer;
    if (!renderer?.renderFishing) {
      return;
    }

    const session = world.getResource(FishingSession) ?? {};
    const lure = session.activeLure && world.hasComponent(session.activeLure, Lure)
      ? {
          entity: session.activeLure,
          ...world.getComponent(session.activeLure, Lure),
          position: world.getComponent(session.activeLure, Position)
        }
      : null;
    const tension = session.activeLure && world.hasComponent(session.activeLure, Tension)
      ? world.getComponent(session.activeLure, Tension)
      : null;
    const fish = world.query(Fish, Position).map((entity) => ({
      entity,
      ...world.getComponent(entity, Fish),
      position: world.getComponent(entity, Position)
    }));
    const waterZones = world.query(WaterZone, Position).map((entity) => ({
      entity,
      ...world.getComponent(entity, WaterZone),
      position: world.getComponent(entity, Position)
    }));
    const terrainSnapshot = terrainBinding?.snapshotResource
      ? world.getResource(terrainBinding.snapshotResource)
      : null;
    const realism = realismBinding?.snapshotResource
      ? world.getResource(realismBinding.snapshotResource)
      : world.__nexusRealismSnapshot ?? null;
    renderer.renderFishing({
      clock: world.__nexusClock,
      session,
      catchLog: world.getResource(CatchLog),
      weather: world.getResource(WeatherState),
      tide: world.getResource(TideState),
      renderSettings: world.getResource(RenderSettings),
      terrain: world.getResource(TerrainState),
      terrainSnapshot,
      terrainChunks: terrainSnapshot?.visibleChunks ?? null,
      realism,
      water: world.getResource(WaterSurfaceState),
      sky: world.getResource(SkyState),
      clouds: world.getResource(CloudState),
      camera: world.getResource(CameraRigState),
      screenAim: world.getResource(ScreenAim),
      lure,
      tension,
      fish,
      waterZones
    });
  };
}

export function createFishingKit(options = {}) {
  const definitions = createDefinitions();
  const content = { ...defaultContent(), ...(options.content ?? {}) };
  const terrainBinding = options.terrain?.__nexusTerrainBinding ? options.terrain : null;
  const realismBinding = options.visuals?.__nexusRealismBinding ? options.visuals : null;
  const terrain = terrainBinding ? null : { ...defaultTerrain(), ...(options.terrain ?? {}) };
  const water = { ...defaultWater(), ...(options.water ?? {}) };
  if (terrainBinding && options.water?.level === undefined) {
    water.level = terrainBinding.waterLevel;
  }
  const sky = { ...defaultSky(), ...(options.sky ?? {}) };
  const camera = { ...defaultCamera(), ...(options.camera ?? {}) };
  const gameId = options.gameId ?? "cozy-fishing";
  const title = options.title ?? "Cozy Fishing";
  const sceneMode = options.sceneMode ?? "beach-side";
  const components = definitions.components;
  const resources = definitions.resources;
  const events = definitions.events;

  const kit = defineRuntimeKit({
    id: "fishing",
    components,
    resources,
    events,
    shaders: [...fishingShaders, ...(options.shaders ?? [])],
    materials: options.materials ?? [],
    sequences: options.sequences ?? [
      {
        id: "intro",
        type: "Group",
        completionMode: "linear",
        children: [
          { id: "intro_ui", type: "UIControllerSequence", params: { panel: "cast" } },
          { id: "intro_beach_pan", type: "UIControllerSequence", params: { panel: "beach-pan" } }
        ]
      },
      {
        id: "cast_settle",
        type: "Group",
        completionMode: "linear",
        children: [
          { id: "cast_camera", type: "UIControllerSequence", params: { panel: "cast-settle" } }
        ]
      },
      {
        id: "bite_reaction",
        type: "Group",
        completionMode: "linear",
        children: [
          { id: "bite_ui", type: "UIControllerSequence", params: { panel: "bite" } }
        ]
      },
      {
        id: "fight_tension_pulse",
        type: "Group",
        completionMode: "linear",
        children: [
          { id: "fight_tension_ui", type: "UIControllerSequence", params: { panel: "fight-tension" } }
        ]
      },
      {
        id: "catch_celebration",
        type: "Group",
        completionMode: "linear",
        children: [
          { id: "catch_ui", type: "UIControllerSequence", params: { panel: "catch" } }
        ]
      },
      {
        id: "weather_tide_event",
        type: "Group",
        completionMode: "linear",
        children: [
          { id: "weather_tide_ui", type: "UIControllerSequence", params: { panel: "weather-tide" } }
        ]
      },
      {
        id: "escape_recovery",
        type: "Group",
        completionMode: "linear",
        children: [
          { id: "escape_ui", type: "UIControllerSequence", params: { panel: "recover" } }
        ]
      }
    ],
    subscriptions: options.subscriptions ?? [
      { event: "CastStarted", thenSequence: "cast_settle" },
      { event: "BiteStarted", thenSequence: "bite_reaction" },
      { event: "TensionChanged", thenSequence: "fight_tension_pulse" },
      { event: "FishCaught", thenSequence: "catch_celebration" },
      { event: "FishEscaped", thenSequence: "escape_recovery" },
      { event: "TideShifted", thenSequence: "weather_tide_event" },
      { event: "WeatherShifted", thenSequence: "weather_tide_event" }
    ],
    systems: [
      { phase: "input", name: "FishingInputSystem", system: createFishingInputSystem(definitions) },
      terrainBinding ? null : { phase: "input", name: "FishingTerrainSystem", system: createTerrainSystem(definitions) },
      { phase: "input", name: "FishingSceneControlSystem", system: createSceneControlSystem(definitions, terrainBinding) },
      { phase: "input", name: "FishingCastSystem", system: createCastSystem(definitions, content) },
      { phase: "simulate", name: "FishingLureDriftSystem", system: createLureDriftSystem(definitions) },
      { phase: "simulate", name: "FishingFishAISystem", system: createFishAISystem(definitions) },
      { phase: "resolve", name: "FishingHookSystem", system: createHookSystem(definitions) },
      { phase: "resolve", name: "FishingFightSystem", system: createFightSystem(definitions) },
      { phase: "resolve", name: "FishingScoringSystem", system: createScoringSystem(definitions) },
      { phase: "resolve", name: "FishingRenderSystem", system: createRenderSystem(definitions, terrainBinding, realismBinding) },
      { phase: "cleanup", name: "FishingCleanupSystem", system: createCleanupSystem(definitions) }
    ].filter(Boolean),
    initWorld({ world, engine }) {
      world.__nexusRenderer = engine.renderer;
      world.__nexusClock = engine.clock;
      world.setResource(resources.InputState, { aimX: 0, aimY: -0.3, lookX: 0, lookY: 10, zoom: 1, castPower: 0.55, reel: false, rodAngle: 0 });
      world.setResource(resources.FishingSession, {
        phase: "Explore",
        status: "running",
        phaseElapsed: 0,
        delta: 1 / 60,
        caught: 0,
        objective: content.objective,
        lureId: content.lures?.[0]?.id ?? "spinner"
      });
      world.setResource(resources.WeatherState, { wind: { x: 0.08, y: 0.02 }, label: "soft wind" });
      world.setResource(resources.TideState, { current: { x: 0.02, y: -0.01 }, label: "incoming" });
      world.setResource(resources.CatchLog, { catches: [], escaped: 0, score: 0 });
      world.setResource(resources.RenderSettings, {
        rendererType: options.rendererType ?? "custom-webgl",
        sceneMode,
        gameId,
        title,
        theme: options.theme ?? {}
      });
      if (!terrainBinding) {
        world.setResource(resources.TerrainState, terrain);
      }
      world.setResource(resources.WaterSurfaceState, { ...water, baseLevel: number(water.level, 0) });
      world.setResource(resources.SkyState, sky);
      world.setResource(resources.CloudState, { density: number(sky.cloudDensity, 0.68), offset: { x: 0, y: 0 } });
      world.setResource(resources.CameraRigState, camera);
      world.setResource(resources.ScreenAim, { normalized: { x: 0, y: -0.3 }, waterPoint: { x: 0, y: 8 } });

      if (!terrainBinding) {
        addEntity(world, [
          [components.TerrainChunk, { id: terrain.id, width: terrain.width, depth: terrain.depth, resolution: terrain.resolution }],
          [components.Renderable, { kind: "terrain", material: "beach-terrain" }]
        ]);
      }

      addEntity(world, [
        [components.WaterSurface, { id: "main-water", level: water.level, transparent: water.transparent }],
        [components.Shoreline, { z: terrain?.shorelineZ ?? -2.6, foam: water.foam }],
        [components.Renderable, { kind: "water", material: "transparent-water" }]
      ]);

      addEntity(world, [
        [components.CloudLayer, { id: "main-clouds", density: sky.cloudDensity }],
        [components.CameraRig, { id: "beach-camera", mode: camera.mode }],
        [components.Renderable, { kind: "sky", material: "soft-clouds" }]
      ]);

      for (const zone of content.waterZones ?? []) {
        addEntity(world, [
          [components.Position, zone.position],
          [components.WaterZone, zone],
          [components.Renderable, { kind: "water-zone", material: zone.kind }]
        ]);
      }

      for (const fishConfig of createInitialFish(content)) {
        const species = fishConfig.species;
        addEntity(world, [
          [components.Position, { ...fishConfig.position }],
          [components.Velocity, { x: 0, y: 0 }],
          [components.Fish, {
            speciesId: species.id,
            label: species.label,
            fight: species.fight,
            stamina: species.stamina,
            score: species.score,
            curiosity: 0.75 + number(species.rarity, 1) * 0.12,
            size: fishConfig.size,
            hooked: false
          }],
          [components.FishAI, { home: fishConfig.home, interest: 0 }],
          [components.Catchable, { speciesId: species.id }],
          [components.Renderable, { kind: "fish", material: "fish-shimmer" }]
        ]);
      }
    },
    install({ engine, kit }) {
      engine.kit = kit;
      engine.sequenceRuntime?.start("intro");
    },
    metadata: {
      gameId,
      title,
      sceneMode,
      loop: "Scout water -> cast -> drift -> bite -> hook -> fight -> catch"
    }
  });

  return {
    ...kit,
    definitions,
    content,
    terrain,
    terrainBinding,
    realismBinding,
    water,
    sky,
    camera,
    invokes: {
      spawnLure() {},
      setPanel({ world, panel, node } = {}) {
        if (!world) return;
        const session = world.getResource(resources.FishingSession) ?? {};
        session.uiPanel = panel ?? node?.params?.panel ?? session.uiPanel;
        world.setResource(resources.FishingSession, session);
      }
    }
  };
}
