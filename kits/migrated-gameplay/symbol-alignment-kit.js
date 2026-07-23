import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const SymbolAlignmentState = defineResource("symbolAlignment.state");

export function createSymbolAlignmentKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "symbol-alignment-kit",
    resources: { SymbolAlignmentState },
    initWorld({ world }) {
      world.setResource(SymbolAlignmentState, {
        id: config.id ?? "symbol-alignment",
        toleranceDegrees: Number(config.toleranceDegrees ?? 12),
        aligned: 0,
        target: Number(config.target ?? 3)
      });
    },
    install({ engine }) {
      engine.symbolAlignment = {
        align(payload = {}) {
          engine.interactionTargets?.input?.(payload.action ?? "align", payload);
          return engine.world.getResource(SymbolAlignmentState);
        }
      };
    },
    metadata: { purpose: "Generic symbol alignment behavior." }
  });
}
