import assert from "node:assert/strict";
import {
  cloneSerializableState,
  createRealtimeGame,
  createScopedSeed,
  hashSeed
} from "nexusengine";
import {
  clamp as coreClamp,
  expSmoothingAlpha,
  lerp as coreLerp
} from "nexusengine/core-kits/core-utility-kit";
import { createFoundationDomainKits } from "../../../domains/foundation/index.js";
import { createNexusEngineKitInstaller } from "../../../installer/kit-installer.js";
import {
  PROTOKIT_CORE_VERSION,
  approach,
  asList,
  byId,
  clamp,
  clone,
  createDefinitionFactory,
  createProtokitCore,
  createSeededRandom,
  defineInjectedRuntimeKit,
  distance2D,
  ensureResource,
  getClockDelta,
  getClockElapsed,
  hashString,
  lerp,
  number,
  scopedSeed,
  stableId,
  weightedChoice
} from "./index.js";

assert.equal(number("4", 0), 4);
assert.equal(number("invalid", 7), 7);
assert.equal(clamp(12, 0, 10), coreClamp(12, 0, 10));
assert.equal(lerp(2, 6, 0.5), coreLerp(2, 6, 0.5));
assert.equal(approach(2, 6, 3, 0.5), lerp(2, 6, expSmoothingAlpha(3, 0.5)));
assert.deepEqual(asList(null), []);
assert.deepEqual(asList("one"), ["one"]);
assert.deepEqual(clone({ nested: [1, 2] }), cloneSerializableState({ nested: [1, 2] }));
assert.equal(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
assert.equal(getClockDelta({ __nexusClock: { delta: 1 } }), 0.1);
assert.equal(getClockElapsed({ __nexusClock: { elapsed: 4 } }), 4);
assert.equal(hashString("seed"), hashSeed("seed"));
assert.equal(scopedSeed("root", "child"), createScopedSeed("root", "child"));
assert.equal(stableId("item", "a"), stableId("item", "a"));
assert.deepEqual(byId([{ id: "a", value: 1 }]), { a: { id: "a", value: 1 } });

const first = createSeededRandom("repeat");
const second = createSeededRandom("repeat");
assert.deepEqual(Array.from({ length: 1000 }, () => first.next()), Array.from({ length: 1000 }, () => second.next()));
const choices = [{ id: "a", weight: 1 }, { id: "b", weight: 4 }];
const weightedA = createSeededRandom("weighted");
const weightedB = createSeededRandom("weighted");
assert.deepEqual(Array.from({ length: 1000 }, () => weightedChoice(choices, weightedA).id), Array.from({ length: 1000 }, () => weightedChoice(choices, weightedB).id));

const fallback = defineInjectedRuntimeKit({}, { id: "fallback", systems: [() => {}], provides: ["fallback:test"] });
assert.equal(fallback.id, "fallback");
assert.equal(fallback.systems[0].phase, "simulate");
const definitions = createDefinitionFactory({});
const resource = definitions.resource("resource");
const resources = new Map();
const world = {
  hasResource: (key) => resources.has(key),
  getResource: (key) => resources.get(key),
  setResource: (key, value) => resources.set(key, value)
};
assert.deepEqual(ensureResource(world, resource, () => ({ count: 1 })), { count: 1 });
assert.deepEqual(ensureResource(world, resource, () => ({ count: 2 })), { count: 1 });

const directEngine = createRealtimeGame({ kits: [createProtokitCore()] });
assert.equal(directEngine.n.protokitCore, directEngine.protokitCore);
assert.equal(directEngine.kits.find((kit) => kit.id === "protokit-core").metadata.status, "deprecated");
const snapshot = directEngine.n.protokitCore.getSnapshot();
assert.equal(snapshot.version, PROTOKIT_CORE_VERSION);
assert.deepEqual(directEngine.n.protokitCore.loadSnapshot(snapshot), snapshot);
assert.deepEqual(directEngine.n.protokitCore.reset(), snapshot);

const defaultInstaller = createNexusEngineKitInstaller();
const rejected = await defaultInstaller.installKit(createRealtimeGame(), "protokit-core");
assert.equal(rejected.installed, false);
assert.equal(rejected.reason, "status-not-allowed");

const optInInstaller = createNexusEngineKitInstaller({ allowStatuses: ["official", "deprecated"] });
const installedEngine = createRealtimeGame();
const installed = await optInInstaller.installKit(installedEngine, "protokit-core");
assert.equal(installed.installed, true);
assert.equal(installedEngine.n.protokitCore.hashString("seed"), hashSeed("seed"));

assert.equal(createFoundationDomainKits().some((kit) => kit.id === "protokit-core"), false);
assert.equal(createFoundationDomainKits({}, { allowStatuses: ["official", "deprecated"] }).some((kit) => kit.id === "protokit-core"), true);

console.log("protokit-core deprecated compatibility smoke passed");
