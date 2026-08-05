# Changelog

This file records notable verified changes. No Git tag or GitHub release currently establishes a versioned release history.

## Unreleased

### Added

- Added the official `agriculture-domain-kit` with deterministic land, soil, cultivation, watering, growth, harvest, replay, snapshot, and perennial-crop behavior.
- Added a professional documentation entry path, maintainer profile, and reusable repository image pack.
- Added immutable Composition registry v3 hydration while keeping unresolved records non-installable.

### Changed

- Strengthened agriculture replay behavior and aligned generated catalog and registry metadata.
- Namespaced external Domain paths below canonical NexusEngine semantic parents.
- Moved Economy Resources and Progression registry extensions below their Core-owned semantic Domains to avoid replacing restored Core owners.
- Updated registry merge proof to preserve both Core and imported recipes.
- Renamed the specialized external `interaction-kit` identity to `gameplay-interaction-kit` to avoid a Core collision.
- Updated consumers to NexusEngine `0.0.4` canonical package subpaths.

### Removed

- Removed fifteen Core-owned catalog identities and all six reachable compatibility implementations.
- Removed ProtoKit, generic resource-loop, completion-ledger, MCP, Object Placement, and registry-control-plane exports without forwarding aliases. Replacement imports are documented in the [Core promotion migration](docs/0.0.4-CORE-PROMOTION-MIGRATION.md).

### Known Limits

- Most catalog entries remain metadata-backed placeholders or scaffolds.
- Tagged release stability and public npm publication are not established.
- `package.json` declares MIT, but no license text is tracked.
