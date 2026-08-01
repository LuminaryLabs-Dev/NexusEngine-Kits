# KIT-INSTALLER.md

`NexusEngine-KitInstaller` lives in this repo under `installer/`.

It is not a runtime engine. It resolves kits and installs them into a NexusEngine engine.

## Responsibilities

```txt
resolve kit ID to manifest
resolve domain ID to kit list
resolve bundle ID to domain list
plan dependencies and reject missing providers or cycles before execution
skip unready domain/bundle members and reject direct unready selections
resolve only real generated factories or integrity-verified modules
install into engine.installKit()
track duplicate kit IDs
return install reports
```

## Basic Use

```js
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";

const installer = createNexusEngineKitInstaller();
await installer.installKit(engine, "fishing-kit");
await installer.installDomain(engine, "hazard-combat");
await installer.installBundle(engine, "default-game-stack");
await installer.installAll(engine);
```

## CDN Use

```js
import { createNexusEngineKitInstaller } from "https://cdn.jsdelivr.net/gh/LuminaryLabs-Dev/NexusEngine-Kits@<40-character-sha>/installer/index.js";
```

## Readiness Behavior

The default installer allows only `official` manifests. Domain and bundle reports retain one result per catalog entry and mark unready members as `skipped` with `reason: "status-not-allowed"`.

```js
const reviewInstaller = createNexusEngineKitInstaller({
  allowStatuses: ["official", "candidate"]
});
```

`createPlaceholderKit()` is disabled. Unresolved behavior remains descriptive
metadata until an approved implementation passes the official acceptance gates.

The local installer consumes the package's private generated catalog. Public
registry discovery uses Composition registry v3 and is applied by a host through
NexusEngine Core Composition. Third-party code still requires an explicit SHA
pin, verified integrity, and an approved module resolver.
