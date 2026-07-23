import { ARPlacementState, ARSupportState } from "./ar-kit.js";
import { ARExperienceState } from "./ar-experience-kit.js";
import { CollectibleState } from "./collectible-kit.js";
import { InteractionTargetState } from "./interaction-target-kit.js";
import { ObjectiveFlowState } from "./objective-flow-kit.js";
import { RenderDescriptorState } from "./render-descriptor-kit.js";
import { chooseARMode, classifyARDevice } from "./ar-device.js";
import { createCameraOverlayMode } from "./ar-modes/camera-overlay.js";
import { createFallbackPreviewMode } from "./ar-modes/fallback-preview.js";
import { createPageMarkerMode } from "./ar-modes/page-marker.js";
import { createWebXRPlaneMode } from "./ar-modes/webxr-plane.js";

const modeFactories = {
  "page-marker": createPageMarkerMode,
  "webxr-plane": createWebXRPlaneMode,
  "camera-overlay": createCameraOverlayMode,
  "fallback-preview": createFallbackPreviewMode
};

function currentStep(engine) {
  const state = engine.world.getResource(ObjectiveFlowState) ?? engine.world.getResource(ARExperienceState);
  return state?.steps?.[state.currentStepIndex] ?? null;
}

export async function createARLaunchRuntime(options = {}) {
  const {
    engine,
    root,
    manifest,
    preferredModes = manifest?.preferredModes ?? [],
    render,
    onUpdate
  } = options;

  if (!engine) {
    throw new TypeError("createARLaunchRuntime requires an engine.");
  }

  const device = await classifyARDevice(options.device ?? {});
  const selected = chooseARMode(device, preferredModes);
  const mode = (modeFactories[selected.mode] ?? createFallbackPreviewMode)(options.modeOptions ?? {});
  let activeStream = null;

  engine.world.setResource(ARSupportState, {
    checked: true,
    supported: selected.mode !== "fallback-preview",
    reason: selected.reason,
    mode: selected.mode,
    deviceClass: selected.deviceClass
  });

  function state() {
    return {
      device,
      selectedMode: selected,
      mode,
      support: engine.world.getResource(ARSupportState),
      placement: engine.world.getResource(ARPlacementState),
      experience: engine.world.getResource(ObjectiveFlowState) ?? engine.world.getResource(ARExperienceState),
      objective: engine.world.getResource(ObjectiveFlowState),
      interactions: engine.world.getResource(InteractionTargetState),
      collectibles: engine.world.getResource(CollectibleState),
      renderDescriptors: engine.world.getResource(RenderDescriptorState)
    };
  }

  function paint() {
    render?.(state());
    const video = root?.querySelector?.("[data-ar-camera]");
    if (video && activeStream) {
      video.srcObject = activeStream;
      video.setAttribute("playsinline", "");
      video.muted = true;
      video.play?.().catch?.(() => {});
    }
    onUpdate?.(state());
  }

  const runtime = {
    engine,
    root,
    manifest,
    device,
    selectedMode: selected,
    mode,
    getState: state,
    async start() {
      paint();
      const video = root?.querySelector?.("[data-ar-camera]");
      const overlayRoot = root?.querySelector?.("[data-ar-overlay]") ?? root;
      const result = await mode.start({ engine, root, video, overlayRoot, manifest });
      activeStream = result.stream ?? mode.stream ?? activeStream;
      if (result.ok && selected.mode === "webxr-plane") {
        paint();
        return state();
      }
      paint();
      return state();
    },
    place(payload = {}) {
      if (mode.place) {
        mode.place({ engine, ...payload });
      } else {
        engine.ar.placeAnchor({ anchor: { id: `${manifest?.slug ?? "ar"}-anchor`, mode: selected.mode } });
        engine.arExperience?.action("place");
        engine.objectiveFlow?.action("place");
      }
      paint();
      return state();
    },
    action(action, payload = {}) {
      const step = currentStep(engine);
      const resolvedAction = action ?? step?.action ?? "tap";
      engine.ar.tapObject({ action: resolvedAction, payload });
      if (engine.interactionTargets) {
        engine.interactionTargets.input(resolvedAction, payload);
      } else {
        engine.arExperience?.action(resolvedAction, payload);
        engine.objectiveFlow?.action(resolvedAction, payload);
      }
      paint();
      return state();
    },
    reset() {
      engine.arExperience?.reset();
      engine.objectiveFlow?.reset();
      engine.interactionTargets?.reset?.();
      paint();
      return state();
    },
    async stop() {
      await mode.stop?.();
      return true;
    }
  };

  paint();
  return runtime;
}
