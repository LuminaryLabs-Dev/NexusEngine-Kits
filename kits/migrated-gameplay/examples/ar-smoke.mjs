import { createEngine } from "nexusengine/engine";
import {
  ARExperienceState,
  ARPlacementState,
  createARExperienceKit,
  createARKit
} from "../index.js";

const engine = createEngine({
  kits: [
    createARKit(),
    createARExperienceKit({
      id: "ar-smoke",
      steps: [
        { id: "place", label: "Place", action: "place", target: 1 },
        { id: "tap", label: "Tap", action: "tap", target: 2 }
      ]
    })
  ]
});

engine.ar.detectPlane({ plane: { id: "fallback-plane" } });
engine.ar.placeAnchor({ anchor: { id: "anchor-1" } });
engine.arExperience.action("place");
engine.arExperience.action("tap");
engine.arExperience.action("tap");

const placement = engine.world.getResource(ARPlacementState);
const experience = engine.world.getResource(ARExperienceState);

console.log(JSON.stringify({
  placement: placement.status,
  experience: experience.status,
  completed: experience.completed
}, null, 2));
