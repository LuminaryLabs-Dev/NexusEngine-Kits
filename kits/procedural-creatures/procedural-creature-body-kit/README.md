# Procedural Creature Body Kit

`procedural-creature-body-kit` generates renderer-agnostic creature body descriptors from deterministic recipes.

## Owns

- triangulated body topology descriptors
- skeleton and bind-pose descriptors
- skin indices and weights
- material-region colors
- attachment points
- recommended collision shape
- lightweight procedural pose descriptors
- snapshot, load, and reset

## Does not own

- Three.js, WebGL, or GPU objects
- active movement or gameplay state
- AI, combat, health, or scoring
- physics resolution
- renderer animation mixers

## Install

```js
import { createRealtimeGame } from "nexusengine";
import { createSeedKit } from "@luminarylabs/nexusengine-kits/seed-kit";
import { createProceduralCreatureBodyKit } from "@luminarylabs/nexusengine-kits/procedural-creature-body-kit";

const engine = createRealtimeGame({
  kits: [
    createSeedKit({ seed: "creature-world" }),
    createProceduralCreatureBodyKit()
  ]
});

const body = engine.n.proceduralCreatureBody.create({
  id: "runner-raptor",
  archetype: "theropod"
});
```

A renderer adapter converts `body.geometry`, `body.skeleton`, and `body.material` into platform objects. The durable snapshot stores recipes and content hashes so geometry can be regenerated deterministically.
