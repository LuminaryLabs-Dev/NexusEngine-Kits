# Installer

The installer resolves catalog entries into NexusEngine runtime kits.

## API

```js
import { createNexusEngineKitInstaller } from "./index.js";

const installer = createNexusEngineKitInstaller();
await installer.installKit(engine, "action-input-kit");
await installer.installDomain(engine, "input");
await installer.installBundle(engine, "default-game-stack");
```

## Readiness

The default installer executes only allowed-status factories. Unresolved
metadata may be inspected through the catalog, but it is skipped or rejected
rather than installed as empty behavior.
