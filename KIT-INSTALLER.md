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
await installer.installKit(engine, "generic-resource-loop-kit");
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

`createPlaceholderKit()` is disabled. Unresolved behavior belongs in ProtoKits until promotion proof exists.

Registry metadata can be pulled without code execution. Third-party registries require an explicit registry SHA pin, and third-party modules additionally require `allowExternalCode: true`, an integrity hash, and an approved module resolver.
