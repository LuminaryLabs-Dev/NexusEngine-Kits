# How To Install One Kit

Use the installer when the kit may be resolved by catalog ID.

```js
import { createNexusRealtimeKitInstaller } from "@luminarylabs/nexusrealtime-kits/installer";

const installer = createNexusRealtimeKitInstaller();
await installer.installKit(engine, "completion-ledger-kit");
```

Use CDN when working from browser-hosted experiments:

```js
import { createNexusRealtimeKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/installer/index.js";
```

During the bootstrap phase, unresolved behavior installs as a metadata-only runtime kit. Full kit behavior is migrated from ProtoKits over time.
