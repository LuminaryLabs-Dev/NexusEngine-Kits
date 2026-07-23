import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";
import { ARAnchorPlaced, ARPlacementState } from "./ar-kit.js";
import { ObjectiveFlowAction } from "./objective-flow-kit.js";

export const SurfacePlacementConfig = defineResource("surface.placementConfig");

function surfacePlacementSystem(world) {
  for (const payload of world.readEvents(ARAnchorPlaced)) {
    world.emit(ObjectiveFlowAction, { action: "place", payload });
  }
}

export function createSurfacePlacementKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "surface-placement-kit",
    resources: { SurfacePlacementConfig },
    systems: [
      { phase: "resolve", system: surfacePlacementSystem, name: "surfacePlacementSystem" }
    ],
    initWorld({ world }) {
      world.setResource(SurfacePlacementConfig, {
        preferredAnchor: config.preferredAnchor ?? config.sceneRecipe?.placement?.preferredAnchor ?? "center-floor",
        scale: Number(config.scale ?? config.sceneRecipe?.placement?.arScale ?? 1)
      });
    },
    install({ engine }) {
      engine.surfacePlacement = {
        getConfig() {
          return engine.world.getResource(SurfacePlacementConfig);
        },
        getState() {
          return engine.world.getResource(ARPlacementState);
        },
        place(anchor = {}) {
          engine.ar?.placeAnchor?.({ anchor });
          engine.objectiveFlow?.action?.("place", { anchor });
          return engine.world.getResource(ARPlacementState);
        }
      };
    },
    metadata: { purpose: "Generic placement bridge from anchors to objective progress." }
  });
}
