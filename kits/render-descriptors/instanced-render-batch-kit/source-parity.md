# Source parity

Initial proof source:

```txt
Repository: LuminaryLabs-Publish/PrehistoricRush
Commit: 732426127947c899567c8cd0c9a74f56dc69d902
Path: src/game.js
```

The source exposed two reusable failures:

1. `InstancedMesh.count` was used as both immutable capacity and mutable active draw count, causing permanent population shrinkage.
2. Instance matrices moved between world windows without a renderer-facing bounds invalidation signal.

The rebuilt kit generalizes those concerns into renderer-agnostic capacity, active membership, per-cell replacement/release, overflow diagnostics, changed ranges, and bounds-dirty output.
