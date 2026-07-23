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

The all-bundle returns only behavior permitted by its status policy. Catalog
metadata for unresolved entries remains discoverable but does not become an
empty runtime implementation.
