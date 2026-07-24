import { createEngine } from "nexusengine/engine";
import {
  ARExperienceState,
  ARPlacementState,
  classifyARDevice,
  createARExperienceKit,
  createARKit,
  createARLaunchRuntime
} from "../index.js";

const manifest = {
  slug: "smoke",
  preferredModes: ["webxr-plane", "camera-overlay", "fallback-preview"],
  steps: [
    { id: "place", label: "Place", action: "place", target: 1 },
    { id: "tap", label: "Tap", action: "tap", target: 1 }
  ]
};

const engine = createEngine({
  kits: [
    createARKit(),
    createARExperienceKit({ id: manifest.slug, steps: manifest.steps })
  ]
});

const runtime = await createARLaunchRuntime({
  engine,
  manifest,
  preferredModes: manifest.preferredModes,
  device: {
    navigator: {},
    window: { isSecureContext: true },
    location: { protocol: "https:", hostname: "example.test" }
  },
  render() {}
});

await runtime.start();
runtime.action("tap");

const mockedAndroid = await classifyARDevice({
  navigator: {
    userAgent: "Mozilla/5.0 Android Chrome",
    xr: { isSessionSupported: async () => true },
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) }
  },
  window: { isSecureContext: true },
  location: { protocol: "https:", hostname: "example.test" }
});

console.log(JSON.stringify({
  fallbackMode: runtime.selectedMode.mode,
  placement: engine.world.getResource(ARPlacementState).status,
  experience: engine.world.getResource(ARExperienceState).status,
  androidClass: mockedAndroid.deviceClass,
  androidWebXR: mockedAndroid.supports["webxr-plane"]
}, null, 2));
