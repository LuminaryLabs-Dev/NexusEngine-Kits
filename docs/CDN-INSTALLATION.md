# CDN Installation

CDN imports should be stable and explicit.

## Installer

```js
import { createNexusEngineKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@main/installer/index.js";
```

## One domain

```js
import { createInputDomainKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@main/domains/input/index.js";
```

## Full catalog

```js
import { createAllNexusEngineKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@main/bundles/all.js";
```

Prefer version or commit pinned CDN URLs for production builds after the first tagged release.
