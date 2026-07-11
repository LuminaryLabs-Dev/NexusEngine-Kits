# Source parity

Initial behavior was generalized from the procedural raptor body used by `LuminaryLabs-Publish/PrehistoricRush` at commit `643cff89f6e74db983863a942a4644e6746947b5`.

The official Kits implementation intentionally changes the boundary:

- removes direct Three.js construction
- emits renderer-agnostic geometry, skeleton, skinning, material, attachment, and collision descriptors
- uses a deterministic recipe and content hash
- adds snapshot, load, reset, and registry-ready metadata
- keeps PrehistoricRush proportions and colors outside the reusable kit

Parity target: preserve the original theropod silhouette, bone naming, skin-weight structure, and procedural gait while making the output portable across renderers.
