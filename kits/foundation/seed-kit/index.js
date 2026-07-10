import {
  createScopedSeed as createNexusScopedSeed,
  createSeededRandom as createNexusSeededRandom,
  defineDomainServiceKit as defineNexusDomainServiceKit
} from "nexusengine";

export const GENERIC_SEED_KIT_VERSION = "1.0.0";

export const SEED_KIT_DEFINITION = Object.freeze({
  id: "seed-kit",
  camelName: "seedKit",
  engineKey: "seedStream",
  category: "foundation",
  tier: "atomic",
  domainPath: "n:foundation:seed-stream",
  provides: ["seed:world", "random:seeded", "random:stream"],
  requires: [],
  purpose: "Deterministic world-seed ownership and bounded named random streams."
});

export const GENERIC_SEED_KIT_DEFINITION = Object.freeze({
  ...SEED_KIT_DEFINITION,
  id: "generic-seed-kit",
  camelName: "genericSeedKit"
});

const clone = (value) => value == null ? value : typeof structuredClone === "function"
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

function stableText(value, fallback, label) {
  const raw = value ?? fallback;
  if (raw == null) throw new TypeError(`${label} requires a non-empty value.`);
  const next = String(raw).trim();
  if (!next) throw new TypeError(`${label} requires a non-empty value.`);
  return next;
}

function positiveInteger(value, fallback, label) {
  const next = Number(value ?? fallback);
  if (!Number.isInteger(next) || next < 1) throw new TypeError(`${label} must be a positive integer.`);
  return next;
}

function normalizePreloads(value) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((entry) => typeof entry === "string" ? { id: entry } : { ...(entry ?? {}) });
}

function resolveRuntime(runtime = {}) {
  return {
    defineDomainServiceKit: runtime.defineDomainServiceKit ?? defineNexusDomainServiceKit,
    createSeededRandom: runtime.createSeededRandom ?? createNexusSeededRandom,
    createScopedSeed: runtime.createScopedSeed ?? createNexusScopedSeed
  };
}

function createSeedStreamApi(config, runtime) {
  const initialWorldSeed = stableText(config.seed ?? config.worldSeed, "nexusengine", "World seed");
  const maxStreams = positiveInteger(config.maxStreams, 128, "maxStreams");
  const initialStreams = normalizePreloads(config.streams ?? config.preloadStreams);
  let worldSeed = initialWorldSeed;
  let streams = new Map();

  function descriptor(record) {
    return Object.freeze({
      id: record.id,
      seed: record.seed,
      draws: record.draws,
      lastUint32: record.lastUint32,
      state: record.rng.snapshot().state
    });
  }

  function createStream(streamId, options = {}) {
    const id = stableText(streamId, "default", "Random stream");
    const existing = streams.get(id);
    if (existing && options.replace !== true) return descriptor(existing);
    if (!existing && streams.size >= maxStreams) {
      throw new RangeError(`Seed stream limit ${maxStreams} reached.`);
    }
    const seed = stableText(options.seed, runtime.createScopedSeed(worldSeed, id), "Random stream seed");
    const record = { id, seed, draws: 0, lastUint32: null, rng: runtime.createSeededRandom(seed) };
    streams.set(id, record);
    return descriptor(record);
  }

  function requireStream(streamId = "default") {
    const id = stableText(streamId, "default", "Random stream");
    if (!streams.has(id)) createStream(id);
    return streams.get(id);
  }

  function nextUint32(streamId = "default") {
    const record = requireStream(streamId);
    const value = record.rng.nextUint32();
    record.draws += 1;
    record.lastUint32 = value;
    return value;
  }

  function next(streamId = "default") {
    return nextUint32(streamId) / 0x100000000;
  }

  function getSnapshot() {
    return {
      version: GENERIC_SEED_KIT_VERSION,
      status: "ready",
      worldSeed,
      maxStreams,
      streams: [...streams.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((record) => ({
          id: record.id,
          seed: record.seed,
          draws: record.draws,
          lastUint32: record.lastUint32,
          random: clone(record.rng.snapshot())
        }))
    };
  }

  function loadSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new TypeError("Seed stream snapshots must be objects.");
    }
    if (snapshot.version !== GENERIC_SEED_KIT_VERSION || snapshot.status !== "ready") {
      throw new TypeError("Unsupported seed stream snapshot.");
    }
    if (snapshot.maxStreams !== maxStreams) {
      throw new TypeError(`Seed stream snapshot maxStreams ${snapshot.maxStreams} does not match ${maxStreams}.`);
    }
    const entries = Array.isArray(snapshot.streams) ? snapshot.streams : [];
    if (entries.length > maxStreams) throw new RangeError(`Seed stream snapshot exceeds limit ${maxStreams}.`);
    const nextStreams = new Map();
    for (const entry of entries) {
      const id = stableText(entry?.id, null, "Snapshot stream");
      if (nextStreams.has(id)) throw new TypeError(`Seed stream snapshot duplicates ${id}.`);
      const seed = stableText(entry?.seed ?? entry?.random?.seed, null, "Snapshot stream seed");
      const state = Number(entry?.random?.state);
      const draws = Number(entry?.draws ?? 0);
      const lastUint32 = entry?.lastUint32 == null ? null : Number(entry.lastUint32);
      if (!Number.isInteger(state) || state < 0 || state > 0xFFFFFFFF) {
        throw new TypeError(`Seed stream ${id} has invalid random state.`);
      }
      if (!Number.isInteger(draws) || draws < 0) throw new TypeError(`Seed stream ${id} has invalid draw count.`);
      if (lastUint32 != null && (!Number.isInteger(lastUint32) || lastUint32 < 0 || lastUint32 > 0xFFFFFFFF)) {
        throw new TypeError(`Seed stream ${id} has invalid last value.`);
      }
      const rng = runtime.createSeededRandom(seed);
      rng.restore({ seed, state });
      nextStreams.set(id, { id, seed, draws, lastUint32, rng });
    }
    worldSeed = stableText(snapshot.worldSeed, initialWorldSeed, "Snapshot world seed");
    streams = nextStreams;
    return getSnapshot();
  }

  function reset(options = {}) {
    worldSeed = stableText(options.seed ?? options.worldSeed, initialWorldSeed, "World seed");
    streams = new Map();
    for (const preload of initialStreams) createStream(preload.id, preload);
    return getSnapshot();
  }

  const api = {
    getWorldSeed: () => worldSeed,
    setWorldSeed(seed) {
      worldSeed = stableText(seed, initialWorldSeed, "World seed");
      streams = new Map();
      return getSnapshot();
    },
    createStream,
    hasStream(streamId) { return streams.has(stableText(streamId, "default", "Random stream")); },
    getStream(streamId = "default") { return descriptor(requireStream(streamId)); },
    listStreams() { return [...streams.values()].sort((a, b) => a.id.localeCompare(b.id)).map(descriptor); },
    deleteStream(streamId) { return streams.delete(stableText(streamId, "default", "Random stream")); },
    nextUint32,
    next,
    range(streamId, min = 0, max = 1) {
      const low = Number(min);
      const high = Number(max);
      if (!Number.isFinite(low) || !Number.isFinite(high)) throw new TypeError("Seed stream ranges require finite bounds.");
      return low + (high - low) * next(streamId);
    },
    int(streamId, min = 0, max = 1) {
      const low = Math.ceil(Number(min));
      const high = Math.floor(Number(max));
      if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) throw new TypeError("Seed stream integer ranges require ordered finite bounds.");
      return low + Math.floor(next(streamId) * (high - low + 1));
    },
    bool(streamId, chance = 0.5) {
      const probability = Number(chance);
      if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new TypeError("Seed stream chance must be between 0 and 1.");
      return next(streamId) < probability;
    },
    choose(streamId, items = []) {
      if (!Array.isArray(items)) throw new TypeError("Seed stream choose expects an array.");
      if (!items.length) return undefined;
      return items[Math.floor(next(streamId) * items.length) % items.length];
    },
    shuffle(streamId, items = []) {
      if (!Array.isArray(items)) throw new TypeError("Seed stream shuffle expects an array.");
      const output = [...items];
      for (let index = output.length - 1; index > 0; index -= 1) {
        const selected = Math.floor(next(streamId) * (index + 1));
        [output[index], output[selected]] = [output[selected], output[index]];
      }
      return output;
    },
    fork(parentStreamId, scopeId, options = {}) {
      const parent = requireStream(parentStreamId);
      const scope = stableText(scopeId, null, "Random stream scope");
      const id = stableText(options.id, `${parent.id}:${scope}`, "Forked stream");
      return createStream(id, { ...options, seed: runtime.createScopedSeed(parent.seed, scope) });
    },
    getState: getSnapshot,
    configure(nextConfig = {}) {
      if (!nextConfig || typeof nextConfig !== "object" || Array.isArray(nextConfig)) {
        throw new TypeError("Seed stream configure expects an object.");
      }
      if (nextConfig.seed != null || nextConfig.worldSeed != null) {
        worldSeed = stableText(nextConfig.seed ?? nextConfig.worldSeed, initialWorldSeed, "World seed");
        streams = new Map();
      }
      for (const preload of normalizePreloads(nextConfig.streams ?? nextConfig.preloadStreams)) {
        createStream(preload.id, preload);
      }
      return getSnapshot();
    },
    command(command = {}) {
      switch (command.type) {
        case "configure": return api.configure(command.config ?? command);
        case "setWorldSeed": return api.setWorldSeed(command.seed ?? command.worldSeed);
        case "createStream": return api.createStream(command.id, command);
        case "deleteStream": return api.deleteStream(command.id);
        case "next": return api.next(command.id);
        default: throw new TypeError(`Unsupported seed stream command: ${command.type ?? "unknown"}.`);
      }
    },
    getSnapshot,
    loadSnapshot,
    reset
  };

  reset();
  return Object.freeze(api);
}

function defineSeedKit(runtimeInput, config = {}, definition = SEED_KIT_DEFINITION) {
  const runtime = resolveRuntime(runtimeInput);
  return runtime.defineDomainServiceKit({
    id: config.id ?? definition.id,
    domain: "seed-stream",
    domainPath: SEED_KIT_DEFINITION.domainPath,
    parentDomainPath: "n:foundation",
    apiName: "seedStream",
    stability: "official",
    version: GENERIC_SEED_KIT_VERSION,
    services: ["world-seed", "named-stream", "snapshot", "replay"],
    provides: [...SEED_KIT_DEFINITION.provides],
    createApi() { return createSeedStreamApi(config, runtime); },
    install({ engine }) {
      const api = engine.n.seedStream;
      engine.seedStream = api;
      engine.seedKit = api;
      engine.n.genericSeed = api;
      engine.genericSeed = api;
      engine.genericSeedKit = api;
    },
    metadata: {
      status: "official",
      scope: "foundation-seed-stream-service",
      corePrimitive: "nexusengine/foundation seeded-random",
      legacyDefinitionId: GENERIC_SEED_KIT_DEFINITION.id,
      ownsLoop: false,
      maxStreams: positiveInteger(config.maxStreams, 128, "maxStreams"),
      boundary: "Owns world-seed configuration and named deterministic stream lifecycle while NexusEngine owns the random primitive and consumers own procedural meaning."
    }
  });
}

export function createSeedKit(config = {}) {
  return defineSeedKit({}, config, SEED_KIT_DEFINITION);
}

export function createGenericSeedKit(runtimeOrConfig = {}, maybeConfig = {}) {
  const injectedRuntime = runtimeOrConfig && typeof runtimeOrConfig.defineDomainServiceKit === "function";
  const runtime = injectedRuntime ? runtimeOrConfig : {};
  const config = injectedRuntime ? maybeConfig : runtimeOrConfig;
  return defineSeedKit(runtime, { ...(config ?? {}), id: config?.id ?? GENERIC_SEED_KIT_DEFINITION.id }, GENERIC_SEED_KIT_DEFINITION);
}

export default createGenericSeedKit;
