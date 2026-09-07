import assert from "node:assert/strict";
import { createGPUHost } from "nexusengine/domains/host";
import { createWebGPUHostProvider } from "@luminarylabs/nexusengine-kits/providers/webgpu";
import { createWebGPUFrameExecutor } from "@luminarylabs/nexusengine-kits/providers/webgpu";

function createMockDevice() {
  let sequence = 0;
  const encoders = [];
  const queue = { submissions: [], writeBuffer() {}, submit(commandBuffers) { this.submissions.push(commandBuffers); }, async onSubmittedWorkDone() {} };
  const device = {
    features: new Set(), queue, lost: new Promise(() => {}), encoders,
    createBuffer(descriptor) { return { id: `buffer-${++sequence}`, descriptor, destroy() {} }; },
    createTexture(descriptor) { const texture = { id: `texture-${++sequence}`, descriptor, destroy() {}, createView(viewDescriptor = {}) { return { texture, viewDescriptor }; } }; return texture; },
    createShaderModule(descriptor) { return { descriptor }; },
    async createRenderPipelineAsync(descriptor) { return { descriptor, getBindGroupLayout(group) { return { group }; } }; },
    createBindGroup(descriptor) { return { descriptor }; },
    createCommandEncoder(descriptor) {
      const encoded = { descriptor, render: [] }; encoders.push(encoded);
      return {
        beginRenderPass(passDescriptor) {
          const record = { passDescriptor, draws: [], bindGroups: [] }; encoded.render.push(record);
          return {
            setPipeline(pipeline) { record.pipeline = pipeline; },
            setBindGroup(group, bindGroup) { record.bindGroups.push({ group, bindGroup }); },
            setVertexBuffer() {}, setIndexBuffer() {},
            draw(vertexCount, instanceCount, firstVertex, firstInstance) { record.draws.push({ type: "draw", vertexCount, instanceCount, firstVertex, firstInstance }); },
            drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance) { record.draws.push({ type: "drawIndexed", indexCount, instanceCount, firstIndex, baseVertex, firstInstance }); },
            drawIndirect(buffer, offset) { record.draws.push({ type: "drawIndirect", buffer, offset }); },
            drawIndexedIndirect(buffer, offset) { record.draws.push({ type: "drawIndexedIndirect", buffer, offset }); },
            end() { record.ended = true; }
          };
        },
        finish() { return encoded; }
      };
    }
  };
  return device;
}

const device = createMockDevice();
const hostProvider = createWebGPUHostProvider({ id: "frame-host-provider", device, deviceId: "frame-device" });
const gpuHost = createGPUHost({ id: "frame-host", provider: hostProvider });
await gpuHost.ensureDevice({ requiredBackend: "webgpu", requiredFeatures: ["render", "storage-buffer", "indirect-buffer"] });
await gpuHost.ensureResource({ id: "world-depth", type: "texture", size: [1280, 720, 1], format: "depth24plus", usage: ["render-attachment"] });
for (const id of ["terrain-data", "tree-data", "ground-data"]) await gpuHost.ensureResource({ id, type: "buffer", byteLength: 64, usage: ["storage", "vertex"] }, new Float32Array(16));
await gpuHost.ensureResource({ id: "draw-args", type: "buffer", byteLength: 16, usage: ["storage", "indirect"] }, new Uint32Array([3, 1, 0, 0]));

let currentTextureCount = 0;
const context = { configure() {}, getCurrentTexture() { currentTextureCount += 1; return { createView() { return { type: "surface-view" }; } }; } };
const frame = createWebGPUFrameExecutor({ id: "unified-world-frame", gpuHost, context, format: "bgra8unorm", awaitCompletion: true });
await frame.initialize({ context, format: "bgra8unorm" });
const shader = `
@group(0) @binding(0) var<storage, read> data: array<vec4<f32>>;
@vertex fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
  let x = select(-0.5, 0.5, vertexIndex == 1u);
  let y = select(-0.5, 0.5, vertexIndex == 2u);
  return vec4<f32>(x + data[0].x * 0.0, y, 0.0, 1.0);
}
@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(0.2, 0.7, 0.3, 1.0); }`;
const passes = ["terrain-data", "tree-data", "ground-data"].map((resourceId, index) => ({
  id: resourceId,
  pipeline: { id: `${resourceId}-pipeline`, source: shader, vertex: { entryPoint: "vs_main", buffers: [] }, fragment: { entryPoint: "fs_main", targets: [{ format: "bgra8unorm" }] }, depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" } },
  bindings: [{ group: 0, binding: 0, resourceId }],
  depthStencilAttachment: { resourceId: "world-depth", depthClearValue: 1, depthLoadOp: index === 0 ? "clear" : "load", depthStoreOp: "store" },
  draw: index === 2 ? { indirect: { resourceId: "draw-args", offset: 0 } } : { vertexCount: 3 }
}));
const result = await frame.executeFrame({ id: "unified-world", passes });
assert.equal(result.gpuDeviceId, "frame-device");
assert.equal(result.passCount, 3);
assert.equal(result.submissionCount, 1);
assert.equal(result.zeroCopy, true);
assert.equal(device.queue.submissions.length, 1);
assert.equal(device.encoders.at(-1).render.length, 3);
assert.equal(currentTextureCount, 1);
const depthTexture = gpuHost.providerAccess().resolveResource("world-depth");
for (const pass of device.encoders.at(-1).render) assert.equal(pass.passDescriptor.depthStencilAttachment.view.texture, depthTexture);
assert.equal(device.encoders.at(-1).render[2].draws[0].type, "drawIndirect");
assert.equal(frame.snapshot().sharedDepth, true);
console.log(JSON.stringify({ status: "PASS", sharedDevice: result.gpuDeviceId, passCount: result.passCount, submissionCount: result.submissionCount, sharedDepth: true, zeroCopy: result.zeroCopy }, null, 2));
