export const GENERIC_RESOURCE_LOOP_KIT_VERSION = "1.0.0";
export const RESOURCE_METER_ENGINE_NAMESPACE = "resourceMeter";
export const GENERIC_RESOURCE_LOOP_ENGINE_NAMESPACE = "genericResourceLoop";

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const toNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const asArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function requireNexus(NexusEngine) {
  for (const key of ["defineDomainServiceKit", "defineResource", "defineEvent"]) {
    if (typeof NexusEngine?.[key] !== "function") {
      throw new TypeError(`createGenericResourceLoopKit requires NexusEngine.${key}.`);
    }
  }
}

function stableId(value, label) {
  const id = String(value ?? "").trim();
  if (!id) throw new TypeError(`${label} requires a stable id.`);
  return id;
}

function normalizeThreshold(threshold = {}, index = 0) {
  const id = stableId(threshold.id ?? `threshold-${index + 1}`, "Resource thresholds");
  return {
    id,
    value: toNumber(threshold.value, 0),
    direction: threshold.direction === "above" ? "above" : "below",
    repeatable: threshold.repeatable !== false && threshold.once !== true,
    metadata: clone(threshold.metadata ?? {})
  };
}

function thresholdMatches(resource, threshold) {
  return threshold.direction === "above"
    ? resource.value >= threshold.value
    : resource.value <= threshold.value;
}

function classify(resource) {
  if (resource.locked) return "locked";
  if (resource.empty) return "empty";
  if (resource.full) return "full";
  return "active";
}

function thresholdStatesFor(resource) {
  return Object.fromEntries(resource.thresholds.map((threshold) => [threshold.id, thresholdMatches(resource, threshold)]));
}

export function normalizeResourceMeter(resource = {}, index = 0) {
  const id = stableId(resource.id ?? resource.name ?? `resource-${index + 1}`, "Resource meters");
  const min = toNumber(resource.min, 0);
  const max = Math.max(min, toNumber(resource.max, Math.max(100, min)));
  const initial = clamp(toNumber(resource.initial ?? resource.start ?? resource.value, max), min, max);
  const drainPerSecond = Math.max(0, toNumber(resource.drainPerSecond ?? resource.drain, 0));
  const recoverPerSecond = Math.max(0, toNumber(resource.recoverPerSecond ?? resource.recover, 0));
  const hasExplicitRate = resource.ratePerSecond != null || resource.rate != null;
  const ratePerSecond = hasExplicitRate
    ? toNumber(resource.ratePerSecond ?? resource.rate, 0)
    : recoverPerSecond - drainPerSecond;
  const thresholds = asArray(resource.thresholds).map(normalizeThreshold);
  const meter = {
    id,
    index: Number.isFinite(Number(resource.index)) ? Number(resource.index) : index,
    label: String(resource.label ?? id),
    initial,
    start: initial,
    value: initial,
    min,
    max,
    ratePerSecond,
    drainPerSecond: Math.max(0, -ratePerSecond),
    recoverPerSecond: Math.max(0, ratePerSecond),
    empty: initial <= min,
    depleted: initial <= min,
    full: initial >= max,
    locked: Boolean(resource.locked),
    status: "active",
    thresholds,
    thresholdStates: {},
    thresholdCrossCounts: Object.fromEntries(thresholds.map((threshold) => [threshold.id, 0])),
    tags: Array.from(new Set(asArray(resource.tags).map(String).filter(Boolean))),
    lastChangeReason: null,
    lastThresholdEvent: null,
    metadata: clone(resource.metadata ?? {})
  };
  meter.thresholdStates = thresholdStatesFor(meter);
  meter.status = classify(meter);
  return meter;
}

function normalizeMeters(resources, defaults = {}) {
  const ids = new Set();
  return asArray(resources).map((resource, index) => {
    const meter = normalizeResourceMeter({ ...defaults, ...resource }, index);
    if (ids.has(meter.id)) throw new TypeError(`Resource meter id ${meter.id} is duplicated.`);
    ids.add(meter.id);
    return meter;
  });
}

function createState(config = {}) {
  return rebuildState({
    version: GENERIC_RESOURCE_LOOP_KIT_VERSION,
    id: String(config.stateId ?? "resource-meter-service"),
    status: "ready",
    resources: normalizeMeters(config.resources, config.defaults),
    resourcesById: {},
    depleted: [],
    recentChanges: [],
    elapsedSeconds: 0,
    tick: 0,
    lastChange: null
  });
}

function rebuildState(state) {
  return {
    ...state,
    resourcesById: Object.fromEntries(state.resources.map((resource) => [resource.id, resource])),
    depleted: state.resources.filter((resource) => resource.empty).map((resource) => resource.id)
  };
}

function restoreMeter(resource = {}, index = 0) {
  const meter = normalizeResourceMeter(resource, index);
  meter.initial = clamp(toNumber(resource.initial ?? resource.start, meter.initial), meter.min, meter.max);
  meter.start = meter.initial;
  meter.value = clamp(toNumber(resource.value, meter.value), meter.min, meter.max);
  meter.empty = meter.value <= meter.min;
  meter.depleted = meter.empty;
  meter.full = meter.value >= meter.max;
  meter.locked = Boolean(resource.locked);
  meter.status = classify(meter);
  meter.thresholdStates = Object.fromEntries(meter.thresholds.map((threshold) => [
    threshold.id,
    Boolean(resource.thresholdStates?.[threshold.id] ?? thresholdMatches(meter, threshold))
  ]));
  meter.thresholdCrossCounts = Object.fromEntries(meter.thresholds.map((threshold) => [
    threshold.id,
    Math.max(0, Math.floor(toNumber(resource.thresholdCrossCounts?.[threshold.id], 0)))
  ]));
  meter.lastChangeReason = resource.lastChangeReason == null ? null : String(resource.lastChangeReason);
  meter.lastThresholdEvent = clone(resource.lastThresholdEvent ?? null);
  return meter;
}

function restoreState(snapshot, config = {}) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("Resource meter snapshots must be objects.");
  }
  if (snapshot.version !== GENERIC_RESOURCE_LOOP_KIT_VERSION) {
    throw new TypeError(`Unsupported resource meter snapshot version: ${snapshot.version}.`);
  }
  if (snapshot.status !== "ready") {
    throw new TypeError(`Invalid resource meter snapshot status: ${snapshot.status}.`);
  }
  const resources = asArray(snapshot.resources).map(restoreMeter);
  normalizeMeters(resources);
  return rebuildState({
    ...createState({ ...config, resources: [] }),
    id: String(snapshot.id ?? config.stateId ?? "resource-meter-service"),
    resources,
    recentChanges: clone(asArray(snapshot.recentChanges)),
    elapsedSeconds: Math.max(0, toNumber(snapshot.elapsedSeconds, 0)),
    tick: Math.max(0, Math.floor(toNumber(snapshot.tick, 0))),
    lastChange: clone(snapshot.lastChange ?? null)
  });
}

function descriptorFromMeter(resource) {
  const span = resource.max - resource.min;
  return {
    id: resource.id,
    kind: "resource-meter",
    label: resource.label,
    value: resource.value,
    min: resource.min,
    max: resource.max,
    normalized: span <= 0 ? 0 : (resource.value - resource.min) / span,
    ratePerSecond: resource.ratePerSecond,
    status: resource.status,
    empty: resource.empty,
    depleted: resource.depleted,
    full: resource.full,
    locked: resource.locked,
    tags: [...resource.tags],
    metadata: clone(resource.metadata)
  };
}

function applyValue(resource, nextValue, reason, shouldClamp = true) {
  const value = shouldClamp ? clamp(nextValue, resource.min, resource.max) : nextValue;
  const next = {
    ...resource,
    value,
    empty: value <= resource.min,
    depleted: value <= resource.min,
    full: value >= resource.max,
    lastChangeReason: reason,
    lastThresholdEvent: null,
    thresholdStates: { ...resource.thresholdStates },
    thresholdCrossCounts: { ...resource.thresholdCrossCounts }
  };
  next.status = classify(next);
  return next;
}

export function syncGenericResourceLoopEngineNamespace(engine) {
  if (!engine || typeof engine !== "object") return null;
  engine.n ??= {};
  const api = engine.n[RESOURCE_METER_ENGINE_NAMESPACE] ?? engine.n[GENERIC_RESOURCE_LOOP_ENGINE_NAMESPACE] ?? engine.genericResourceLoop;
  if (!api) return null;
  engine.n[RESOURCE_METER_ENGINE_NAMESPACE] = api;
  engine.n[GENERIC_RESOURCE_LOOP_ENGINE_NAMESPACE] = api;
  engine.resourceMeter = api;
  engine.genericResourceLoop = api;
  return api;
}

function createResourceMeterKitDefinition(NexusEngine, config = {}) {
  requireNexus(NexusEngine);
  const { defineDomainServiceKit, defineResource, defineEvent } = NexusEngine;
  const recentChangeLimit = Math.max(1, Math.floor(toNumber(config.recentChangeLimit, 64)));

  const ResourceLoopState = defineResource(config.resourceName ?? "resourceMeter.state");
  const Registered = defineEvent("genericResource.registered");
  const Removed = defineEvent("genericResource.removed");
  const SpendRequested = defineEvent("genericResource.spendRequested");
  const RestoreRequested = defineEvent("genericResource.restoreRequested");
  const Adjusted = defineEvent("genericResource.adjusted");
  const RateChanged = defineEvent("genericResource.rateChanged");
  const LockChanged = defineEvent("genericResource.lockChanged");
  const Changed = defineEvent("genericResource.changed");
  const ThresholdCrossed = defineEvent("genericResource.thresholdCrossed");
  const Emptied = defineEvent("genericResource.emptied");
  const Filled = defineEvent("genericResource.filled");
  const Rejected = defineEvent("genericResource.rejected");
  const Reset = defineEvent("genericResource.reset");
  const SnapshotLoaded = defineEvent("genericResource.snapshotLoaded");

  function currentState(world) {
    return world.getResource(ResourceLoopState) ?? createState(config);
  }

  function setState(world, state) {
    const next = rebuildState(state);
    world.setResource(ResourceLoopState, next);
    return next;
  }

  function appendChanges(state, changes) {
    const recentChanges = [...state.recentChanges, ...changes].slice(-recentChangeLimit);
    return { ...state, recentChanges, lastChange: clone(changes.at(-1) ?? state.lastChange) };
  }

  function reject(world, reason, payload = {}) {
    const event = { accepted: false, reason, ...clone(payload) };
    const state = setState(world, appendChanges(currentState(world), [event]));
    world.emit(Rejected, event);
    return { event, state };
  }

  function emitThresholds(world, before, after, reason) {
    const events = [];
    for (const threshold of after.thresholds) {
      const wasMatched = Boolean(before.thresholdStates?.[threshold.id]);
      const isMatched = thresholdMatches(after, threshold);
      const priorCount = Math.max(0, Math.floor(toNumber(after.thresholdCrossCounts?.[threshold.id], 0)));
      if (!wasMatched && isMatched && (threshold.repeatable || priorCount === 0)) {
        const event = {
          id: after.id,
          thresholdId: threshold.id,
          value: after.value,
          threshold: threshold.value,
          direction: threshold.direction,
          repeatable: threshold.repeatable,
          reason
        };
        events.push(event);
        after.thresholdCrossCounts[threshold.id] = priorCount + 1;
        after.lastThresholdEvent = event;
        world.emit(ThresholdCrossed, event);
      }
      after.thresholdStates[threshold.id] = isMatched;
    }
    return events;
  }

  function changeResource(world, id, requestedAmount, reason, eventDefinition, payload = {}) {
    const state = currentState(world);
    const resource = state.resourcesById[id];
    if (!resource) {
      reject(world, "unknown-resource", { id, reason });
      return null;
    }
    if (resource.locked && payload.allowLockedOverride !== true && config.allowLockedOverride !== true) {
      reject(world, "resource-locked", { id, reason });
      return clone(resource);
    }
    const after = applyValue(resource, resource.value + requestedAmount, reason, config.clamp !== false);
    const event = {
      accepted: true,
      id,
      before: resource.value,
      after: after.value,
      amount: after.value - resource.value,
      requestedAmount,
      reason,
      source: payload.source ?? reason,
      metadata: clone(payload.metadata ?? {})
    };
    const thresholdEvents = emitThresholds(world, resource, after, reason);
    world.emit(eventDefinition, event);
    if (eventDefinition !== Adjusted) world.emit(Adjusted, event);
    world.emit(Changed, event);
    if (!resource.empty && after.empty) world.emit(Emptied, event);
    if (!resource.full && after.full) world.emit(Filled, event);
    const resources = state.resources.map((entry) => entry.id === id ? after : entry);
    setState(world, appendChanges({ ...state, resources }, [event, ...thresholdEvents]));
    return clone(after);
  }

  function register(world, resource, payload = {}) {
    const state = currentState(world);
    const existing = state.resourcesById[String(resource?.id ?? resource?.name ?? "")];
    const index = existing?.index ?? state.resources.length;
    const normalized = normalizeResourceMeter(resource, index);
    const resources = existing
      ? state.resources.map((entry) => entry.id === normalized.id ? normalized : entry)
      : [...state.resources, normalized];
    const event = { id: normalized.id, replaced: Boolean(existing), reason: payload.reason ?? "register" };
    setState(world, appendChanges({ ...state, resources }, [event]));
    world.emit(Registered, event);
    return clone(normalized);
  }

  function remove(world, id, payload = {}) {
    const state = currentState(world);
    if (!state.resourcesById[id]) {
      reject(world, "unknown-resource", { id, reason: payload.reason ?? "remove" });
      return false;
    }
    const event = { id, reason: payload.reason ?? "remove" };
    setState(world, appendChanges({ ...state, resources: state.resources.filter((resource) => resource.id !== id) }, [event]));
    world.emit(Removed, event);
    return true;
  }

  function setRate(world, id, ratePerSecond, reason = "setRate") {
    const state = currentState(world);
    if (!state.resourcesById[id]) {
      reject(world, "unknown-resource", { id, reason });
      return null;
    }
    const rate = toNumber(ratePerSecond, 0);
    const resources = state.resources.map((resource) => resource.id === id ? {
      ...resource,
      ratePerSecond: rate,
      drainPerSecond: Math.max(0, -rate),
      recoverPerSecond: Math.max(0, rate),
      lastChangeReason: reason
    } : resource);
    const event = { id, ratePerSecond: rate, reason };
    setState(world, appendChanges({ ...state, resources }, [event]));
    world.emit(RateChanged, event);
    return clone(currentState(world).resourcesById[id]);
  }

  function setLocked(world, id, locked, reason = "setLocked") {
    const state = currentState(world);
    if (!state.resourcesById[id]) {
      reject(world, "unknown-resource", { id, reason });
      return null;
    }
    const resources = state.resources.map((resource) => {
      if (resource.id !== id) return resource;
      const next = { ...resource, locked: Boolean(locked), lastChangeReason: reason };
      next.status = classify(next);
      return next;
    });
    const event = { id, locked: Boolean(locked), reason };
    setState(world, appendChanges({ ...state, resources }, [event]));
    world.emit(LockChanged, event);
    return clone(currentState(world).resourcesById[id]);
  }

  function reset(world, payload = {}) {
    const next = createState({ ...config, stateId: payload.stateId ?? config.stateId, resources: payload.resources ?? config.resources ?? [] });
    world.setResource(ResourceLoopState, next);
    world.emit(Reset, { reason: payload.reason ?? "reset", count: next.resources.length });
    return clone(next);
  }

  function loadSnapshot(world, snapshot) {
    const next = restoreState(snapshot, config);
    world.setResource(ResourceLoopState, next);
    world.emit(SnapshotLoaded, { stateId: next.id, count: next.resources.length });
    return clone(next);
  }

  function system(world) {
    const state = currentState(world);
    const rawDelta = Math.max(0, toNumber(world.__nexusClock?.delta, 0));
    const maxDelta = config.maxDelta == null ? rawDelta : Math.max(0, toNumber(config.maxDelta, rawDelta));
    const dt = Math.min(rawDelta, maxDelta);
    const changes = [];
    const resources = state.resources.map((resource) => {
      if (resource.ratePerSecond === 0 || dt === 0 || resource.locked) return resource;
      const after = applyValue(resource, resource.value + resource.ratePerSecond * dt, "tick", config.clamp !== false);
      if (after.value === resource.value) return after;
      const event = {
        accepted: true,
        id: resource.id,
        before: resource.value,
        after: after.value,
        amount: after.value - resource.value,
        requestedAmount: resource.ratePerSecond * dt,
        reason: "tick",
        source: "passive-rate",
        metadata: {}
      };
      const thresholdEvents = emitThresholds(world, resource, after, "tick");
      world.emit(Changed, event);
      if (!resource.empty && after.empty) world.emit(Emptied, event);
      if (!resource.full && after.full) world.emit(Filled, event);
      changes.push(event, ...thresholdEvents);
      return after;
    });
    setState(world, appendChanges({
      ...state,
      resources,
      elapsedSeconds: state.elapsedSeconds + dt,
      tick: Math.max(0, Math.floor(toNumber(world.__nexusClock?.frame, state.tick)))
    }, changes));
  }

  function createApi(world) {
    return {
      resources: { ResourceLoopState },
      events: { Registered, Removed, SpendRequested, RestoreRequested, Adjusted, RateChanged, LockChanged, Changed, ThresholdCrossed, Emptied, Filled, Rejected, Reset, SnapshotLoaded },
      register: (resource, payload) => register(world, resource, payload),
      remove: (id, payload) => remove(world, id, payload),
      adjust: (id, amount, payload = {}) => changeResource(world, id, toNumber(amount, 0), payload.reason ?? payload.source ?? "adjust", Adjusted, payload),
      add: (id, amount, payload = {}) => changeResource(world, id, toNumber(amount, 0), payload.reason ?? payload.source ?? "add", Adjusted, payload),
      spend: (id, amount, reason = "spend", payload = {}) => changeResource(world, id, -Math.abs(toNumber(amount, 0)), reason, SpendRequested, payload),
      restore: (id, amount, reason = "restore", payload = {}) => changeResource(world, id, Math.abs(toNumber(amount, 0)), reason, RestoreRequested, payload),
      drain: (id, amountPerSecond, reason = "drain") => setRate(world, id, -Math.abs(toNumber(amountPerSecond, 0)), reason),
      setRate: (id, ratePerSecond, reason) => setRate(world, id, ratePerSecond, reason),
      setLocked: (id, locked, reason) => setLocked(world, id, locked, reason),
      reset: (payload) => reset(world, payload),
      loadSnapshot: (snapshot) => loadSnapshot(world, snapshot),
      getState: () => clone(currentState(world)),
      getSnapshot: () => clone(currentState(world)),
      snapshot: () => clone(currentState(world)),
      getResource: (id) => clone(currentState(world).resourcesById[id] ?? null),
      get: (id) => clone(currentState(world).resourcesById[id ?? currentState(world).resources[0]?.id] ?? null),
      getDescriptors: () => currentState(world).resources.map(descriptorFromMeter)
    };
  }

  return defineDomainServiceKit({
    id: config.kitId ?? config.id ?? "generic-resource-loop-kit",
    domain: "resource-meter-service",
    domainPath: "n:simulation:resource-meter-service",
    parentDomainPath: "n:simulation",
    apiName: RESOURCE_METER_ENGINE_NAMESPACE,
    stability: "official",
    version: GENERIC_RESOURCE_LOOP_KIT_VERSION,
    services: ["registry", "mutation", "passive-rate", "threshold", "descriptor", "snapshot"],
    provides: ["resource:loop", "resource:meters", "resource:meter-service", "validation:resources"],
    resources: { ResourceLoopState },
    events: { Registered, Removed, SpendRequested, RestoreRequested, Adjusted, RateChanged, LockChanged, Changed, ThresholdCrossed, Emptied, Filled, Rejected, Reset, SnapshotLoaded },
    systems: [{ phase: config.phase ?? "simulate", name: "resourceMeterServiceSystem", system }],
    initWorld({ world }) { world.setResource(ResourceLoopState, createState(config)); },
    createApi({ world }) { return createApi(world); },
    install({ engine }) { syncGenericResourceLoopEngineNamespace(engine); },
    bindings: { ResourceLoopState },
    metadata: {
      status: "official",
      officialKitCatalog: true,
      migrationPlaceholder: false,
      realBehavior: true,
      sourceProtoKitCommit: "9da1fdb979a878dff8f50565fec4a4952e58af5e",
      engineNamespace: `engine.n.${GENERIC_RESOURCE_LOOP_ENGINE_NAMESPACE}`,
      canonicalEngineNamespace: `engine.n.${RESOURCE_METER_ENGINE_NAMESPACE}`,
      parentDomain: "simulation",
      scope: "feature-domain",
      extendsBase: "nexusengine/core-simulation/resource-meter",
      composes: [],
      ownsLoop: true,
      purpose: "Deterministic resource meter registry, mutation, passive-rate, threshold, descriptor, and snapshot service.",
      boundary: "Owns resource meter collections and service behavior. Core owns the pure meter primitive; pressure policies, economy, inventory, controls, rendering, and game fiction remain separate."
    }
  });
}

export function createGenericResourceLoopKit(config = {}) {
  return createResourceMeterKitDefinition(NexusEngineRuntime, config);
}

export const createResourceMeterKit = createGenericResourceLoopKit;
export const createResourceMeterDomainKit = createGenericResourceLoopKit;
export default createGenericResourceLoopKit;
import * as NexusEngineRuntime from "nexusengine";

