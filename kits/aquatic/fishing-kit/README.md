# Fishing Kit

Status: official first-party non-Core kit

`fishing-kit` owns the reusable fishing loop: casting, lure drift, fish interest,
hook timing, line tension, catch scoring, fishing-specific render snapshots,
shader descriptors, and optional coastal realism.

It is not NexusEngine Core because its concepts and defaults are
genre-specific. Products own authored species, objectives, locations, input
mapping, presentation, and game rules.

## Install

```js
import { createEngine } from "nexusengine";
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";
import { createFishingHeadlessRenderer } from "@luminarylabs/nexusengine-kits/fishing-kit";

const engine = createEngine({ renderer: createFishingHeadlessRenderer() });
const installer = createNexusEngineKitInstaller();
const result = await installer.installKit(engine, "fishing-kit");

if (!result.installed) throw new Error(result.reason);
engine.tick(1 / 60);
```

`createFishingTerrainBinding(terrainKit)` adapts the public NexusEngine terrain
kit without adding a fishing method to Core.

## Ownership

- NexusEngine: ECS, scheduler, runtime-kit contract, sequences, and generic
  terrain APIs.
- Fishing kit: fishing state, systems, shaders, renderer adapters, and
  fishing/coastal realism.
- Product or game: authored content, controls, objectives, and presentation.

