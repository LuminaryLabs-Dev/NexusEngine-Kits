import assert from "node:assert/strict";
import * as NexusEngine from "nexusengine";
import {
  createRealtimeGame,
  createScopedSeed,
  createSeededRandom
} from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createFoundationDomainKits } from "../../../domains/foundation/index.js";
import { createNexusEngineKitInstaller } from "../../../installer/kit-installer.js";
import {
  GENERIC_SEED_KIT_VERSION,
  createGenericSeedKit,
  createSeedKit
} from "./index.js";

const engine = createRealtimeGame({
  kits: [createSeedKit({ seed: "world-1", streams: ["preloaded"] })]
});
assert.equal(engine.kits.find((kit) => kit.id === "seed-kit").metadata.status, "official");
const api = engine.n.seedStream;
assert.equal(api, engine.seedStream);
assert.equal(api, engine.seedKit);
assert.equal(api, engine.n.genericSeed);
assert.equal(api, engine.genericSeed);
assert.equal(api.getWorldSeed(), "world-1");
assert.equal(api.hasStream("preloaded"), true);

const core = createSeededRandom(createScopedSeed("world-1", "terrain"));
assert.deepEqual(
  Array.from({ length: 1000 }, () => api.next("terrain")),
  Array.from({ length: 1000 }, () => core.next())
);
assert.equal(api.getStream("terrain").draws, 1000);

const orderA = createRealtimeGame({ kits: [createSeedKit({ seed: "independent" })] }).n.seedStream;
const a1 = orderA.next("a");
const b1 = orderA.next("b");
const a2 = orderA.next("a");
const orderB = createRealtimeGame({ kits: [createSeedKit({ seed: "independent" })] }).n.seedStream;
assert.equal(orderB.next("a"), a1);
assert.equal(orderB.next("a"), a2);
assert.equal(orderB.next("b"), b1);

const values = ["a", "b", "c", "d"];
const choiceEngine = createRealtimeGame({ kits: [createSeedKit({ seed: "collections" })] }).n.seedStream;
const choiceReplay = createRealtimeGame({ kits: [createSeedKit({ seed: "collections" })] }).n.seedStream;
assert.equal(choiceEngine.choose("loot", values), choiceReplay.choose("loot", values));
assert.deepEqual(choiceEngine.shuffle("deck", values), choiceReplay.shuffle("deck", values));
assert.equal(choiceEngine.int("dice", 1, 6), choiceReplay.int("dice", 1, 6));
assert.equal(choiceEngine.bool("chance", 0.25), choiceReplay.bool("chance", 0.25));
assert.equal(choiceEngine.range("range", -2, 3), choiceReplay.range("range", -2, 3));

api.fork("terrain", "caves");
const snapshot = api.getSnapshot();
assert.equal(snapshot.version, GENERIC_SEED_KIT_VERSION);
const expectedContinuation = Array.from({ length: 64 }, () => api.next("terrain:caves"));
const restoredEngine = createRealtimeGame({ kits: [createSeedKit({ seed: "other" })] });
assert.deepEqual(restoredEngine.n.seedStream.loadSnapshot(snapshot), snapshot);
assert.deepEqual(Array.from({ length: 64 }, () => restoredEngine.n.seedStream.next("terrain:caves")), expectedContinuation);

api.setWorldSeed("world-2");
assert.equal(api.listStreams().length, 0);
const worldTwoFirst = api.next("terrain");
api.reset();
assert.equal(api.getWorldSeed(), "world-1");
assert.notEqual(api.next("terrain"), worldTwoFirst);
assert.equal(api.hasStream("preloaded"), true);

const limited = createRealtimeGame({ kits: [createSeedKit({ maxStreams: 2 })] }).n.seedStream;
limited.createStream("one");
limited.createStream("two");
assert.throws(() => limited.createStream("three"), /limit 2/);
assert.throws(() => limited.loadSnapshot({ ...limited.getSnapshot(), maxStreams: 3 }), /does not match 2/);
assert.throws(() => limited.loadSnapshot({ ...limited.getSnapshot(), streams: [
  { id: "duplicate", seed: "one", draws: 0, random: { seed: "one", state: 1 } },
  { id: "duplicate", seed: "two", draws: 0, random: { seed: "two", state: 2 } }
] }), /duplicates duplicate/);

const scaleEngine = createRealtimeGame({ kits: [createSeedKit({ seed: "scale", maxStreams: 1000 })] });
for (let index = 0; index < 1000; index += 1) scaleEngine.n.seedStream.next(`stream-${index}`);
const scaleSnapshot = scaleEngine.n.seedStream.getSnapshot();
assert.equal(scaleSnapshot.streams.length, 1000);
const scaleRestore = createRealtimeGame({ kits: [createSeedKit({ maxStreams: 1000 })] });
assert.deepEqual(scaleRestore.n.seedStream.loadSnapshot(scaleSnapshot), scaleSnapshot);

const legacy = createRealtimeGame({ kits: [createGenericSeedKit(NexusEngine, { seed: "legacy" })] });
assert.equal(legacy.kits.some((kit) => kit.id === "generic-seed-kit"), true);
assert.equal(legacy.genericSeed.next("legacy"), createSeededRandom(createScopedSeed("legacy", "legacy")).next());
assert.equal(typeof legacy.genericSeedKit.getSnapshot, "function");
assert.equal(legacy.genericSeed.getState().streams[0].lastUint32, legacy.genericSeed.getStream("legacy").lastUint32);
legacy.genericSeed.command({ type: "configure", config: { seed: "legacy-2", streams: ["configured"] } });
assert.equal(legacy.genericSeed.getWorldSeed(), "legacy-2");
assert.equal(legacy.genericSeed.hasStream("configured"), true);
assert.throws(() => legacy.genericSeed.command({ type: "unrelated-domain-command" }), /Unsupported seed stream command/);

const installerEngine = createRealtimeGame({ kits: [createCoreSimulationKit()] });
const installer = createNexusEngineKitInstaller();
const installed = await installer.installKit(installerEngine, "seed-kit", { seed: "installer" });
assert.equal(installed.installed, true);
assert.equal(installed.report.ok, true);
assert.equal(typeof installerEngine.n.coreSimulation.getSnapshot, "function");
assert.equal(installerEngine.n.seedStream.getWorldSeed(), "installer");

const foundationKits = createFoundationDomainKits();
assert.equal(foundationKits.some((kit) => kit.id === "seed-kit"), true);
assert.equal(foundationKits.some((kit) => kit.id === "protokit-core"), false);

console.log("seed-kit official smoke passed");
