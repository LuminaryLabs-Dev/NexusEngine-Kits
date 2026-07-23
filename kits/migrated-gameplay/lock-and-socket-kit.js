import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const LockAndSocketState = defineResource("lockAndSocket.state");

export function createLockAndSocketKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "lock-and-socket-kit",
    resources: { LockAndSocketState },
    initWorld({ world }) {
      world.setResource(LockAndSocketState, {
        id: config.id ?? "lock-and-socket",
        sockets: config.sockets ?? [],
        requiredCount: Number(config.requiredCount ?? config.sockets?.length ?? 1),
        filled: 0,
        unlocked: false
      });
    },
    install({ engine }) {
      engine.lockAndSocket = {
        light(payload = {}) {
          engine.interactionTargets?.input?.(payload.action ?? "light", payload);
          return engine.world.getResource(LockAndSocketState);
        },
        unlock(payload = {}) {
          engine.interactionTargets?.input?.(payload.action ?? "unlock", payload);
          return engine.world.getResource(LockAndSocketState);
        }
      };
    },
    metadata: { purpose: "Generic socket filling and unlock behavior." }
  });
}
