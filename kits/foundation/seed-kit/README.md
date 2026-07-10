# seed-kit

Official NexusEngine Domain Service Kit for deterministic world-seed ownership and bounded named random streams.

## Domain

- Parent: `foundation`
- Domain path: `n:foundation:seed-stream`
- API: `engine.n.seedStream`
- Factory: `createSeedKit(config?)`
- Base primitive: NexusEngine `createSeededRandom()` and `createScopedSeed()`

NexusEngine owns hashing and the seeded-random primitive. This DSK owns world-seed configuration, deterministic named-stream derivation, bounded stream lifecycle, draw accounting, collection helpers, reset, and exact replay state.

## Source lineage

- `LuminaryLabs-Agents/NexusEngine-ProtoKits` commit `11d245913ba4d30f3ce950eb5a17e1cc6e4aa1f5`
  - exact validated DSK, feature union, generic factory, and aliases
- `LuminaryLabs-Dev/NexusEngine` commit `851372d29fece5ad7d9a6253fb1a74730ae24047`
  - deterministic random and native DSK primitives

The source repositories were inspected read-only.

## Public API

```text
engine.n.seedStream.getWorldSeed()
engine.n.seedStream.setWorldSeed(seed)
engine.n.seedStream.createStream(id, options?)
engine.n.seedStream.hasStream(id)
engine.n.seedStream.getStream(id?)
engine.n.seedStream.listStreams()
engine.n.seedStream.deleteStream(id)
engine.n.seedStream.nextUint32(id?)
engine.n.seedStream.next(id?)
engine.n.seedStream.range(id, min, max)
engine.n.seedStream.int(id, min, max)
engine.n.seedStream.bool(id, chance)
engine.n.seedStream.choose(id, items)
engine.n.seedStream.shuffle(id, items)
engine.n.seedStream.fork(parentId, scopeId, options?)
engine.n.seedStream.getState()
engine.n.seedStream.configure(config)
engine.n.seedStream.command(command)
engine.n.seedStream.getSnapshot()
engine.n.seedStream.loadSnapshot(snapshot)
engine.n.seedStream.reset(options?)
```

## Boundary

Owns deterministic seed identity and named-stream state. It does not own procedural generation, loot/encounter policy, world content, simulation ticks, persistence transport, networking, rendering, input, or nondeterministic entropy.

## Compatibility

`createGenericSeedKit(NexusEngine?, config?)`, `engine.genericSeed`, and the prior generic aliases remain available. The unrelated generic catch-all commands are intentionally rejected because they belong to other domains.
