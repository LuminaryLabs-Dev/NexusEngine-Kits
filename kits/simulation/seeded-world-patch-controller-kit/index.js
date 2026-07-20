import { defineDomainServiceKit } from "nexusengine";

export const SEEDED_WORLD_PATCH_CONTROLLER_KIT_VERSION = "0.1.0";

const clone = (value) => value == null
  ? value
  : typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

function stableText(value, fallback, label) {
  const next = String(value ?? fallback ?? "").trim();
  if (!next) throw new TypeError(`${label} requires a non-empty value.`);
  return next;
}

function positiveInteger(value, fallback, label, minimum = 1) {
  const next = Number(value ?? fallback);
  if (!Number.isInteger(next) || next < minimum) throw new TypeError(`${label} must be an integer >= ${minimum}.`);
  return next;
}

function finite(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function vector2(value = {}, fallback = { x: 0, z: 0 }) {
  return {
    x: finite(value.x, fallback.x),
    z: finite(value.z, fallback.z)
  };
}

function normalize2(value = {}, fallback = { x: 0, z: 1 }) {
  const next = vector2(value, fallback);
  const length = Math.hypot(next.x, next.z);
  if (length < 1e-8) return { ...fallback };
  return { x: next.x / length, z: next.z / length };
}

function patchId(x, z) {
  return `${x}:${z}`;
}

function stableHash(value) {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createController(options = {}, seedApi) {
  const id = stableText(options.id, null, "World patch controller");
  const patchSize = positiveInteger(options.patchSize, 64, "Patch size");
  const activeRadius = positiveInteger(options.activeRadius, 2, "Active radius", 0);
  const retainRadius = positiveInteger(options.retainRadius, Math.max(activeRadius + 1, 3), "Retain radius", activeRadius);
  const prefetchDistance = positiveInteger(options.prefetchDistance, 2, "Prefetch distance", 0);
  const cacheLimit = positiveInteger(options.cacheLimit, 96, "Patch cache limit");
  const activationBudget = positiveInteger(options.activationBudget, 1, "Activation budget");
  const generationBudget = positiveInteger(options.generationBudget, 2, "Generation budget");
  const generatorVersion = stableText(options.generatorVersion, "v1", "Generator version");
  const terrainSettingsHash = stableText(options.terrainSettingsHash, "terrain-default", "Terrain settings hash");
  const vegetationSettingsHash = stableText(options.vegetationSettingsHash, "vegetation-default", "Vegetation settings hash");
  const worldSeed = stableText(options.worldSeed ?? options.seed, seedApi?.getWorldSeed?.() ?? "nexusengine", "World seed");
  const priorityPolicy = typeof options.priorityPolicy === "function"
    ? options.priorityPolicy
    : typeof options.priorityPolicy?.score === "function"
      ? options.priorityPolicy.score.bind(options.priorityPolicy)
      : null;
  const priorityPolicyId = stableText(
    options.priorityPolicyId ?? options.priorityPolicy?.id,
    priorityPolicy ? "custom" : "distance-first-v1",
    "Priority policy id"
  );

  let generator = typeof options.generator === "function" ? options.generator : null;
  let executor = options.executor ?? null;
  let focus = {
    position: { x: 0, z: 0 },
    velocity: { x: 0, z: 0 },
    forward: { x: 0, z: 1 },
    center: { x: 0, z: 0 }
  };
  let sequence = 0;
  const records = new Map();
  const queued = new Set();
  const inflight = new Set();
  const queue = [];
  const readyQueue = [];
  const prefetchReadyQueue = [];
  const active = new Set();
  const presentationPrefetched = new Set();
  const desiredActive = new Set();
  const desiredPrefetch = new Set();
  const released = new Set();
  const diagnostics = [];

  function cacheKey(x, z) {
    return `${worldSeed}:${generatorVersion}:${x}:${z}:${terrainSettingsHash}:${vegetationSettingsHash}`;
  }

  function queueOnce(target, idValue) {
    if (!target.includes(idValue)) target.push(idValue);
  }

  function makeRequest(x, z, priority = 0, reason = "active") {
    const idValue = patchId(x, z);
    return {
      controllerId: id,
      requestId: `${id}:${++sequence}`,
      patchId: idValue,
      cacheKey: cacheKey(x, z),
      x,
      z,
      patchSize,
      worldSeed,
      generatorVersion,
      terrainSettingsHash,
      vegetationSettingsHash,
      priority,
      reason
    };
  }

  function getOrCreateRecord(x, z) {
    const idValue = patchId(x, z);
    let record = records.get(idValue);
    if (!record) {
      record = {
        id: idValue,
        key: cacheKey(x, z),
        x,
        z,
        status: "missing",
        patch: null,
        priority: Infinity,
        reason: "unknown",
        prefetchStep: null,
        lastTouched: sequence,
        error: null
      };
      records.set(idValue, record);
    }
    record.lastTouched = ++sequence;
    return record;
  }

  function priorityFor(cell, reason) {
    const fallback = reason === "active" ? cell.distance : 100 + cell.step;
    if (!priorityPolicy) return fallback;
    const offsetX = cell.x - focus.center.x;
    const offsetZ = cell.z - focus.center.z;
    const forwardDot = offsetX * focus.forward.x + offsetZ * focus.forward.z;
    const lateralDistance = Math.abs(offsetX * focus.forward.z - offsetZ * focus.forward.x);
    const context = Object.freeze({
      controllerId: id,
      reason,
      x: cell.x,
      z: cell.z,
      patchId: patchId(cell.x, cell.z),
      step: Number(cell.step ?? 0),
      distance: Number(cell.distance ?? Math.max(Math.abs(offsetX), Math.abs(offsetZ))),
      offsetX,
      offsetZ,
      forwardDot,
      lateralDistance,
      activeRadius,
      retainRadius,
      prefetchDistance,
      patchSize,
      focus: clone(focus)
    });
    const value = Number(priorityPolicy(context));
    if (!Number.isFinite(value)) {
      throw new TypeError(`Priority policy ${priorityPolicyId} returned a non-finite value for ${context.patchId}.`);
    }
    return value;
  }

  function markRecordReady(record) {
    if (!record?.patch) return;
    if (active.has(record.id)) {
      record.status = "active";
      return;
    }
    if (presentationPrefetched.has(record.id)) {
      record.status = "presentation-prefetched";
      return;
    }
    if (desiredActive.has(record.id)) {
      record.status = "ready";
      queueOnce(readyQueue, record.id);
      return;
    }
    if (desiredPrefetch.has(record.id)) {
      record.status = "presentation-ready";
      queueOnce(prefetchReadyQueue, record.id);
      return;
    }
    record.status = "cached";
  }

  function enqueue(record, priority, reason, step = null) {
    if (priority < record.priority) {
      record.priority = priority;
      record.reason = reason;
    }
    if (step != null) record.prefetchStep = record.prefetchStep == null ? step : Math.min(record.prefetchStep, step);
    if (record.patch) {
      markRecordReady(record);
      return;
    }
    if (queued.has(record.id) || inflight.has(record.id)) return;
    record.status = "requested";
    queued.add(record.id);
    queue.push(record.id);
  }

  function activeCoordinates(centerX, centerZ) {
    const output = [];
    for (let z = centerZ - activeRadius; z <= centerZ + activeRadius; z += 1) {
      for (let x = centerX - activeRadius; x <= centerX + activeRadius; x += 1) {
        output.push({ x, z, distance: Math.max(Math.abs(x - centerX), Math.abs(z - centerZ)) });
      }
    }
    return output;
  }

  function prefetchCoordinatesForStep(centerX, centerZ, forward, step) {
    const output = [];
    const x = centerX + Math.round(forward.x * (activeRadius + step));
    const z = centerZ + Math.round(forward.z * (activeRadius + step));
    for (let sideZ = -1; sideZ <= 1; sideZ += 1) {
      for (let sideX = -1; sideX <= 1; sideX += 1) {
        output.push({ x: x + sideX, z: z + sideZ, step });
      }
    }
    return output;
  }

  function prefetchCoordinates(centerX, centerZ, forward) {
    const output = new Map();
    for (let step = 1; step <= prefetchDistance; step += 1) {
      for (const cell of prefetchCoordinatesForStep(centerX, centerZ, forward, step)) {
        const idValue = patchId(cell.x, cell.z);
        const previous = output.get(idValue);
        if (!previous || cell.step < previous.step) output.set(idValue, cell);
      }
    }
    return [...output.values()];
  }

  function insideRetainRing(record, centerX, centerZ) {
    return Math.max(Math.abs(record.x - centerX), Math.abs(record.z - centerZ)) <= retainRadius;
  }

  function evict() {
    const candidates = [...records.values()]
      .filter((record) =>
        !active.has(record.id)
        && !presentationPrefetched.has(record.id)
        && !desiredActive.has(record.id)
        && !desiredPrefetch.has(record.id)
        && !inflight.has(record.id)
      )
      .sort((left, right) => left.lastTouched - right.lastTouched);
    while (records.size > cacheLimit && candidates.length) {
      const record = candidates.shift();
      records.delete(record.id);
      queued.delete(record.id);
      record.patch = null;
    }
  }

  function setFocus(next = {}) {
    const position = vector2(next.position ?? next);
    const velocity = vector2(next.velocity);
    const forward = normalize2(next.forward ?? (Math.hypot(velocity.x, velocity.z) > 1e-8 ? velocity : focus.forward));
    focus = {
      position,
      velocity,
      forward,
      center: {
        x: Math.floor(position.x / patchSize),
        z: Math.floor(position.z / patchSize)
      }
    };
    return clone(focus);
  }

  function update() {
    const { x: centerX, z: centerZ } = focus.center;
    desiredActive.clear();
    desiredPrefetch.clear();

    for (const idValue of queued) {
      const record = records.get(idValue);
      if (!record) continue;
      record.priority = Infinity;
      record.reason = "unknown";
      record.prefetchStep = null;
    }

    for (const cell of activeCoordinates(centerX, centerZ)) {
      const idValue = patchId(cell.x, cell.z);
      desiredActive.add(idValue);
      desiredPrefetch.add(idValue);
      enqueue(getOrCreateRecord(cell.x, cell.z), priorityFor(cell, "active"), "active");
    }

    for (const cell of prefetchCoordinates(centerX, centerZ, focus.forward)) {
      const idValue = patchId(cell.x, cell.z);
      if (desiredActive.has(idValue)) continue;
      desiredPrefetch.add(idValue);
      enqueue(getOrCreateRecord(cell.x, cell.z), priorityFor(cell, "prefetch"), "prefetch", cell.step);
    }

    for (const idValue of [...active]) {
      if (desiredActive.has(idValue)) continue;
      active.delete(idValue);
      released.add(idValue);
      const record = records.get(idValue);
      if (record) record.status = insideRetainRing(record, centerX, centerZ) ? "retained" : "cached";
    }

    for (const idValue of [...presentationPrefetched]) {
      if (desiredPrefetch.has(idValue)) continue;
      presentationPrefetched.delete(idValue);
      released.add(idValue);
      const record = records.get(idValue);
      if (record) record.status = insideRetainRing(record, centerX, centerZ) ? "retained" : "cached";
    }

    for (const idValue of desiredPrefetch) {
      const record = records.get(idValue);
      if (record?.patch) markRecordReady(record);
    }

    evict();
    return getStats();
  }

  function runRequest(record) {
    if (!generator) throw new Error(`World patch controller ${id} has no generator.`);
    const request = makeRequest(record.x, record.z, record.priority, record.reason);
    const run = typeof executor === "function" ? executor : executor?.run?.bind(executor);
    if (run) return Promise.resolve(run(request, generator));
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(generator(request));
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }

  function startRecord(record) {
    queued.delete(record.id);
    inflight.add(record.id);
    record.status = "generating";
    record.error = null;
    runRequest(record).then((patch) => {
      if (!patch || typeof patch !== "object") throw new TypeError(`Patch generator returned no patch for ${record.id}.`);
      record.patch = patch;
      record.priority = Infinity;
      record.lastTouched = ++sequence;
      markRecordReady(record);
    }).catch((error) => {
      record.status = "error";
      record.error = String(error?.message ?? error);
      diagnostics.push({ patchId: record.id, type: "generation-error", message: record.error });
    }).finally(() => {
      inflight.delete(record.id);
      evict();
    });
  }

  function pump(optionsInput = {}) {
    const maximum = positiveInteger(optionsInput.maximum, generationBudget, "Generation maximum");
    queue.sort((leftId, rightId) => {
      const left = records.get(leftId);
      const right = records.get(rightId);
      return (left?.priority ?? Infinity) - (right?.priority ?? Infinity) || leftId.localeCompare(rightId);
    });
    let started = 0;
    while (started < maximum && queue.length) {
      const idValue = queue.shift();
      const record = records.get(idValue);
      if (!record || record.patch || inflight.has(idValue)) {
        queued.delete(idValue);
        continue;
      }
      startRecord(record);
      started += 1;
    }
    return { started, queued: queue.length, inflight: inflight.size };
  }

  function generateSync(x, z) {
    if (!generator) throw new Error(`World patch controller ${id} has no generator.`);
    const record = getOrCreateRecord(Number(x), Number(z));
    if (!record.patch) record.patch = generator(makeRequest(record.x, record.z, 0, "prime"));
    record.lastTouched = ++sequence;
    markRecordReady(record);
    return record.patch;
  }

  function primePatch(x, z, patch) {
    const record = getOrCreateRecord(Number(x), Number(z));
    record.patch = patch;
    record.lastTouched = ++sequence;
    markRecordReady(record);
    return record.id;
  }

  function takeReadyPatches(optionsInput = {}) {
    const maximum = positiveInteger(optionsInput.maximum, activationBudget, "Activation maximum");
    const output = [];
    while (output.length < maximum && readyQueue.length) {
      const idValue = readyQueue.shift();
      const record = records.get(idValue);
      if (!record?.patch || active.has(idValue) || presentationPrefetched.has(idValue) || !desiredActive.has(idValue)) continue;
      active.add(idValue);
      record.status = "active";
      record.lastTouched = ++sequence;
      output.push({ id: record.id, key: record.key, x: record.x, z: record.z, patch: record.patch, promoted: false });
    }
    return output;
  }

  function takeReadyPrefetchPatches(optionsInput = {}) {
    const maximum = positiveInteger(optionsInput.maximum, activationBudget, "Presentation-prefetch activation maximum");
    const output = [];
    while (output.length < maximum && prefetchReadyQueue.length) {
      const idValue = prefetchReadyQueue.shift();
      const record = records.get(idValue);
      if (
        !record?.patch
        || active.has(idValue)
        || presentationPrefetched.has(idValue)
        || desiredActive.has(idValue)
        || !desiredPrefetch.has(idValue)
      ) continue;
      presentationPrefetched.add(idValue);
      record.status = "presentation-prefetched";
      record.lastTouched = ++sequence;
      output.push({
        id: record.id,
        key: record.key,
        x: record.x,
        z: record.z,
        patch: record.patch,
        presentationOnly: true
      });
    }
    return output;
  }

  function promotePrefetchPatch(idValue) {
    const key = String(idValue);
    const record = records.get(key);
    if (!record?.patch || !presentationPrefetched.has(key) || !desiredActive.has(key)) return null;
    presentationPrefetched.delete(key);
    active.add(key);
    record.status = "active";
    record.lastTouched = ++sequence;
    return {
      id: record.id,
      key: record.key,
      x: record.x,
      z: record.z,
      patch: record.patch,
      promoted: true
    };
  }

  function takeReleasedPatchIds() {
    const output = [...released].sort();
    released.clear();
    return output;
  }

  function getForwardReadiness(optionsInput = {}) {
    const targetIds = Array.isArray(optionsInput.patchIds)
      ? [...new Set(optionsInput.patchIds.map(String))].sort()
      : [...desiredPrefetch].filter((idValue) => !desiredActive.has(idValue)).sort();
    const generatedPatchIds = [];
    const presentationReadyPatchIds = [];
    const presentationPrefetchedPatchIds = [];
    const activePatchIds = [];
    const readyPatchIds = [];
    for (const idValue of targetIds) {
      const record = records.get(idValue);
      if (record?.patch) generatedPatchIds.push(idValue);
      if (record?.status === "presentation-ready") presentationReadyPatchIds.push(idValue);
      if (presentationPrefetched.has(idValue)) presentationPrefetchedPatchIds.push(idValue);
      if (active.has(idValue)) activePatchIds.push(idValue);
      if (presentationPrefetched.has(idValue) || active.has(idValue)) readyPatchIds.push(idValue);
    }

    const steps = [];
    let contiguousSteps = 0;
    for (let step = 1; step <= prefetchDistance; step += 1) {
      const patchIds = [...new Set(prefetchCoordinatesForStep(focus.center.x, focus.center.z, focus.forward, step)
        .map((cell) => patchId(cell.x, cell.z)))].sort();
      const presented = patchIds.filter((idValue) => active.has(idValue) || presentationPrefetched.has(idValue));
      const complete = presented.length === patchIds.length;
      steps.push({ step, patchIds, presentedPatchIds: presented, complete });
      if (complete && contiguousSteps === step - 1) contiguousSteps = step;
    }

    return {
      controllerId: id,
      priorityPolicyId,
      patchSize,
      required: targetIds.length,
      generated: generatedPatchIds.length,
      presentationReady: presentationReadyPatchIds.length,
      presentationPrefetched: presentationPrefetchedPatchIds.length,
      simulationActive: activePatchIds.length,
      ready: readyPatchIds.length,
      forwardBufferedSteps: contiguousSteps,
      forwardBufferedMeters: contiguousSteps * patchSize,
      targetPatchIds: targetIds,
      generatedPatchIds,
      presentationReadyPatchIds,
      presentationPrefetchedPatchIds,
      activePatchIds,
      readyPatchIds,
      steps
    };
  }

  function getStats() {
    const statuses = {};
    for (const record of records.values()) statuses[record.status] = (statuses[record.status] ?? 0) + 1;
    const forward = getForwardReadiness();
    return {
      id,
      worldSeed,
      generatorVersion,
      patchSize,
      activeRadius,
      retainRadius,
      prefetchDistance,
      cacheLimit,
      activationBudget,
      generationBudget,
      priorityPolicyId,
      focus: clone(focus),
      desiredActive: desiredActive.size,
      desiredPrefetch: desiredPrefetch.size,
      active: active.size,
      presentationPrefetched: presentationPrefetched.size,
      cached: records.size,
      ready: readyQueue.length,
      presentationReady: prefetchReadyQueue.length,
      queued: queue.length,
      inflight: inflight.size,
      releasedPending: released.size,
      forwardBufferedSteps: forward.forwardBufferedSteps,
      forwardBufferedMeters: forward.forwardBufferedMeters,
      statuses,
      diagnostics: diagnostics.slice(-16).map(clone)
    };
  }

  function getSnapshot() {
    return {
      version: SEEDED_WORLD_PATCH_CONTROLLER_KIT_VERSION,
      status: "ready",
      id,
      config: {
        worldSeed,
        generatorVersion,
        patchSize,
        activeRadius,
        retainRadius,
        prefetchDistance,
        cacheLimit,
        activationBudget,
        generationBudget,
        priorityPolicyId,
        terrainSettingsHash,
        vegetationSettingsHash
      },
      focus: clone(focus),
      activePatchIds: [...active].sort(),
      presentationPrefetchedPatchIds: [...presentationPrefetched].sort(),
      cachedPatchIds: [...records.keys()].sort(),
      cacheDigest: stableHash([...records.values()].map((record) => `${record.key}:${record.status}`).sort().join("|")),
      stats: getStats()
    };
  }

  function reset() {
    records.clear();
    queued.clear();
    inflight.clear();
    queue.length = 0;
    readyQueue.length = 0;
    prefetchReadyQueue.length = 0;
    active.clear();
    presentationPrefetched.clear();
    desiredActive.clear();
    desiredPrefetch.clear();
    released.clear();
    diagnostics.length = 0;
    sequence = 0;
    return getSnapshot();
  }

  return Object.freeze({
    id,
    get worldSeed() { return worldSeed; },
    get patchSize() { return patchSize; },
    setGenerator(next) {
      if (typeof next !== "function") throw new TypeError("setGenerator expects a function.");
      generator = next;
      return true;
    },
    setExecutor(next) {
      if (next != null && typeof next !== "function" && typeof next?.run !== "function") {
        throw new TypeError("setExecutor expects a function, an object with run(), or null.");
      }
      executor = next;
      return true;
    },
    setFocus,
    update,
    pump,
    generateSync,
    primePatch,
    takeReadyPatches,
    takeReadyPrefetchPatches,
    promotePrefetchPatch,
    takeReleasedPatchIds,
    hasPatch(idValue) { return Boolean(records.get(String(idValue))?.patch); },
    getPatch(idValue) { return records.get(String(idValue))?.patch ?? null; },
    getActivePatchIds() { return [...active].sort(); },
    getPresentationPrefetchedPatchIds() { return [...presentationPrefetched].sort(); },
    getDesiredActivePatchIds() { return [...desiredActive].sort(); },
    getDesiredPrefetchPatchIds() { return [...desiredPrefetch].sort(); },
    getForwardReadiness,
    getStats,
    getSnapshot,
    loadSnapshot(snapshot = {}) {
      if (snapshot.version !== SEEDED_WORLD_PATCH_CONTROLLER_KIT_VERSION || snapshot.status !== "ready") {
        throw new TypeError("Unsupported seeded world patch controller snapshot.");
      }
      reset();
      setFocus(snapshot.focus ?? {});
      update();
      return getSnapshot();
    },
    reset
  });
}

export function createMessageWorkerExecutor(worker, options = {}) {
  if (!worker || typeof worker.postMessage !== "function") throw new TypeError("createMessageWorkerExecutor expects a Worker-like object.");
  const requestType = options.requestType ?? "generate-patch";
  const responseType = options.responseType ?? "patch-generated";
  const errorType = options.errorType ?? "patch-error";
  const pending = new Map();

  const onMessage = (event) => {
    const message = event?.data ?? event;
    if (!message?.requestId || !pending.has(message.requestId)) return;
    const entry = pending.get(message.requestId);
    if (message.type === responseType) {
      pending.delete(message.requestId);
      entry.resolve(message.patch ?? message.payload);
    } else if (message.type === errorType) {
      pending.delete(message.requestId);
      entry.reject(new Error(message.error ?? `Worker failed request ${message.requestId}.`));
    }
  };
  worker.addEventListener?.("message", onMessage);

  return Object.freeze({
    run(request) {
      return new Promise((resolve, reject) => {
        pending.set(request.requestId, { resolve, reject });
        worker.postMessage({ type: requestType, requestId: request.requestId, request });
      });
    },
    dispose() {
      worker.removeEventListener?.("message", onMessage);
      for (const { reject } of pending.values()) reject(new Error("Worker executor disposed."));
      pending.clear();
      worker.terminate?.();
    }
  });
}

function createApi(config, seedApi) {
  const initialControllers = Array.isArray(config.controllers) ? config.controllers : [];
  const controllers = new Map();

  function create(options = {}) {
    const id = stableText(options.id, null, "World patch controller");
    if (controllers.has(id) && options.replace !== true) return controllers.get(id);
    const controller = createController({ ...options, id }, seedApi);
    controllers.set(id, controller);
    return controller;
  }

  function getSnapshot() {
    return {
      version: SEEDED_WORLD_PATCH_CONTROLLER_KIT_VERSION,
      status: "ready",
      controllers: [...controllers.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((controller) => controller.getSnapshot())
    };
  }

  function reset() {
    for (const controller of controllers.values()) controller.reset();
    controllers.clear();
    for (const options of initialControllers) create(options);
    return getSnapshot();
  }

  reset();
  return Object.freeze({
    create,
    has(id) { return controllers.has(String(id)); },
    get(id) {
      const controller = controllers.get(String(id));
      if (!controller) throw new RangeError(`Unknown seeded world patch controller: ${id}`);
      return controller;
    },
    remove(id) {
      const key = String(id);
      controllers.get(key)?.reset();
      return controllers.delete(key);
    },
    list() { return [...controllers.values()].map((controller) => controller.getStats()); },
    getSnapshot,
    getState: getSnapshot,
    loadSnapshot(snapshot = {}) {
      if (snapshot.version !== SEEDED_WORLD_PATCH_CONTROLLER_KIT_VERSION || snapshot.status !== "ready") {
        throw new TypeError("Unsupported seeded world patch controller service snapshot.");
      }
      controllers.clear();
      for (const controllerSnapshot of snapshot.controllers ?? []) {
        const controller = create({ id: controllerSnapshot.id, ...(controllerSnapshot.config ?? {}) });
        controller.loadSnapshot(controllerSnapshot);
      }
      return getSnapshot();
    },
    reset
  });
}

export function createSeededWorldPatchControllerKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "seeded-world-patch-controller-kit",
    domain: "seeded-world-patch-controller",
    domainPath: "n:simulation:seeded-world-patch-controller",
    parentDomainPath: "n:simulation",
    apiName: config.apiName ?? "seededWorldPatchController",
    version: SEEDED_WORLD_PATCH_CONTROLLER_KIT_VERSION,
    stability: "candidate",
    services: ["patch-identity", "patch-cache", "active-ring", "prefetch-ring", "generation-queue", "activation-budget", "cache-eviction"],
    requires: ["random:stream"],
    provides: [
      "world:seeded-patch-controller",
      "world:patch-cache",
      "world:patch-prefetch",
      "world:patch-activation-budget"
    ],
    createApi({ engine }) {
      return createApi(config, engine.n.seedStream);
    },
    metadata: {
      domainFamily: "simulation",
      rendererAgnostic: true,
      workerOptional: true,
      ownsLoop: false,
      boundary: "Owns deterministic patch identity, cache records, active/retained/prefetch sets, generation priority, ready delivery, activation budgets, and eviction. Generators own patch content; worker adapters own execution; renderers own GPU uploads and scene objects."
    }
  });
}

export default createSeededWorldPatchControllerKit;
