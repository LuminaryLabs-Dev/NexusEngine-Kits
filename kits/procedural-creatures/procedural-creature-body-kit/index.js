import { createObjectDescriptor } from "nexusengine";
import {
  PROCEDURAL_CREATURE_BODY_KIT_VERSION as LEGACY_PROCEDURAL_CREATURE_BODY_KIT_VERSION,
  SMALL_THEROPOD_PRESET,
  createProceduralCreatureBodyKit as createLegacyProceduralCreatureBodyKit,
  createTheropodPreset
} from "./legacy.js";

export {
  SMALL_THEROPOD_PRESET,
  createTheropodPreset
};

export const PROCEDURAL_CREATURE_BODY_KIT_VERSION = "0.1.1";
const clone = (value) => value === undefined ? undefined : structuredClone(value);

function decorateCreatureDescriptor(value) {
  if (!value || value.objectDescriptor) return clone(value);
  const bounds = value.bounds ?? { min: [0, 0, 0], max: [0, 0, 0] };
  const centerY = (Number(bounds.min?.[1] ?? 0) + Number(bounds.max?.[1] ?? 0)) * 0.5;
  const objectDescriptor = createObjectDescriptor({
    id: value.id,
    objectType: "procedural-creature",
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: value.transform?.scale ?? [1, 1, 1]
    },
    parts: (value.skeleton?.bones ?? []).map((bone) => ({
      id: bone.id,
      parentId: bone.parentId,
      kind: "creature-bone-part",
      transform: {
        position: bone.position ?? [0, 0, 0],
        rotation: bone.rotation ?? [0, 0, 0, 1],
        scale: [1, 1, 1]
      }
    })),
    bounds,
    pivot: [0, centerY, 0],
    groundAnchor: [0, Number(bounds.min?.[1] ?? 0), 0],
    geometry: {
      provider: "procedural-creature-body-kit",
      descriptorId: `${value.id}:geometry`,
      contentHash: value.contentHash,
      metadata: {
        primitive: value.geometry?.primitive,
        vertices: value.topology?.vertices,
        triangles: value.topology?.triangles
      }
    },
    material: {
      provider: "procedural-object-material-kit",
      descriptorId: `${value.id}:material`
    },
    collision: {
      provider: "procedural-creature-body-kit",
      descriptorId: `${value.id}:collision`,
      metadata: clone(value.collision ?? {})
    },
    lod: {
      provider: "procedural-object-lod-kit",
      descriptorId: `${value.id}:lod`
    },
    capture: {
      provider: "procedural-object-capture-profile-kit",
      descriptorId: `${value.id}:capture`
    },
    metadata: {
      sourceDomain: "procedural-creatures",
      sourceDescriptorKind: value.kind,
      archetype: value.archetype,
      legacyVersion: LEGACY_PROCEDURAL_CREATURE_BODY_KIT_VERSION
    }
  });
  return {
    ...clone(value),
    objectDescriptor
  };
}

function wrapApi(api) {
  return Object.freeze({
    ...api,
    create(options = {}) {
      return decorateCreatureDescriptor(api.create(options));
    },
    get(id) {
      return decorateCreatureDescriptor(api.get(id));
    },
    list() {
      return api.list().map(decorateCreatureDescriptor);
    },
    getObjectDescriptor(id) {
      return decorateCreatureDescriptor(api.get(id)).objectDescriptor;
    }
  });
}

export function createProceduralCreatureBodyKit(config = {}) {
  const legacy = createLegacyProceduralCreatureBodyKit(config);
  return Object.freeze({
    ...legacy,
    version: PROCEDURAL_CREATURE_BODY_KIT_VERSION,
    provides: [
      ...(legacy.provides ?? []),
      "object:descriptor"
    ],
    createApi(context) {
      return wrapApi(legacy.createApi(context));
    },
    metadata: {
      ...(legacy.metadata ?? {}),
      objectContract: "nexus-object-descriptor/1",
      objectContractProvider: "core-object-kit"
    }
  });
}

export default createProceduralCreatureBodyKit;
