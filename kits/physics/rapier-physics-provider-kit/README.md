# rapier-physics-provider-kit

Explicit candidate factory `createRapierPhysicsProvider`. See `docs/PHYSICS-FIRST-SLICE.md` for composition, version pins, measured proof, and limitations. It is not automatically installed by Core or the official registry installer.

Supply the initialized pinned Rapier module and the installed `engine.n.physicsBodyState.normalize` capability. Provider bytes remain host-owned and are not Core portable snapshots.
