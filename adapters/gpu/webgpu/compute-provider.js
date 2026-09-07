import { portableClone } from "nexusengine/domains/compute";
import { createComputeResourceReceipt } from "nexusengine/domains/compute";
import { createGPUHost } from "nexusengine/domains/host";
import { createWebGPUHostProvider } from "./host-provider.js";

function bytesFrom(value) {
  if (value == null) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return new Float32Array(value);
  throw new TypeError("WebGPU compute initialData must be an ArrayBuffer, TypedArray, or numeric array.");
}

function alignedSize(value) {
  const size = Math.max(4, Number(value ?? 0));
  return Math.ceil(size / 4) * 4;
}

function kernelSource(kernel = {}) {
  const source = kernel.source ?? kernel.metadata?.source ?? kernel.metadata?.wgsl;
  if (typeof source !== "string" || !source.trim()) {
    throw new Error(`WebGPU compute kernel ${kernel.id ?? "kernel"} requires portable WGSL source.`);
  }
  return source;
}

function nodeBindingIds(node = {}) {
  if (Array.isArray(node.bindings) && node.bindings.length) return node.bindings.map(String);
  const ids = [];
  for (const id of [...(node.reads ?? []), ...(node.writes ?? [])]) {
    const key = String(id);
    if (!ids.includes(key)) ids.push(key);
  }
  return ids;
}

function normalizeBufferUsage(descriptor = {}) {
  const requested = descriptor.usage == null ? ["storage"] : Array.isArray(descriptor.usage) ? descriptor.usage : [descriptor.usage];
  return [...new Set(["storage", "copy-src", "copy-dst", ...requested.map(String)])];
}

export function createWebGPUComputeProvider(config = {}) {
  const ownsGPUHost = !config.gpuHost;
  const gpuHost = config.gpuHost ?? createGPUHost({
    id: `${config.id ?? "webgpu-compute"}:gpu-host`,
    provider: config.gpuProvider ?? createWebGPUHostProvider(config)
  });
  let descriptors = { buffers: {}, kernels: {}, graphs: {} };
  const pipelines = new Map();
  let sequence = 0;

  async function ensureDevice() {
    const descriptor = await gpuHost.ensureDevice({
      requiredBackend: "webgpu",
      requiredFeatures: ["compute"],
      compute: true,
      render: false
    });
    const access = gpuHost.providerAccess();
    const device = access.getDevice();
    if (!device) throw new Error("WebGPU Compute Host did not expose its provider device.");
    return { descriptor, device, access };
  }

  async function ensureBuffer(id, descriptor = {}) {
    const initial = bytesFrom(descriptor.initialData);
    const size = alignedSize(descriptor.byteLength || initial?.byteLength || 4);
    await gpuHost.ensureResource({
      id,
      type: "buffer",
      usage: normalizeBufferUsage(descriptor),
      byteLength: size,
      metadata: { ...(descriptor.metadata ?? {}), computeResource: true }
    }, initial);
    const buffer = gpuHost.providerAccess().resolveResource(id);
    if (!buffer) throw new Error(`GPU Host did not resolve compute buffer ${id}.`);
    return buffer;
  }

  async function ensurePipeline(kernel = {}) {
    const { descriptor: deviceDescriptor, device } = await ensureDevice();
    const source = kernelSource(kernel);
    const cacheKey = `${deviceDescriptor.id}:${deviceDescriptor.generation}:${kernel.id}:${kernel.entryPoint}:${source}`;
    if (pipelines.has(cacheKey)) return pipelines.get(cacheKey);
    const shaderModule = device.createShaderModule({ label: `nexus-compute:${kernel.id}:wgsl`, code: source });
    const compilation = await shaderModule.getCompilationInfo?.();
    const errors = compilation?.messages?.filter((message) => message.type === "error") ?? [];
    if (errors.length) throw new Error(`WebGPU kernel ${kernel.id} failed compilation: ${errors.map((entry) => entry.message).join("; ")}`);
    const pipelineDescriptor = {
      label: `nexus-compute:${kernel.id}:pipeline`,
      layout: "auto",
      compute: {
        module: shaderModule,
        entryPoint: kernel.entryPoint ?? "main",
        constants: kernel.constants ?? kernel.metadata?.constants
      }
    };
    const pipeline = typeof device.createComputePipelineAsync === "function"
      ? await device.createComputePipelineAsync(pipelineDescriptor)
      : device.createComputePipeline(pipelineDescriptor);
    pipelines.set(cacheKey, pipeline);
    return pipeline;
  }

  async function syncRequestBuffers(request) {
    for (const [id, descriptor] of Object.entries(request.buffers ?? {})) await ensureBuffer(id, descriptor);
  }

  return {
    id: String(config.id ?? "webgpu-compute"),
    capabilities: {
      family: "gpu",
      backend: "webgpu",
      features: ["portable-graph", "storage-buffer", "compute-pipeline", "direct-dispatch", "gpu-resident-resource", "shared-gpu-host"],
      priority: Number(config.priority ?? 100)
    },
    getCapabilities() {
      const deviceDescriptor = gpuHost.getDeviceDescriptor?.();
      return {
        ...this.capabilities,
        features: [...new Set([...this.capabilities.features, ...(deviceDescriptor?.features ?? [])])].sort(),
        limits: portableClone(deviceDescriptor?.limits ?? config.limits ?? {}, "WebGPU adapter limits")
      };
    },
    supports(profile = {}) {
      return !profile.requiredBackend || profile.requiredBackend === "webgpu";
    },
    async initialize() { await ensureDevice(); },
    syncDescriptors(next = {}) {
      descriptors = portableClone(next, "WebGPU compute descriptors");
    },
    async executeGraph(request) {
      const { device } = await ensureDevice();
      await syncRequestBuffers(request);
      const encoder = device.createCommandEncoder({ label: `nexus-compute:${request.graph?.id ?? "graph"}` });
      const pass = encoder.beginComputePass({ label: `nexus-compute:${request.graph?.id ?? "graph"}:pass` });
      const nodeById = new Map((request.graph?.nodes ?? []).map((node) => [node.id, node]));
      const diagnostics = [];
      const writtenResources = new Set();

      try {
        for (const nodeId of request.executionOrder ?? []) {
          const node = nodeById.get(nodeId);
          if (!node) throw new Error(`WebGPU compute graph references missing node ${nodeId}.`);
          const kernel = request.kernels?.[node.kernelId] ?? descriptors.kernels?.[node.kernelId];
          if (!kernel) throw new Error(`WebGPU compute node ${node.id} references missing kernel ${node.kernelId}.`);
          const pipeline = await ensurePipeline(kernel);
          pass.setPipeline(pipeline);
          const bindings = nodeBindingIds(node);
          if (bindings.length) {
            const entries = [];
            for (let binding = 0; binding < bindings.length; binding += 1) {
              const resourceId = bindings[binding];
              const descriptor = request.buffers?.[resourceId] ?? descriptors.buffers?.[resourceId] ?? {};
              const buffer = await ensureBuffer(resourceId, descriptor);
              entries.push({ binding, resource: { buffer } });
            }
            const bindGroup = device.createBindGroup({
              label: `nexus-compute:${node.id}:bindings`,
              layout: pipeline.getBindGroupLayout(0),
              entries
            });
            pass.setBindGroup(0, bindGroup);
          }
          for (const resourceId of node.writes ?? []) {
            const key = String(resourceId);
            if (!writtenResources.has(key)) {
              gpuHost.beginWrite(key, this.id);
              writtenResources.add(key);
            }
          }
          if (node.indirect?.bufferId) {
            const indirectBuffer = await ensureBuffer(node.indirect.bufferId, request.buffers?.[node.indirect.bufferId] ?? {});
            pass.dispatchWorkgroupsIndirect(indirectBuffer, Number(node.indirect.offset ?? 0));
          } else {
            pass.dispatchWorkgroups(Number(node.dispatch?.x ?? 1), Number(node.dispatch?.y ?? 1), Number(node.dispatch?.z ?? 1));
          }
          diagnostics.push({ nodeId: node.id, kernelId: kernel.id, status: "encoded" });
        }
        pass.end();
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        if (config.awaitCompletion !== false) await device.queue.onSubmittedWorkDone?.();
        for (const resourceId of writtenResources) gpuHost.completeWrite(resourceId, this.id);
      } catch (error) {
        for (const resourceId of writtenResources) {
          const resource = gpuHost.getResource(resourceId);
          if (resource?.state === "writing") gpuHost.invalidate(`compute-failure:${this.id}:${resourceId}`);
        }
        throw error;
      }

      sequence += 1;
      const resourceReceipts = Object.keys(request.buffers ?? {}).sort().map((resourceId) => {
        const entry = gpuHost.getResource(resourceId);
        return createComputeResourceReceipt({
          resourceId,
          providerId: this.id,
          backend: "webgpu",
          revision: entry?.revision ?? 0,
          resident: entry?.residency === "resident",
          byteLength: entry?.byteLength ?? request.buffers?.[resourceId]?.byteLength ?? 0
        });
      });
      return {
        providerId: this.id,
        graphId: request.graph?.id,
        status: "completed",
        outputs: {},
        diagnostics,
        metadata: {
          family: "gpu",
          backend: "webgpu",
          sequence,
          sharedGPUHost: true,
          gpuDeviceId: gpuHost.getDeviceDescriptor()?.id ?? null,
          resourceReceipts
        }
      };
    },
    resolveResource(resourceId) { return gpuHost.providerAccess().resolveResource(resourceId); },
    getDevice() { return gpuHost.providerAccess().getDevice(); },
    getAdapter() { return gpuHost.providerAccess().getAdapter(); },
    getGPUHost() { return gpuHost; },
    reset() { sequence = 0; pipelines.clear(); },
    dispose() { pipelines.clear(); if (ownsGPUHost) gpuHost.dispose(); }
  };
}
