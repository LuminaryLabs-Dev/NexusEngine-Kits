# Changelog

This file records notable verified changes. No Git tag or GitHub release currently establishes a versioned release history.

## Unreleased

### Added

- Added the official `agriculture-domain-kit` with deterministic land, soil, cultivation, watering, growth, harvest, replay, snapshot, and perennial-crop behavior.
- Added a professional documentation entry path, maintainer profile, and reusable repository image pack.

### Changed

- Strengthened agriculture replay behavior and aligned generated catalog and registry metadata.
- Continued fail-closed registry planning and executable-factory validation.

### Removed

- Removed the MCP domain and renderer-neutral Object Placement candidates after their promotion into NexusEngine Core `0.0.4`.
- Removed the former package subpaths rather than forwarding them; replacement imports are documented in the [Core promotion migration](docs/0.0.4-CORE-PROMOTION-MIGRATION.md).

### Deprecated

- `generic-resource-loop-kit` remains only as opt-in compatibility because NexusEngine Core owns the canonical resource service.
- `protokit-core` remains an opt-in compatibility bridge; the ProtoKit workflow itself is retired.

### Known Limits

- Most catalog entries remain metadata-backed placeholders or scaffolds.
- Tagged release stability and public npm publication are not established.
- `package.json` declares MIT, but no license text is tracked.
