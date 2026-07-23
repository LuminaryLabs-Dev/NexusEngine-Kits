import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const RenderDescriptorState = defineResource("render.descriptorState");

function byId(items = []) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export function createRenderDescriptorSnapshot(config = {}) {
  const building = config.buildingDataset ?? null;
  const scene = config.sceneRecipe ?? null;
  const visual = config.visualDataset ?? {};
  return {
    id: config.id ?? scene?.id ?? "render-descriptors",
    building,
    scene,
    visual,
    rooms: building?.rooms ?? [],
    props: building?.props ?? [],
    objects: scene?.objects ?? [],
    materials: byId(visual.materials),
    effects: byId(visual.effects),
    palette: visual.palette ?? {}
  };
}

export function createRenderDescriptorKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "render-descriptor-kit",
    resources: { RenderDescriptorState },
    initWorld({ world }) {
      world.setResource(RenderDescriptorState, createRenderDescriptorSnapshot(config));
    },
    install({ engine }) {
      engine.renderDescriptors = {
        getState() {
          return engine.world.getResource(RenderDescriptorState);
        },
        setSnapshot(snapshot) {
          engine.world.setResource(RenderDescriptorState, snapshot);
          return snapshot;
        }
      };
    },
    metadata: { purpose: "Generic render descriptors for rooms and interactive objects." }
  });
}
