# Spatial Domain

The spatial domain groups kits for spatial lookup, interaction checks, hold actions, and completion ledgers.

## Members

```txt
spatial-index-kit              status: migration-placeholder
interactable-registry-kit      status: migration-placeholder
spatial-interaction-kit        status: migration-placeholder
hold-action-kit                status: migration-placeholder
completion-ledger-kit          status: candidate, real behavior
```

## Current truth

The domain is installable. Most members are still metadata-backed placeholders. `completion-ledger-kit` is the first real candidate behavior in this domain.

## Install

```js
import { createSpatialDomainKits } from "@luminarylabs/nexusengine-kits/domain-spatial";

const kits = createSpatialDomainKits();
```

## CDN

```js
import { createSpatialDomainKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@main/domains/spatial/index.js";
```

## Next validation

The next domain smoke test should prove that placeholder members and `completion-ledger-kit` install together without duplicate IDs and that the ledger API remains available after domain install.
