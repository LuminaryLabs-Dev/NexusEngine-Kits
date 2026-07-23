# NexusEngine Kits

NexusEngine Kits is the official first-party trusted registry for reusable
behavior that does not belong in NexusEngine Core.

## Ownership

```txt
NexusEngine
  atomic, idempotent, fully reusable Core behavior

NexusEngine-Kits
  reusable optional, niche, genre, or platform behavior

Experiment and game repositories
  complete games, presets, authored content, and product behavior
```

This package does not incubate ProtoKits. That workflow is retired. Historical
source mappings remain as lineage evidence only.

## Install

One kit:

```js
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";

const installer = createNexusEngineKitInstaller();
await installer.installKit(engine, "fishing-kit");
```

Direct public import:

```js
import { createFishingKit } from "@luminarylabs/nexusengine-kits/fishing-kit";

const fishing = createFishingKit();
```

One domain:

```js
import { createFishingKit } from "@luminarylabs/nexusengine-kits/domain-aquatic";

const engine = createRealtimeGame({ kits: [createFishingKit()] });
```

Registry planning:

```js
import {
  pullRegistry,
  createInstallPlan,
  createNexusEngineKitInstaller
} from "@luminarylabs/nexusengine-kits";

const registry = await pullRegistry("LuminaryLabs-Dev/NexusEngine-Kits");
const plan = createInstallPlan({ kits: ["fishing-kit"] }, { registry });
const installer = createNexusEngineKitInstaller({ registry });
```

Registry metadata is descriptive until a trusted resolver verifies the owner,
immutable source, integrity, status, package export, and executable factory.

## Package Shape

```txt
kits/          official and explicitly staged implementations
domains/       domain composition entrypoints
bundles/       multi-domain compositions
manifests/     authoritative kit, domain, bundle, and registry records
registry/      trust, graph, planning, lockfile, integrity, and resolution
installer/     generated factories and installation
contracts/     manifest, status, and install-report contracts
parity/        historical source and behavior lineage
docs/          current usage and legacy migration pointers
```

Placeholders remain discoverable but cannot install as behavior through default
paths. Deprecated compatibility kits require explicit status opt-in.

## Current Catalog

As generated on 2026-07-23:

```txt
149 inventoried
27 official
7 of 120 baseline entries resolved
21 of 29 approved additions resolved
1 deprecated compatibility kit
```

Run `npm run progress` for current generated counts.

## Validation

```bash
npm run build:catalog
npm run check
```

Start with [docs/START-HERE.md](docs/START-HERE.md).
