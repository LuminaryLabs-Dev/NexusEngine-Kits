# Registry Import

`nexusengine.registry.json` is generated from `manifests/` using
`nexusengine.composition-registry/3`.

## Two Phases

1. The tracked registry is metadata-only. Every Kit is non-installable and its
   source commit is a placeholder because a Git commit cannot contain itself.
2. `pullRegistry()` resolves an immutable 40-character commit, validates trust,
   and hydrates only proven `official` records as installable candidates.

Hydration does not execute JavaScript. The application host must still verify
the exact package, version, commit, SHA-256 integrity, subpath, export,
environment, and permissions during Composition preflight.

```js
import { createEngineRegistrySnapshot, mergeRegistrySnapshots } from "nexusengine/domains/composition/registry";
import { pullRegistry } from "@luminarylabs/nexusengine-kits/registry";

const imported = await pullRegistry("LuminaryLabs-Dev/NexusEngine-Kits");
const merged = mergeRegistrySnapshots(createEngineRegistrySnapshot(), [imported]);
```

## External Owners

Owners outside the trusted first-party list require an exact approved pin:

```js
const imported = await pullRegistry("ThirdParty/Example-Kits", {
  externalRegistries: {
    "third-party-kits": "<40-character-sha>"
  }
});
```

Metadata retrieval never imports a module. A changed commit, integrity mismatch,
missing export, path escape, identity collision, or unresolved status fails
before mutation.

## Local Installer Lock

`nexusengine-kits.lock.json` belongs to the package-local installer. It records
the exact payload commit, selected internal bundle, deterministic install order,
module paths, versions, and per-module integrity. Core Composition receipts are
the application-level exactly-once record and are not replaced by this lockfile.
