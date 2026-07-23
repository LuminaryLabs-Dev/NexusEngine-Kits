# Repository Memory

## Purpose

NexusEngine-Kits is the first-party trusted registry for reusable optional,
niche, genre, or platform behavior. It is not an incubator and does not own
complete games or product presets.

## Architecture

- `kits/`: official or explicitly staged implementations grouped by domain
- `domains/`: domain-level composition entrypoints
- `bundles/`: multi-domain compositions
- `installer/`: resolution and installation only
- `manifests/`: authoritative records
- `registry/`: metadata pull, trust, graph, planning, lockfile, integrity, and
  approved module resolution
- `contracts/`: manifest, status, and install-report contracts
- `parity/`: historical source and behavior evidence

Generated catalogs, exports, factories, readiness, CDN indexes, and progress
derive from manifests and must not become independent truth.

## Ownership

- NexusEngine owns only atomic, idempotent, fully reusable Core behavior.
- This repository owns reusable non-Core behavior.
- Experiment and game repositories own complete games, authored content,
  routes, UI, product tuning, and product presets.
- The ProtoKit workflow is retired. Existing source hashes and compatibility
  names are historical lineage only.

## Trust

Trusted owner names do not bypass immutable source, integrity, collision,
dependency, package-export, status, or executable-code gates. Registry metadata
remains descriptive until a trusted provider resolves it.

## Current Migrations

- `fishing-kit` owns fishing simulation, renderers, shaders, realism, and its
  terrain binding.
- `migrated-gameplay` exposes 20 atomic optional kit identities through public
  NexusEngine imports.
- Complete Reef Rescue behavior is external to this package.
- The deprecated `protokit-core` compatibility kit remains excluded from
  default installs and requires explicit status opt-in.
- `generic-resource-loop-kit` is deprecated because current NexusEngine Core
  owns the same resource service and compatibility API names.

## Validation

Run `npm run build:catalog` and `npm run check`. A kit is not official behavior
without direct, installed, reset/snapshot where stateful, package-export, and
registry proof.
