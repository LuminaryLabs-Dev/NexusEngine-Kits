import { defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";
import {
  ARAnchorPlaced,
  ARExperienceCompleted,
  ARObjectTapped,
  ARPlaneDetected,
  ARStepCompleted
} from "./ar-kit.js";

export const ARExperienceState = defineResource("ar.experienceState");
export const ARExperienceAction = defineEvent("ar.experienceAction");
export const ARExperienceReset = defineEvent("ar.experienceReset");

function normalizeSteps(steps = []) {
  return steps.map((step, index) => ({
    id: step.id ?? `step-${index + 1}`,
    label: step.label ?? step.id ?? `Step ${index + 1}`,
    instruction: step.instruction ?? "",
    action: step.action ?? "next",
    target: Number(step.target ?? 1),
    ...step,
    progress: 0,
    complete: false
  }));
}

function initialState(config) {
  const steps = normalizeSteps(config.steps);
  return {
    id: config.id ?? "ar-experience",
    status: "intro",
    currentStepIndex: 0,
    steps,
    completed: false,
    content: config.content ?? {},
    interactions: config.interactions ?? {}
  };
}

function advanceState(state, action) {
  if (!state.steps.length || state.completed) {
    return state;
  }

  const steps = state.steps.map((step) => ({ ...step }));
  const current = steps[state.currentStepIndex];
  const actionName = action?.action ?? action?.type ?? "next";

  if (current.action !== actionName && actionName !== "next") {
    return { ...state, status: "interacting", steps };
  }

  current.progress = Math.min(current.target, Number(current.progress ?? 0) + 1);
  current.complete = current.progress >= current.target;

  if (!current.complete) {
    return { ...state, status: "interacting", steps };
  }

  const nextIndex = state.currentStepIndex + 1;
  if (nextIndex >= steps.length) {
    return {
      ...state,
      status: "complete",
      currentStepIndex: state.currentStepIndex,
      steps,
      completed: true
    };
  }

  return {
    ...state,
    status: "interacting",
    currentStepIndex: nextIndex,
    steps
  };
}

function experienceSystem(world) {
  let state = world.getResource(ARExperienceState);
  if (!state) {
    return;
  }

  const actions = [
    ...world.readEvents(ARExperienceAction),
    ...world.readEvents(ARObjectTapped).map((payload) => ({ action: payload.action ?? "tap", payload }))
  ];

  if (world.readEvents(ARPlaneDetected).length > 0 && state.status === "intro") {
    state = { ...state, status: "surface-found" };
  }

  if (world.readEvents(ARAnchorPlaced).length > 0) {
    state = { ...state, status: "placed" };
  }

  if (world.readEvents(ARExperienceReset).length > 0) {
    state = initialState({ id: state.id, steps: state.steps, content: state.content, interactions: state.interactions });
  }

  for (const action of actions) {
    const previousStep = state.steps[state.currentStepIndex];
    state = advanceState(state, action);
    const currentStep = state.steps[state.currentStepIndex];
    if (previousStep?.complete && previousStep.id !== currentStep?.id) {
      world.emit(ARStepCompleted, { step: previousStep });
    }
  }

  if (state.completed) {
    world.emit(ARExperienceCompleted, { id: state.id });
  }

  world.setResource(ARExperienceState, state);
}

export function createARExperienceKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "ar-experience-kit",
    resources: { ARExperienceState },
    events: { ARExperienceAction, ARExperienceReset },
    systems: [
      { phase: "simulate", system: experienceSystem, name: "arExperienceSystem" }
    ],
    initWorld({ world }) {
      world.setResource(ARExperienceState, initialState(config));
    },
    install({ engine }) {
      engine.arExperience = {
        getState() {
          return engine.world.getResource(ARExperienceState);
        },
        action(action, payload = {}) {
          engine.world.emit(ARExperienceAction, { action, payload });
          engine.tick(0);
          return engine.world.getResource(ARExperienceState);
        },
        reset() {
          engine.world.emit(ARExperienceReset, {});
          engine.tick(0);
          return engine.world.getResource(ARExperienceState);
        },
        complete() {
          const state = engine.world.getResource(ARExperienceState);
          engine.world.setResource(ARExperienceState, { ...state, completed: true, status: "complete" });
          engine.world.emit(ARExperienceCompleted, { id: state.id });
          engine.tick(0);
          return engine.world.getResource(ARExperienceState);
        }
      };
    },
    metadata: {
      purpose: "Multi-step AR experience flow."
    }
  });
}
