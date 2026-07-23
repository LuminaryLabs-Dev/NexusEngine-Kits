const IOS_RE = /iPad|iPhone|iPod/;
const ANDROID_RE = /Android/;
const CHROME_RE = /Chrome|CriOS/;

function runtimeGlobals(overrides = {}) {
  return {
    navigator: overrides.navigator ?? globalThis.navigator,
    window: overrides.window ?? globalThis.window,
    location: overrides.location ?? globalThis.location
  };
}

function isSecure({ window, location }) {
  if (window && typeof window.isSecureContext === "boolean") {
    return window.isSecureContext;
  }
  return location?.protocol === "https:" || location?.hostname === "localhost";
}

function userAgent(navigator) {
  return String(navigator?.userAgent ?? "");
}

export async function classifyARDevice(options = {}) {
  const globals = runtimeGlobals(options);
  const ua = userAgent(globals.navigator);
  const secure = isSecure(globals);
  const hasMediaDevices = typeof globals.navigator?.mediaDevices?.getUserMedia === "function";
  const hasWebXR = typeof globals.navigator?.xr?.isSessionSupported === "function";
  const isIOS = IOS_RE.test(ua) || (globals.navigator?.platform === "MacIntel" && globals.navigator?.maxTouchPoints > 1);
  const isAndroid = ANDROID_RE.test(ua);
  const isChrome = CHROME_RE.test(ua);
  const isMobile = isIOS || isAndroid;
  let webxrPlane = false;
  let webxrReason = hasWebXR ? "unchecked" : "webxr_unavailable";

  if (secure && hasWebXR) {
    try {
      webxrPlane = await globals.navigator.xr.isSessionSupported("immersive-ar");
      webxrReason = webxrPlane ? "supported" : "immersive_ar_unsupported";
    } catch (error) {
      webxrReason = "webxr_check_failed";
    }
  } else if (!secure) {
    webxrReason = "insecure_context";
  }

  const cameraOverlay = secure && hasMediaDevices && isMobile;
  const deviceClass = webxrPlane && isAndroid && isChrome
    ? "android-webxr"
    : cameraOverlay && isIOS
      ? "ios-camera"
      : cameraOverlay
        ? "camera-overlay"
        : "desktop-preview";

  return Object.freeze({
    secure,
    deviceClass,
    userAgent: ua,
    supports: Object.freeze({
      "page-marker": cameraOverlay,
      "webxr-plane": webxrPlane,
      "camera-overlay": cameraOverlay,
      "fallback-preview": true
    }),
    reasons: Object.freeze({
      "page-marker": cameraOverlay ? "camera_available" : secure ? "camera_unavailable" : "insecure_context",
      "webxr-plane": webxrReason,
      "camera-overlay": cameraOverlay ? "camera_available" : secure ? "camera_unavailable" : "insecure_context",
      "fallback-preview": "always_available"
    })
  });
}

export function chooseARMode(device, preferredModes = []) {
  const requested = preferredModes.length
    ? preferredModes
    : ["page-marker", "webxr-plane", "camera-overlay", "fallback-preview"];

  const selected = requested.find((mode) => device?.supports?.[mode]) ?? "fallback-preview";
  return Object.freeze({
    mode: selected,
    reason: device?.reasons?.[selected] ?? "selected",
    deviceClass: device?.deviceClass ?? "unknown"
  });
}
