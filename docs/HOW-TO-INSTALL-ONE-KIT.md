# How To Install One Kit

Use the installer when the kit may be resolved by catalog ID.

```js
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";

const installer = createNexusEngineKitInstaller();
await installer.installKit(engine, "completion-ledger-kit");
```

Use CDN when working from browser-hosted experiments:

```js
import { createNexusEngineKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@<40-character-sha>/installer/index.js";
```

Unresolved metadata is descriptive only. Default installer paths must skip or
reject entries without an allowed-status executable factory.
