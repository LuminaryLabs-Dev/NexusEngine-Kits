<p align="center">
  <img src="docs/assets/brand/social-card.png" alt="Manifest records entering the NexusEngine Kits catalog, passing validation, and becoming an installed composition" width="100%">
</p>

# NexusEngine Kits

NexusEngine Kits is the first-party trusted registry and installer for reusable NexusEngine behavior that is optional, niche, genre-specific, or platform-specific. It does not own NexusEngine Core behavior, complete games, authored content, or product presets.

## Ownership

```text
NexusEngine Core
  atomic, idempotent, fully reusable behavior

NexusEngine-Kits
  reusable non-Core kits, domains, bundles, and adapters

Experiment and game repositories
  complete games, authored content, routes, UI, tuning, and presets
```

The ProtoKit workflow is retired. Historical mappings remain lineage evidence only and are not an active authoring path.

## Verified State

At the current documented snapshot, `npm run progress` reports:

| Measure | Count |
| --- | ---: |
| Inventoried kits | 149 |
| Official | 26 |
| Candidate | 9 |
| Scaffolded | 9 |
| Metadata placeholders | 103 |
| Deprecated compatibility kits | 2 |
| Baseline resolved | 7 of 120 |
| Approved additions resolved | 21 of 29 |

Run `npm run progress` for live counts. Catalog presence is not proof of implemented behavior: default installation permits only `official` entries with validated factories and public exports.

## Quick Start

```bash
npm ci
npm run progress
npm run check
```

The package metadata identifies version `0.0.1`, but no Git tag, GitHub release, or public npm package is currently available. Use a reviewed source checkout or an immutable commit until a release is published.

### Install One Kit

Given an existing NexusEngine instance:

```js
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";

const installer = createNexusEngineKitInstaller();
const report = await installer.installKit(engine, "fishing-kit");

if (!report.installed) throw new Error(report.reason);
```

Direct public imports are also available for implemented kits:

```js
import {
  createFishingHeadlessRenderer,
  createFishingKit
} from "@luminarylabs/nexusengine-kits/fishing-kit";

const fishing = createFishingKit();
const renderer = createFishingHeadlessRenderer();
```

See the exact public surface in [`package.json`](package.json) and the installation guides in [`docs/`](docs/DOCS-INDEX.md).

## Trust Model

`manifests/` is authoritative for kit, domain, bundle, and registry records. Generated catalogs, factories, readiness reports, CDN indexes, and physical manifest mirrors derive from it.

Registry metadata remains descriptive until a resolver verifies the owner, immutable source revision, integrity, status, package export, dependencies, and executable factory. External code additionally requires explicit approval and an approved resolver.

## Repository Shape

```text
kits/          kit implementations and focused proof
domains/       related-kit composition entrypoints
bundles/       reusable multi-domain compositions
manifests/     authoritative catalog records
installer/     planning, resolution, and engine installation
registry/      trust, integrity, lockfiles, and module resolution
contracts/     manifest, status, and install-report contracts
adapters/      host or protocol transports without domain behavior
parity/        historical source and behavior lineage
docs/          usage, authoring, readiness, and migration guidance
```

Generic MCP infrastructure and renderer-neutral Object Placement contracts were promoted into NexusEngine Core `0.0.4`; their former candidate exports were removed rather than forwarded. See the [Core promotion migration](docs/0.0.4-CORE-PROMOTION-MIGRATION.md).

## Documentation

- [Start here](docs/START-HERE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Known limitations](KNOWN-LIMITATIONS.md)
- [Visual identity](docs/VISUAL-IDENTITY.md)

`package.json` declares MIT, but no license text is tracked at this revision. Do not infer redistribution terms beyond the repository's explicit files.
