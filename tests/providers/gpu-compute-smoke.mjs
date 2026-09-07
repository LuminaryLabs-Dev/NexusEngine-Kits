import assert from "node:assert/strict";
import { createWebGPUComputeProvider } from "@luminarylabs/nexusengine-kits/providers/webgpu";
import { resolveComputeProviderResource } from "nexusengine/domains/compute";
const calls = [];
const mockDevice = {
  queue: { writeBuffer() { calls.push("write-buffer"); }, submit() { calls.push("submit"); }, async onSubmittedWorkDone() { calls.push("complete"); } },
  createBuffer(descriptor) { calls.push("buffer"); return { descriptor, destroy() {} }; },
  createShaderModule() { calls.push("shader"); return { async getCompilationInfo() { return { messages: [] }; } }; },
  async createComputePipelineAsync() { calls.push("pipeline"); return { getBindGroupLayout() { return {}; } }; },
  createBindGroup() { calls.push("bind-group"); return {}; },
  createCommandEncoder() {
    return {
      beginComputePass() {
        return { setPipeline() {}, setBindGroup() {}, dispatchWorkgroups(x) { calls.push(`dispatch:${x}`); }, dispatchWorkgroupsIndirect() { calls.push("dispatch-indirect"); }, end() {} };
      },
      finish() { return {}; }
    };
  }
};
const webgpu = createWebGPUComputeProvider({ device: mockDevice });
const webgpuRequest = {
  graph: { id: "webgpu-smoke", nodes: [{ id: "fill", kernelId: "fill", reads: [], writes: ["out"], bindings: ["out"], dispatch: { x: 4, y: 1, z: 1 }, indirect: null }] },
  executionOrder: ["fill"],
  buffers: { out: { id: "out", byteLength: 64, usage: ["storage"] } },
  kernels: { fill: { id: "fill", entryPoint: "main", source: "@group(0) @binding(0) var<storage,read_write> out: array<u32>; @compute @workgroup_size(1) fn main(@builtin(global_invocation_id) id: vec3<u32>) { out[id.x] = id.x; }" } },
  input: {}, context: {}
};
const webgpuResult = await webgpu.executeGraph(webgpuRequest);
assert.equal(webgpuResult.metadata.backend, "webgpu");
assert.equal(webgpuResult.metadata.resourceReceipts[0].resourceId, "out");
assert.doesNotThrow(() => structuredClone(webgpuResult));
assert.ok(resolveComputeProviderResource(webgpu, webgpuResult.metadata.resourceReceipts[0]));
assert.ok(calls.includes("dispatch:4"));
assert.ok(calls.includes("submit"));

console.log("WebGPU compute migration proof passed");
