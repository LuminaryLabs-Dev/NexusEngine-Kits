import { defineDomainServiceKit } from "nexusengine";

export const PROCEDURAL_OBJECT_MATERIAL_KIT_VERSION = "0.1.0";
const clone = (value) => value === undefined ? undefined : structuredClone(value);

function text(value, fallback, label) {
  const next = String(value ?? fallback ?? "").trim();
  if (!next) throw new TypeError(`${label} requires a non-empty value.`);
  return next;
}

function hash(value) {
  const source = JSON.stringify(value, Object.keys(value).sort());
  let state = 2166136261;
  for (const character of source) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return (state >>> 0).toString(16).padStart(8, "0");
}

export function createProceduralObjectMaterialDescriptor(input = {}) {
  const objectId = text(input.objectId ?? input.id, null, "material.objectId");
  const descriptor = {
    schema: "nexus-procedural-object-material/1",
    version: PROCEDURAL_OBJECT_MATERIAL_KIT_VERSION,
    id: text(input.id, `${objectId}:material`, "material.id"),
    objectId,
    family: text(input.family, "pbr", "material.family"),
    palette: clone(input.palette ?? {}),
    fields: clone(input.fields ?? {}),
    channels: clone(input.channels ?? {}),
    metadata: clone(input.metadata ?? {})
  };
  descriptor.contentHash = hash(descriptor);
  return descriptor;
}

function createApi(config = {}) {
  let records = new Map();
  const api = {
    create(input = {}) {
      const descriptor = createProceduralObjectMaterialDescriptor({ ...config.defaults, ...input });
      records.set(descriptor.objectId, descriptor);
      return clone(descriptor);
    },
    get(id) { return clone(records.get(String(id)) ?? null); },
    list() { return [...records.values()].sort((a, b) => a.objectId.localeCompare(b.objectId)).map(clone); },
    remove(id) { return records.delete(String(id)); },
    getSnapshot() {
      return { version: PROCEDURAL_OBJECT_MATERIAL_KIT_VERSION, status: "ready", records: api.list() };
    },
    loadSnapshot(snapshot = {}) {
      if (snapshot.version !== PROCEDURAL_OBJECT_MATERIAL_KIT_VERSION || snapshot.status !== "ready") {
        throw new TypeError("Unsupported procedural object material snapshot.");
      }
      records = new Map((snapshot.records ?? []).map((record) => [record.objectId, clone(record)]));
      return api.getSnapshot();
    },
    reset() { records = new Map(); return api.getSnapshot(); }
  };
  return Object.freeze(api);
}

export function createProceduralObjectMaterialKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "procedural-object-material-kit",
    domain: "procedural-object-material",
    domainPath: "n:object:procedural:material",
    parentDomainPath: "n:object:procedural",
    apiName: config.apiName ?? "proceduralObjectMaterial",
    version: PROCEDURAL_OBJECT_MATERIAL_KIT_VERSION,
    stability: config.stability ?? "candidate",
    services: ["material-family", "palette", "field-references", "channel-descriptors", "snapshot", "reset"],
    requires: ["object:descriptor-contract"],
    provides: ["object:procedural-material-descriptor"],
    createApi() { return createApi(config); },
    install({ engine }) { engine.proceduralObjectMaterial = engine.n.proceduralObjectMaterial; },
    metadata: {
      rendererAgnostic: true,
      deterministic: true,
      boundary: "Owns portable material meaning and field references. It does not create GPU textures, shaders, canvases, or renderer materials."
    }
  });
}

export default createProceduralObjectMaterialKit;
