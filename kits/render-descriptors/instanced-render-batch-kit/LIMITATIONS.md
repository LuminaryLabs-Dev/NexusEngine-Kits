# Limitations

- The kit emits renderer-agnostic descriptors and does not upload GPU buffers.
- Changed ranges currently conservatively cover the full active span after any cell mutation.
- Capacity is fixed for the lifetime of a batch. Resizing requires creating a replacement batch.
- Bounds are axis-aligned unions of instance bounds. Renderer adapters may choose tighter renderer-native bounds.
- The kit does not perform distance LOD, occlusion, or per-instance frustum culling.
- Overflowed instances are reported and omitted from the active output; automatic growth is intentionally not performed.
- Cell retention is explicit. Callers must release cells that leave their active world window.
