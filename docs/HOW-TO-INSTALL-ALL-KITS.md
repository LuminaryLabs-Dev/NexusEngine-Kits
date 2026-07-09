# How To Install All Kits

The full catalog bundle is available through `bundles/all.js`.

```js
import { createAllNexusEngineKits } from "@luminarylabs/nexusengine-kits/all";

const kits = createAllNexusEngineKits();
```

CDN:

```js
import { createAllNexusEngineKits } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@main/bundles/all.js";
```

The bootstrap all-bundle returns metadata-backed kit entries for the complete catalog. Full behavior migrates from ProtoKits kit-by-kit.
