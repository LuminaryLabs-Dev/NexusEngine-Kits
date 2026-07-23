import { createCameraOverlayMode } from "./camera-overlay.js";

export function createPageMarkerMode(options = {}) {
  const cameraMode = createCameraOverlayMode(options);

  return {
    id: "page-marker",
    label: "Printed page marker AR",
    get stream() {
      return cameraMode.stream;
    },
    async start(context = {}) {
      const result = await cameraMode.start(context);
      if (!result.ok) {
        return { ...result, mode: "page-marker" };
      }

      context.engine?.ar?.detectPlane({
        plane: { id: "printed-page-marker", mode: "page-marker", tracking: "page-target" }
      });
      context.engine?.ar?.placeAnchor({
        anchor: { id: "printed-page-anchor", mode: "page-marker", tracking: "page-target" }
      });
      return { ...result, mode: "page-marker" };
    },
    async stop() {
      return cameraMode.stop();
    }
  };
}
