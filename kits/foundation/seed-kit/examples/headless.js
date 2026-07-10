import { createRealtimeGame } from "nexusengine";
import { createSeedKit } from "@luminarylabs/nexusengine-kits/seed-kit";

const engine = createRealtimeGame({
  kits: [createSeedKit({ seed: "world-1", streams: ["terrain", "loot"] })]
});

console.log(engine.n.seedStream.range("terrain", -100, 100));
console.log(engine.n.seedStream.choose("loot", ["coin", "key", "relic"]));
console.log(engine.n.seedStream.getSnapshot());
