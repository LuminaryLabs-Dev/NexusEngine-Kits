import { defineComponent, defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export const ARAnchor = defineComponent("ar.anchor");
export const ARPlane = defineComponent("ar.plane");
export const ARReticle = defineComponent("ar.reticle");
export const ARPlacedObject = defineComponent("ar.placedObject");
export const ARInteractionTarget = defineComponent("ar.interactionTarget");
export const ARStepState = defineComponent("ar.stepState");

export const ARSessionState = defineResource("ar.sessionState");
export const ARPlacementState = defineResource("ar.placementState");
export const ARInputState = defineResource("ar.inputState");
export const ARSupportState = defineResource("ar.supportState");

export const ARSessionStarted = defineEvent("ar.sessionStarted");
export const ARSessionFailed = defineEvent("ar.sessionFailed");
export const ARPlaneDetected = defineEvent("ar.planeDetected");
export const ARAnchorPlaced = defineEvent("ar.anchorPlaced");
export const ARObjectTapped = defineEvent("ar.objectTapped");
export const ARStepCompleted = defineEvent("ar.stepCompleted");
export const ARExperienceCompleted = defineEvent("ar.experienceCompleted");

export const arComponents = Object.freeze({
  ARAnchor,
  ARPlane,
  ARReticle,
  ARPlacedObject,
  ARInteractionTarget,
  ARStepState
});

export const arResources = Object.freeze({
  ARSessionState,
  ARPlacementState,
  ARInputState,
  ARSupportState
});

export const arEvents = Object.freeze({
  ARSessionStarted,
  ARSessionFailed,
  ARPlaneDetected,
  ARAnchorPlaced,
  ARObjectTapped,
  ARStepCompleted,
  ARExperienceCompleted
});

function createSessionState(options) {
  return {
    status: "idle",
    mode: options.mode ?? "fallback",
    session: null,
    error: null
  };
}

function createPlacementState() {
  return {
    status: "unplaced",
    anchor: null,
    plane: null,
    lastPose: null
  };
}

function arEventSystem(world) {
  for (const payload of world.readEvents(ARSessionStarted)) {
    const current = world.getResource(ARSessionState) ?? createSessionState({});
    world.setResource(ARSessionState, {
      ...current,
      status: "running",
      mode: payload.mode ?? current.mode,
      session: payload.session ?? current.session,
      error: null
    });
  }

  for (const payload of world.readEvents(ARSessionFailed)) {
    const current = world.getResource(ARSessionState) ?? createSessionState({});
    world.setResource(ARSessionState, {
      ...current,
      status: "failed",
      error: payload.error ?? payload.reason ?? "unknown"
    });
  }

  for (const payload of world.readEvents(ARPlaneDetected)) {
    const current = world.getResource(ARPlacementState) ?? createPlacementState();
    world.setResource(ARPlacementState, {
      ...current,
      status: "surface-found",
      plane: payload.plane ?? current.plane,
      lastPose: payload.pose ?? current.lastPose
    });
  }

  for (const payload of world.readEvents(ARAnchorPlaced)) {
    const current = world.getResource(ARPlacementState) ?? createPlacementState();
    world.setResource(ARPlacementState, {
      ...current,
      status: "placed",
      anchor: payload.anchor ?? current.anchor,
      plane: payload.plane ?? current.plane,
      lastPose: payload.pose ?? current.lastPose
    });
  }
}

export function createARKit(options = {}) {
  return defineRuntimeKit({
    id: options.id ?? "nexus-ar-kit",
    components: arComponents,
    resources: arResources,
    events: arEvents,
    systems: [
      { phase: "simulate", system: arEventSystem, name: "arEventSystem" }
    ],
    initWorld({ world }) {
      world.setResource(ARSessionState, createSessionState(options));
      world.setResource(ARPlacementState, createPlacementState());
      world.setResource(ARInputState, { pointer: null, action: null, target: null });
      world.setResource(ARSupportState, {
        supported: false,
        checked: false,
        reason: "unchecked"
      });
    },
    install({ engine }) {
      engine.ar = {
        components: arComponents,
        resources: arResources,
        events: arEvents,
        startSession(payload = {}) {
          engine.world.emit(ARSessionStarted, payload);
          engine.tick(0);
        },
        failSession(payload = {}) {
          engine.world.emit(ARSessionFailed, payload);
          engine.tick(0);
        },
        detectPlane(payload = {}) {
          engine.world.emit(ARPlaneDetected, payload);
          engine.tick(0);
        },
        placeAnchor(payload = {}) {
          engine.world.emit(ARAnchorPlaced, payload);
          engine.tick(0);
        },
        tapObject(payload = {}) {
          engine.world.emit(ARObjectTapped, payload);
          engine.tick(0);
        }
      };
    },
    metadata: {
      purpose: "WebXR AR session, surface, anchor, and interaction state."
    }
  });
}
