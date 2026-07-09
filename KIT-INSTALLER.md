# KIT-INSTALLER.md

`NexusRealtime-KitInstaller` lives in this repo under `installer/`.

It is not a runtime engine. It resolves kits and installs them into a NexusRealtime engine.

## Responsibilities

```txt
resolve kit ID to manifest
resolve domain ID to kit list
resolve bundle ID to domain list
create metadata-backed runtime kits during migration
optionally load real ESM factories when module URLs are available
install into engine.installKit()
track duplicate kit IDs
return install reports
```

## Basic Use

```js
import { createNexusRealtimeKitInstaller } from "@luminarylabs/nexusrealtime-kits/installer";

const installer = createNexusRealtimeKitInstaller();
await installer.installKit(engine, "damage-health-kit");
await installer.installDomain(engine, "hazard-combat");
await installer.installBundle(engine, "default-game-stack");
await installer.installAll(engine);
```

## CDN Use

```js
import { createNexusRealtimeKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusRealitime-Kits@main/installer/index.js";
```

## Placeholder Behavior

Until a kit's full behavior is migrated from ProtoKits, the installer creates a metadata-only runtime kit with:

```txt
id
provides
requires
metadata
initWorld install report
```

This makes the catalog installable and inspectable before every source kit is fully promoted.
