export function createCameraOverlayMode(options = {}) {
  let stream = null;

  return {
    id: "camera-overlay",
    label: "Camera overlay AR",
    get stream() {
      return stream;
    },
    async start({ engine, video } = {}) {
      if (typeof navigator === "undefined" || typeof navigator.mediaDevices?.getUserMedia !== "function") {
        engine?.ar?.failSession({ reason: "camera_unavailable" });
        return { ok: false, mode: "camera-overlay", reason: "camera_unavailable" };
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia(options.constraints ?? {
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "");
          video.muted = true;
          await video.play().catch(() => {});
        }

        engine.ar.startSession({ mode: "camera-overlay", session: stream });
        engine.ar.detectPlane({ plane: { id: "camera-overlay-surface", mode: "camera-overlay" } });
        engine.ar.placeAnchor({ anchor: { id: "camera-overlay-anchor", mode: "camera-overlay" } });
        engine.arExperience?.action("place");
        engine.objectiveFlow?.action("place");
        return { ok: true, mode: "camera-overlay", stream };
      } catch (error) {
        engine?.ar?.failSession({ reason: "camera_request_failed", error });
        return { ok: false, mode: "camera-overlay", reason: "camera_request_failed", error };
      }
    },
    async stop() {
      for (const track of stream?.getTracks?.() ?? []) {
        track.stop();
      }
      stream = null;
      return true;
    }
  };
}
