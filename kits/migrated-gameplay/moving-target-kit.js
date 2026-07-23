import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const MovingTargetState = defineResource("movingTarget.state");

export function createMovingTargetKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "moving-target-kit",
    resources: { MovingTargetState },
    initWorld({ world }) {
      world.setResource(MovingTargetState, {
        id: config.id ?? "moving-targets",
        bounds: config.bounds ?? { width: 1, height: 1 },
        speed: Number(config.speed ?? 1),
        targets: config.targets ?? []
      });
    },
    install({ engine }) {
      engine.movingTargets = {
        catch(payload = {}) {
          engine.interactionTargets?.input?.(payload.action ?? "catch", payload);
          return engine.world.getResource(MovingTargetState);
        }
      };
    },
    metadata: { purpose: "Generic moving target behavior." }
  });
}
