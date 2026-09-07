const DEFAULT_BUFFER_USAGE = Object.freeze({
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200
});

const DEFAULT_TEXTURE_USAGE = Object.freeze({
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10
});

function normalizeUsageKey(value) {
  return String(value).trim().replaceAll("-", "_").toUpperCase();
}

function bufferUsageFlags(usage = [], constants = DEFAULT_BUFFER_USAGE) {
  let flags = 0;
  for (const value of usage) {
    const key = normalizeUsageKey(value);
    if (key === "READBACK") flags |= constants.MAP_READ | constants.COPY_DST;
    else if (key === "UPLOAD") flags |= constants.MAP_WRITE | constants.COPY_SRC;
    else if (constants[key] != null) flags |= constants[key];
  }
  return flags || (constants.STORAGE | constants.COPY_DST | constants.COPY_SRC);
}

function textureUsageFlags(usage = [], constants = DEFAULT_TEXTURE_USAGE) {
  let flags = 0;
  for (const value of usage) {
    const key = normalizeUsageKey(value);
    if (constants[key] != null) flags |= constants[key];
  }
  return flags || (constants.TEXTURE_BINDING | constants.COPY_DST);
}

function alignedSize(value) {
  const size = Math.max(4, Number(value ?? 0) || 0);
  return Math.ceil(size / 4) * 4;
}

function bytesFrom(value) {
  if (value == null) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return new Float32Array(value);
  throw new TypeError("WebGPU Host resource initialData must be an ArrayBuffer, TypedArray, or numeric array.");
}

function portableLimits(value) {
  if (!value) return {};
  const output = {};
  for (const key of Object.keys(value)) {
    const entry = Number(value[key]);
    if (Number.isFinite(entry)) output[key] = entry;
  }
  return output;
}

function normalizeTextureSize(size) {
  if (Array.isArray(size)) return size;
  if (size && typeof size === "object") return size;
  return [1, 1, 1];
}

export function createWebGPUHostProvider(config = {}) {
  let adapter = config.adapter ?? null;
  let device = config.device ?? null;
  let generation = device ? 1 : 0;
  let deviceId = device
    ? (typeof config.deviceId === "function" ? config.deviceId(generation) : config.deviceId ?? `webgpu-device-${generation}`)
    : null;
  let lossHandler = null;
  let lossSubscriptionDevice = null;
  const resources = new Map();
  const bufferUsage = config.GPUBufferUsage ?? globalThis.GPUBufferUsage ?? DEFAULT_BUFFER_USAGE;
  const textureUsage = config.GPUTextureUsage ?? globalThis.GPUTextureUsage ?? DEFAULT_TEXTURE_USAGE;

  function observeDeviceLoss() {
    if (!device?.lost || lossSubscriptionDevice === device) return;
    lossSubscriptionDevice = device;
    Promise.resolve(device.lost).then((info) => {
      for (const entry of resources.values()) entry.resource?.destroy?.();
      resources.clear();
      lossHandler?.({ reason: info?.reason ?? "unknown", message: info?.message ?? "WebGPU device lost." });
    }).catch(() => {});
  }

  async function ensureDevice(profile = {}) {
    if (!device) {
      const gpu = config.gpu ?? globalThis.navigator?.gpu;
      if (!gpu && !adapter) throw new Error("WebGPU is unavailable in this host.");
      adapter = adapter ?? await gpu.requestAdapter(config.adapterOptions ?? { powerPreference: "high-performance" });
      if (!adapter) throw new Error("WebGPU adapter acquisition failed.");
      device = await adapter.requestDevice(config.deviceDescriptor ?? {});
      if (!device) throw new Error("WebGPU device acquisition failed.");
      generation += 1;
      deviceId = typeof config.deviceId === "function" ? config.deviceId(generation) : config.deviceId ?? `webgpu-device-${generation}`;
    }
    observeDeviceLoss();
    const features = [...new Set([
      "compute",
      "render",
      "storage-buffer",
      "vertex-buffer",
      "indirect-buffer",
      "storage-texture",
      ...(adapter?.features ? Array.from(adapter.features, String) : []),
      ...(device?.features ? Array.from(device.features, String) : [])
    ])].sort();
    for (const required of profile.requiredFeatures ?? []) {
      if (!features.includes(required)) throw new Error(`WebGPU device is missing required feature ${required}.`);
    }
    return {
      id: deviceId,
      backend: "webgpu",
      generation,
      state: "ready",
      features,
      limits: { ...portableLimits(adapter?.limits), ...portableLimits(config.limits) },
      metadata: { sharedDevice: true }
    };
  }

  async function ensureResource(descriptor, initialData = null) {
    await ensureDevice();
    const id = String(descriptor.id);
    const existing = resources.get(id);
    if (descriptor.type === "texture") {
      const usage = textureUsageFlags(descriptor.usage, textureUsage);
      const size = normalizeTextureSize(descriptor.size);
      const format = descriptor.format ?? "rgba8unorm";
      const signature = JSON.stringify({ type: "texture", usage, size, format });
      if (existing?.signature === signature) return { reallocated: false };
      existing?.resource?.destroy?.();
      const resource = device.createTexture({ label: `nexus-host-gpu:${id}`, size, format, usage });
      resources.set(id, { resource, signature, descriptor: { ...descriptor }, type: "texture" });
      return { reallocated: true };
    }

    const bytes = bytesFrom(initialData);
    const size = alignedSize(descriptor.byteLength || bytes?.byteLength || 4);
    const usage = bufferUsageFlags(descriptor.usage, bufferUsage);
    const signature = JSON.stringify({ type: "buffer", usage, size });
    let reallocated = false;
    let resource = existing?.resource ?? null;
    if (!existing || existing.signature !== signature) {
      existing?.resource?.destroy?.();
      resource = device.createBuffer({ label: `nexus-host-gpu:${id}`, size, usage, mappedAtCreation: false });
      resources.set(id, { resource, signature, descriptor: { ...descriptor }, size, type: "buffer" });
      reallocated = true;
    } else {
      existing.descriptor = { ...descriptor };
    }
    if (bytes?.byteLength) device.queue.writeBuffer(resource, 0, bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { reallocated };
  }

  return Object.freeze({
    id: String(config.id ?? "webgpu-gpu-host-provider"),
    backend: "webgpu",
    setLossHandler(handler) { lossHandler = typeof handler === "function" ? handler : null; observeDeviceLoss(); },
    ensureDevice,
    describeDevice() { return device ? { id: deviceId, backend: "webgpu", generation, state: "ready" } : null; },
    ensureResource,
    resolveResource(resourceId) { return resources.get(String(resourceId))?.resource ?? null; },
    resolveResourceView(resourceId, descriptor = {}) {
      const entry = resources.get(String(resourceId));
      if (!entry?.resource || entry.type !== "texture") return null;
      return entry.resource.createView(descriptor);
    },
    releaseResource(resourceId) {
      const entry = resources.get(String(resourceId));
      if (!entry) return false;
      entry.resource?.destroy?.();
      resources.delete(String(resourceId));
      return true;
    },
    getDevice() { return device; },
    getAdapter() { return adapter; },
    getQueue() { return device?.queue ?? null; },
    invalidate() {
      for (const entry of resources.values()) entry.resource?.destroy?.();
      resources.clear();
      if (!config.device) device = null;
    },
    async restore(profile = {}) {
      for (const entry of resources.values()) entry.resource?.destroy?.();
      resources.clear();
      if (typeof config.deviceFactory === "function") {
        const next = await config.deviceFactory({ generation: generation + 1, profile });
        adapter = next?.adapter ?? adapter;
        device = next?.device ?? next;
      } else if (!config.device) {
        device = null;
      }
      if (device) {
        generation += 1;
        deviceId = typeof config.deviceId === "function" ? config.deviceId(generation) : config.deviceId ?? `webgpu-device-${generation}`;
      }
      return ensureDevice(profile);
    },
    dispose() {
      for (const entry of resources.values()) entry.resource?.destroy?.();
      resources.clear();
      device = null;
      adapter = null;
      lossSubscriptionDevice = null;
    }
  });
}
