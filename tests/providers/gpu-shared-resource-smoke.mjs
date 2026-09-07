import assert from "node:assert/strict";
import { createGPUHost } from "nexusengine/domains/host";
import { createWebGPUHostProvider } from "@luminarylabs/nexusengine-kits/providers/webgpu";
import { createWebGPUComputeProvider } from "@luminarylabs/nexusengine-kits/providers/webgpu";
import { createWebGPURenderProvider } from "@luminarylabs/nexusengine-kits/providers/webgpu";

function createMockDevice(label = "device-1") {
  let resourceSequence = 0;
  const calls = [];
  const queue = {
    writes: [], submissions: [],
    writeBuffer(buffer, offset, data, byteOffset, byteLength) { this.writes.push({ buffer, offset, data, byteOffset, byteLength }); },
    submit(commandBuffers) { this.submissions.push(commandBuffers); },
    async onSubmittedWorkDone() {}
  };
  const device = {
    label,
    features: new Set(),
    queue,
    calls,
    lost: new Promise(() => {}),
    createBuffer(descriptor) {
      const buffer = { kind: "buffer", id: `${label}:buffer:${++resourceSequence}`, descriptor, destroyed: false, destroy() { this.destroyed = true; } };
      calls.push(["createBuffer", buffer]);
      return buffer;
    },
    createTexture(descriptor) {
      const texture = { kind: "texture", id: `${label}:texture:${++resourceSequence}`, descriptor, destroyed: false, destroy() { this.destroyed = true; }, createView(viewDescriptor = {}) { return { texture, viewDescriptor }; } };
      calls.push(["createTexture", texture]);
      return texture;
    },
    createShaderModule(descriptor) {
      calls.push(["createShaderModule", descriptor]);
      return { descriptor, async getCompilationInfo() { return { messages: [] }; } };
    },
    async createComputePipelineAsync(descriptor) {
      calls.push(["createComputePipeline", descriptor]);
      return { descriptor, getBindGroupLayout(group) { return { type: "compute-layout", group }; } };
    },
    async createRenderPipelineAsync(descriptor) {
      calls.push(["createRenderPipeline", descriptor]);
      return { descriptor, getBindGroupLayout(group) { return { type: "render-layout", group }; } };
    },
    createBindGroup(descriptor) { calls.push(["createBindGroup", descriptor]); return { descriptor }; },
    createCommandEncoder(descriptor) {
      const encoded = { descriptor, compute: [], render: [] };
      calls.push(["createCommandEncoder", encoded]);
      return {
        beginComputePass(passDescriptor) {
          const record = { passDescriptor, pipeline: null, bindGroups: [], dispatches: [] };
          encoded.compute.push(record);
          return {
            setPipeline(pipeline) { record.pipeline = pipeline; },
            setBindGroup(group, bindGroup) { record.bindGroups.push({ group, bindGroup }); },
            dispatchWorkgroups(x, y, z) { record.dispatches.push({ type: "direct", x, y, z }); },
            dispatchWorkgroupsIndirect(buffer, offset) { record.dispatches.push({ type: "indirect", buffer, offset }); },
            end() { record.ended = true; }
          };
        },
        beginRenderPass(passDescriptor) {
          const record = { passDescriptor, vertexBuffers: [], bindGroups: [], draws: [] };
          encoded.render.push(record);
          return {
            setPipeline(pipeline) { record.pipeline = pipeline; },
            setBindGroup(group, bindGroup) { record.bindGroups.push({ group, bindGroup }); },
            setVertexBuffer(slot, buffer, offset, size) { record.vertexBuffers.push({ slot, buffer, offset, size }); },
            setIndexBuffer(buffer, format, offset, size) { record.indexBuffer = { buffer, format, offset, size }; },
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

const firstDevice = createMockDevice("device-a");
const secondDevice = createMockDevice("device-b");
const gpuProvider = createWebGPUHostProvider({
  id: "shared-webgpu-host",
  device: firstDevice,
  deviceId: (generation) => `shared-device-${generation}`,
  deviceFactory: async () => ({ device: secondDevice })
});
const gpuHost = createGPUHost({ id: "shared-gpu", provider: gpuProvider });
const deviceDescriptor = await gpuHost.ensureDevice({ requiredBackend: "webgpu", requiredFeatures: ["compute", "render"] });
assert.equal(deviceDescriptor.id, "shared-device-1");
assert.equal(gpuHost.providerAccess().getDevice(), firstDevice);

const compute = createWebGPUComputeProvider({ id: "shared-compute", gpuHost, awaitCompletion: true });
const shader = `
@group(0) @binding(0) var<storage, read_write> transforms: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> indirectArgs: array<u32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  transforms[0] = vec4<f32>(1.0, 2.0, 3.0, 1.0);
  indirectArgs[0] = 3u;
}`;
const computeResult = await compute.executeGraph({
  graph: { id: "shared-resource-graph", nodes: [{ id: "write", kernelId: "write-kernel", bindings: ["tree-transforms", "draw-args"], writes: ["tree-transforms", "draw-args"], dispatch: { x: 1, y: 1, z: 1 } }] },
  executionOrder: ["write"],
  kernels: { "write-kernel": { id: "write-kernel", entryPoint: "main", source: shader } },
  buffers: {
    "tree-transforms": { byteLength: 64, usage: ["storage", "vertex"], initialData: new Float32Array(16) },
    "draw-args": { byteLength: 16, usage: ["storage", "indirect"], initialData: new Uint32Array([3, 1, 0, 0]) }
  }
});
assert.equal(computeResult.metadata.sharedGPUHost, true);
assert.equal(computeResult.metadata.gpuDeviceId, "shared-device-1");
assert.equal(gpuHost.getResource("tree-transforms").state, "ready");
assert.deepEqual(gpuHost.getResource("tree-transforms").usage, ["copy-dst", "copy-src", "storage", "vertex"]);
assert.deepEqual(gpuHost.getResource("draw-args").usage, ["copy-dst", "copy-src", "indirect", "storage"]);
const transformBuffer = gpuHost.providerAccess().resolveResource("tree-transforms");
const indirectBuffer = gpuHost.providerAccess().resolveResource("draw-args");
assert.ok(transformBuffer);
assert.ok(indirectBuffer);

const context = {
  configured: null,
  configure(descriptor) { this.configured = descriptor; },
  getCurrentTexture() { return { createView() { return { type: "surface-view" }; } }; },
  unconfigure() { this.configured = null; }
};
const render = createWebGPURenderProvider({ id: "shared-render", gpuHost, context, format: "bgra8unorm" });
await render.initialize({ context, format: "bgra8unorm" });
assert.equal(render.getDevice(), firstDevice);
const renderWGSL = `
@group(0) @binding(0) var<storage, read> transforms: array<vec4<f32>>;
struct VSOut { @builtin(position) position: vec4<f32> };
@vertex fn vs_main(@location(0) position: vec4<f32>, @builtin(instance_index) instanceIndex: u32) -> VSOut {
  var out: VSOut;
  out.position = position + vec4<f32>(transforms[instanceIndex].xyz * 0.0, 0.0);
  return out;
}
@fragment fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(0.2, 0.8, 0.3, 1.0); }`;
const renderResult = await render.executePass({
  id: "shared-pass",
  pipeline: {
    id: "shared-pipeline",
    source: renderWGSL,
    vertex: { entryPoint: "vs_main", buffers: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x4" }] }] },
    fragment: { entryPoint: "fs_main", targets: [{ format: "bgra8unorm" }] }
  },
  bindings: [{ group: 0, binding: 0, resourceId: "tree-transforms" }],
  vertexBuffers: [{ slot: 0, resourceId: "tree-transforms" }],
  draw: { indirect: { resourceId: "draw-args", offset: 0 } }
});
assert.equal(renderResult.zeroCopy, true);
assert.equal(renderResult.gpuDeviceId, computeResult.metadata.gpuDeviceId);
const renderEncoder = firstDevice.calls.filter(([kind]) => kind === "createCommandEncoder").at(-1)[1];
assert.equal(renderEncoder.render[0].vertexBuffers[0].buffer, transformBuffer, "Render must consume the exact buffer Compute wrote.");
assert.equal(renderEncoder.render[0].bindGroups[0].bindGroup.descriptor.entries[0].resource.buffer, transformBuffer, "Render storage binding must consume the exact buffer Compute wrote.");
assert.equal(renderEncoder.render[0].draws[0].buffer, indirectBuffer, "Indirect draw must consume the exact Host GPU buffer.");
assert.equal(gpuHost.getResource("tree-transforms").state, "available");
assert.equal(gpuHost.getResource("draw-args").state, "available");

await gpuHost.ensureResource({ id: "compute-texture", type: "texture", size: [4, 4, 1], format: "rgba8unorm", usage: ["storage-binding", "texture-binding"] });
gpuHost.beginWrite("compute-texture", "texture-compute-fixture");
gpuHost.completeWrite("compute-texture", "texture-compute-fixture");
const texture = gpuHost.providerAccess().resolveResource("compute-texture");
await render.executePass({
  id: "texture-pass",
  pipeline: { id: "texture-pipeline", source: renderWGSL, vertex: { entryPoint: "vs_main", buffers: [] }, fragment: { entryPoint: "fs_main", targets: [{ format: "bgra8unorm" }] } },
  bindings: [{ group: 0, binding: 0, resourceId: "compute-texture" }],
  draw: { vertexCount: 3 }
});
const textureEncoder = firstDevice.calls.filter(([kind]) => kind === "createCommandEncoder").at(-1)[1];
assert.equal(textureEncoder.render[0].bindGroups[0].bindGroup.descriptor.entries[0].resource.texture, texture, "Render texture binding must resolve the Host GPU texture without CPU readback.");

const snapshotText = JSON.stringify(gpuHost.snapshot());
assert.ok(!snapshotText.includes("createBuffer"));
assert.ok(!snapshotText.includes("GPUBuffer"));
assert.equal(gpuHost.snapshot().device.id, "shared-device-1");

gpuHost.invalidate("test-device-loss");
assert.equal(gpuHost.getResource("tree-transforms").state, "invalid");
assert.equal(gpuHost.getResource("tree-transforms").residency, "nonresident");
const restored = await gpuHost.restore({ requiredBackend: "webgpu" });
assert.equal(restored.id, "shared-device-2");
assert.equal(gpuHost.providerAccess().getDevice(), secondDevice);
await gpuHost.ensureResource({ id: "tree-transforms", type: "buffer", byteLength: 64, usage: ["storage", "vertex"] }, new Float32Array(16));
assert.notEqual(gpuHost.providerAccess().resolveResource("tree-transforms"), transformBuffer, "Recovered device must allocate a new physical resource.");

console.log(JSON.stringify({
  status: "PASS",
  sharedDevice: deviceDescriptor.id,
  computeDevice: computeResult.metadata.gpuDeviceId,
  renderDevice: renderResult.gpuDeviceId,
  zeroCopyVertex: true,
  zeroCopyIndirect: true,
  zeroCopyStorage: true,
  zeroCopyTexture: true,
  recoveryDevice: restored.id
}, null, 2));
