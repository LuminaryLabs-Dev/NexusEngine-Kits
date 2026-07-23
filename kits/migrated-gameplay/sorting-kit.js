import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const SortingState = defineResource("sorting.state");

export function createSortingKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "sorting-kit",
    resources: { SortingState },
    initWorld({ world }) {
      world.setResource(SortingState, {
        id: config.id ?? "sorting",
        zones: config.zones ?? [],
        items: config.items ?? [],
        sorted: 0
      });
    },
    install({ engine }) {
      engine.sorting = {
        sort(payload = {}) {
          engine.interactionTargets?.input?.(payload.action ?? "sort", payload);
          return engine.world.getResource(SortingState);
        }
      };
    },
    metadata: { purpose: "Generic item-to-zone sorting behavior." }
  });
}
