import {
  createHitTestSource,
  endARSession,
  requestARSession
} from "../ar-session.js";

export function createWebXRPlaneMode(options = {}) {
  let session = null;
  let referenceSpace = null;
  let hitTestSource = null;

  return {
    id: "webxr-plane",
    label: "WebXR plane AR",
    get session() {
      return session;
    },
    async start({ engine, overlayRoot } = {}) {
      const result = await requestARSession({
        mode: "immersive-ar",
        requiredFeatures: options.requiredFeatures ?? [],
        optionalFeatures: options.optionalFeatures ?? ["hit-test", "dom-overlay"],
        domOverlayRoot: overlayRoot
      });

      if (!result.ok) {
        engine?.ar?.failSession({ reason: result.support?.reason ?? "webxr_request_failed" });
        return { ok: false, mode: "webxr-plane", reason: result.support?.reason ?? "webxr_request_failed" };
      }

      session = result.session;
      referenceSpace = await session.requestReferenceSpace?.("local").catch(() => null);
      hitTestSource = referenceSpace
        ? await createHitTestSource(session, referenceSpace).catch(() => null)
        : null;

      engine.ar.startSession({ mode: "webxr-plane", session });
      engine.ar.detectPlane({
        plane: { id: "webxr-hit-test-surface", mode: "webxr-plane" },
        pose: null
      });
      return { ok: true, mode: "webxr-plane", session, referenceSpace, hitTestSource };
    },
    place({ engine, pose } = {}) {
      engine?.ar?.placeAnchor({
        anchor: { id: "webxr-anchor", mode: "webxr-plane" },
        pose
      });
      engine?.arExperience?.action("place");
      engine?.objectiveFlow?.action("place");
      return true;
    },
    async stop() {
      hitTestSource?.cancel?.();
      hitTestSource = null;
      referenceSpace = null;
      const ended = await endARSession(session).catch(() => false);
      session = null;
      return ended;
    }
  };
}
