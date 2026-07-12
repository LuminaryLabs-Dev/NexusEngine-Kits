import { defineDomainServiceKit } from "nexusengine";

export const PROCEDURAL_OBJECT_LOD_KIT_VERSION = "0.1.0";
const clone = (value) => value === undefined ? undefined : structuredClone(value);

function finite(value, fallback, label) {
  const next = Number(value ?? fallback);
  if (!Number.isFinite(next)) throw new TypeError(`${label} must be finite.`);
  return next;
}

export function createProceduralObjectLodDescriptor(input = {}) {
  const objectId = String(input.objectId ?? input.id ?? "").trim();
  if (!objectId) throw new TypeError("LOD objectId is required.");
  const sources = (input.sources ?? []).map((source, index) => ({
    level: Number.isInteger(source.level) ? source.level : index,
    type: String(source.type ?? "geometry"),
    descriptorId: String(source.descriptorId ?? `${objectId}:lod:${index}`),
    triangleBudget: Math.max(0, Math.round(finite(source.triangleBudget, 0, "triangleBudget"))),
    metadata: clone(source.metadata ?? {})
  })).sort((a, b) => a.level - b.level);
  if (sources.length === 0) throw new TypeError("At least one LOD source is required.");
  const distances = (input.distances ?? sources.slice(1).map((_, index) => (index + 1) * 25))
    .map((value, index) => finite(value, (index + 1) * 25, `distances[${index}]`));
  for (let index = 1; index < distances.length; index += 1) {
    if (distances[index] <= distances[index - 1]) throw new RangeError("LOD distances must be strictly increasing.");
  }
  return {
    schema: "nexus-procedural-object-lod/1",
    version: PROCEDURAL_OBJECT_LOD_KIT_VERSION,
    id: String(input.id ?? `${objectId}:lod`),
    objectId,
    sources,
    distances,
    captureSourceLevel: Math.max(0, Math.round(finite(input.captureSourceLevel, 0, "captureSourceLevel"))),
    selection: {
      mode: String(input.selection?.mode ?? "distance"),
      hysteresis: Math.max(0, finite(input.selection?.hysteresis, 0, "selection.hysteresis"))
    },
    metadata: clone(input.metadata ?? {})
  };
}

function createApi(config = {}) {
  let records = new Map();
  const api = {
    create(input = {}) {
      const descriptor = createProceduralObjectLodDescriptor({ ...config.defaults, ...input });
      records.set(descriptor.objectId, descriptor);
      return clone(descriptor);
    },
    get(id) { return clone(records.get(String(id)) ?? null); },
    list() { return [...records.values()].sort((a, b) => a.objectId.localeCompare(b.objectId)).map(clone); },
    select(id, distance) {
      const descriptor = records.get(String(id));
      if (!descriptor) throw new RangeError(`Unknown procedural object LOD: ${id}`);
      const value = Math.max(0, finite(distance, 0, "distance"));
      let level = 0;
      while (level < descriptor.distances.length && value >= descriptor.distances[level]) level += 1;
      return { objectId: descriptor.objectId, level: Math.min(level, descriptor.sources.length - 1), distance: value };
    },
    remove(id) { return records.delete(String(id)); },
    getSnapshot() { return { version: PROCEDURAL_OBJECT_LOD_KIT_VERSION, status: "ready", records: api.list() }; },
    loadSnapshot(snapshot = {}) {
      if (snapshot.version !== PROCEDURAL_OBJECT_LOD_KIT_VERSION || snapshot.status !== "ready") {
        throw new TypeError("Unsupported procedural object LOD snapshot.");
      }
      records = new Map((snapshot.records ?? []).map((record) => [record.objectId, clone(record)]));
      return api.getSnapshot();
    },
    reset() { records = new Map(); return api.getSnapshot(); }
  };
  return Object.freeze(api);
}

export function createProceduralObjectLodKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "procedural-object-lod-kit",
    domain: "procedural-object-lod",
    domainPath: "n:object:procedural:lod",
    parentDomainPath: "n:object:procedural",
    apiName: config.apiName ?? "proceduralObjectLod",
    version: PROCEDURAL_OBJECT_LOD_KIT_VERSION,
    stability: config.stability ?? "candidate",
    services: ["lod-source-descriptors", "distance-selection", "capture-source-policy", "snapshot", "reset"],
    requires: ["object:descriptor-contract"],
    provides: ["object:procedural-lod-descriptor"],
    createApi() { return createApi(config); },
    install({ engine }) { engine.proceduralObjectLod = engine.n.proceduralObjectLod; },
    metadata: {
      rendererAgnostic: true,
      deterministic: true,
      boundary: "Owns portable LOD source and selection policy. It does not own renderer objects, cameras, atlas capture, or GPU resource switching."
    }
  });
}

export default createProceduralObjectLodKit;
