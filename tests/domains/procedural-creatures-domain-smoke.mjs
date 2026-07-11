import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createSeedKit } from "../../kits/foundation/seed-kit/index.js";
import { createProceduralCreaturesDomainKits } from "../../domains/procedural-creatures/index.js";

const kits = [
  createSeedKit({ seed: "procedural-creatures-domain" }),
  ...createProceduralCreaturesDomainKits({}, { allowStatuses: ["candidate", "official"] })
];
const engine = createRealtimeGame({ kits });
assert.ok(engine.n.proceduralCreatureBody);
const body = engine.n.proceduralCreatureBody.create({ id: "domain-raptor" });
assert.equal(body.archetype, "theropod");
assert.equal(engine.n.proceduralCreatureBody.getSnapshot().records.length, 1);
console.log("procedural creatures domain smoke passed", { installOrder: engine.game.installOrder });
