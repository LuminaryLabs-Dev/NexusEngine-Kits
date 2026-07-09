# NexusRealtime Kits

NexusRealtime Kits is the official first-party plugin catalog for NexusRealtime.

This repo is a clean rebuild that runs alongside `NexusRealtime-ProtoKits`. ProtoKits remains the incubation/reference repo. Kits mirrors the useful capability coverage, but rebuilds it with cleaner domain boundaries, manifests, tests, install reports, CDN paths, and parity tracking.

> Note: this repository is currently named `NexusRealitime-Kits` on GitHub. The package identity and docs use `NexusRealtime-Kits` / `@luminarylabs/nexusrealtime-kits` as the intended public kit catalog name.

## Role

```txt
NexusRealtime
  runs kits and owns runtime contracts

NexusRealtime-Kits
  clean official rebuild of first-party kits, domains, bundles, adapters, presets, and installer

NexusRealtime-ProtoKits
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
import { createNexusRealtimeKitInstaller } from "@luminarylabs/nexusrealtime-kits/installer";

const installer = createNexusRealtimeKitInstaller();
await installer.installKit(engine, "damage-health-kit");
```

### One domain

```js
import { createHazardCombatDomainKits } from "@luminarylabs/nexusrealtime-kits/domain-hazard-combat";

const engine = createRealtimeGame({
  kits: createHazardCombatDomainKits()
});
```

### Whole catalog

```js
import { createAllNexusRealtimeKits } from "@luminarylabs/nexusrealtime-kits/all";

const engine = createRealtimeGame({
  kits: createAllNexusRealtimeKits()
});
```

### CDN

```js
import { createNexusRealtimeKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/installer/index.js";
```

## Current Status

This is the clean rebuild foundation. The catalog, domains, bundles, installer, contracts, parity tracking, and docs land first so every future rebuilt kit has a stable long-term shape.

Many catalog entries are currently `migration-placeholder` entries. A placeholder is installable as a metadata-only runtime kit so apps, agents, docs, and KitBuilder tooling can resolve the official domain shape before each kit's full behavior is rebuilt against ProtoKits parity.

## Known Limitations

This repo intentionally separates installability from implementation readiness.

A cataloged kit may be metadata-installable before it has real behavior. A domain may install while most of its member kits are still placeholders. A bundle may compose domains before those domains are production-ready.

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
contracts/       manifest schemas, status enums, and install report contracts
installer/       dynamic kit/domain/bundle installer
kit-catalog.json machine-readable kit catalog seed
domain-catalog.json machine-readable domain catalog
bundle-catalog.json machine-readable bundle catalog
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
The whole catalog should be installable.
Every install should be inspectable.
Every stable kit should be CDN-addressable.
Every rebuilt kit should track ProtoKits parity.
Every limitation should be visible before it causes bad assumptions.
```
