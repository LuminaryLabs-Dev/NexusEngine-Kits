# NexusEngine Kits

NexusEngine Kits is the official first-party plugin catalog for NexusEngine.

This repo is a clean rebuild that runs alongside `NexusEngine-ProtoKits`. ProtoKits remains the incubation/reference repo. Kits mirrors the useful capability coverage, but rebuilds it with cleaner domain boundaries, manifests, tests, install reports, CDN paths, and parity tracking.

The repository, package, public APIs, and documentation use the canonical NexusEngine identity.

## Role

```txt
NexusEngine
  runs kits and owns runtime contracts

NexusEngine-Kits
  clean official rebuild of first-party kits, domains, bundles, adapters, presets, and installer

NexusEngine-ProtoKits
  incubation/reference repo for experimental kits and parity source behavior
```

This repo should not become a copied ProtoKits tree. It should mimic useful ProtoKit behavior, but improve the public factories, manifests, docs, testability, install paths, CDN entrypoints, and domain boundaries.

## Rebuild Rule

```txt
same capability coverage
cleaner public factories
cleaner runtime behavior
cleaner resources/events/systems
better manifests
better tests
better install paths
better CDN paths
better docs
better domain boundaries
```

## Install Shapes

### One kit

```js
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";

const installer = createNexusEngineKitInstaller();
await installer.installKit(engine, "generic-resource-loop-kit", {
  resources: [{ id: "energy", initial: 100 }]
});
```

### One domain

```js
import { createRegistryDomainKits } from "@luminarylabs/nexusengine-kits/domain-registry";

const engine = createRealtimeGame({
  kits: createRegistryDomainKits()
});
```

### Whole catalog

```js
import { createAllNexusEngineKits } from "@luminarylabs/nexusengine-kits/all";

const engine = createRealtimeGame({
  kits: createAllNexusEngineKits()
});
```

### CDN

```js
import { createNexusEngineKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@<40-character-sha>/installer/index.js";
```

### Repository registry

```js
import {
  pullRegistry,
  createInstallPlan,
  createNexusEngineKitInstaller
} from "@luminarylabs/nexusengine-kits";

const registry = await pullRegistry("LuminaryLabs-Dev/NexusEngine-Kits");
const plan = createInstallPlan({ bundles: ["registry-control-plane"] }, { registry });
const installer = createNexusEngineKitInstaller({ registry });
await installer.installBundle(engine, "registry-control-plane");
```

## Current Status

This is the clean rebuild foundation. The catalog, domains, bundles, installer, contracts, parity tracking, and docs land first so every future rebuilt kit has a stable long-term shape.

Many catalog entries are currently `migration-placeholder` entries. They remain discoverable, but default installer/domain/bundle APIs skip them instead of presenting metadata as behavior. Placeholder and scaffold factories never silently create empty runtime kits.

`generic-resource-loop-kit` is the first official baseline kit. The three registry control-plane additions are also official without changing the 120-kit baseline denominator. Run `npm run progress` for generated completed/remaining counts.

## Known Limitations

This repo intentionally separates installability from implementation readiness.

A cataloged kit may exist before it has real behavior. Default creation and installation paths include official kits only, so a domain or bundle can report skipped unready members without silently installing empty behavior.

See:

- `KNOWN-LIMITATIONS.md`
- `IMPLEMENTATION-GAPS.md`
- `FAILURE-MODES.md`
- `PLACEHOLDER-MATRIX.md`
- `READINESS-MATRIX.md`
- `AAA-GAP-REGISTER.md`

## Documentation Status

Framework docs now cover install modes, authoring, testing, contracts, parity, domains, bundles, CDN usage, readiness, known limitations, implementation gaps, failure modes, and placeholder status. Per-kit and per-domain docs expand as each placeholder becomes real behavior.

## Repository Map

```txt
contracts/       manifest, registry, lockfile, status, and report contracts
manifests/       authoritative kit, domain, bundle, and repository manifests
registry/        metadata pull, trust, graph/planning, lockfile, integrity, and resolver adapters
installer/       generated catalog/factories and kit/domain/bundle installation
kit-catalog.json generated machine-readable kit catalog
domain-catalog.json generated machine-readable domain catalog
bundle-catalog.json generated machine-readable bundle catalog
nexusengine.registry.json generated repository registry template
domains/         domain bundle entrypoints and future domain manifests
bundles/         full-catalog and game-stack bundles
kits/            official kit landing zones and rebuilt behaviors
parity/          ProtoKits-to-Kits parity tracking
examples/        one-kit, one-domain, bundle, full catalog, CDN, and headless usage
tests/           installer, contracts, domains, bundles, kits, parity, CDN, smoke
scripts/         catalog, manifest, parity, export, readiness, placeholder, and gap checks
```

## Core Principle

```txt
One kit should be installable.
One domain should be installable.
One bundle should be installable.
The whole official catalog should be installable; unready entries should fail closed.
Every install should be inspectable.
Every stable kit should be CDN-addressable.
Every remote module URL should resolve to an immutable commit and verified hash.
Every rebuilt kit should track ProtoKits parity.
Every limitation should be visible before it causes bad assumptions.
```
