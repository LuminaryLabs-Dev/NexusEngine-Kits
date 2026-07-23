import { createEngine } from "nexusengine";
import { createNexusEngineKitInstaller } from "../../../../installer/index.js";
import { createFishingHeadlessRenderer } from "../index.js";

const renderer = createFishingHeadlessRenderer();
const engine = createEngine({ renderer });
const installer = createNexusEngineKitInstaller();
const result = await installer.installKit(engine, "fishing-kit");

if (!result.installed) throw new Error(result.reason);
engine.tick(1 / 60);
console.log(renderer.frames.at(-1)?.snapshot?.session);
