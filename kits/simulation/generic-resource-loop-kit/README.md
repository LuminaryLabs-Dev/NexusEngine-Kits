# generic-resource-loop-kit

Deprecated standalone NexusEngine Domain Service Kit for a deterministic
resource-meter service.

NexusEngine Core now owns the canonical `engine.n.resourceMeter` and
`engine.n.genericResourceLoop` APIs. This kit remains only for historical
consumers that run without Core Simulation. It is excluded from default
installation and must not be installed beside Core Simulation.

## Domain

- Parent: `simulation`
- Domain path: `n:simulation:resource-meter-service`
- Canonical API: `engine.n.resourceMeter`
- Compatibility APIs: `engine.n.genericResourceLoop`, `engine.resourceMeter`, `engine.genericResourceLoop`
- Base primitive: `createResourceMeter()` from `nexusengine/core-kits`

NexusEngine owns both the primitive and the current Core collection service.
This package preserves the former standalone implementation for migration only.

## Source lineage

- `LuminaryLabs-Dev/NexusEngine` commit `851372d29fece5ad7d9a6253fb1a74730ae24047`
  - `createResourceMeter()` supplies the core spend/restore/clamp semantics.
  - `createResourcePressureKit()` supplies `start`, drain/recover rates, adjustment, elapsed time, depletion, and snapshot compatibility shapes.
- `LuminaryLabs-Dev/NexusEngine-GoldRush` commit `d1e3f5ecfaa41ef6e49a6c7cca23bda07f64bb32`
  - Uses the existing generic resource loop for gold cargo capacity, empty/loaded thresholds, pickup, delivery, and extraction snapshots.
- Existing ProtoKits resource-pressure and generic-resource-loop implementations
  - Supply registration, rates, locks, above/below thresholds, empty/full events, and deterministic replay behavior.
- `LuminaryLabs-Agents/NexusEngine-ProtoKits` commit `9da1fdb979a878dff8f50565fec4a4952e58af5e`
  - Supplies the exact validated native DSK promoted by this stable implementation.

The source repositories were inspected read-only.

## Feature union

- Stable IDs, labels, tags, metadata, min/max, initial/start/value aliases.
- `ratePerSecond`, `rate`, `drainPerSecond`, `drain`, `recoverPerSecond`, and `recover` configuration.
- Register/upsert, remove, adjust/add, spend, restore, drain, set rate, and lock/unlock.
- Empty/depleted/full state and renderer-independent descriptors.
- Above and below thresholds with repeatable or one-shot crossing policy.
- Bounded recent-change history, elapsed simulation time, and fixed-tick state.
- Serializable reset, snapshot, exact load, deterministic replay, and source-compatible API aliases.

## Public API

```text
engine.n.resourceMeter.register(resource, payload?)
engine.n.resourceMeter.remove(id, payload?)
engine.n.resourceMeter.adjust(id, amount, payload?)
engine.n.resourceMeter.add(id, amount, payload?)
engine.n.resourceMeter.spend(id, amount, reason?, payload?)
engine.n.resourceMeter.restore(id, amount, reason?, payload?)
engine.n.resourceMeter.drain(id, amountPerSecond, reason?)
engine.n.resourceMeter.setRate(id, ratePerSecond, reason?)
engine.n.resourceMeter.setLocked(id, locked, reason?)
engine.n.resourceMeter.get(id?)
engine.n.resourceMeter.getResource(id)
engine.n.resourceMeter.getDescriptors()
engine.n.resourceMeter.getSnapshot()
engine.n.resourceMeter.loadSnapshot(snapshot)
engine.n.resourceMeter.reset(payload?)
```

## Data contract

```js
{
  id: "oxygen",
  label: "Oxygen",
  min: 0,
  max: 100,
  initial: 100,
  ratePerSecond: -2,
  locked: false,
  thresholds: [
    { id: "low", value: 25, direction: "below", repeatable: true },
    { id: "full", value: 100, direction: "above", once: true }
  ],
  tags: ["survival"],
  metadata: {}
}
```

`start` aliases `initial`. `rate` aliases `ratePerSecond`. If no explicit rate exists, the effective rate is `recoverPerSecond - drainPerSecond`.

## Boundary

Owns:

- meter collection and indexes
- meter mutation and passive fixed-tick rates
- locks, empty/full/depleted facts, and threshold transitions
- serializable descriptors, reset, snapshot, and load

Does not own:

- pressure warning/failure policy
- inventory slots, cargo fiction, economy, or crafting
- controls, objectives, renderer objects, HUD, DOM, Canvas, or Three.js
- wall-clock time, unseeded random, persistence transport, or networking

## Retirement Decision

- NexusEngine Core is the canonical service owner.
- `generic-resource-loop-kit` is deprecated and excluded from default installs.
- `generic-pressure-loop-kit` and `pressure-domain-kit` remain separate pressure-policy candidates; they are not folded into meter state.
- External callers of the historical `createResourcePressureKit()` remain a
  documented migration gap until they can move without feature loss.
- New consumers use `engine.n.coreSimulation.resources` or its Core compatibility
  aliases.

## Validation

The compatibility suite covers standalone installation, Core primitive parity,
resource behavior, reset/load, deterministic replay, bounded history, and
explicit default-installer rejection.
