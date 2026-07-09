# How To Install A Bundle

A bundle is a curated install stack.

Package import:

```js
import { createDefaultGameStackKits } from "@luminarylabs/nexusrealtime-kits/default-game-stack";

const kits = createDefaultGameStackKits();
```

Installer:

```js
const installer = createNexusRealtimeKitInstaller();
await installer.installBundle(engine, "default-game-stack");
```

CDN:

```js
import { createDefaultGameStackKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/bundles/default-game-stack.js";
```
