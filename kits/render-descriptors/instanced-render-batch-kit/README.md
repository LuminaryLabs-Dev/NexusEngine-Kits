# Instanced Render Batch Kit

`instanced-render-batch-kit` owns renderer-agnostic instance membership and visibility bookkeeping for repeated render objects.

## Owns

- immutable batch capacity
- active instance count
- per-cell instance membership
- cell replacement, retention, and release
- deterministic flattening order
- changed ranges
- overflow diagnostics
- bounds recomputation requests
- snapshots and reset

## Does not own

- Three.js, WebGL, WebGPU, or native renderer objects
- GPU buffers
- mesh creation
- frustum-culling implementation
- world generation
- gameplay rules

## Usage

```js
import { createRealtimeGame } from "nexusengine";
import { createInstancedRenderBatchKit } from "@luminarylabs/nexusengine-kits/instanced-render-batch-kit";

const engine = createRealtimeGame({
  kits: [createInstancedRenderBatchKit()]
});

const batch = engine.n.instancedRenderBatch.create({
  id: "forest-tree-trunks",
  capacity: 800,
  boundsMode: "recompute-on-change"
});

batch.replaceCell("12:4", [
  {
    id: "tree-12-4-0",
    matrix: [1, 0, 0, 0, 0, 10, 0, 0, 0, 0, 1, 0, 15, 5, 28, 1],
    bounds: { min: [14, 0, 27], max: [16, 10, 29] }
  }
]);

const update = batch.flush();
```

Renderer adapters consume `update.instances`, set their draw count to `update.activeCount`, report `update.overflow`, and recompute renderer bounds when `update.boundsDirty` is true.

## Critical invariant

`capacity` never changes after batch creation. `activeCount` may increase and decrease on every flush without reducing future capacity.
