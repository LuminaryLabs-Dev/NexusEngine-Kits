import { defineDomainServiceKit } from "nexusengine";

export const OBJECT_PLACEMENT_CONTRACT_KIT_VERSION = "0.1.0";
export const OBJECT_PLACEMENT_SCHEMA = "nexus-object-placement/1";
export const OBJECT_PLACEMENT_FRAME = Object.freeze({
  handedness: "right",
  upAxis: "y",
  forwardAxis: "-z",
  unitsPerMeter: 1
});

const EPSILON = 1e-8;
const clone = (value) => value === undefined ? undefined : structuredClone(value);

function finite(value, fallback, label) {
  const next = Number(value ?? fallback);
  if (!Number.isFinite(next)) throw new TypeError(`${label} must be finite.`);
  return next;
}

function vec3(value, fallback, label) {
  const source = Array.isArray(value) ? value : fallback;
  if (!Array.isArray(source) || source.length !== 3) {
    throw new TypeError(`${label} must contain three values.`);
  }
  return source.map((entry, index) => finite(entry, fallback[index], `${label}[${index}]`));
}

function add(left, right) {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtract(left, right) {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function multiply(left, right) {
  return [left[0] * right[0], left[1] * right[1], left[2] * right[2]];
}

function scale(value, amount) {
  return [value[0] * amount, value[1] * amount, value[2] * amount];
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function magnitude(value) {
  return Math.hypot(value[0], value[1], value[2]);
}

function unit(value, label) {
  const length = magnitude(value);
  if (length <= EPSILON) throw new TypeError(`${label} cannot be a zero vector.`);
  return scale(value, 1 / length);
}

function quaternion(value, label) {
  const source = Array.isArray(value) ? value : [0, 0, 0, 1];
  if (source.length !== 4) throw new TypeError(`${label} must contain four values.`);
  const next = source.map((entry, index) => finite(entry, index === 3 ? 1 : 0, `${label}[${index}]`));
  const length = Math.hypot(...next);
  if (length <= EPSILON) throw new TypeError(`${label} cannot be a zero quaternion.`);
  return next.map((entry) => entry / length);
}

function multiplyQuaternion(left, right) {
  const [lx, ly, lz, lw] = left;
  const [rx, ry, rz, rw] = right;
  return quaternion([
    lw * rx + lx * rw + ly * rz - lz * ry,
    lw * ry - lx * rz + ly * rw + lz * rx,
    lw * rz + lx * ry - ly * rx + lz * rw,
    lw * rw - lx * rx - ly * ry - lz * rz
  ], "quaternion product");
}

function rotate(value, rotation) {
  const vector = [rotation[0], rotation[1], rotation[2]];
  const firstCross = cross(vector, value);
  const secondCross = cross(vector, firstCross);
  return add(value, add(scale(firstCross, 2 * rotation[3]), scale(secondCross, 2)));
}

function quaternionFromUnitVectors(from, to) {
  let scalar = dot(from, to) + 1;
  let axis;
  if (scalar < EPSILON) {
    scalar = 0;
    axis = Math.abs(from[0]) > Math.abs(from[2])
      ? [-from[1], from[0], 0]
      : [0, -from[2], from[1]];
  } else {
    axis = cross(from, to);
  }
  return quaternion([axis[0], axis[1], axis[2], scalar], "alignment quaternion");
}

function quaternionFromAxisAngle(axis, angle) {
  const normalizedAxis = unit(axis, "rotation axis");
  const half = angle / 2;
  const sine = Math.sin(half);
  return quaternion([
    normalizedAxis[0] * sine,
    normalizedAxis[1] * sine,
    normalizedAxis[2] * sine,
    Math.cos(half)
  ], "axis-angle quaternion");
}

function projectToPlane(value, normal) {
  return subtract(value, scale(normal, dot(value, normal)));
}

function fallbackForward(normal) {
  const preferred = projectToPlane([0, 0, -1], normal);
  if (magnitude(preferred) > EPSILON) return unit(preferred, "anchor forward");
  return unit(projectToPlane([1, 0, 0], normal), "anchor forward");
}

function normalizeFrame(input = {}) {
  const frame = {
    handedness: String(input.handedness ?? OBJECT_PLACEMENT_FRAME.handedness),
    upAxis: String(input.upAxis ?? OBJECT_PLACEMENT_FRAME.upAxis),
    forwardAxis: String(input.forwardAxis ?? OBJECT_PLACEMENT_FRAME.forwardAxis),
    unitsPerMeter: finite(input.unitsPerMeter, OBJECT_PLACEMENT_FRAME.unitsPerMeter, "coordinateFrame.unitsPerMeter")
  };
  if (frame.handedness !== "right" || frame.upAxis !== "y" || frame.forwardAxis !== "-z") {
    throw new TypeError("Object placement v1 requires a right-handed, Y-up, -Z-forward coordinate frame.");
  }
  if (frame.unitsPerMeter <= 0) throw new RangeError("coordinateFrame.unitsPerMeter must be greater than zero.");
  return frame;
}

function normalizeBounds(input, label = "localBounds") {
  if (!input || typeof input !== "object") throw new TypeError(`${label} is required.`);
  let minimum;
  let maximum;
  if (input.min != null || input.max != null) {
    minimum = vec3(input.min, [0, 0, 0], `${label}.min`);
    maximum = vec3(input.max, [0, 0, 0], `${label}.max`);
  } else {
    const center = vec3(input.center, [0, 0, 0], `${label}.center`);
    const sizeValue = vec3(input.size, [0, 0, 0], `${label}.size`);
    if (sizeValue.some((entry) => entry < 0)) throw new RangeError(`${label}.size cannot be negative.`);
    minimum = subtract(center, scale(sizeValue, 0.5));
    maximum = add(center, scale(sizeValue, 0.5));
  }
  if (minimum.some((entry, index) => entry > maximum[index])) {
    throw new RangeError(`${label}.min cannot exceed ${label}.max.`);
  }
  const sizeValue = subtract(maximum, minimum);
  if (sizeValue.every((entry) => entry <= EPSILON)) {
    throw new RangeError(`${label} must occupy space on at least one axis.`);
  }
  return {
    min: minimum,
    max: maximum,
    center: scale(add(minimum, maximum), 0.5),
    size: sizeValue
  };
}

function normalizeTransform(input = {}) {
  const scaleValue = typeof input.scale === "number"
    ? [input.scale, input.scale, input.scale]
    : vec3(input.scale, [1, 1, 1], "transform.scale");
  if (scaleValue.some((entry) => entry <= 0)) throw new RangeError("transform.scale values must be greater than zero.");
  return {
    position: vec3(input.position, [0, 0, 0], "transform.position"),
    rotation: quaternion(input.rotation, "transform.rotation"),
    scale: scaleValue
  };
}

function normalizeAnchor(input, index) {
  const id = String(input?.id ?? "").trim();
  if (!id) throw new TypeError(`anchors[${index}].id is required.`);
  const normal = unit(vec3(input.normal, [0, 1, 0], `anchors[${index}].normal`), `anchors[${index}].normal`);
  const requestedForward = vec3(input.forward, fallbackForward(normal), `anchors[${index}].forward`);
  const projectedForward = projectToPlane(requestedForward, normal);
  return {
    id,
    position: vec3(input.position, [0, 0, 0], `anchors[${index}].position`),
    normal,
    forward: magnitude(projectedForward) <= EPSILON
      ? fallbackForward(normal)
      : unit(projectedForward, `anchors[${index}].forward`),
    tags: [...new Set((input.tags ?? []).map((entry) => String(entry)))].sort(),
    metadata: clone(input.metadata ?? {})
  };
}

function boundsCorners(bounds) {
  const result = [];
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) result.push([x, y, z]);
    }
  }
  return result;
}

function pointInsideBounds(point, bounds, tolerance = 0) {
  return point.every((entry, index) => (
    entry >= bounds.min[index] - tolerance && entry <= bounds.max[index] + tolerance
  ));
}

function descriptor(value) {
  return createObjectPlacementDescriptor(value);
}

export function createObjectPlacementDescriptor(input = {}) {
  const objectId = String(input.objectId ?? "").trim();
  if (!objectId) throw new TypeError("objectId is required.");
  const localBounds = normalizeBounds(input.localBounds);
  const anchors = (input.anchors ?? []).map(normalizeAnchor);
  const anchorIds = new Set();
  for (const anchor of anchors) {
    if (anchorIds.has(anchor.id)) throw new TypeError(`Duplicate anchor id ${anchor.id}.`);
    anchorIds.add(anchor.id);
  }
  const supportAnchorId = String(input.supportAnchorId ?? input.support?.anchorId ?? "support").trim();
  if (!anchorIds.has(supportAnchorId)) {
    if (supportAnchorId !== "support") throw new TypeError(`Support anchor ${supportAnchorId} is not defined.`);
    anchors.push(normalizeAnchor({
      id: supportAnchorId,
      position: [localBounds.center[0], localBounds.min[1], localBounds.center[2]],
      normal: [0, -1, 0],
      forward: [0, 0, -1],
      tags: ["support"]
    }, anchors.length));
  }
  anchors.sort((left, right) => left.id.localeCompare(right.id));
  return {
    schema: OBJECT_PLACEMENT_SCHEMA,
    version: OBJECT_PLACEMENT_CONTRACT_KIT_VERSION,
    id: String(input.id ?? `${objectId}:placement`),
    objectId,
    revision: Math.max(0, Math.trunc(finite(input.revision, 0, "revision"))),
    coordinateFrame: normalizeFrame(input.coordinateFrame),
    localBounds,
    origin: vec3(input.origin, [0, 0, 0], "origin"),
    pivot: vec3(input.pivot, localBounds.center, "pivot"),
    anchors,
    supportAnchorId,
    transform: normalizeTransform(input.transform),
    metadata: clone(input.metadata ?? {})
  };
}

export function computePlacementWorldPoint(input, localPoint) {
  const placement = descriptor(input);
  const point = vec3(localPoint, [0, 0, 0], "localPoint");
  return add(placement.transform.position, rotate(multiply(point, placement.transform.scale), placement.transform.rotation));
}

export function computePlacementWorldDirection(input, localDirection) {
  const placement = descriptor(input);
  return unit(rotate(unit(vec3(localDirection, [0, 1, 0], "localDirection"), "localDirection"), placement.transform.rotation), "worldDirection");
}

export function getPlacementWorldAnchor(input, anchorId) {
  const placement = descriptor(input);
  const anchor = placement.anchors.find((entry) => entry.id === String(anchorId));
  if (!anchor) throw new TypeError(`Unknown placement anchor ${anchorId}.`);
  return {
    id: anchor.id,
    objectId: placement.objectId,
    position: computePlacementWorldPoint(placement, anchor.position),
    normal: computePlacementWorldDirection(placement, anchor.normal),
    forward: computePlacementWorldDirection(placement, anchor.forward),
    tags: [...anchor.tags],
    metadata: clone(anchor.metadata)
  };
}

export function getPlacementWorldBounds(input) {
  const placement = descriptor(input);
  const points = boundsCorners(placement.localBounds).map((point) => computePlacementWorldPoint(placement, point));
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];
  for (const point of points) {
    for (let axis = 0; axis < 3; axis += 1) {
      minimum[axis] = Math.min(minimum[axis], point[axis]);
      maximum[axis] = Math.max(maximum[axis], point[axis]);
    }
  }
  return normalizeBounds({ min: minimum, max: maximum }, "worldBounds");
}

function normalizeWorldAnchor(input, label = "targetAnchor") {
  const normal = unit(vec3(input?.normal, [0, 1, 0], `${label}.normal`), `${label}.normal`);
  const requestedForward = vec3(input?.forward, fallbackForward(normal), `${label}.forward`);
  const projectedForward = projectToPlane(requestedForward, normal);
  return {
    id: String(input?.id ?? label),
    position: vec3(input?.position, [0, 0, 0], `${label}.position`),
    normal,
    forward: magnitude(projectedForward) <= EPSILON
      ? fallbackForward(normal)
      : unit(projectedForward, `${label}.forward`)
  };
}

export function alignPlacementAnchors(sourceInput, targetInput, options = {}) {
  const source = descriptor(sourceInput);
  const sourceAnchorId = String(options.sourceAnchorId ?? source.supportAnchorId);
  const sourceAnchor = getPlacementWorldAnchor(source, sourceAnchorId);
  const targetAnchor = targetInput?.schema === OBJECT_PLACEMENT_SCHEMA
    ? getPlacementWorldAnchor(targetInput, options.targetAnchorId ?? targetInput.supportAnchorId)
    : normalizeWorldAnchor(targetInput);
  const normalMode = String(options.normalMode ?? "opposed");
  if (!["opposed", "same", "position-only"].includes(normalMode)) {
    throw new TypeError(`Unsupported normalMode ${normalMode}.`);
  }

  let nextRotation = source.transform.rotation;
  if (normalMode !== "position-only") {
    const desiredNormal = normalMode === "opposed" ? scale(targetAnchor.normal, -1) : targetAnchor.normal;
    const normalDelta = quaternionFromUnitVectors(sourceAnchor.normal, desiredNormal);
    nextRotation = multiplyQuaternion(normalDelta, nextRotation);

    if (options.alignForward !== false) {
      const rotatedForward = unit(projectToPlane(
        rotate(sourceAnchor.forward, normalDelta),
        desiredNormal
      ), "aligned source forward");
      const targetForward = unit(projectToPlane(targetAnchor.forward, desiredNormal), "target forward");
      const angle = Math.atan2(
        dot(desiredNormal, cross(rotatedForward, targetForward)),
        dot(rotatedForward, targetForward)
      );
      nextRotation = multiplyQuaternion(quaternionFromAxisAngle(desiredNormal, angle), nextRotation);
    }
  }

  const localAnchor = source.anchors.find((entry) => entry.id === sourceAnchorId);
  const rotatedLocalAnchor = rotate(multiply(localAnchor.position, source.transform.scale), nextRotation);
  const offset = finite(options.offset, 0, "offset");
  const targetPosition = add(targetAnchor.position, scale(targetAnchor.normal, offset));
  return createObjectPlacementDescriptor({
    ...source,
    revision: source.revision + 1,
    transform: {
      ...source.transform,
      rotation: nextRotation,
      position: subtract(targetPosition, rotatedLocalAnchor)
    }
  });
}

export function groundPlacement(input, planeInput = {}, options = {}) {
  const source = descriptor(input);
  const plane = {
    point: vec3(planeInput.point, [0, 0, 0], "plane.point"),
    normal: unit(vec3(planeInput.normal, [0, 1, 0], "plane.normal"), "plane.normal")
  };
  let nextRotation = source.transform.rotation;
  if (options.orientToSurface !== false) {
    const support = getPlacementWorldAnchor(source, source.supportAnchorId);
    const desiredNormal = scale(plane.normal, -1);
    nextRotation = multiplyQuaternion(
      quaternionFromUnitVectors(support.normal, desiredNormal),
      nextRotation
    );
  }

  let next = createObjectPlacementDescriptor({
    ...source,
    revision: source.revision + 1,
    transform: { ...source.transform, rotation: nextRotation }
  });
  const clearance = finite(options.clearance, 0, "clearance");
  const contactMode = String(options.contactMode ?? "anchor");
  let distance;
  if (contactMode === "anchor") {
    const support = getPlacementWorldAnchor(next, next.supportAnchorId);
    distance = dot(subtract(support.position, plane.point), plane.normal);
  } else if (contactMode === "bounds") {
    distance = Math.min(...boundsCorners(next.localBounds).map((point) => (
      dot(subtract(computePlacementWorldPoint(next, point), plane.point), plane.normal)
    )));
  } else {
    throw new TypeError(`Unsupported contactMode ${contactMode}.`);
  }
  next = createObjectPlacementDescriptor({
    ...next,
    transform: {
      ...next.transform,
      position: add(next.transform.position, scale(plane.normal, clearance - distance))
    }
  });
  return next;
}

export function fitPlacementWithinBounds(input, targetBoundsInput, options = {}) {
  const source = descriptor(input);
  const targetBounds = normalizeBounds(targetBoundsInput, "targetBounds");
  const mode = String(options.mode ?? "contain");
  if (!["contain", "cover"].includes(mode)) throw new TypeError(`Unsupported fit mode ${mode}.`);
  const originTransform = {
    ...source.transform,
    position: [0, 0, 0]
  };
  const originPlacement = createObjectPlacementDescriptor({ ...source, transform: originTransform });
  const currentBounds = getPlacementWorldBounds(originPlacement);
  const ratios = targetBounds.size
    .map((sizeValue, axis) => currentBounds.size[axis] <= EPSILON ? Infinity : sizeValue / currentBounds.size[axis])
    .filter(Number.isFinite);
  if (!ratios.length) throw new RangeError("Placement cannot be fit because its transformed bounds have no measurable size.");
  const factor = mode === "contain" ? Math.min(...ratios) : Math.max(...ratios);
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError("Placement fit produced an invalid scale.");
  const fitted = createObjectPlacementDescriptor({
    ...source,
    revision: source.revision + 1,
    transform: {
      ...source.transform,
      position: [0, 0, 0],
      scale: scale(source.transform.scale, factor)
    }
  });
  const fittedBounds = getPlacementWorldBounds(fitted);
  return createObjectPlacementDescriptor({
    ...fitted,
    transform: {
      ...fitted.transform,
      position: subtract(targetBounds.center, fittedBounds.center)
    }
  });
}

function boundsOverlap(left, right, padding = 0) {
  return left.min.every((minimum, axis) => (
    minimum < right.max[axis] - padding && left.max[axis] > right.min[axis] + padding
  ));
}

export function validatePlacement(input, options = {}) {
  const errors = [];
  const warnings = [];
  let placement;
  try {
    placement = descriptor(input);
  } catch (error) {
    return {
      valid: false,
      errors: [{ code: "invalid-descriptor", message: error.message }],
      warnings,
      metrics: {}
    };
  }
  const tolerance = Math.max(0, finite(options.tolerance, 0.001, "tolerance"));
  if (!pointInsideBounds(placement.pivot, placement.localBounds, tolerance)) {
    warnings.push({ code: "pivot-outside-bounds", message: "The pivot is outside local bounds." });
  }
  if (!pointInsideBounds(placement.origin, placement.localBounds, tolerance)) {
    warnings.push({ code: "origin-outside-bounds", message: "The origin is outside local bounds." });
  }
  for (const anchor of placement.anchors) {
    if (!pointInsideBounds(anchor.position, placement.localBounds, tolerance)) {
      warnings.push({ code: "anchor-outside-bounds", anchorId: anchor.id, message: `Anchor ${anchor.id} is outside local bounds.` });
    }
  }

  const worldBounds = getPlacementWorldBounds(placement);
  const metrics = { worldBounds };
  if (options.containerBounds) {
    const container = normalizeBounds(options.containerBounds, "containerBounds");
    const outside = worldBounds.min.some((entry, axis) => (
      entry < container.min[axis] - tolerance || worldBounds.max[axis] > container.max[axis] + tolerance
    ));
    if (outside) errors.push({ code: "outside-container", message: "Placement exceeds the required container bounds." });
  }
  for (const [index, obstacleInput] of (options.obstacleBounds ?? []).entries()) {
    const obstacle = normalizeBounds(obstacleInput, `obstacleBounds[${index}]`);
    if (boundsOverlap(worldBounds, obstacle, tolerance)) {
      errors.push({ code: "bounds-overlap", obstacleIndex: index, message: `Placement overlaps obstacle ${index}.` });
    }
  }
  if (options.contactPlane) {
    const plane = {
      point: vec3(options.contactPlane.point, [0, 0, 0], "contactPlane.point"),
      normal: unit(vec3(options.contactPlane.normal, [0, 1, 0], "contactPlane.normal"), "contactPlane.normal")
    };
    const clearance = finite(options.clearance, 0, "clearance");
    const support = getPlacementWorldAnchor(placement, placement.supportAnchorId);
    const contactError = Math.abs(dot(subtract(support.position, plane.point), plane.normal) - clearance);
    const minimumCornerDistance = Math.min(...boundsCorners(placement.localBounds).map((point) => (
      dot(subtract(computePlacementWorldPoint(placement, point), plane.point), plane.normal)
    )));
    metrics.contactError = contactError;
    metrics.minimumCornerDistance = minimumCornerDistance;
    if (contactError > tolerance) {
      errors.push({ code: "contact-gap", value: contactError, message: "Support anchor does not meet the contact plane." });
    }
    if (minimumCornerDistance < -tolerance) {
      errors.push({ code: "surface-penetration", value: -minimumCornerDistance, message: "Placement penetrates the contact plane." });
    }
  }
  return { valid: errors.length === 0, errors, warnings, metrics };
}

function createApi(config = {}) {
  let records = new Map();

  function resolve(value) {
    if (typeof value === "string") {
      const found = records.get(value);
      if (!found) throw new TypeError(`Unknown object placement ${value}.`);
      return found;
    }
    return descriptor(value);
  }

  const api = {
    create(input = {}) {
      const next = createObjectPlacementDescriptor({ ...config.defaults, ...input });
      records.set(next.id, next);
      return clone(next);
    },
    revise(id, patch = {}) {
      const current = resolve(String(id));
      const next = createObjectPlacementDescriptor({
        ...current,
        ...patch,
        id: current.id,
        objectId: current.objectId,
        revision: current.revision + 1,
        coordinateFrame: { ...current.coordinateFrame, ...(patch.coordinateFrame ?? {}) },
        localBounds: patch.localBounds ?? current.localBounds,
        transform: { ...current.transform, ...(patch.transform ?? {}) },
        metadata: { ...current.metadata, ...(patch.metadata ?? {}) },
        anchors: patch.anchors ?? current.anchors
      });
      records.set(next.id, next);
      return clone(next);
    },
    save(input) {
      const next = descriptor(input);
      records.set(next.id, next);
      return clone(next);
    },
    get(id) {
      return clone(records.get(String(id)) ?? null);
    },
    list() {
      return [...records.values()].sort((left, right) => left.id.localeCompare(right.id)).map(clone);
    },
    remove(id) {
      return records.delete(String(id));
    },
    worldPoint(input, point) {
      return computePlacementWorldPoint(resolve(input), point);
    },
    worldAnchor(input, anchorId) {
      return getPlacementWorldAnchor(resolve(input), anchorId);
    },
    worldBounds(input) {
      return getPlacementWorldBounds(resolve(input));
    },
    align(input, target, options = {}) {
      return alignPlacementAnchors(resolve(input), resolveTarget(target), options);
    },
    ground(input, plane, options = {}) {
      return groundPlacement(resolve(input), plane, options);
    },
    fit(input, targetBounds, options = {}) {
      return fitPlacementWithinBounds(resolve(input), targetBounds, options);
    },
    validate(input, options = {}) {
      return validatePlacement(resolve(input), options);
    },
    getSnapshot() {
      return {
        version: OBJECT_PLACEMENT_CONTRACT_KIT_VERSION,
        status: "ready",
        records: api.list()
      };
    },
    loadSnapshot(snapshot = {}) {
      if (snapshot.version !== OBJECT_PLACEMENT_CONTRACT_KIT_VERSION || snapshot.status !== "ready") {
        throw new TypeError("Unsupported object-placement snapshot.");
      }
      records = new Map((snapshot.records ?? []).map((record) => {
        const next = descriptor(record);
        return [next.id, next];
      }));
      return api.getSnapshot();
    },
    reset() {
      records = new Map();
      return api.getSnapshot();
    }
  };

  function resolveTarget(target) {
    return typeof target === "string" ? resolve(target) : target;
  }

  return Object.freeze(api);
}

export function createObjectPlacementContractKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "object-placement-contract-kit",
    domain: "object-placement",
    domainPath: "n:spatial:object-placement",
    parentDomainPath: "n:spatial",
    apiName: config.apiName ?? "objectPlacement",
    version: OBJECT_PLACEMENT_CONTRACT_KIT_VERSION,
    stability: config.stability ?? "candidate",
    services: [
      "coordinate-frame",
      "origin-pivot",
      "local-bounds",
      "named-anchors",
      "surface-contact",
      "anchor-alignment",
      "volume-fit",
      "placement-validation",
      "snapshot",
      "reset"
    ],
    provides: [
      "spatial:object-placement-contract",
      "spatial:placement-anchor-alignment",
      "spatial:placement-validation"
    ],
    createApi() {
      return createApi(config);
    },
    install({ engine }) {
      engine.objectPlacement = engine.n.objectPlacement;
    },
    metadata: {
      status: "candidate",
      rendererAgnostic: true,
      deterministic: true,
      coordinateFrame: OBJECT_PLACEMENT_FRAME,
      boundary: "Owns serializable placement records and deterministic placement math. It does not own meshes, render objects, physics bodies, navigation meshes, world generation, or agent review decisions."
    }
  });
}

export default createObjectPlacementContractKit;
