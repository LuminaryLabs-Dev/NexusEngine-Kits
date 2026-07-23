import { defineComponent, defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export function createCompanionCommandKit(options = {}) {
  const components = {
    Companion: defineComponent("companion-agent"),
    CommandTarget: defineComponent("companion-command-target")
  };
  const resources = {
    CompanionInput: defineResource("companion-input"),
    CompanionState: defineResource("companion-state")
  };
  const events = {
    CompanionCommanded: defineEvent("companion-commanded"),
    CompanionArrived: defineEvent("companion-arrived")
  };

  function companionSystem(world) {
    const input = world.getResource(resources.CompanionInput) ?? {};
    const state = world.getResource(resources.CompanionState);
    if (!state) return;

    if (input.command && !state.commanded) {
      state.commanded = true;
      state.target = input.target ?? "assist-node";
      state.progress = 0;
      world.emit(events.CompanionCommanded, { target: state.target });
    }

    if (state.commanded && !state.arrived) {
      state.progress = Math.min(1, state.progress + (world.__nexusClock?.delta ?? 1 / 60) * state.speed);
      if (state.progress >= 1) {
        state.arrived = true;
        world.emit(events.CompanionArrived, { target: state.target });
      }
    }
  }

  return defineRuntimeKit({
    id: options.id ?? "companion-command-kit",
    components,
    resources,
    events,
    systems: [{ phase: "simulate", name: "CompanionCommandSystem", system: companionSystem }],
    initWorld({ world }) {
      world.setResource(resources.CompanionInput, { command: false, target: null });
      world.setResource(resources.CompanionState, {
        commanded: false,
        arrived: false,
        progress: 0,
        speed: options.speed ?? 0.75,
        target: null
      });
    },
    metadata: { domain: "companion", reusable: true }
  });
}
