# CDN Installation

CDN imports should be stable and explicit.

## Installer

```js
import { createNexusRealtimeKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/installer/index.js";
```

## One domain

```js
import { createInputDomainKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/domains/input/index.js";
```

## Full catalog

```js
import { createAllNexusRealtimeKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/bundles/all.js";
```

Prefer version or commit pinned CDN URLs for production builds after the first tagged release.
