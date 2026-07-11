import { defineDomainServiceKit } from "nexusengine";

export const INSTANCED_RENDER_BATCH_KIT_VERSION = "0.1.0";

const clone = (value) => value == null
  ? value
  : typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

function stableId(value, fallback, label) {
  const next = String(value ?? fallback ?? "").trim();
  if (!next) throw new TypeError(`${label} requires a non-empty id.`);
  return next;
}

function positiveInteger(value, fallback, label) {
  const next = Number(value ?? fallback);
  if (!Number.isInteger(next) || next < 1) throw new TypeError(`${label} must be a positive integer.`);
  return next;
}

function vector3(value, fallback = [0, 0, 0]) {
  const source = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
  return [0, 1, 2].map((index) => {
    const next = Number(source[index]);
    return Number.isFinite(next) ? next : Number(fallback[index] ?? 0);
  });
}

function matrixScale(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 16) return [1, 1, 1];
  return [
    Math.hypot(matrix[0], matrix[1], matrix[2]) || 1,
    Math.hypot(matrix[4], matrix[5], matrix[6]) || 1,
    Math.hypot(matrix[8], matrix[9], matrix[10]) || 1
  ];
}

function matrixPosition(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 16) return [0, 0, 0];
  return vector3([matrix[12], matrix[13], matrix[14]]);
}

function normalizeBounds(bounds, position, scale) {
  if (bounds?.min && bounds?.max) {
    return { min: vector3(bounds.min), max: vector3(bounds.max) };
  }
  const half = scale.map((value) => Math.abs(value) * 0.5);
  return {
    min: position.map((value, index) => value - half[index]),
    max: position.map((value, index) => value + half[index])
  };
}

function normalizeInstance(instance = {}, cellId, index) {
  const matrix = Array.isArray(instance.matrix) && instance.matrix.length === 16
    ? instance.matrix.map(Number)
    : null;
  const position = vector3(instance.position ?? matrixPosition(matrix));
  const scale = vector3(instance.scale ?? matrixScale(matrix), [1, 1, 1]);
  return Object.freeze({
    id: stableId(instance.id, `${cellId}:${index}`, "Instance"),
    cellId,
    matrix,
    position,
    scale,
    bounds: normalizeBounds(instance.bounds, position, scale),
    metadata: clone(instance.metadata ?? {})
  });
}

function unionBounds(instances) {
  if (!instances.length) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const instance of instances) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], instance.bounds.min[axis]);
      max[axis] = Math.max(max[axis], instance.bounds.max[axis]);
    }
  }
  const center = min.map((value, axis) => (value + max[axis]) * 0.5);
  const radius = Math.hypot(max[0] - center[0], max[1] - center[1], max[2] - center[2]);
  return { min, max, center, radius };
}

function createBatchRecord(options = {}) {
  return {
    id: stableId(options.id, null, "Instanced render batch"),
    capacity: positiveInteger(options.capacity, 1, "Instanced render batch capacity"),
    boundsMode: options.boundsMode ?? "recompute-on-change",
    cells: new Map(),
    revision: 0,
    dirty: true,
    releasedInstanceIds: new Set(),
    previousActiveCount: 0,
    lastFlush: null
  };
}

function markDirty(record) {
  record.revision += 1;
  record.dirty = true;
}

function flattenInstances(record) {
  return [...record.cells.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, instances]) => instances);
}

function batchSnapshot(record) {
  return {
    id: record.id,
    capacity: record.capacity,
    boundsMode: record.boundsMode,
    revision: record.revision,
    cells: [...record.cells.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([cellId, instances]) => ({ cellId, instances: clone(instances) })),
    lastFlush: clone(record.lastFlush)
  };
}

function createBatchHandle(record) {
  return Object.freeze({
    id: record.id,
    get capacity() { return record.capacity; },
    replaceCell(cellIdInput, descriptors = []) {
      const cellId = stableId(cellIdInput, null, "Instance cell");
      if (!Array.isArray(descriptors)) throw new TypeError("replaceCell expects an array of instance descriptors.");
      const normalized = descriptors.map((descriptor, index) => normalizeInstance(descriptor, cellId, index));
      const previous = record.cells.get(cellId) ?? [];
      for (const instance of previous) record.releasedInstanceIds.add(instance.id);
      record.cells.set(cellId, normalized);
      markDirty(record);
      return { cellId, count: normalized.length, capacity: record.capacity };
    },
    retainCell(cellIdInput) {
      const cellId = stableId(cellIdInput, null, "Instance cell");
      return record.cells.has(cellId);
    },
    releaseCell(cellIdInput) {
      const cellId = stableId(cellIdInput, null, "Instance cell");
      const previous = record.cells.get(cellId);
      if (!previous) return false;
      for (const instance of previous) record.releasedInstanceIds.add(instance.id);
      record.cells.delete(cellId);
      markDirty(record);
      return true;
    },
    clear() {
      for (const instances of record.cells.values()) {
        for (const instance of instances) record.releasedInstanceIds.add(instance.id);
      }
      record.cells.clear();
      markDirty(record);
      return true;
    },
    hasCell(cellIdInput) {
      return record.cells.has(String(cellIdInput));
    },
    listCellIds() {
      return [...record.cells.keys()].sort();
    },
    flush() {
      const requested = flattenInstances(record);
      const instances = requested.slice(0, record.capacity);
      const overflowInstances = requested.slice(record.capacity);
      const activeCount = instances.length;
      const changedSpan = Math.max(activeCount, record.previousActiveCount);
      const result = {
        id: record.id,
        version: INSTANCED_RENDER_BATCH_KIT_VERSION,
        revision: record.revision,
        capacity: record.capacity,
        requestedCount: requested.length,
        activeCount,
        instances: clone(instances),
        changedRanges: record.dirty && changedSpan > 0 ? [{ start: 0, count: changedSpan }] : [],
        bounds: unionBounds(instances),
        boundsDirty: record.dirty && record.boundsMode === "recompute-on-change",
        overflow: {
          count: overflowInstances.length,
          instanceIds: overflowInstances.map((instance) => instance.id)
        },
        releasedInstanceIds: [...record.releasedInstanceIds].sort(),
        visibility: {
          empty: activeCount === 0,
          visible: activeCount > 0
        }
      };
      record.previousActiveCount = activeCount;
      record.lastFlush = {
        revision: result.revision,
        activeCount: result.activeCount,
        requestedCount: result.requestedCount,
        overflow: clone(result.overflow),
        bounds: clone(result.bounds)
      };
      record.dirty = false;
      record.releasedInstanceIds.clear();
      return result;
    },
    getSnapshot() {
      return batchSnapshot(record);
    },
    getStats() {
      const requestedCount = flattenInstances(record).length;
      return {
        id: record.id,
        capacity: record.capacity,
        activeCount: Math.min(record.capacity, requestedCount),
        requestedCount,
        overflowCount: Math.max(0, requestedCount - record.capacity),
        cellCount: record.cells.size,
        revision: record.revision,
        dirty: record.dirty
      };
    }
  });
}

function createApi(config = {}) {
  const initialBatches = Array.isArray(config.batches) ? config.batches.map(clone) : [];
  const records = new Map();
  const handles = new Map();

  function create(options = {}) {
    const id = stableId(options.id, null, "Instanced render batch");
    if (records.has(id) && options.replace !== true) return handles.get(id);
    const record = createBatchRecord({ ...options, id });
    const handle = createBatchHandle(record);
    records.set(id, record);
    handles.set(id, handle);
    return handle;
  }

  function get(id) {
    const key = String(id ?? "");
    const handle = handles.get(key);
    if (!handle) throw new RangeError(`Unknown instanced render batch: ${key}`);
    return handle;
  }

  function getSnapshot() {
    return {
      version: INSTANCED_RENDER_BATCH_KIT_VERSION,
      status: "ready",
      batches: [...records.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map(batchSnapshot)
    };
  }

  function reset() {
    records.clear();
    handles.clear();
    for (const batch of initialBatches) create(batch);
    return getSnapshot();
  }

  function loadSnapshot(snapshot = {}) {
    if (snapshot.version !== INSTANCED_RENDER_BATCH_KIT_VERSION || snapshot.status !== "ready") {
      throw new TypeError("Unsupported instanced render batch snapshot.");
    }
    records.clear();
    handles.clear();
    for (const batch of snapshot.batches ?? []) {
      const handle = create(batch);
      for (const cell of batch.cells ?? []) handle.replaceCell(cell.cellId, cell.instances ?? []);
      handle.flush();
    }
    return getSnapshot();
  }

  const api = {
    create,
    has(id) { return records.has(String(id)); },
    get,
    remove(id) {
      const key = String(id);
      handles.delete(key);
      return records.delete(key);
    },
    list() {
      return [...records.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((record) => createBatchHandle(record).getStats());
    },
    getSnapshot,
    getState: getSnapshot,
    loadSnapshot,
    reset
  };

  reset();
  return Object.freeze(api);
}

export function createInstancedRenderBatchKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "instanced-render-batch-kit",
    domain: "instanced-render-batch",
    domainPath: "n:render-descriptors:instanced-render-batch",
    parentDomainPath: "n:render-descriptors",
    apiName: config.apiName ?? "instancedRenderBatch",
    version: INSTANCED_RENDER_BATCH_KIT_VERSION,
    stability: "candidate",
    services: ["batch-registry", "cell-membership", "instance-flush", "overflow-diagnostics", "bounds-invalidation"],
    provides: [
      "render:instanced-batch",
      "render:instance-cell-membership",
      "render:instance-overflow-diagnostics",
      "render:instance-bounds-invalidation"
    ],
    createApi() {
      return createApi(config);
    },
    metadata: {
      domainFamily: "render-descriptors",
      rendererAgnostic: true,
      ownsCapacity: true,
      boundary: "Owns stable instanced-batch capacity, active membership, cell replacement and release, overflow diagnostics, changed ranges, and bounds invalidation. Renderer adapters own GPU buffers, mesh objects, matrix uploads, and actual culling."
    }
  });
}

export default createInstancedRenderBatchKit;
