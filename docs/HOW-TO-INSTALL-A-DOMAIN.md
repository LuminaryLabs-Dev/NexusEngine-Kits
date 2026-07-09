# How To Install A Domain

A domain is an install group for related kits.

## Package import

```js
import { createSpatialDomainKits } from "@luminarylabs/nexusrealtime-kits/domain-spatial";

const kits = createSpatialDomainKits();
```

## CDN import

```js
import { createSpatialDomainKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/domains/spatial/index.js";
```

## Installer-driven domain install

```js
const installer = createNexusRealtimeKitInstaller();
await installer.installDomain(engine, "spatial");
```

## Rule

A domain should compose kits. It should not hide unrelated behavior.
