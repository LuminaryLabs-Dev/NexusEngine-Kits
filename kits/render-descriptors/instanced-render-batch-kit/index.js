import { defineDomainServiceKit } from "nexusengine";

export const INSTANCED_RENDER_BATCH_KIT_VERSION = "0.2.0";

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

function unionCellBounds(record) {
  const bounds = [...record.cells.values()].map((cell) => cell.bounds).filter(Boolean);
  if (!bounds.length) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const entry of bounds) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], entry.min[axis]);
      max[axis] = Math.max(max[axis], entry.max[axis]);
    }
  }
  const center = min.map((value, axis) => (value + max[axis]) * 0.5);
  const radius = Math.hypot(max[0] - center[0], max[1] - center[1], max[2] - center[2]);
  return { min, max, center, radius };
}

function normalizeUpdateMode(value) {
  const mode = String(value ?? "full");
  if (!new Set(["full", "incremental"]).has(mode)) {
    throw new TypeError("Instanced render batch updateMode must be full or incremental.");
  }
  return mode;
}

function createBatchRecord(options = {}) {
  const capacity = positiveInteger(options.capacity, 1, "Instanced render batch capacity");
  const updateMode = normalizeUpdateMode(options.updateMode);
  return {
    id: stableId(options.id, null, "Instanced render batch"),
    capacity,
    cellCapacity: options.cellCapacity == null
      ? null
      : positiveInteger(options.cellCapacity, null, "Instanced render batch cellCapacity"),
    updateMode,
    boundsMode: options.boundsMode ?? "recompute-on-change",
    cells: new Map(),
    slots: updateMode === "incremental" ? new Array(capacity).fill(null) : null,
    freeRanges: updateMode === "incremental" ? [{ start: 0, count: capacity }] : [],
    dirtyRanges: [],
    revision: 0,
    dirty: true,
    releasedInstanceIds: new Set(),
    previousActiveCount: 0,
    lastFlush: null
  };
}

function markDirty(record, range = null) {
  record.revision += 1;
  record.dirty = true;
  if (range && range.count > 0) record.dirtyRanges.push({ start: range.start, count: range.count });
}

function mergeRanges(ranges) {
  const sorted = ranges
    .filter((range) => range.count > 0)
    .map((range) => ({ start: range.start, count: range.count }))
    .sort((left, right) => left.start - right.start || left.count - right.count);
  const output = [];
  for (const range of sorted) {
    const previous = output.at(-1);
    if (!previous || range.start > previous.start + previous.count) {
      output.push(range);
      continue;
    }
    previous.count = Math.max(previous.start + previous.count, range.start + range.count) - previous.start;
  }
  return output;
}

function mergeFreeRanges(record) {
  record.freeRanges = mergeRanges(record.freeRanges);
}

function allocateRange(record, requestedCount) {
  if (requestedCount <= 0) return null;
  const index = record.freeRanges.findIndex((range) => range.count >= requestedCount);
  if (index < 0) return null;
  const source = record.freeRanges[index];
  const allocated = { start: source.start, count: requestedCount };
  source.start += requestedCount;
  source.count -= requestedCount;
  if (source.count === 0) record.freeRanges.splice(index, 1);
  return allocated;
}

function releaseRange(record, range) {
  if (!range) return;
  record.freeRanges.push({ start: range.start, count: range.count });
  mergeFreeRanges(record);
}

function cellAllocationSize(record, requestedCount) {
  if (record.cellCapacity != null) return record.cellCapacity;
  return requestedCount > 0 ? requestedCount : 0;
}

function clearSlots(record, range) {
  if (!range) return;
  for (let index = range.start; index < range.start + range.count; index += 1) record.slots[index] = null;
}

function writeIncrementalCell(record, cell, previous = null) {
  const requestedSize = cellAllocationSize(record, cell.requested.length);
  let range = previous?.range ?? null;
  if (range && requestedSize > range.count) {
    clearSlots(record, range);
    markDirty(record, range);
    releaseRange(record, range);
    range = null;
  }
  if (!range && requestedSize > 0) range = allocateRange(record, requestedSize);
  if (range) clearSlots(record, range);

  const visible = range ? cell.requested.slice(0, range.count) : [];
  const overflow = cell.requested.slice(visible.length);
  if (range) {
    for (let index = 0; index < visible.length; index += 1) record.slots[range.start + index] = visible[index];
    markDirty(record, range);
  } else {
    markDirty(record);
  }
  cell.range = range;
  cell.visible = visible;
  cell.overflow = overflow;
  cell.bounds = unionBounds(visible);
  return cell;
}

function flattenRequested(record) {
  return [...record.cells.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, cell]) => cell.requested);
}

function activeCount(record) {
  if (record.updateMode === "full") return Math.min(record.capacity, flattenRequested(record).length);
  let count = 0;
  for (const cell of record.cells.values()) count += cell.visible.length;
  return count;
}

function requestedCount(record) {
  let count = 0;
  for (const cell of record.cells.values()) count += cell.requested.length;
  return count;
}

function incrementalOverflow(record) {
  return [...record.cells.values()].flatMap((cell) => cell.overflow);
}

function slotCount(record) {
  let end = 0;
  for (const cell of record.cells.values()) {
    if (cell.range) end = Math.max(end, cell.range.start + cell.range.count);
  }
  return end;
}

function cellRanges(record) {
  return [...record.cells.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([cellId, cell]) => ({
      cellId,
      start: cell.range?.start ?? null,
      count: cell.range?.count ?? 0,
      activeCount: cell.visible.length,
      requestedCount: cell.requested.length,
      overflowCount: cell.overflow.length
    }));
}

function batchSnapshot(record) {
  return {
    id: record.id,
    capacity: record.capacity,
    cellCapacity: record.cellCapacity,
    updateMode: record.updateMode,
    boundsMode: record.boundsMode,
    revision: record.revision,
    cells: [...record.cells.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([cellId, cell]) => ({ cellId, instances: clone(cell.requested) })),
    lastFlush: clone(record.lastFlush)
  };
}

function flushFull(record) {
  const requested = flattenRequested(record);
  const instances = requested.slice(0, record.capacity);
  const overflowInstances = requested.slice(record.capacity);
  const nextActiveCount = instances.length;
  const changedSpan = Math.max(nextActiveCount, record.previousActiveCount);
  return {
    requestedCount: requested.length,
    activeCount: nextActiveCount,
    slotCount: nextActiveCount,
    instances: clone(instances),
    instanceWrites: record.dirty && changedSpan > 0
      ? [{ start: 0, count: changedSpan, instances: clone(instances) }]
      : [],
    changedRanges: record.dirty && changedSpan > 0 ? [{ start: 0, count: changedSpan }] : [],
    bounds: unionBounds(instances),
    overflowInstances
  };
}

function flushIncremental(record) {
  const changedRanges = mergeRanges(record.dirtyRanges);
  const overflowInstances = incrementalOverflow(record);
  return {
    requestedCount: requestedCount(record),
    activeCount: activeCount(record),
    slotCount: slotCount(record),
    instances: [],
    instanceWrites: changedRanges.map((range) => ({
      ...range,
      instances: clone(record.slots.slice(range.start, range.start + range.count))
    })),
    changedRanges,
    cellRanges: cellRanges(record),
    bounds: unionCellBounds(record),
    overflowInstances
  };
}

function createBatchHandle(record) {
  return Object.freeze({
    id: record.id,
    get capacity() { return record.capacity; },
    get updateMode() { return record.updateMode; },
    replaceCell(cellIdInput, descriptors = []) {
      const cellId = stableId(cellIdInput, null, "Instance cell");
      if (!Array.isArray(descriptors)) throw new TypeError("replaceCell expects an array of instance descriptors.");
      const requested = descriptors.map((descriptor, index) => normalizeInstance(descriptor, cellId, index));
      const previous = record.cells.get(cellId) ?? null;
      const nextIds = new Set(requested.map((instance) => instance.id));
      for (const instance of previous?.requested ?? []) {
        if (!nextIds.has(instance.id)) record.releasedInstanceIds.add(instance.id);
      }
      const cell = { requested, visible: requested, overflow: [], range: null, bounds: null };
      if (record.updateMode === "incremental") writeIncrementalCell(record, cell, previous);
      else {
        cell.bounds = unionBounds(requested);
        markDirty(record);
      }
      record.cells.set(cellId, cell);
      return {
        cellId,
        count: cell.visible.length,
        requestedCount: requested.length,
        overflowCount: cell.overflow.length,
        range: cell.range ? { ...cell.range } : null,
        capacity: record.capacity
      };
    },
    retainCell(cellIdInput) {
      const cellId = stableId(cellIdInput, null, "Instance cell");
      return record.cells.has(cellId);
    },
    releaseCell(cellIdInput) {
      const cellId = stableId(cellIdInput, null, "Instance cell");
      const previous = record.cells.get(cellId);
      if (!previous) return false;
      for (const instance of previous.requested) record.releasedInstanceIds.add(instance.id);
      if (record.updateMode === "incremental" && previous.range) {
        clearSlots(record, previous.range);
        markDirty(record, previous.range);
        releaseRange(record, previous.range);
      } else {
        markDirty(record);
      }
      record.cells.delete(cellId);
      return true;
    },
    clear() {
      for (const [cellId] of [...record.cells]) this.releaseCell(cellId);
      return true;
    },
    hasCell(cellIdInput) {
      return record.cells.has(String(cellIdInput));
    },
    listCellIds() {
      return [...record.cells.keys()].sort();
    },
    flush() {
      const payload = record.updateMode === "incremental" ? flushIncremental(record) : flushFull(record);
      const result = {
        id: record.id,
        version: INSTANCED_RENDER_BATCH_KIT_VERSION,
        revision: record.revision,
        capacity: record.capacity,
        updateMode: record.updateMode,
        ...payload,
        boundsDirty: record.dirty && record.boundsMode === "recompute-on-change",
        overflow: {
          count: payload.overflowInstances.length,
          instanceIds: payload.overflowInstances.map((instance) => instance.id)
        },
        releasedInstanceIds: [...record.releasedInstanceIds].sort(),
        visibility: {
          empty: payload.activeCount === 0,
          visible: payload.activeCount > 0
        }
      };
      delete result.overflowInstances;
      record.previousActiveCount = result.activeCount;
      record.lastFlush = {
        revision: result.revision,
        activeCount: result.activeCount,
        slotCount: result.slotCount,
        requestedCount: result.requestedCount,
        changedRanges: clone(result.changedRanges),
        overflow: clone(result.overflow),
        bounds: clone(result.bounds)
      };
      record.dirty = false;
      record.dirtyRanges.length = 0;
      record.releasedInstanceIds.clear();
      return result;
    },
    getSnapshot() {
      return batchSnapshot(record);
    },
    getStats() {
      const requested = requestedCount(record);
      const active = activeCount(record);
      return {
        id: record.id,
        capacity: record.capacity,
        updateMode: record.updateMode,
        cellCapacity: record.cellCapacity,
        activeCount: active,
        slotCount: record.updateMode === "incremental" ? slotCount(record) : active,
        requestedCount: requested,
        overflowCount: Math.max(0, requested - active),
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
    services: ["batch-registry", "cell-membership", "stable-cell-ranges", "instance-flush", "overflow-diagnostics", "bounds-invalidation"],
    provides: [
      "render:instanced-batch",
      "render:instance-cell-membership",
      "render:instance-stable-cell-ranges",
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
      boundary: "Owns stable instanced-batch capacity, optional stable per-cell slot ranges, active membership, cell replacement and release, overflow diagnostics, changed ranges, and bounds invalidation. Renderer adapters own GPU buffers, mesh objects, matrix uploads, and actual culling."
    }
  });
}

export default createInstancedRenderBatchKit;
