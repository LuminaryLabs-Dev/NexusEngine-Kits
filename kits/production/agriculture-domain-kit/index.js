export const AGRICULTURE_DOMAIN_KIT_VERSION = "1.0.0";
export const AGRICULTURE_DOMAIN_PATH = "n:production:agriculture";
export const AGRICULTURE_ENGINE_NAMESPACE = "agriculture";

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const asArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp01 = (value) => Math.max(0, Math.min(1, finite(value, 0)));

function stableId(value, label) {
  const id = String(value ?? "").trim();
  if (!id) throw new TypeError(`${label} requires a stable id.`);
  return id;
}

function requireNexus(NexusEngine) {
  for (const key of ["defineDomainServiceKit", "defineResource", "defineEvent"]) {
    if (typeof NexusEngine?.[key] !== "function") {
      throw new TypeError(`createAgricultureDomainKit requires NexusEngine.${key}.`);
    }
  }
}

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeCrop(input = {}, index = 0) {
  const id = stableId(input.id ?? `crop-${index + 1}`, "Crop");
  const growthSeconds = Math.max(0.001, finite(input.growthSeconds, finite(input.growthDays, 1) * 60));
  const regrowSeconds = input.perennial
    ? Math.max(0.001, finite(input.regrowSeconds, finite(input.regrowDays, 1) * 60))
    : 0;
  return Object.freeze({
    id,
    label: String(input.label ?? id),
    seedItemId: input.seedItemId == null ? null : String(input.seedItemId),
    harvestItemId: stableId(input.harvestItemId ?? id, "Crop harvest item"),
    growthSeconds,
    regrowSeconds,
    stageCount: Math.max(1, Math.floor(finite(input.stageCount, 4))),
    yieldMin: Math.max(0, Math.floor(finite(input.yieldMin, 1))),
    yieldMax: Math.max(0, Math.floor(finite(input.yieldMax, input.yieldMin ?? 1))),
    waterRequired: input.waterRequired !== false,
    perennial: Boolean(input.perennial),
    seedReturnItemId: input.seedReturnItemId == null ? null : String(input.seedReturnItemId),
    seedReturnAmount: Math.max(0, Math.floor(finite(input.seedReturnAmount, 0))),
    preferredSoils: Object.freeze(asArray(input.preferredSoils).map(String)),
    metadata: Object.freeze(clone(input.metadata ?? {}))
  });
}

function normalizeCrops(input = {}) {
  const values = Array.isArray(input) ? input : Object.values(input);
  const crops = values.map(normalizeCrop);
  const ids = new Set();
  for (const crop of crops) {
    if (ids.has(crop.id)) throw new TypeError(`Duplicate crop id: ${crop.id}`);
    if (crop.yieldMax < crop.yieldMin) throw new RangeError(`Crop ${crop.id} yieldMax must be >= yieldMin.`);
    ids.add(crop.id);
  }
  return Object.freeze(Object.fromEntries(crops.map((crop) => [crop.id, crop])));
}

function normalizePlot(input = {}, index = 0, defaults = {}) {
  const id = stableId(input.id ?? `plot-${index + 1}`, "Plot");
  const soil = input.soil ?? {};
  return {
    id,
    status: input.status ?? "untilled",
    cropId: input.cropId ?? null,
    cropInstanceId: input.cropInstanceId ?? null,
    progressSeconds: Math.max(0, finite(input.progressSeconds, 0)),
    stage: Math.max(0, Math.floor(finite(input.stage, 0))),
    watered: Boolean(input.watered),
    wateredDay: input.wateredDay == null ? null : Math.floor(finite(input.wateredDay, 0)),
    harvestCount: Math.max(0, Math.floor(finite(input.harvestCount, 0))),
    regrowthCount: Math.max(0, Math.floor(finite(input.regrowthCount, 0))),
    revision: Math.max(1, Math.floor(finite(input.revision, 1))),
    position: clone(input.position ?? null),
    size: clone(input.size ?? null),
    soil: {
      type: String(soil.type ?? input.soilType ?? defaults.soilType ?? "loam"),
      prepared: Boolean(soil.prepared ?? (input.status !== "untilled")),
      moisture: clamp01(soil.moisture ?? defaults.moisture ?? 0.35),
      fertility: clamp01(soil.fertility ?? defaults.fertility ?? 0.75),
      amendments: Object.freeze(asArray(soil.amendments).map(String))
    },
    metadata: clone(input.metadata ?? {})
  };
}

function normalizePlots(input = [], defaults = {}) {
  const plots = asArray(input).map((plot, index) => normalizePlot(plot, index, defaults));
  const ids = new Set();
  for (const plot of plots) {
    if (ids.has(plot.id)) throw new TypeError(`Duplicate plot id: ${plot.id}`);
    ids.add(plot.id);
  }
  return Object.fromEntries(plots.map((plot) => [plot.id, plot]));
}

function createInitialState(config, crops) {
  return {
    schema: "nexusengine.agriculture/1",
    version: AGRICULTURE_DOMAIN_KIT_VERSION,
    id: String(config.stateId ?? "agriculture-state"),
    revision: 1,
    currentDay: Math.max(0, Math.floor(finite(config.initialDay, 0))),
    growthMode: config.growthMode === "daily" ? "daily" : "continuous",
    plots: normalizePlots(config.plots, config.soilDefaults),
    cropIds: Object.keys(crops).sort(),
    totalHarvests: 0,
    lastResult: null,
    journal: []
  };
}

function plotDescriptor(plot, crops) {
  const crop = plot.cropId ? crops[plot.cropId] ?? null : null;
  return Object.freeze({
    id: plot.id,
    kind: "agriculture-plot",
    status: plot.status,
    cropId: plot.cropId,
    cropLabel: crop?.label ?? null,
    cropInstanceId: plot.cropInstanceId,
    stage: plot.stage,
    stageCount: crop?.stageCount ?? 0,
    normalizedGrowth: crop ? clamp01(plot.progressSeconds / (plot.status === "regrowing" ? crop.regrowSeconds : crop.growthSeconds)) : 0,
    watered: plot.watered,
    soil: clone(plot.soil),
    position: clone(plot.position),
    size: clone(plot.size),
    perennial: Boolean(crop?.perennial),
    revision: plot.revision,
    metadata: clone(plot.metadata)
  });
}

function deterministicYield(crop, operationId, fertility = 1) {
  const span = crop.yieldMax - crop.yieldMin + 1;
  const hash = Number.parseInt(hashText(operationId).slice(-6), 16);
  const base = crop.yieldMin + (hash % Math.max(1, span));
  return Math.max(0, Math.round(base * (0.72 + clamp01(fertility) * 0.28)));
}

function ensureSnapshot(snapshot, initial, crops) {
  if (!snapshot || snapshot.schema !== "nexusengine.agriculture/1") {
    throw new TypeError("Unsupported agriculture snapshot schema.");
  }
  if (snapshot.version !== AGRICULTURE_DOMAIN_KIT_VERSION) {
    throw new TypeError(`Unsupported agriculture snapshot version: ${snapshot.version}.`);
  }
  const plots = { ...clone(initial.plots) };
  for (const [plotId, value] of Object.entries(snapshot.plots ?? {})) {
    if (!plots[plotId]) throw new TypeError(`Agriculture snapshot references unknown plot ${plotId}.`);
    const plot = normalizePlot({ ...plots[plotId], ...value, id: plotId }, 0, {});
    if (plot.cropId && !crops[plot.cropId]) throw new TypeError(`Agriculture snapshot references unknown crop ${plot.cropId}.`);
    plots[plotId] = plot;
  }
  return {
    ...clone(initial),
    ...clone(snapshot),
    plots,
    cropIds: Object.keys(crops).sort(),
    revision: Math.max(1, Math.floor(finite(snapshot.revision, 1)))
  };
}

export function createAgricultureDomainKit(NexusEngine, config = {}) {
  requireNexus(NexusEngine);
  const { defineDomainServiceKit, defineResource, defineEvent } = NexusEngine;
  const crops = normalizeCrops(config.cropDefinitions);
  const initial = createInitialState(config, crops);
  const journalLimit = Math.max(8, Math.floor(finite(config.journalLimit, 128)));

  const AgricultureState = defineResource(config.resourceName ?? "production.agriculture.state");
  const PlotPrepared = defineEvent("agriculture.plot.prepared");
  const CropPlanted = defineEvent("agriculture.crop.planted");
  const CropWatered = defineEvent("agriculture.crop.watered");
  const CropStageChanged = defineEvent("agriculture.crop.stageChanged");
  const CropReady = defineEvent("agriculture.crop.ready");
  const CropHarvested = defineEvent("agriculture.crop.harvested");
  const DayResolved = defineEvent("agriculture.day.resolved");
  const CommandRejected = defineEvent("agriculture.command.rejected");
  const SnapshotLoaded = defineEvent("agriculture.snapshot.loaded");
  const Reset = defineEvent("agriculture.reset");

  let engineRef = null;

  function read(world) {
    return world.getResource(AgricultureState) ?? clone(initial);
  }

  function write(world, next) {
    world.setResource(AgricultureState, next);
    return next;
  }

  function appendJournal(state, result) {
    return {
      ...state,
      journal: [...(state.journal ?? []), clone(result)].slice(-journalLimit),
      lastResult: clone(result)
    };
  }

  function reject(world, reason, payload = {}) {
    const result = { ok: false, reason, ...clone(payload) };
    const state = read(world);
    write(world, appendJournal({ ...state, revision: state.revision + 1 }, result));
    world.emit(CommandRejected, clone(result));
    return result;
  }

  function nextStage(plot, crop, elapsed) {
    const duration = plot.status === "regrowing" ? crop.regrowSeconds : crop.growthSeconds;
    const progressSeconds = Math.min(duration, plot.progressSeconds + elapsed);
    const normalized = clamp01(progressSeconds / duration);
    const stage = Math.min(crop.stageCount, Math.floor(normalized * crop.stageCount));
    const status = normalized >= 1 ? "ready" : plot.status;
    return { ...plot, progressSeconds, stage, status };
  }

  function continuousGrowthSystem(world) {
    if (!engineRef || initial.growthMode !== "continuous") return;
    const dt = Math.max(0, finite(world.__nexusClock?.delta, 0));
    if (dt <= 0) return;
    const state = read(world);
    let changed = false;
    const plots = { ...state.plots };
    for (const [plotId, plot] of Object.entries(state.plots)) {
      if (!["growing", "regrowing"].includes(plot.status) || !plot.cropId) continue;
      const crop = crops[plot.cropId];
      if (!crop) continue;
      const waterFactor = crop.waterRequired ? (plot.watered ? 1 : finite(config.unwateredGrowthRate, 0.58)) : 1;
      const fertilityFactor = 0.65 + clamp01(plot.soil.fertility) * 0.35;
      const next = nextStage(plot, crop, dt * waterFactor * fertilityFactor);
      if (next.progressSeconds === plot.progressSeconds && next.stage === plot.stage && next.status === plot.status) continue;
      plots[plotId] = { ...next, revision: plot.revision + 1 };
      changed = true;
      if (next.stage !== plot.stage) world.emit(CropStageChanged, { plotId, cropId: crop.id, stage: next.stage });
      if (next.status === "ready" && plot.status !== "ready") world.emit(CropReady, { plotId, cropId: crop.id });
    }
    if (changed) write(world, { ...state, plots, revision: state.revision + 1 });
  }

  function buildPlan(world, plotId, options = {}) {
    const id = stableId(plotId, "Agriculture plot");
    const state = read(world);
    const plot = state.plots[id];
    if (!plot) return { ok: false, reason: "unknown-plot", plotId: id };
    const actorId = String(options.actorId ?? "actor");
    const operationId = stableId(options.operationId, "Agriculture operation");
    let nextPlot = null;
    let result = null;
    let eventName = null;
    const resourceChanges = [];

    if (plot.status === "untilled") {
      nextPlot = { ...plot, status: "tilled", soil: { ...plot.soil, prepared: true } };
      result = { ok: true, action: "prepare", plotId: id, actorId };
      eventName = "prepared";
    } else if (plot.status === "tilled") {
      const cropId = stableId(options.cropId, "Planting crop");
      const crop = crops[cropId];
      if (!crop) return { ok: false, reason: "unknown-crop", plotId: id, cropId };
      if (crop.preferredSoils.length && !crop.preferredSoils.includes(plot.soil.type)) {
        return { ok: false, reason: "incompatible-soil", plotId: id, cropId, soilType: plot.soil.type };
      }
      if (crop.seedItemId) resourceChanges.push({ itemId: crop.seedItemId, amount: -1, reason: "plant" });
      nextPlot = {
        ...plot,
        status: "growing",
        cropId,
        cropInstanceId: `${id}:${cropId}:${hashText(operationId)}`,
        progressSeconds: 0,
        stage: 0,
        watered: false,
        wateredDay: null
      };
      result = { ok: true, action: "plant", plotId: id, cropId, seedItemId: crop.seedItemId, actorId };
      eventName = "planted";
    } else if (["growing", "regrowing"].includes(plot.status)) {
      if (plot.watered) return { ok: false, reason: "already-watered", plotId: id, cropId: plot.cropId };
      nextPlot = {
        ...plot,
        watered: true,
        wateredDay: state.currentDay,
        soil: { ...plot.soil, moisture: 1 }
      };
      result = { ok: true, action: "water", plotId: id, cropId: plot.cropId, actorId };
      eventName = "watered";
    } else if (plot.status === "ready") {
      const crop = crops[plot.cropId];
      if (!crop) return { ok: false, reason: "unknown-crop", plotId: id, cropId: plot.cropId };
      const amount = deterministicYield(crop, operationId, plot.soil.fertility);
      resourceChanges.push({ itemId: crop.harvestItemId, amount, reason: "harvest" });
      if (crop.seedReturnItemId && crop.seedReturnAmount > 0) {
        resourceChanges.push({ itemId: crop.seedReturnItemId, amount: crop.seedReturnAmount, reason: "seed-return" });
      }
      nextPlot = crop.perennial
        ? {
            ...plot,
            status: "regrowing",
            progressSeconds: 0,
            stage: Math.max(1, crop.stageCount - 2),
            watered: false,
            wateredDay: null,
            harvestCount: plot.harvestCount + 1,
            regrowthCount: plot.regrowthCount + 1
          }
        : {
            ...plot,
            status: "tilled",
            cropId: null,
            cropInstanceId: null,
            progressSeconds: 0,
            stage: 0,
            watered: false,
            wateredDay: null,
            harvestCount: plot.harvestCount + 1
          };
      result = { ok: true, action: "harvest", plotId: id, cropId: crop.id, itemId: crop.harvestItemId, amount, perennial: crop.perennial, actorId };
      eventName = "harvested";
    } else {
      return { ok: false, reason: "unsupported-plot-state", plotId: id, status: plot.status };
    }

    return Object.freeze({
      ok: true,
      id: `agriculture-plan:${hashText(`${operationId}:${plot.revision}:${eventName}`)}`,
      operationId,
      actorId,
      plotId: id,
      predecessorRevision: plot.revision,
      eventName,
      nextPlot: Object.freeze(clone(nextPlot)),
      resourceChanges: Object.freeze(resourceChanges.map((entry) => Object.freeze(entry))),
      result: Object.freeze(result)
    });
  }

  function commitPlan(world, plan, operationId = plan?.operationId) {
    if (!plan?.ok) return plan ?? reject(world, "invalid-plan");
    const opId = stableId(operationId, "Agriculture operation");
    const ledger = engineRef?.n?.coreTransactionLedger;
    if (!ledger) throw new Error("Agriculture requires engine.n.coreTransactionLedger.");
    return ledger.applyOnce("agriculture", opId, () => {
      const state = read(world);
      const current = state.plots[plan.plotId];
      if (!current) return reject(world, "unknown-plot", { plotId: plan.plotId });
      if (current.revision !== plan.predecessorRevision) {
        return reject(world, "stale-plan", { plotId: plan.plotId, expectedRevision: plan.predecessorRevision, actualRevision: current.revision });
      }
      const nextPlot = { ...clone(plan.nextPlot), revision: current.revision + 1 };
      const nextState = appendJournal({
        ...state,
        plots: { ...state.plots, [plan.plotId]: nextPlot },
        revision: state.revision + 1,
        totalHarvests: plan.eventName === "harvested" ? state.totalHarvests + 1 : state.totalHarvests
      }, plan.result);
      write(world, nextState);
      const event = { ...clone(plan.result), resourceChanges: clone(plan.resourceChanges), operationId: opId };
      if (plan.eventName === "prepared") world.emit(PlotPrepared, event);
      if (plan.eventName === "planted") world.emit(CropPlanted, event);
      if (plan.eventName === "watered") world.emit(CropWatered, event);
      if (plan.eventName === "harvested") world.emit(CropHarvested, event);
      return event;
    }, { plotId: plan.plotId, action: plan.eventName, actorId: plan.actorId });
  }

  function resolveDay(world, day, weather = {}, operationId) {
    const nextDay = Math.max(0, Math.floor(finite(day, read(world).currentDay + 1)));
    const opId = stableId(operationId ?? `agriculture:day:${nextDay}`, "Agriculture day operation");
    return engineRef.n.coreTransactionLedger.applyOnce("agriculture", opId, () => {
      const state = read(world);
      if (nextDay <= state.currentDay) return { ok: false, reason: "day-not-advanced", day: nextDay, currentDay: state.currentDay };
      const rainfall = clamp01(weather.rainfall ?? weather.rain ?? 0);
      const plots = { ...state.plots };
      for (const [plotId, plot] of Object.entries(state.plots)) {
        const moisture = clamp01(plot.soil.moisture * finite(config.dailyMoistureRetention, 0.58) + rainfall);
        let next = { ...plot, watered: rainfall >= finite(config.rainWaterThreshold, 0.35), wateredDay: rainfall >= finite(config.rainWaterThreshold, 0.35) ? nextDay : null, soil: { ...plot.soil, moisture } };
        if (["growing", "regrowing"].includes(plot.status) && plot.cropId) {
          const crop = crops[plot.cropId];
          const waterFactor = crop.waterRequired ? (plot.watered || rainfall >= finite(config.rainWaterThreshold, 0.35) ? 1 : finite(config.unwateredGrowthRate, 0.58)) : 1;
          const fertilityFactor = 0.65 + clamp01(plot.soil.fertility) * 0.35;
          next = nextStage(next, crop, finite(config.secondsPerResolvedDay, 60) * waterFactor * fertilityFactor);
          if (next.stage !== plot.stage) world.emit(CropStageChanged, { plotId, cropId: crop.id, stage: next.stage, day: nextDay });
          if (next.status === "ready" && plot.status !== "ready") world.emit(CropReady, { plotId, cropId: crop.id, day: nextDay });
        }
        plots[plotId] = { ...next, revision: plot.revision + 1 };
      }
      const result = { ok: true, action: "resolve-day", day: nextDay, rainfall };
      write(world, appendJournal({ ...state, currentDay: nextDay, plots, revision: state.revision + 1 }, result));
      world.emit(DayResolved, result);
      return result;
    }, { day: nextDay });
  }

  return defineDomainServiceKit({
    id: config.id ?? "agriculture-domain-kit",
    domain: "agriculture",
    domainPath: AGRICULTURE_DOMAIN_PATH,
    parentDomainPath: "n:production",
    apiName: config.apiName ?? AGRICULTURE_ENGINE_NAMESPACE,
    version: AGRICULTURE_DOMAIN_KIT_VERSION,
    stability: config.stability ?? "official",
    services: ["land", "soil", "cultivation", "water", "growth", "harvest", "perennials", "descriptors", "snapshot", "reset"],
    requires: ["n:core-transaction-ledger", ...(config.requires ?? [])],
    provides: ["production:agriculture", "agriculture:land", "agriculture:soil", "agriculture:cultivation", "agriculture:harvest", ...(config.provides ?? [])],
    resources: { AgricultureState },
    events: { PlotPrepared, CropPlanted, CropWatered, CropStageChanged, CropReady, CropHarvested, DayResolved, CommandRejected, SnapshotLoaded, Reset },
    systems: [{ phase: "simulate", name: "agricultureContinuousGrowthSystem", system: continuousGrowthSystem }],
    metadata: {
      purpose: "Renderer-agnostic agriculture authority for land, soil, cultivation, watering, growth, harvest, and perennial crops.",
      rendererAgnostic: true,
      deterministic: true,
      domainFamily: "production",
      noProductionParentRuntimeRequired: true,
      contentDefined: true,
      ...(config.metadata ?? {})
    },
    initWorld({ engine, world }) {
      engineRef = engine;
      write(world, clone(initial));
    },
    createApi({ world }) {
      const getState = () => clone(read(world));
      const getPlot = (plotId) => clone(read(world).plots[String(plotId)] ?? null);
      const listPlots = () => Object.values(read(world).plots).sort((a, b) => a.id.localeCompare(b.id)).map(clone);
      const descriptors = () => listPlots().map((plot) => plotDescriptor(plot, crops));
      return {
        cropDefinitions: crops,
        land: Object.freeze({ getPlot, listPlots, prepare: (plotId, operationId, actorId) => commitPlan(world, buildPlan(world, plotId, { operationId, actorId }), operationId) }),
        soil: Object.freeze({ inspect: (plotId) => clone(getPlot(plotId)?.soil ?? null) }),
        cultivation: Object.freeze({
          plan: (plotId, options) => buildPlan(world, plotId, options),
          commit: (plan, operationId) => commitPlan(world, plan, operationId),
          plant: (plotId, cropId, operationId, actorId) => commitPlan(world, buildPlan(world, plotId, { operationId, actorId, cropId }), operationId),
          inspect: getPlot
        }),
        water: Object.freeze({ apply: (plotId, operationId, actorId) => commitPlan(world, buildPlan(world, plotId, { operationId, actorId }), operationId) }),
        growth: Object.freeze({ resolveDay: (day, weather, operationId) => resolveDay(world, day, weather, operationId) }),
        harvest: Object.freeze({ plan: (plotId, options) => buildPlan(world, plotId, options), commit: (plan, operationId) => commitPlan(world, plan, operationId) }),
        perennials: Object.freeze({ list: () => Object.values(crops).filter((crop) => crop.perennial).map(clone) }),
        getState,
        getSnapshot: getState,
        getPlot,
        listPlots,
        getDescriptors: descriptors,
        planInteraction: (plotId, options) => buildPlan(world, plotId, options),
        commitPlan: (plan, operationId) => commitPlan(world, plan, operationId),
        interact(plotId, operationId, actorId = "actor", cropId = null) {
          const plan = buildPlan(world, plotId, { operationId, actorId, cropId });
          return plan.ok ? commitPlan(world, plan, operationId) : plan;
        },
        loadSnapshot(snapshot = {}) {
          const next = ensureSnapshot(snapshot, initial, crops);
          write(world, next);
          world.emit(SnapshotLoaded, { revision: next.revision });
          return clone(next);
        },
        reset() {
          write(world, clone(initial));
          world.emit(Reset, { revision: initial.revision });
          return clone(initial);
        }
      };
    }
  });
}

export default createAgricultureDomainKit;
