# Installer

The installer resolves catalog entries into NexusRealtime runtime kits.

## API

```js
import { createNexusRealtimeKitInstaller } from "./index.js";

const installer = createNexusRealtimeKitInstaller();
await installer.installKit(engine, "action-input-kit");
await installer.installDomain(engine, "input");
await installer.installBundle(engine, "default-game-stack");
```

## Bootstrap Note

Until a kit's behavior is fully migrated from ProtoKits, the installer creates a metadata-only runtime kit that is valid to install and inspect.
