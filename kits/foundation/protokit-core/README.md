# protokit-core

Deprecated NexusEngine compatibility Domain Service Kit for the original ProtoKit utility aggregate.

## Domain

- Parent: `compatibility`
- Domain path: `n:compatibility:protokit-core`
- API: `engine.n.protokitCore`
- Compatibility alias: `engine.protokitCore`
- Status: `deprecated`

NexusEngine owns runtime definitions, core utility math, deterministic random primitives, cloning, serialization, snapshots, and clock contracts. This kit preserves the remaining aggregate import surface for consumers that cannot migrate atomically.

## Source lineage

- `LuminaryLabs-Agents/NexusEngine-ProtoKits` commit `9b0d74c57c29d04a9ba955ae41c8ca19cb2cd5d6`
  - exact validated compatibility surface promoted here
- `LuminaryLabs-Dev/NexusEngine` commit `851372d29fece5ad7d9a6253fb1a74730ae24047`
  - canonical replacement behavior and native DSK contracts

The source repositories were inspected read-only.

## Installation

Direct imports remain available, but the registry installer rejects deprecated Kits unless the consumer explicitly opts in:

```js
const installer = createNexusEngineKitInstaller({
  allowStatuses: ["official", "deprecated"]
});
await installer.installKit(engine, "protokit-core");
```

New projects should import the replacement NexusEngine APIs directly.

## Boundary

This bridge owns no simulation loop, renderer, host, game policy, persistence transport, or new core primitive. Its snapshot contains only versioned replacement metadata.
