import {
  createObjectDescriptor,
  defineDomainServiceKit,
  validateObjectDescriptor
} from "nexusengine";

export const PROCEDURAL_OBJECT_BODY_KIT_VERSION = "0.1.0";
const clone = (value) => value === undefined ? undefined : structuredClone(value);

export function createProceduralObjectBodyDescriptor(input = {}) {
  const object = createObjectDescriptor({
    ...input,
    metadata: {
      generationRecipe: clone(input.recipe ?? {}),
      ...(input.metadata ?? {})
    },
    lifecycle: input.lifecycle ?? { status: "generated", revision: 0 }
  });
  return {
    schema: "nexus-procedural-object-body/1",
    version: PROCEDURAL_OBJECT_BODY_KIT_VERSION,
    id: `${object.id}:body`,
    objectId: object.id,
    objectType: object.objectType,
    recipe: clone(input.recipe ?? {}),
    object,
    parts: clone(object.parts),
    geometry: clone(input.geometry ?? object.geometry),
    attachments: clone(input.attachments ?? []),
    collision: clone(input.collision ?? object.collision),
    contentHash: object.contentHash
  };
}

function createApi(config = {}) {
  let records = new Map();
  const api = {
    create(input = {}) {
      const descriptor = createProceduralObjectBodyDescriptor({ ...config.defaults, ...input });
      records.set(descriptor.objectId, descriptor);
      return clone(descriptor);
    },
    get(id) {
      return clone(records.get(String(id)) ?? null);
    },
    has(id) {
      return records.has(String(id));
    },
    list() {
      return [...records.values()]
        .sort((a, b) => a.objectId.localeCompare(b.objectId))
        .map(clone);
    },
    remove(id) {
      return records.delete(String(id));
    },
    validate(value) {
      if (value?.schema !== "nexus-procedural-object-body/1") {
        return { valid: false, errors: ["schema must be nexus-procedural-object-body/1"] };
      }
      return validateObjectDescriptor(value.object);
    },
    getSnapshot() {
      return {
        version: PROCEDURAL_OBJECT_BODY_KIT_VERSION,
        status: "ready",
        records: api.list()
      };
    },
    loadSnapshot(snapshot = {}) {
      if (snapshot.version !== PROCEDURAL_OBJECT_BODY_KIT_VERSION || snapshot.status !== "ready") {
        throw new TypeError("Unsupported procedural object body snapshot.");
      }
      const next = new Map();
      for (const record of snapshot.records ?? []) {
        const validation = api.validate(record);
        if (!validation.valid) throw new TypeError(validation.errors.join("; "));
        next.set(record.objectId, clone(record));
      }
      records = next;
      return api.getSnapshot();
    },
    reset() {
      records = new Map();
      return api.getSnapshot();
    }
  };
  return Object.freeze(api);
}

export function createProceduralObjectBodyKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "procedural-object-body-kit",
    domain: "procedural-object-body",
    domainPath: "n:object:procedural:body",
    parentDomainPath: "n:object:procedural",
    apiName: config.apiName ?? "proceduralObjectBody",
    version: PROCEDURAL_OBJECT_BODY_KIT_VERSION,
    stability: config.stability ?? "candidate",
    services: ["recipe-normalization", "object-admission", "part-hierarchy", "attachments", "collision-hints", "snapshot", "reset"],
    requires: ["object:descriptor-contract"],
    provides: ["object:procedural-body-descriptor"],
    createApi() {
      return createApi(config);
    },
    install({ engine }) {
      engine.proceduralObjectBody = engine.n.proceduralObjectBody;
    },
    metadata: {
      rendererAgnostic: true,
      deterministic: true,
      boundary: "Owns generic procedural-object recipes and portable body descriptors. It does not own species semantics, renderer objects, GPU buffers, physics resolution, or capture rendering."
    }
  });
}

export default createProceduralObjectBodyKit;
