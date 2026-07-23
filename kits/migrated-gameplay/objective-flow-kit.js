import { defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const ObjectiveFlowState = defineResource("objective.flowState");
export const ObjectiveFlowAction = defineEvent("objective.flowAction");
export const ObjectiveFlowReset = defineEvent("objective.flowReset");
export const ObjectiveFlowCompleted = defineEvent("objective.flowCompleted");
export const ObjectiveStepCompleted = defineEvent("objective.stepCompleted");

function normalizeStep(step = {}, index = 0) {
  return {
    id: step.id ?? `step-${index + 1}`,
    label: step.label ?? step.id ?? `Step ${index + 1}`,
    instruction: step.instruction ?? "",
    requiredAction: step.requiredAction ?? step.action ?? "next",
    target: Math.max(1, Number(step.target ?? 1)),
    timeoutSeconds: Number(step.timeoutSeconds ?? 0),
    sequenceRequired: step.sequenceRequired === true,
    progress: 0,
    complete: false,
    ...step
  };
}

function createState(config = {}) {
  const dataset = config.objectiveDataset ?? config;
  return {
    id: dataset.id ?? config.id ?? "objective-flow",
    status: "intro",
    durationSeconds: Number(dataset.durationSeconds ?? 300),
    startedAt: null,
    currentStepIndex: 0,
    steps: (dataset.steps ?? config.steps ?? []).map(normalizeStep),
    completion: dataset.completion ?? {},
    completed: false,
    failed: false,
    lastAction: null
  };
}

function applyAction(state, action) {
  if (state.completed || state.failed || state.steps.length === 0) {
    return state;
  }

  const actionName = action?.action ?? action?.type ?? "next";
  const steps = state.steps.map((step) => ({ ...step }));
  const current = steps[state.currentStepIndex];

  if (current.requiredAction !== actionName && actionName !== "next") {
    return { ...state, status: "interacting", steps, lastAction: actionName };
  }

  current.progress = Math.min(current.target, Number(current.progress ?? 0) + 1);
  current.complete = current.progress >= current.target;

  if (!current.complete) {
    return { ...state, status: "interacting", steps, lastAction: actionName };
  }

  const nextIndex = state.currentStepIndex + 1;
  if (nextIndex >= steps.length) {
    return {
      ...state,
      status: "complete",
      steps,
      completed: true,
      lastAction: actionName
    };
  }

  return {
    ...state,
    status: "interacting",
    currentStepIndex: nextIndex,
    steps,
    lastAction: actionName
  };
}

function objectiveFlowSystem(world) {
  let state = world.getResource(ObjectiveFlowState);
  if (!state) return;

  if (world.readEvents(ObjectiveFlowReset).length > 0) {
    const previous = world.getResource(ObjectiveFlowState);
    state = createState(previous);
  }

  for (const action of world.readEvents(ObjectiveFlowAction)) {
    const previousStep = state.steps[state.currentStepIndex];
    state = applyAction(state, action);
    const nextStep = state.steps[state.currentStepIndex];
    if (previousStep && previousStep.complete && previousStep.id !== nextStep?.id) {
      world.emit(ObjectiveStepCompleted, { step: previousStep, flow: state.id });
    }
  }

  if (state.completed) {
    world.emit(ObjectiveFlowCompleted, {
      id: state.id,
      completion: state.completion,
      collectibleId: state.completion?.collectibleId
    });
  }

  world.setResource(ObjectiveFlowState, state);
}

export function createObjectiveFlowKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "objective-flow-kit",
    resources: { ObjectiveFlowState },
    events: { ObjectiveFlowAction, ObjectiveFlowReset, ObjectiveFlowCompleted, ObjectiveStepCompleted },
    systems: [
      { phase: "simulate", system: objectiveFlowSystem, name: "objectiveFlowSystem" }
    ],
    initWorld({ world }) {
      world.setResource(ObjectiveFlowState, createState(config));
    },
    install({ engine }) {
      engine.objectiveFlow = {
        getState() {
          return engine.world.getResource(ObjectiveFlowState);
        },
        action(action, payload = {}) {
          engine.world.emit(ObjectiveFlowAction, { action, payload });
          engine.tick(0);
          return engine.world.getResource(ObjectiveFlowState);
        },
        reset() {
          engine.world.emit(ObjectiveFlowReset, {});
          engine.tick(0);
          return engine.world.getResource(ObjectiveFlowState);
        },
        complete(payload = {}) {
          const state = engine.world.getResource(ObjectiveFlowState);
          const next = { ...state, completed: true, status: "complete" };
          engine.world.setResource(ObjectiveFlowState, next);
          engine.world.emit(ObjectiveFlowCompleted, {
            id: state.id,
            completion: state.completion,
            collectibleId: payload.collectibleId ?? state.completion?.collectibleId
          });
          engine.tick(0);
          return engine.world.getResource(ObjectiveFlowState);
        }
      };
    },
    metadata: { purpose: "Generic objective progression." }
  });
}
