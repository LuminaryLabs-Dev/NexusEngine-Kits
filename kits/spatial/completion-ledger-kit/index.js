import { resolveKitManifest } from "../../../installer/kit-catalog.js";
import { defineEvent } from "nexusengine";

export const kitId = "completion-ledger-kit";
export const kitManifest = resolveKitManifest(kitId);

function normalizeId(id) {
  const value = String(id ?? "").trim();
  if (!value) throw new TypeError("completion id is required");
  return value;
}

function cloneRecord(record) {
  return {
    id: record.id,
    count: record.count,
    completed: record.completed,
    repeatable: record.repeatable,
    tags: [...record.tags],
    data: { ...record.data },
    firstCompletedTick: record.firstCompletedTick,
    lastCompletedTick: record.lastCompletedTick
  };
}

function createLedgerState(seed = {}) {
  const records = new Map();
  for (const entry of seed.records ?? []) {
    const id = normalizeId(entry.id);
    records.set(id, {
      id,
      count: Number(entry.count ?? 0),
      completed: Boolean(entry.completed),
      repeatable: Boolean(entry.repeatable),
      tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
      data: entry.data && typeof entry.data === "object" ? { ...entry.data } : {},
      firstCompletedTick: entry.firstCompletedTick ?? null,
      lastCompletedTick: entry.lastCompletedTick ?? null
    });
  }
  return { records };
}

function createLedgerApi(state, config = {}) {
  const defaultRepeatable = Boolean(config.defaultRepeatable);

  function tickFrom(engine) {
    return engine?.tickCount ?? engine?.frame ?? null;
  }

  function getRecord(id) {
    return state.records.get(normalizeId(id)) ?? null;
  }

  function ensureRecord(id, options = {}) {
    const key = normalizeId(id);
    const existing = state.records.get(key);
    if (existing) return existing;
    const record = {
      id: key,
      count: 0,
      completed: false,
      repeatable: Boolean(options.repeatable ?? defaultRepeatable),
      tags: Array.isArray(options.tags) ? [...options.tags] : [],
      data: options.data && typeof options.data === "object" ? { ...options.data } : {},
      firstCompletedTick: null,
      lastCompletedTick: null
    };
    state.records.set(key, record);
    return record;
  }

  function complete(id, options = {}, engine = null) {
    const record = ensureRecord(id, options);
    if (record.completed && !record.repeatable && options.force !== true) {
      return { ok: false, id: record.id, reason: "already-completed", record: cloneRecord(record) };
    }

    record.count += 1;
    record.completed = true;
    if (typeof options.repeatable === "boolean") record.repeatable = options.repeatable;
    if (Array.isArray(options.tags)) record.tags = [...new Set([...record.tags, ...options.tags])];
    if (options.data && typeof options.data === "object") record.data = { ...record.data, ...options.data };

    const tick = tickFrom(engine);
    if (record.firstCompletedTick == null) record.firstCompletedTick = tick;
    record.lastCompletedTick = tick;

    return { ok: true, id: record.id, record: cloneRecord(record) };
  }

  function has(id) {
    return Boolean(getRecord(id)?.completed);
  }

  function count(id) {
    return getRecord(id)?.count ?? 0;
  }

  function reset(id = null) {
    if (id == null) {
      state.records.clear();
      return { ok: true, reset: "all" };
    }
    const key = normalizeId(id);
    return { ok: true, reset: key, deleted: state.records.delete(key) };
  }

  function snapshot() {
    return {
      version: 1,
      records: [...state.records.values()].map(cloneRecord).sort((a, b) => a.id.localeCompare(b.id))
    };
  }

  function loadSnapshot(snapshotValue = {}) {
    const next = createLedgerState(snapshotValue);
    state.records.clear();
    for (const [id, record] of next.records.entries()) state.records.set(id, record);
    return snapshot();
  }

  return {
    ensureRecord,
    complete,
    has,
    count,
    get: getRecord,
    reset,
    snapshot,
    loadSnapshot
  };
}

export function createCompletionLedgerKit(config = {}) {
  const state = createLedgerState(config.seed ?? {});

  const kit = {
    id: kitId,
    components: {},
    resources: {},
    events: {
      CompletionLedgerCompleted: defineEvent("completion-ledger-completed"),
      CompletionLedgerReset: defineEvent("completion-ledger-reset"),
      CompletionLedgerRejected: defineEvent("completion-ledger-rejected")
    },
    systems: [],
    requires: [],
    provides: ["kit:completion-ledger-kit", "domain:spatial"],
    bindings: {},
    metadata: {
      ...kitManifest,
      stability: "candidate",
      migrationPlaceholder: false,
      officialKitCatalog: true,
      realBehavior: true
    },
    initWorld({ engine } = {}) {
      const api = createLedgerApi(state, config);
      if (!engine.n) engine.n = {};
      engine.n.completionLedger = api;
      engine.completionLedger = api;
      if (!Array.isArray(engine.nexusEngineKitInstallReports)) engine.nexusEngineKitInstallReports = [];
      engine.nexusEngineKitInstallReports.push({
        id: kitId,
        domain: "spatial",
        stability: "candidate",
        placeholder: false,
        behavior: "completion-ledger"
      });
    },
    reset() {
      state.records.clear();
    },
    snapshot() {
      return createLedgerApi(state, config).snapshot();
    },
    loadSnapshot(snapshotValue) {
      return createLedgerApi(state, config).loadSnapshot(snapshotValue);
    }
  };

  return kit;
}

export default createCompletionLedgerKit;
