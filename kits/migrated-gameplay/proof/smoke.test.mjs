import assert from "node:assert/strict";
import { createEngine } from "nexusengine/engine";
import { validateRuntimeKit } from "nexusengine/runtime-kit";
import { createNexusEngineKitInstaller } from "../../../installer/index.js";
import * as migrated from "../index.js";

const cases = [
  ["ar-kit", "createARKit"],
  ["ar-experience-kit", "createARExperienceKit"],
  ["interaction-kit", "createInteractionKit"],
  ["light-combat-kit", "createLightCombatKit"],
  ["companion-command-kit", "createCompanionCommandKit"],
  ["camera-collision-kit", "createCameraCollisionKit"],
  ["character-ragdoll-kit", "createCharacterRagdollKit"],
  ["forest-placement-kit", "createForestPlacementKit"],
  ["objective-kit", "createObjectiveKit"],
  ["spatial-room-kit", "createSpatialRoomKit"],
  ["greybox-building-kit", "createGreyboxBuildingKit"],
  ["surface-placement-kit", "createSurfacePlacementKit"],
  ["interaction-target-kit", "createInteractionTargetKit"],
  ["collectible-kit", "createCollectibleKit"],
  ["symbol-alignment-kit", "createSymbolAlignmentKit"],
  ["sorting-kit", "createSortingKit"],
  ["reveal-light-kit", "createRevealLightKit"],
  ["moving-target-kit", "createMovingTargetKit"],
  ["lock-and-socket-kit", "createLockAndSocketKit"],
  ["render-descriptor-kit", "createRenderDescriptorKit"]
];

for (const [kitId, factoryName] of cases) {
  const factory = migrated[factoryName];
  assert.equal(typeof factory, "function", `${factoryName} should be exported`);
  const direct = factory();
  assert.equal(validateRuntimeKit(direct), direct, `${kitId} should be a valid runtime kit`);

  const engine = createEngine();
  const installer = createNexusEngineKitInstaller();
  const installed = await installer.installKit(engine, kitId);
  assert.equal(installed.installed, true, `${kitId}: ${installed.reason}`);
  engine.tick(1 / 60);

  const duplicate = await installer.installKit(engine, kitId);
  assert.equal(duplicate.installed, false, `${kitId} should install idempotently`);
  assert.equal(duplicate.duplicate, true, `${kitId} duplicate should be explicit`);
}

console.log("migrated gameplay kits smoke ok", { kits: cases.length });
