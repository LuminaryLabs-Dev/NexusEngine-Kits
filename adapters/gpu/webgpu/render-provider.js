import { createGPUHost } from "nexusengine/domains/host";
import { createWebGPUHostProvider } from "./host-provider.js";

function nonEmptyText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} must be a non-empty string.`);
  return text;
}

function stableKey(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`).join(",")}}`;
}

function shaderSource(stage = {}, fallback = null) {
  const source = stage.source ?? fallback;
  if (typeof source !== "string" || !source.trim()) throw new Error("WebGPU Render shader stage requires WGSL source.");
  return source;
}

export function createWebGPURenderProvider(config = {}) {
  const ownsGPUHost = !config.gpuHost;
  const gpuHost = config.gpuHost ?? createGPUHost({
    id: `${config.id ?? "webgpu-render"}:gpu-host`,
    provider: config.gpuProvider ?? createWebGPUHostProvider(config)
  });
  const pipelines = new Map();
  let context = config.context ?? null;
  let canvas = config.canvas ?? null;
  let format = config.format ?? null;
  let initialized = false;
  let sequence = 0;

  async function ensureDevice() {
    const descriptor = await gpuHost.ensureDevice({
      requiredBackend: "webgpu",
      requiredFeatures: ["render"],
      compute: false,
      render: true
    });
    const access = gpuHost.providerAccess();
    const device = access.getDevice();
    if (!device) throw new Error("WebGPU Render Host did not expose its provider device.");
    return { descriptor, device, access };
  }

  async function initialize(options = {}) {
    const { device } = await ensureDevice();
    canvas = options.canvas ?? canvas;
    context = options.context ?? context ?? canvas?.getContext?.("webgpu") ?? null;
    const gpu = config.gpu ?? globalThis.navigator?.gpu;
    format = options.format ?? format ?? gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
    if (context?.configure) {
      context.configure({
        device,
        format,
        alphaMode: options.alphaMode ?? config.alphaMode ?? "opaque",
        usage: options.usage ?? config.surfaceUsage,
        colorSpace: options.colorSpace ?? config.colorSpace
      });
    }
    initialized = true;
    return snapshot();
  }

  async function ensurePipeline(input = {}) {
    const { descriptor: deviceDescriptor, device } = await ensureDevice();
    const id = nonEmptyText(input.id ?? "render-pipeline", "WebGPU render pipeline id");
    const vertexSource = shaderSource(input.vertex ?? {}, input.source);
    const fragmentSource = input.fragment === false ? null : shaderSource(input.fragment ?? {}, vertexSource);
    const key = `${deviceDescriptor.id}:${deviceDescriptor.generation}:${id}:${stableKey(input)}`;
    if (pipelines.has(key)) return pipelines.get(key);
    const vertexModule = device.createShaderModule({ label: `nexus-render:${id}:vertex`, code: vertexSource });
    const fragmentModule = fragmentSource === vertexSource
      ? vertexModule
      : fragmentSource
        ? device.createShaderModule({ label: `nexus-render:${id}:fragment`, code: fragmentSource })
        : null;
    const descriptor = {
      label: `nexus-render:${id}`,
      layout: input.layout ?? "auto",
      vertex: {
        module: vertexModule,
        entryPoint: input.vertex?.entryPoint ?? "vs_main",
        buffers: input.vertex?.buffers ?? []
      },
      primitive: input.primitive ?? { topology: "triangle-list", cullMode: "back" },
      multisample: input.multisample,
      depthStencil: input.depthStencil
    };
    if (fragmentModule) descriptor.fragment = {
      module: fragmentModule,
      entryPoint: input.fragment?.entryPoint ?? "fs_main",
      targets: input.fragment?.targets ?? [{ format }]
    };
    const pipeline = typeof device.createRenderPipelineAsync === "function"
      ? await device.createRenderPipelineAsync(descriptor)
      : device.createRenderPipeline(descriptor);
    pipelines.set(key, pipeline);
    return pipeline;
  }

  async function ensureResource(resourceId, descriptor = {}, initialData = null) {
    await gpuHost.ensureResource({
      id: resourceId,
      type: descriptor.type ?? "buffer",
      usage: descriptor.usage ?? ["vertex", "copy-dst"],
      byteLength: descriptor.byteLength ?? 0,
      format: descriptor.format,
      size: descriptor.size,
      metadata: { ...(descriptor.metadata ?? {}), renderResource: true }
    }, initialData);
    return gpuHost.getResource(resourceId);
  }

  function currentColorView() {
    const texture = context?.getCurrentTexture?.();
    return texture?.createView?.() ?? null;
  }

  async function executePass(request = {}) {
    if (!initialized) await initialize(request.surface ?? {});
    const { descriptor: deviceDescriptor, device, access } = await ensureDevice();
    const pipeline = await ensurePipeline(request.pipeline ?? {});
    const reads = new Set();

    const beginRead = (resourceId) => {
      const id = String(resourceId);
      if (reads.has(id)) return;
      gpuHost.beginRead(id, provider.id);
      reads.add(id);
    };

    try {
      const encoder = device.createCommandEncoder({ label: `nexus-render:${request.id ?? "pass"}` });
      const attachments = request.colorAttachments?.map((attachment) => ({
        view: attachment.resourceId
          ? (beginRead(attachment.resourceId), access.resolveResourceView(attachment.resourceId, attachment.viewDescriptor))
          : attachment.view ?? currentColorView(),
        clearValue: attachment.clearValue ?? { r: 0, g: 0, b: 0, a: 1 },
        loadOp: attachment.loadOp ?? "clear",
        storeOp: attachment.storeOp ?? "store"
      })) ?? [{
        view: currentColorView(),
        clearValue: request.clearValue ?? { r: 0, g: 0, b: 0, a: 1 },
        loadOp: request.loadOp ?? "clear",
        storeOp: request.storeOp ?? "store"
      }];
      if (attachments.some((entry) => !entry.view)) throw new Error("WebGPU Render requires a color attachment or configured canvas context.");

      let depthStencilAttachment = request.depthStencilAttachment;
      if (depthStencilAttachment?.resourceId) {
        beginRead(depthStencilAttachment.resourceId);
        depthStencilAttachment = {
          ...depthStencilAttachment,
          resourceId: undefined,
          view: access.resolveResourceView(depthStencilAttachment.resourceId, depthStencilAttachment.viewDescriptor)
        };
      }
      const pass = encoder.beginRenderPass({
        label: `nexus-render:${request.id ?? "pass"}:render-pass`,
        colorAttachments: attachments,
        depthStencilAttachment
      });
      pass.setPipeline(pipeline);

      const groups = new Map();
      for (const binding of request.bindings ?? []) {
        const group = Number(binding.group ?? 0);
        if (!groups.has(group)) groups.set(group, []);
        const resourceId = String(binding.resourceId);
        beginRead(resourceId);
        const resourceRecord = gpuHost.getResource(resourceId);
        if (!resourceRecord) throw new Error(`Unknown Host GPU resource ${resourceId}.`);
        let resource;
        if (resourceRecord.type === "texture") {
          resource = access.resolveResourceView(resourceId, binding.viewDescriptor);
        } else {
          const buffer = access.resolveResource(resourceId);
          resource = { buffer, offset: Number(binding.offset ?? 0) };
          if (binding.size != null) resource.size = Number(binding.size);
        }
        groups.get(group).push({ binding: Number(binding.binding ?? 0), resource });
      }
      for (const [group, entries] of [...groups.entries()].sort(([a], [b]) => a - b)) {
        const bindGroup = device.createBindGroup({
          label: `nexus-render:${request.id ?? "pass"}:group-${group}`,
          layout: pipeline.getBindGroupLayout(group),
          entries: entries.sort((a, b) => a.binding - b.binding)
        });
        pass.setBindGroup(group, bindGroup);
      }

      for (const vertex of request.vertexBuffers ?? []) {
        const resourceId = String(vertex.resourceId);
        beginRead(resourceId);
        const buffer = access.resolveResource(resourceId);
        if (!buffer) throw new Error(`Host GPU resource ${resourceId} is unavailable for vertex consumption.`);
        pass.setVertexBuffer(Number(vertex.slot ?? 0), buffer, Number(vertex.offset ?? 0), vertex.size == null ? undefined : Number(vertex.size));
      }

      let indexed = false;
      if (request.indexBuffer?.resourceId) {
        const resourceId = String(request.indexBuffer.resourceId);
        beginRead(resourceId);
      const buffer = access.resolveResource(resourceId);
      if (!buffer) throw new Error(`Host GPU resource ${resourceId} is unavailable for index consumption.`);
      pass.setIndexBuffer(buffer, request.indexBuffer.format ?? "uint32", Number(request.indexBuffer.offset ?? 0), request.indexBuffer.size == null ? undefined : Number(request.indexBuffer.size));
      indexed = true;
      }

      const draw = request.draw ?? {};
      if (draw.indirect?.resourceId) {
        const resourceId = String(draw.indirect.resourceId);
        beginRead(resourceId);
        const buffer = access.resolveResource(resourceId);
        if (!buffer) throw new Error(`Host GPU resource ${resourceId} is unavailable for indirect drawing.`);
        if (indexed || draw.indirect.indexed) pass.drawIndexedIndirect(buffer, Number(draw.indirect.offset ?? 0));
        else pass.drawIndirect(buffer, Number(draw.indirect.offset ?? 0));
      } else if (indexed) {
        pass.drawIndexed(
          Number(draw.indexCount ?? 0),
          Number(draw.instanceCount ?? 1),
          Number(draw.firstIndex ?? 0),
          Number(draw.baseVertex ?? 0),
          Number(draw.firstInstance ?? 0)
      );
      } else {
        pass.draw(
          Number(draw.vertexCount ?? 0),
          Number(draw.instanceCount ?? 1),
          Number(draw.firstVertex ?? 0),
          Number(draw.firstInstance ?? 0)
      );
      }
      pass.end();
      device.queue.submit([encoder.finish()]);
      if (config.awaitCompletion !== false) await device.queue.onSubmittedWorkDone?.();
      sequence += 1;
      return Object.freeze({
        providerId: provider.id,
        status: "completed",
        sequence,
        backend: "webgpu",
        gpuDeviceId: deviceDescriptor.id,
        zeroCopy: true,
        resources: Object.freeze([...reads].sort())
      });
    } finally {
      for (const resourceId of reads) {
        const resource = gpuHost.getResource(resourceId);
        const active = resource?.references?.[provider.id] ?? 0;
        if (active > 0) gpuHost.completeRead(resourceId, provider.id);
      }
    }
  }

  function snapshot() {
    return Object.freeze({
      id: String(config.id ?? "webgpu-render"),
      backend: "webgpu",
      initialized,
      format,
      sequence,
      gpuDeviceId: gpuHost.getDeviceDescriptor()?.id ?? null,
      zeroCopy: true
    });
  }

  const provider = {
    id: String(config.id ?? "webgpu-render"),
    capabilities: Object.freeze({
      family: "gpu",
      backend: "webgpu",
      features: Object.freeze(["render-pipeline", "shared-gpu-host", "host-resource-identity", "vertex-buffer", "storage-buffer", "indirect-draw", "storage-texture"])
    }),
    initialize,
    ensureResource,
    executePass,
    getGPUHost() { return gpuHost; },
    getDevice() { return gpuHost.providerAccess().getDevice(); },
    snapshot,
    dispose() {
      context?.unconfigure?.();
      pipelines.clear();
      initialized = false;
      if (ownsGPUHost) gpuHost.dispose();
    }
  };

  return Object.freeze(provider);
}
