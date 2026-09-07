function text(value, label) {
  const result = String(value ?? "").trim();
  if (!result) throw new TypeError(`${label} must be a non-empty string.`);
  return result;
}

function stable(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}

function stageSource(stage = {}, fallback = null) {
  const source = stage.source ?? fallback;
  if (typeof source !== "string" || !source.trim()) throw new Error("WebGPU frame shader stage requires WGSL source.");
  return source;
}

export function createWebGPUFrameExecutor(config = {}) {
  const gpuHost = config.gpuHost;
  if (!gpuHost) throw new TypeError("WebGPU frame executor requires a shared GPU Host.");
  const id = String(config.id ?? "webgpu-frame-executor");
  const pipelines = new Map();
  let canvas = config.canvas ?? null;
  let context = config.context ?? null;
  let format = config.format ?? null;
  let initialized = false;
  let sequence = 0;

  async function deviceAccess() {
    const descriptor = await gpuHost.ensureDevice({ requiredBackend: "webgpu", requiredFeatures: ["render"], compute: true, render: true });
    const access = gpuHost.providerAccess();
    const device = access.getDevice();
    if (!device) throw new Error("WebGPU frame executor could not resolve the shared Host GPU device.");
    return { descriptor, access, device };
  }

  async function initialize(options = {}) {
    const { device } = await deviceAccess();
    canvas = options.canvas ?? canvas;
    context = options.context ?? context ?? canvas?.getContext?.("webgpu") ?? null;
    const gpu = config.gpu ?? globalThis.navigator?.gpu;
    format = options.format ?? format ?? gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
    context?.configure?.({ device, format, alphaMode: options.alphaMode ?? config.alphaMode ?? "opaque", usage: options.usage ?? config.surfaceUsage, colorSpace: options.colorSpace ?? config.colorSpace });
    initialized = true;
    return snapshot();
  }

  async function pipeline(input = {}) {
    const { descriptor: deviceDescriptor, device } = await deviceAccess();
    const pipelineId = text(input.id ?? "render-pipeline", "WebGPU frame pipeline id");
    const vertexSource = stageSource(input.vertex ?? {}, input.source);
    const fragmentSource = input.fragment === false ? null : stageSource(input.fragment ?? {}, vertexSource);
    const key = `${deviceDescriptor.id}:${deviceDescriptor.generation}:${pipelineId}:${stable(input)}`;
    if (pipelines.has(key)) return pipelines.get(key);
    const vertexModule = device.createShaderModule({ label: `nexus-render-frame:${pipelineId}:vertex`, code: vertexSource });
    const fragmentModule = fragmentSource === vertexSource ? vertexModule : fragmentSource ? device.createShaderModule({ label: `nexus-render-frame:${pipelineId}:fragment`, code: fragmentSource }) : null;
    const descriptor = {
      label: `nexus-render-frame:${pipelineId}`,
      layout: input.layout ?? "auto",
      vertex: { module: vertexModule, entryPoint: input.vertex?.entryPoint ?? "vs_main", buffers: input.vertex?.buffers ?? [] },
      primitive: input.primitive ?? { topology: "triangle-list", cullMode: "back" },
      multisample: input.multisample,
      depthStencil: input.depthStencil
    };
    if (fragmentModule) descriptor.fragment = { module: fragmentModule, entryPoint: input.fragment?.entryPoint ?? "fs_main", targets: input.fragment?.targets ?? [{ format }] };
    const created = typeof device.createRenderPipelineAsync === "function" ? await device.createRenderPipelineAsync(descriptor) : device.createRenderPipeline(descriptor);
    pipelines.set(key, created);
    return created;
  }

  async function executeFrame(request = {}) {
    if (!initialized) await initialize(request.surface ?? {});
    const passes = Array.isArray(request.passes) ? request.passes : [];
    if (!passes.length) throw new TypeError("WebGPU frame requires at least one render pass.");
    const { descriptor: deviceDescriptor, access, device } = await deviceAccess();
    const encoder = device.createCommandEncoder({ label: `nexus-render-frame:${request.id ?? "frame"}` });
    const reads = new Set();
    const defaultColorView = context?.getCurrentTexture?.()?.createView?.() ?? null;
    const beginRead = (resourceId) => {
      const resource = String(resourceId);
      if (!reads.has(resource)) { gpuHost.beginRead(resource, id); reads.add(resource); }
    };

    try {
      for (let index = 0; index < passes.length; index += 1) {
        const item = passes[index] ?? {};
        const renderPipeline = await pipeline(item.pipeline ?? {});
        const colorAttachments = item.colorAttachments?.map((attachment) => ({
          view: attachment.resourceId ? (beginRead(attachment.resourceId), access.resolveResourceView(attachment.resourceId, attachment.viewDescriptor)) : attachment.view ?? defaultColorView,
          clearValue: attachment.clearValue ?? { r: 0, g: 0, b: 0, a: 1 },
          loadOp: attachment.loadOp ?? (index === 0 ? "clear" : "load"),
          storeOp: attachment.storeOp ?? "store"
        })) ?? [{ view: defaultColorView, clearValue: item.clearValue ?? { r: 0, g: 0, b: 0, a: 1 }, loadOp: item.loadOp ?? (index === 0 ? "clear" : "load"), storeOp: item.storeOp ?? "store" }];
        if (colorAttachments.some((attachment) => !attachment.view)) throw new Error("WebGPU frame requires a color attachment or configured canvas context.");

        let depthStencilAttachment = item.depthStencilAttachment;
        if (depthStencilAttachment?.resourceId) {
          const resourceId = String(depthStencilAttachment.resourceId);
          beginRead(resourceId);
          depthStencilAttachment = {
            ...depthStencilAttachment,
            resourceId: undefined,
            view: access.resolveResourceView(resourceId, depthStencilAttachment.viewDescriptor),
            depthLoadOp: depthStencilAttachment.depthLoadOp ?? (index === 0 ? "clear" : "load"),
            depthStoreOp: depthStencilAttachment.depthStoreOp ?? "store"
          };
        }

        const pass = encoder.beginRenderPass({ label: `nexus-render-frame:${request.id ?? "frame"}:${item.id ?? index}`, colorAttachments, depthStencilAttachment });
        pass.setPipeline(renderPipeline);
        const groups = new Map();
        for (const binding of item.bindings ?? []) {
          const group = Number(binding.group ?? 0);
          if (!groups.has(group)) groups.set(group, []);
          const resourceId = String(binding.resourceId);
          beginRead(resourceId);
          const record = gpuHost.getResource(resourceId);
          if (!record) throw new Error(`Unknown Host GPU resource ${resourceId}.`);
          const resource = record.type === "texture" ? access.resolveResourceView(resourceId, binding.viewDescriptor) : { buffer: access.resolveResource(resourceId), offset: Number(binding.offset ?? 0), ...(binding.size == null ? {} : { size: Number(binding.size) }) };
          groups.get(group).push({ binding: Number(binding.binding ?? 0), resource });
        }
        for (const [group, entries] of [...groups.entries()].sort(([a], [b]) => a - b)) {
          pass.setBindGroup(group, device.createBindGroup({ label: `nexus-render-frame:${item.id ?? index}:group-${group}`, layout: renderPipeline.getBindGroupLayout(group), entries: entries.sort((a, b) => a.binding - b.binding) }));
        }
        for (const vertex of item.vertexBuffers ?? []) {
          const resourceId = String(vertex.resourceId); beginRead(resourceId);
          pass.setVertexBuffer(Number(vertex.slot ?? 0), access.resolveResource(resourceId), Number(vertex.offset ?? 0), vertex.size == null ? undefined : Number(vertex.size));
        }
        let indexed = false;
        if (item.indexBuffer?.resourceId) {
          const resourceId = String(item.indexBuffer.resourceId); beginRead(resourceId);
          pass.setIndexBuffer(access.resolveResource(resourceId), item.indexBuffer.format ?? "uint32", Number(item.indexBuffer.offset ?? 0), item.indexBuffer.size == null ? undefined : Number(item.indexBuffer.size));
          indexed = true;
        }
        const draw = item.draw ?? {};
        if (draw.indirect?.resourceId) {
          const resourceId = String(draw.indirect.resourceId); beginRead(resourceId);
          const buffer = access.resolveResource(resourceId);
          if (indexed || draw.indirect.indexed) pass.drawIndexedIndirect(buffer, Number(draw.indirect.offset ?? 0)); else pass.drawIndirect(buffer, Number(draw.indirect.offset ?? 0));
        } else if (indexed) {
          pass.drawIndexed(Number(draw.indexCount ?? 0), Number(draw.instanceCount ?? 1), Number(draw.firstIndex ?? 0), Number(draw.baseVertex ?? 0), Number(draw.firstInstance ?? 0));
        } else {
          pass.draw(Number(draw.vertexCount ?? 0), Number(draw.instanceCount ?? 1), Number(draw.firstVertex ?? 0), Number(draw.firstInstance ?? 0));
        }
        pass.end();
      }
      device.queue.submit([encoder.finish()]);
      if (config.awaitCompletion !== false) await device.queue.onSubmittedWorkDone?.();
      sequence += 1;
      return Object.freeze({ providerId: id, status: "completed", sequence, backend: "webgpu", gpuDeviceId: deviceDescriptor.id, zeroCopy: true, passCount: passes.length, submissionCount: 1, resources: Object.freeze([...reads].sort()) });
    } finally {
      for (const resourceId of reads) if ((gpuHost.getResource(resourceId)?.references?.[id] ?? 0) > 0) gpuHost.completeRead(resourceId, id);
    }
  }

  function snapshot() {
    return Object.freeze({ id, backend: "webgpu", initialized, format, sequence, gpuDeviceId: gpuHost.getDeviceDescriptor()?.id ?? null, zeroCopy: true, multiPassFrame: true, sharedDepth: true });
  }

  return Object.freeze({ id, initialize, executeFrame, snapshot, getGPUHost: () => gpuHost, dispose() { pipelines.clear(); initialized = false; } });
}
