export function createFallbackPreviewMode() {
  return {
    id: "fallback-preview",
    label: "Desktop fallback preview",
    async start({ engine }) {
      engine.ar.startSession({ mode: "fallback-preview" });
      engine.ar.detectPlane({ plane: { id: "fallback-surface", mode: "fallback-preview" } });
      engine.ar.placeAnchor({ anchor: { id: "fallback-anchor", mode: "fallback-preview" } });
      engine.arExperience?.action("place");
      engine.objectiveFlow?.action("place");
      return { ok: true, mode: "fallback-preview" };
    },
    async stop() {
      return true;
    }
  };
}
