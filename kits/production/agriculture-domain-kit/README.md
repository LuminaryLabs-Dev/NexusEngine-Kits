# agriculture-domain-kit

Official renderer-agnostic Agriculture Domain Service Kit at `n:production:agriculture`.

It owns land, soil, cultivation, watering, growth, harvest, and perennial crop meaning. `n:production` is a catalog family, not an executable parent kit.

## Install

```js
import * as NexusEngine from "nexusengine";
import { createAgricultureDomainKit } from "./index.js";

const engine = NexusEngine.createEngine({
  kits: [
    NexusEngine.createCoreTransactionLedgerKit(),
    createAgricultureDomainKit(NexusEngine, {
      plots: [{ id: "field-1", soilType: "loam" }],
      cropDefinitions: {
        wheat: {
          id: "wheat",
          seedItemId: "wheat-seed",
          harvestItemId: "wheat",
          growthDays: 3,
          stageCount: 4,
          yieldMin: 2,
          yieldMax: 5
        }
      }
    })
  ]
});
```

## Services

```txt
engine.n.agriculture.land
engine.n.agriculture.soil
engine.n.agriculture.cultivation
engine.n.agriculture.water
engine.n.agriculture.growth
engine.n.agriculture.harvest
engine.n.agriculture.perennials
```

Inventory, weather, calendars, wild foraging, rendering, and storage transport remain separate authorities. Plant and harvest plans publish `resourceChanges` for product transaction coordinators.
