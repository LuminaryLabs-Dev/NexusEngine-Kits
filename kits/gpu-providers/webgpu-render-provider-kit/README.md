# webgpu-render-provider-kit

`createWebGPURenderProvider` realizes the render part of the external WebGPU provider. Import through `@luminarylabs/nexusengine-kits/providers/webgpu`. Pass the returned provider into the public Host/Compute/Render consumer; it is not an editable-state owner or an Engine runtime Kit. No provider receives Authoring documents.

Proof: `node tests/providers/gpu-shared-resource-smoke.mjs`.
