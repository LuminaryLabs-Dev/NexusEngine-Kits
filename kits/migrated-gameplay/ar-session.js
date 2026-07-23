function unsupported(reason, details = {}) {
  return Object.freeze({
    supported: false,
    reason,
    ...details
  });
}

export async function detectARSupport(options = {}) {
  const mode = options.mode ?? "immersive-ar";

  if (typeof navigator === "undefined") {
    return unsupported("navigator_unavailable");
  }

  if (!navigator.xr || typeof navigator.xr.isSessionSupported !== "function") {
    return unsupported("webxr_unavailable");
  }

  try {
    const supported = await navigator.xr.isSessionSupported(mode);
    return Object.freeze({
      supported,
      mode,
      reason: supported ? "supported" : "session_mode_unsupported"
    });
  } catch (error) {
    return unsupported("support_check_failed", { error });
  }
}

export async function requestARSession(options = {}) {
  const mode = options.mode ?? "immersive-ar";
  const sessionInit = {
    requiredFeatures: options.requiredFeatures ?? [],
    optionalFeatures: options.optionalFeatures ?? ["hit-test", "dom-overlay"],
    ...options.sessionInit
  };

  if (sessionInit.optionalFeatures.includes("dom-overlay") && options.domOverlayRoot) {
    sessionInit.domOverlay = { root: options.domOverlayRoot };
  }

  const support = await detectARSupport({ mode });
  if (!support.supported) {
    return Object.freeze({ ok: false, support, session: null });
  }

  try {
    const session = await navigator.xr.requestSession(mode, sessionInit);
    return Object.freeze({ ok: true, support, session });
  } catch (error) {
    return Object.freeze({
      ok: false,
      support: unsupported("request_session_failed", { error }),
      session: null
    });
  }
}

export async function createHitTestSource(session, referenceSpace, options = {}) {
  if (!session || typeof session.requestHitTestSource !== "function") {
    return null;
  }

  const viewerSpace = options.viewerSpace
    ?? (typeof session.requestReferenceSpace === "function"
      ? await session.requestReferenceSpace("viewer").catch(() => null)
      : null);

  if (!viewerSpace) {
    return null;
  }

  return session.requestHitTestSource({ space: viewerSpace, entityTypes: options.entityTypes });
}

export function resolveHitTestPose(frame, hitTestSource, referenceSpace) {
  if (!frame || !hitTestSource || !referenceSpace || typeof frame.getHitTestResults !== "function") {
    return null;
  }

  const results = frame.getHitTestResults(hitTestSource);
  const first = results[0];
  if (!first || typeof first.getPose !== "function") {
    return null;
  }

  const pose = first.getPose(referenceSpace);
  if (!pose) {
    return null;
  }

  return {
    matrix: Array.from(pose.transform.matrix),
    position: {
      x: pose.transform.position.x,
      y: pose.transform.position.y,
      z: pose.transform.position.z
    },
    orientation: {
      x: pose.transform.orientation.x,
      y: pose.transform.orientation.y,
      z: pose.transform.orientation.z,
      w: pose.transform.orientation.w
    }
  };
}

export async function endARSession(session) {
  if (!session || typeof session.end !== "function") {
    return false;
  }

  await session.end();
  return true;
}
