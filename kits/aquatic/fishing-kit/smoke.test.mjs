import assert from "node:assert/strict";
import { createEngine, validateRuntimeKit } from "nexusengine";
import { createNexusEngineKitInstaller } from "../../../installer/index.js";
import {
  createFishingHeadlessRenderer,
  createFishingKit
} from "./index.js";

const direct = createFishingKit();
assert.equal(validateRuntimeKit(direct), direct);
assert.equal(direct.id, "fishing");
assert.equal(typeof direct.invokes.setPanel, "function");

const renderer = createFishingHeadlessRenderer();
const engine = createEngine({ renderer, tick: { maxDelta: 1 } });
const installer = createNexusEngineKitInstaller();
const installed = await installer.installKit(engine, "fishing-kit");

assert.equal(installed.installed, true, installed.reason);
assert.equal(installed.kit.id, "fishing");
engine.tick(1 / 60);
assert.equal(renderer.frames.length, 1);

const sessionResource = installed.kit.resources.FishingSession;
const initialSession = structuredClone(engine.world.getResource(sessionResource));
assert.equal(initialSession.phase, "Explore");
assert.equal(initialSession.caught, 0);

installed.kit.invokes.setPanel({ world: engine.world, panel: "cast" });
assert.equal(engine.world.getResource(sessionResource).uiPanel, "cast");

const duplicate = await installer.installKit(engine, "fishing-kit");
assert.equal(duplicate.installed, false);
assert.equal(duplicate.duplicate, true);
assert.equal(engine.kits.filter((kit) => kit.id === "fishing").length, 1);

console.log("fishing-kit smoke ok");
