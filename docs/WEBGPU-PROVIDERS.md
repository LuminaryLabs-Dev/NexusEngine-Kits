# Optional WebGPU providers

The four factories exported by `@luminarylabs/nexusengine-kits/providers/webgpu`
are `createWebGPUHostProvider`, `createWebGPURenderProvider`,
`createWebGPUFrameExecutor` and `createWebGPUComputeProvider`. Their original
implementation and tests come from Engine
`bacc8fc0073bf92910e26776a6695d2b8ec45858`.

Host owns actual device/surface access; Render and Frame perform concrete GPU
execution; Compute executes GPU work. Core retains provider-neutral request,
resource and receipt contracts. Use the returned provider with the matching
public Engine API; these factories do not install another source-data owner.

Manifest identities and wrappers live under `kits/gpu-providers/`; concrete
implementation is shared in `adapters/gpu/webgpu/`. Registry records are candidate
and remain outside automatic official-only installation. Direct factory use is
a deliberate trusted-host choice.

Run `npm run test:gpu` for the preserved host/device-loss, shared-resource, compute
and unified-frame fixtures, and `npm run check` for registry/package ownership.
Fixtures use mock devices; no physical GPU compatibility or production hardware
certification is claimed. Authoring's Three/WebGL viewport does not require these
providers. No complete asset, game or Authoring document belongs in this package.
