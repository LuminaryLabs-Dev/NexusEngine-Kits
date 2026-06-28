# How To Install All Kits

The full catalog bundle is available through `bundles/all.js`.

```js
import { createAllNexusRealtimeKits } from "@luminarylabs/nexusrealtime-kits/all";

const kits = createAllNexusRealtimeKits();
```

CDN:

```js
import { createAllNexusRealtimeKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/bundles/all.js";
```

The bootstrap all-bundle returns metadata-backed kit entries for the complete catalog. Full behavior migrates from ProtoKits kit-by-kit.
