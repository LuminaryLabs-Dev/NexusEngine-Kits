<p align="center">
  <img src="docs/assets/brand/social-card.png" alt="Manifest records entering the NexusEngine Kits catalog, passing validation, and becoming an installed composition" width="100%">
</p>

# NexusEngine Kits

NexusEngine-Kits is the first-party registry for reusable behavior that is useful
across products but intentionally outside NexusEngine Core.

## Ownership

```txt
NexusEngine       universal atomic behavior and semantic state ownership
NexusEngine-Kits  optional niche, genre, platform, and authored systems
Game repositories complete games, presets, tuning, UI, and product behavior
```

ProtoKits are retired. Their Git history and extraction lineage remain evidence,
not an authoring workflow or runtime dependency.

## Current Verified State

| Measure | Count |
| --- | ---: |
| Inventoried kits | 134 |
| Official | 23 |
| Candidate | 8 |
| Scaffolded | 8 |
| Metadata placeholders | 95 |
| Deprecated compatibility kits | 0 |
| Baseline resolved | 5 of 108 |
| Approved additions resolved | 18 of 26 |

Run `npm run progress` for live counts. Catalog presence is not proof of
implemented behavior: installation permits only `official` entries with
validated factories and public exports.

## Quick Start

```bash
npm ci
npm run progress
npm run check
```

The package metadata identifies version `0.0.1`, but no Git tag, GitHub release,
or public npm package is currently available. Use a reviewed source checkout or
an immutable commit until a release is published.

## Use A Kit

```js
import { createEngine } from "nexusengine";
import { createFishingKit } from "@luminarylabs/nexusengine-kits/fishing-kit";

const engine = createEngine({ kits: [createFishingKit()] });
```

The local first-party installer uses the generated package catalog:

```js
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";

const installer = createNexusEngineKitInstaller();
const report = await installer.installKit(engine, "fishing-kit");

if (!report.installed) throw new Error(report.reason);
```

## Import The Registry

`nexusengine.registry.json` uses `nexusengine.composition-registry/3`. The tracked
file is metadata-only and cannot execute code. Fetching it from an immutable Git
commit hydrates source identity; a host must still verify the package, export,
integrity, environment, and permissions before execution.

```js
import { createEngineRegistrySnapshot, mergeRegistrySnapshots } from "nexusengine/domains/composition/registry";
import { pullRegistry } from "@luminarylabs/nexusengine-kits/registry";

const kits = await pullRegistry("LuminaryLabs-Dev/NexusEngine-Kits");
const registry = mergeRegistrySnapshots(createEngineRegistrySnapshot(), [kits]);
```

Unresolved placeholders remain searchable with `source.installable: false`.
Only proven `official` records become installable after immutable hydration.

## Core Cutover

Fifteen catalog identities already owned by NexusEngine `0.0.4` were removed,
including ProtoKit compatibility, generic resource/pressure/action services,
completion/data behavior, persistence/spatial primitives, and the old
registry-control-plane Kits. There are no forwarding exports.

See [the 0.0.4 migration map](docs/0.0.4-CORE-PROMOTION-MIGRATION.md).

## Repository Shape

```txt
kits/       proven and staged non-Core implementations
domains/    package-local grouping entrypoints
bundles/    package-local multi-domain selections
manifests/  authoritative Kit, Domain, recipe, and registry sources
registry/   v3 metadata hydration, trust, integrity, and resolution
installer/  private generated catalog planning and installation
parity/     historical source and behavior lineage
docs/       current usage and migration guidance
```

## Current Catalog

```txt
134 inventoried Kit records
23 official
111 candidate, scaffolded, or migration-placeholder records
108 historical baseline records
26 approved additions
0 deprecated runtime Kits
```

Run `npm run progress` for generated counts. Validate changes with:

```bash
npm run build:catalog
npm run check
```

## Documentation

- [Start here](docs/START-HERE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Known limitations](KNOWN-LIMITATIONS.md)
- [Visual identity](docs/VISUAL-IDENTITY.md)

`package.json` declares MIT, but no license text is tracked at this revision. Do not infer redistribution terms beyond the repository's explicit files.
