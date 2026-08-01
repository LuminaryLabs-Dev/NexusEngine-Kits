# Repository Memory

## Purpose

NexusEngine-Kits is the first-party registry for reusable optional, niche,
genre, platform, and authored behavior. NexusEngine owns universal atomic
behavior; game repositories own complete products and presets.

## Architecture

- `manifests/` is the only authoring source for Kit, Domain, recipe, and registry metadata.
- `nexusengine.registry.json` is a generated Composition registry v3 projection.
- The tracked registry is metadata-only; immutable hydration never executes code.
- `installer/` uses a private generated catalog for first-party local installation.
- `registry/` exposes v3 pull, hydration, trust, integrity, and module resolution.
- `parity/` preserves historical lineage and is not an active ownership source.

Generated catalogs, factories, readiness reports, CDN indexes, and progress must
not become independent truth.

## Ownership

- No active workflow creates or updates ProtoKits.
- Core-owned behavior is removed in the same change as its replacement; use a
  changelog and import map, never runtime forwarding.
- External Kit registry Domains use namespaced semantic paths below Core parents,
  such as `n:simulation:aquatic` and `n:spatial:extensions`.
- Complete games, authored presets, product UI, and product tuning stay outside.

## Current Cutover

- Fifteen Core-owned Kit records and six runtime implementations were removed.
- The old registry-control-plane runtime Kits were removed because Core
  Composition now owns registry, capability graph, and planning services.
- `protokit-core` and `generic-resource-loop-kit` have no compatibility exports.
- The specialized external `interaction-kit` identity became
  `gameplay-interaction-kit` to avoid colliding with Core `interaction-kit`.
- Public registry schema is `nexusengine.composition-registry/3`.
- Current generated inventory is 134 records: 23 official and 111 non-installable
  candidate, scaffolded, or placeholder records.

## Validation

Run `npm run build:catalog` and `npm run check`. A Kit is not executable registry
behavior until immutable source, integrity, export, environment, status,
dependency, collision, and host preflight gates pass.
