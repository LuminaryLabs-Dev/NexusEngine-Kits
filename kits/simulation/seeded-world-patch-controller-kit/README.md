# Seeded World Patch Controller Kit

Coordinates deterministic world-patch identity, caching, active and prefetch rings, generation priority, ready delivery, and per-frame activation budgets.

## Owns

- Seed/version/settings-based patch cache keys
- Active, retained, and forward-prefetch sets
- In-memory LRU-style cache eviction
- Generation queues and optional worker execution
- Ready and released patch delivery
- Snapshot statistics and reset

## Does not own

- Terrain, vegetation, pickup, or collider generation algorithms
- Three.js, WebGL, meshes, GPU uploads, or scene objects
- Physics world mutation
- Browser worker construction

## Usage

```js
const controller = engine.n.seededWorldPatchController.create({
  id: "open-world",
  patchSize: 64,
  activeRadius: 2,
  retainRadius: 4,
  prefetchDistance: 2,
  activationBudget: 1,
  generator: generatePatch,
  executor: workerExecutor
});

controller.setFocus({ position, velocity, forward });
controller.update();
controller.pump({ maximum: 2 });

for (const patch of controller.takeReadyPatches({ maximum: 1 })) {
  rendererAdapter.activatePatch(patch);
}
```

Without an executor, generation uses a deferred synchronous fallback so the host can adopt the controller before adding a worker.
