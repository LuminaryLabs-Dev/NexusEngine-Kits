import { defineDomainServiceKit } from "nexusengine";

export const PROCEDURAL_OBJECT_CAPTURE_PROFILE_KIT_VERSION = "0.1.0";
const clone = (value) => value === undefined ? undefined : structuredClone(value);

function finite(value, fallback, label) {
  const next = Number(value ?? fallback);
  if (!Number.isFinite(next)) throw new TypeError(`${label} must be finite.`);
  return next;
}

function vec3(value, fallback, label) {
  const source = Array.isArray(value) ? value : fallback;
  if (!Array.isArray(source) || source.length !== 3) throw new TypeError(`${label} must contain three values.`);
  return source.map((entry, index) => finite(entry, fallback[index], `${label}[${index}]`));
}

export function createProceduralObjectCaptureProfile(input = {}) {
  const objectId = String(input.objectId ?? input.id ?? "").trim();
  if (!objectId) throw new TypeError("Capture profile objectId is required.");
  const azimuthCount = Math.max(1, Math.round(finite(input.views?.azimuthCount, 8, "views.azimuthCount")));
  const elevations = (input.views?.elevations ?? [5, 25]).map((value, index) => finite(value, 0, `views.elevations[${index}]`));
  const frameCount = azimuthCount * elevations.length;
  const columns = Math.max(1, Math.round(finite(input.atlas?.columns, Math.ceil(Math.sqrt(frameCount)), "atlas.columns")));
  const rows = Math.max(1, Math.round(finite(input.atlas?.rows, Math.ceil(frameCount / columns), "atlas.rows")));
  if (columns * rows < frameCount) throw new RangeError("Capture atlas does not have enough cells for all views.");
  return {
    schema: "nexus-object-capture-profile/1",
    version: PROCEDURAL_OBJECT_CAPTURE_PROFILE_KIT_VERSION,
    id: String(input.id ?? `${objectId}:capture`),
    objectId,
    pivot: vec3(input.pivot, [0, 0, 0], "capture.pivot"),
    groundAnchor: vec3(input.groundAnchor, [0, 0, 0], "capture.groundAnchor"),
    views: {
      azimuthCount,
      elevations,
      azimuthConvention: "camera-at-positive-z-clockwise-to-positive-x"
    },
    framing: {
      mode: String(input.framing?.mode ?? "per-view-projected-bounds"),
      padding: Math.max(0, finite(input.framing?.padding, 0.08, "framing.padding")),
      preserveGroundAnchor: input.framing?.preserveGroundAnchor !== false,
      sharedScale: input.framing?.sharedScale === true
    },
    atlas: {
      columns,
      rows,
      frameSize: Math.max(16, Math.round(finite(input.atlas?.frameSize, 256, "atlas.frameSize"))),
      dilationPasses: Math.max(0, Math.round(finite(input.atlas?.dilationPasses, 6, "atlas.dilationPasses")))
    },
    passes: [...(input.passes ?? ["color-alpha"])],
    validation: {
      requireAlpha: input.validation?.requireAlpha !== false,
      maxEdgeContactPixels: Math.max(0, Math.round(finite(input.validation?.maxEdgeContactPixels, 0, "validation.maxEdgeContactPixels"))),
      maxGroundAnchorErrorPixels: Math.max(0, finite(input.validation?.maxGroundAnchorErrorPixels, 2, "validation.maxGroundAnchorErrorPixels"))
    },
    metadata: clone(input.metadata ?? {})
  };
}

function createApi(config = {}) {
  let records = new Map();
  const api = {
    create(input = {}) {
      const descriptor = createProceduralObjectCaptureProfile({ ...config.defaults, ...input });
      records.set(descriptor.objectId, descriptor);
      return clone(descriptor);
    },
    get(id) { return clone(records.get(String(id)) ?? null); },
    list() { return [...records.values()].sort((a, b) => a.objectId.localeCompare(b.objectId)).map(clone); },
    remove(id) { return records.delete(String(id)); },
    getSnapshot() { return { version: PROCEDURAL_OBJECT_CAPTURE_PROFILE_KIT_VERSION, status: "ready", records: api.list() }; },
    loadSnapshot(snapshot = {}) {
      if (snapshot.version !== PROCEDURAL_OBJECT_CAPTURE_PROFILE_KIT_VERSION || snapshot.status !== "ready") {
        throw new TypeError("Unsupported procedural object capture-profile snapshot.");
      }
      records = new Map((snapshot.records ?? []).map((record) => [record.objectId, clone(record)]));
      return api.getSnapshot();
    },
    reset() { records = new Map(); return api.getSnapshot(); }
  };
  return Object.freeze(api);
}

export function createProceduralObjectCaptureProfileKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "procedural-object-capture-profile-kit",
    domain: "procedural-object-capture-profile",
    domainPath: "n:object:procedural:capture-profile",
    parentDomainPath: "n:object:procedural",
    apiName: config.apiName ?? "proceduralObjectCaptureProfile",
    version: PROCEDURAL_OBJECT_CAPTURE_PROFILE_KIT_VERSION,
    stability: config.stability ?? "candidate",
    services: ["capture-pivot", "ground-anchor", "view-plan", "framing-policy", "atlas-policy", "capture-validation-policy", "snapshot", "reset"],
    requires: ["object:descriptor-contract"],
    provides: ["object:capture-profile"],
    createApi() { return createApi(config); },
    install({ engine }) { engine.proceduralObjectCaptureProfile = engine.n.proceduralObjectCaptureProfile; },
    metadata: {
      rendererAgnostic: true,
      deterministic: true,
      boundary: "Owns capture intent, view conventions, framing, atlas layout, and validation policy. It does not own cameras, WebGL render targets, pixel reads, PNGs, or GPU resources."
    }
  });
}

export default createProceduralObjectCaptureProfileKit;
