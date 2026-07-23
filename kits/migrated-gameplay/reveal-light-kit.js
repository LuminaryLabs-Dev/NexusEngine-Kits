import { defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const RevealLightState = defineResource("revealLight.state");

export function createRevealLightKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "reveal-light-kit",
    resources: { RevealLightState },
    initWorld({ world }) {
      world.setResource(RevealLightState, {
        id: config.id ?? "reveal-light",
        revealThreshold: Number(config.revealThreshold ?? 3),
        overexposureLimit: Number(config.overexposureLimit ?? 5),
        pulses: 0,
        overexposure: 0
      });
    },
    install({ engine }) {
      engine.revealLight = {
        pulse(payload = {}) {
          engine.interactionTargets?.input?.(payload.action ?? "pulse", payload);
          return engine.world.getResource(RevealLightState);
        }
      };
    },
    metadata: { purpose: "Generic pulse-to-reveal behavior." }
  });
}
