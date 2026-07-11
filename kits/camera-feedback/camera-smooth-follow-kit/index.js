import { defineDomainServiceKit } from "nexusengine";

export const CAMERA_SMOOTH_FOLLOW_KIT_VERSION = "0.1.0";

const clone = (value) => value == null
  ? value
  : typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

function finite(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function positive(value, fallback, minimum = 1e-4) {
  return Math.max(minimum, finite(value, fallback));
}

function vector3(value, fallback = [0, 0, 0]) {
  const source = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
  return [
    finite(source[0], fallback[0]),
    finite(source[1], fallback[1]),
    finite(source[2], fallback[2])
  ];
}

function quaternion(value, fallback = [0, 0, 0, 1]) {
  const source = Array.isArray(value) ? value : [value?.x, value?.y, value?.z, value?.w];
  const output = [
    finite(source[0], fallback[0]),
    finite(source[1], fallback[1]),
    finite(source[2], fallback[2]),
    finite(source[3], fallback[3])
  ];
  const length = Math.hypot(...output) || 1;
  return output.map((component) => component / length);
}

function copy3(target, source) {
  target[0] = source[0];
  target[1] = source[1];
  target[2] = source[2];
  return target;
}

function copy4(target, source) {
  target[0] = source[0];
  target[1] = source[1];
  target[2] = source[2];
  target[3] = source[3];
  return target;
}

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function normalize3(value, fallback = [0, 1, 0]) {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 1e-8) return [...fallback];
  return [value[0] / length, value[1] / length, value[2] / length];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function lookQuaternion(eye, target, upInput = [0, 1, 0]) {
  const z = normalize3([
    eye[0] - target[0],
    eye[1] - target[1],
    eye[2] - target[2]
  ], [0, 0, 1]);
  let x = cross3(vector3(upInput, [0, 1, 0]), z);
  if (Math.hypot(...x) < 1e-8) {
    const adjusted = Math.abs(z[1]) > 0.999 ? [0, 0, 1] : [0, 1, 0];
    x = cross3(adjusted, z);
  }
  x = normalize3(x, [1, 0, 0]);
  const y = cross3(z, x);

  const m11 = x[0], m12 = y[0], m13 = z[0];
  const m21 = x[1], m22 = y[1], m23 = z[1];
  const m31 = x[2], m32 = y[2], m33 = z[2];
  const trace = m11 + m22 + m33;
  const output = [0, 0, 0, 1];

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    output[3] = 0.25 / s;
    output[0] = (m32 - m23) * s;
    output[1] = (m13 - m31) * s;
    output[2] = (m21 - m12) * s;
  } else if (m11 > m22 && m11 > m33) {
    const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
    output[3] = (m32 - m23) / s;
    output[0] = 0.25 * s;
    output[1] = (m12 + m21) / s;
    output[2] = (m13 + m31) / s;
  } else if (m22 > m33) {
    const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
    output[3] = (m13 - m31) / s;
    output[0] = (m12 + m21) / s;
    output[1] = 0.25 * s;
    output[2] = (m23 + m32) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
    output[3] = (m21 - m12) / s;
    output[0] = (m13 + m31) / s;
    output[1] = (m23 + m32) / s;
    output[2] = 0.25 * s;
  }
  return quaternion(output);
}

function slerpQuaternion(current, targetInput, amount) {
  const target = quaternion(targetInput);
  let cosine = current[0] * target[0] + current[1] * target[1] + current[2] * target[2] + current[3] * target[3];
  if (cosine < 0) {
    cosine = -cosine;
    target[0] = -target[0];
    target[1] = -target[1];
    target[2] = -target[2];
    target[3] = -target[3];
  }

  const t = Math.max(0, Math.min(1, finite(amount, 0)));
  let scale0;
  let scale1;
  if (1 - cosine > 1e-6) {
    const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
    const sine = Math.sin(angle);
    scale0 = Math.sin((1 - t) * angle) / sine;
    scale1 = Math.sin(t * angle) / sine;
  } else {
    scale0 = 1 - t;
    scale1 = t;
  }

  return quaternion([
    scale0 * current[0] + scale1 * target[0],
    scale0 * current[1] + scale1 * target[1],
    scale0 * current[2] + scale1 * target[2],
    scale0 * current[3] + scale1 * target[3]
  ]);
}

function smoothDampVector(current, target, velocity, smoothTime, maximumSpeed, deltaTime) {
  const dt = Math.max(0, finite(deltaTime, 0));
  if (dt <= 0) return current;

  const duration = positive(smoothTime, 0.2);
  const omega = 2 / duration;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const originalTarget = [...target];
  const change = [
    current[0] - target[0],
    current[1] - target[1],
    current[2] - target[2]
  ];
  const maximumChange = Math.max(0, finite(maximumSpeed, Infinity)) * duration;
  const changeLength = Math.hypot(...change);
  if (Number.isFinite(maximumChange) && changeLength > maximumChange && changeLength > 1e-8) {
    const scale = maximumChange / changeLength;
    change[0] *= scale;
    change[1] *= scale;
    change[2] *= scale;
  }

  const adjustedTarget = [
    current[0] - change[0],
    current[1] - change[1],
    current[2] - change[2]
  ];
  const temporary = [
    (velocity[0] + omega * change[0]) * dt,
    (velocity[1] + omega * change[1]) * dt,
    (velocity[2] + omega * change[2]) * dt
  ];
  velocity[0] = (velocity[0] - omega * temporary[0]) * decay;
  velocity[1] = (velocity[1] - omega * temporary[1]) * decay;
  velocity[2] = (velocity[2] - omega * temporary[2]) * decay;

  const output = [
    adjustedTarget[0] + (change[0] + temporary[0]) * decay,
    adjustedTarget[1] + (change[1] + temporary[1]) * decay,
    adjustedTarget[2] + (change[2] + temporary[2]) * decay
  ];
  const before = [
    originalTarget[0] - current[0],
    originalTarget[1] - current[1],
    originalTarget[2] - current[2]
  ];
  const after = [
    output[0] - originalTarget[0],
    output[1] - originalTarget[1],
    output[2] - originalTarget[2]
  ];
  if (before[0] * after[0] + before[1] * after[1] + before[2] * after[2] > 0) {
    copy3(output, originalTarget);
    velocity[0] = velocity[1] = velocity[2] = 0;
  }

  copy3(current, output);
  return current;
}

function createController(options = {}) {
  const id = String(options.id ?? "camera-smooth-follow").trim();
  if (!id) throw new TypeError("Camera smooth follow controller requires a non-empty id.");

  const config = {
    positionSmoothTime: positive(options.positionSmoothTime, 0.22),
    lookSmoothTime: positive(options.lookSmoothTime, 0.14),
    maximumPositionSpeed: positive(options.maximumPositionSpeed, 45),
    maximumLookSpeed: positive(options.maximumLookSpeed, 65),
    rotationSharpness: positive(options.rotationSharpness, 12),
    maximumDeltaTime: positive(options.maximumDeltaTime, 1 / 30),
    teleportThreshold: positive(options.teleportThreshold, 30),
    up: vector3(options.up, [0, 1, 0])
  };
  const state = {
    initialized: false,
    revision: 0,
    position: vector3(options.position),
    positionVelocity: [0, 0, 0],
    lookPoint: vector3(options.lookPoint, [0, 0, 1]),
    lookVelocity: [0, 0, 0],
    quaternion: quaternion(options.quaternion),
    targetPosition: vector3(options.position),
    targetLookPoint: vector3(options.lookPoint, [0, 0, 1]),
    targetQuaternion: quaternion(options.quaternion),
    lastDeltaTime: 0,
    lastResetReason: "initial"
  };
  const output = {
    id,
    kind: "camera-smooth-follow-transform",
    revision: 0,
    position: state.position,
    lookPoint: state.lookPoint,
    quaternion: state.quaternion,
    positionVelocity: state.positionVelocity,
    lookVelocity: state.lookVelocity,
    deltaTime: 0,
    reset: false
  };

  function reset(input = {}) {
    const position = vector3(input.position ?? input.targetPosition, state.position);
    const lookPoint = vector3(input.lookPoint ?? input.targetLookPoint, state.lookPoint);
    const nextQuaternion = input.quaternion
      ? quaternion(input.quaternion)
      : lookQuaternion(position, lookPoint, input.up ?? config.up);
    copy3(state.position, position);
    copy3(state.targetPosition, position);
    copy3(state.lookPoint, lookPoint);
    copy3(state.targetLookPoint, lookPoint);
    state.positionVelocity[0] = state.positionVelocity[1] = state.positionVelocity[2] = 0;
    state.lookVelocity[0] = state.lookVelocity[1] = state.lookVelocity[2] = 0;
    copy4(state.quaternion, nextQuaternion);
    copy4(state.targetQuaternion, nextQuaternion);
    state.initialized = true;
    state.revision += 1;
    state.lastDeltaTime = 0;
    state.lastResetReason = String(input.reason ?? "manual");
    output.revision = state.revision;
    output.deltaTime = 0;
    output.reset = true;
    return output;
  }

  function update(input = {}) {
    const targetPosition = vector3(input.targetPosition ?? input.position, state.targetPosition);
    const targetLookPoint = vector3(input.targetLookPoint ?? input.lookPoint, state.targetLookPoint);
    copy3(state.targetPosition, targetPosition);
    copy3(state.targetLookPoint, targetLookPoint);

    if (!state.initialized || input.reset === true || distance3(state.position, targetPosition) > config.teleportThreshold) {
      return reset({
        position: targetPosition,
        lookPoint: targetLookPoint,
        up: input.up ?? config.up,
        reason: input.reset === true ? "requested" : state.initialized ? "teleport-threshold" : "initialize"
      });
    }

    const dt = Math.min(config.maximumDeltaTime, Math.max(0, finite(input.deltaTime, 0)));
    smoothDampVector(
      state.position,
      targetPosition,
      state.positionVelocity,
      config.positionSmoothTime,
      config.maximumPositionSpeed,
      dt
    );
    smoothDampVector(
      state.lookPoint,
      targetLookPoint,
      state.lookVelocity,
      config.lookSmoothTime,
      config.maximumLookSpeed,
      dt
    );
    copy4(state.targetQuaternion, lookQuaternion(state.position, state.lookPoint, input.up ?? config.up));
    copy4(
      state.quaternion,
      slerpQuaternion(state.quaternion, state.targetQuaternion, 1 - Math.exp(-config.rotationSharpness * dt))
    );
    state.revision += 1;
    state.lastDeltaTime = dt;
    output.revision = state.revision;
    output.deltaTime = dt;
    output.reset = false;
    return output;
  }

  function getSnapshot() {
    return {
      version: CAMERA_SMOOTH_FOLLOW_KIT_VERSION,
      id,
      config: clone(config),
      state: {
        initialized: state.initialized,
        revision: state.revision,
        position: [...state.position],
        positionVelocity: [...state.positionVelocity],
        lookPoint: [...state.lookPoint],
        lookVelocity: [...state.lookVelocity],
        quaternion: [...state.quaternion],
        targetPosition: [...state.targetPosition],
        targetLookPoint: [...state.targetLookPoint],
        targetQuaternion: [...state.targetQuaternion],
        lastDeltaTime: state.lastDeltaTime,
        lastResetReason: state.lastResetReason
      }
    };
  }

  function loadSnapshot(snapshot = {}) {
    if (snapshot.version !== CAMERA_SMOOTH_FOLLOW_KIT_VERSION || snapshot.id !== id) {
      throw new TypeError(`Unsupported camera smooth follow snapshot for ${id}.`);
    }
    const next = snapshot.state ?? {};
    state.initialized = Boolean(next.initialized);
    state.revision = Math.max(0, Math.floor(finite(next.revision, 0)));
    copy3(state.position, vector3(next.position));
    copy3(state.positionVelocity, vector3(next.positionVelocity));
    copy3(state.lookPoint, vector3(next.lookPoint, [0, 0, 1]));
    copy3(state.lookVelocity, vector3(next.lookVelocity));
    copy4(state.quaternion, quaternion(next.quaternion));
    copy3(state.targetPosition, vector3(next.targetPosition, state.position));
    copy3(state.targetLookPoint, vector3(next.targetLookPoint, state.lookPoint));
    copy4(state.targetQuaternion, quaternion(next.targetQuaternion, state.quaternion));
    state.lastDeltaTime = Math.max(0, finite(next.lastDeltaTime, 0));
    state.lastResetReason = String(next.lastResetReason ?? "snapshot");
    output.revision = state.revision;
    output.deltaTime = state.lastDeltaTime;
    output.reset = false;
    return output;
  }

  return Object.freeze({
    id,
    update,
    reset,
    getTransform: () => output,
    getSnapshot,
    getState: getSnapshot,
    loadSnapshot,
    getConfig: () => clone(config)
  });
}

function createApi(config = {}) {
  const initialControllers = Array.isArray(config.controllers) ? config.controllers.map(clone) : [];
  const controllers = new Map();

  function create(options = {}) {
    const id = String(options.id ?? "camera-smooth-follow");
    if (controllers.has(id) && options.replace !== true) return controllers.get(id);
    const controller = createController({ ...options, id });
    controllers.set(id, controller);
    return controller;
  }

  function get(id) {
    const key = String(id ?? "");
    const controller = controllers.get(key);
    if (!controller) throw new RangeError(`Unknown camera smooth follow controller: ${key}`);
    return controller;
  }

  function getSnapshot() {
    return {
      version: CAMERA_SMOOTH_FOLLOW_KIT_VERSION,
      status: "ready",
      controllers: [...controllers.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((controller) => controller.getSnapshot())
    };
  }

  function reset() {
    controllers.clear();
    for (const controller of initialControllers) create(controller);
    return getSnapshot();
  }

  function loadSnapshot(snapshot = {}) {
    if (snapshot.version !== CAMERA_SMOOTH_FOLLOW_KIT_VERSION || snapshot.status !== "ready") {
      throw new TypeError("Unsupported camera smooth follow service snapshot.");
    }
    controllers.clear();
    for (const record of snapshot.controllers ?? []) {
      const controller = create({ id: record.id, ...(record.config ?? {}) });
      controller.loadSnapshot(record);
    }
    return getSnapshot();
  }

  reset();
  return Object.freeze({
    create,
    get,
    has(id) { return controllers.has(String(id)); },
    remove(id) { return controllers.delete(String(id)); },
    list() { return [...controllers.keys()].sort(); },
    getSnapshot,
    getState: getSnapshot,
    loadSnapshot,
    reset
  });
}

export function createCameraSmoothFollowKit(config = {}) {
  return defineDomainServiceKit({
    id: config.id ?? "camera-smooth-follow-kit",
    domain: "camera-smooth-follow",
    domainPath: "n:camera-feedback:smooth-follow",
    parentDomainPath: "n:camera-feedback",
    apiName: config.apiName ?? "cameraSmoothFollow",
    version: CAMERA_SMOOTH_FOLLOW_KIT_VERSION,
    stability: "candidate",
    services: ["position-smooth-damp", "look-target-smooth-damp", "rotation-damping", "camera-reset"],
    provides: [
      "camera:smooth-follow",
      "camera:smooth-position",
      "camera:smooth-look-target",
      "camera:smooth-rotation"
    ],
    createApi() {
      return createApi(config);
    },
    metadata: {
      domainFamily: "camera-feedback",
      rendererAgnostic: true,
      deterministic: true,
      boundary: "Owns damped camera transform state and reset behavior. Renderers own camera objects, projection, scene graph, collision queries, and final transform application."
    }
  });
}

export default createCameraSmoothFollowKit;
