import { defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";
import { ObjectiveFlowAction, ObjectiveFlowReset } from "./objective-flow-kit.js";

export const InteractionTargetState = defineResource("interaction.targetState");
export const InteractionTargetInput = defineEvent("interaction.targetInput");
export const InteractionTargetCompleted = defineEvent("interaction.targetCompleted");

function normalizeTarget(object = {}, index = 0) {
  return {
    id: object.id ?? `target-${index + 1}`,
    group: object.group ?? object.targetGroup ?? "default",
    action: object.interaction?.action ?? object.action ?? "tap",
    requiredCount: Math.max(1, Number(object.interaction?.count ?? object.count ?? 1)),
    progress: 0,
    complete: false,
    transform: object.transform ?? {},
    visual: object.visual ?? {},
    metadata: object.metadata ?? {}
  };
}

function initialState(config = {}) {
  const objects = config.sceneRecipe?.objects ?? config.targets ?? [];
  return {
    id: config.id ?? "interaction-targets",
    targets: objects
      .filter((object) => object.kit === "interaction-target" || object.archetype === "interactive-target" || object.interaction)
      .map(normalizeTarget),
    lastInput: null
  };
}

function interactionTargetSystem(world) {
  let state = world.getResource(InteractionTargetState);
  if (!state) return;

  if (world.readEvents(ObjectiveFlowReset).length > 0) {
    world.setResource(InteractionTargetState, initialState({
      id: state.id,
      targets: state.targets.map((target) => ({
        ...target,
        kit: "interaction-target",
        interaction: { action: target.action, count: target.requiredCount }
      }))
    }));
    return;
  }

  const targets = state.targets.map((target) => ({ ...target }));
  let lastInput = state.lastInput;

  for (const input of world.readEvents(InteractionTargetInput)) {
    lastInput = input;
    const action = input.action ?? "tap";
    const explicitTarget = input.targetId
      ? targets.find((target) => target.id === input.targetId)
      : null;
    const target = explicitTarget ?? targets.find((entry) => !entry.complete && entry.action === action);

    if (target) {
      target.progress = Math.min(target.requiredCount, target.progress + 1);
      target.complete = target.progress >= target.requiredCount;
      if (target.complete) {
        world.emit(InteractionTargetCompleted, { target });
      }
    }

    world.emit(ObjectiveFlowAction, { action, payload: input });
  }

  world.setResource(InteractionTargetState, { ...state, targets, lastInput });
}

export function createInteractionTargetKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "interaction-target-kit",
    resources: { InteractionTargetState },
    events: { InteractionTargetInput, InteractionTargetCompleted },
    systems: [
      { phase: "input", system: interactionTargetSystem, name: "interactionTargetSystem" }
    ],
    initWorld({ world }) {
      world.setResource(InteractionTargetState, initialState(config));
    },
    install({ engine }) {
      engine.interactionTargets = {
        getState() {
          return engine.world.getResource(InteractionTargetState);
        },
        input(action, payload = {}) {
          engine.world.emit(InteractionTargetInput, { action, ...payload });
          engine.tick(0);
          return engine.world.getResource(InteractionTargetState);
        },
        reset() {
          engine.world.emit(ObjectiveFlowReset, {});
          engine.tick(0);
          return engine.world.getResource(InteractionTargetState);
        }
      };
    },
    metadata: { purpose: "Generic interactive targets." }
  });
}
