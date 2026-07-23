function resolveRoot(root) {
  if (typeof document === "undefined") {
    return null;
  }
  return typeof root === "string" ? document.querySelector(root) : root;
}

function defaultRenderExperience({ manifest, state }) {
  const step = state.steps[state.currentStepIndex] ?? state.steps[0];
  return `
    <div class="nexus-ar-stage" data-status="${state.status}">
      <div class="nexus-ar-plane"></div>
      <div class="nexus-ar-object">${manifest.render?.(state) ?? manifest.preview?.() ?? ""}</div>
      <div class="nexus-ar-caption">${step?.instruction ?? manifest.prompt ?? ""}</div>
    </div>
  `;
}

function defaultRenderImmersive({ manifest, state }) {
  const step = state.experience?.steps?.[state.experience?.currentStepIndex] ?? state.steps?.[state.currentStepIndex] ?? state.steps?.[0];
  const status = state.experience?.status ?? state.status ?? "intro";
  return `
    <div class="nexus-ar-immersive" data-status="${status}">
      <video class="nexus-ar-immersive__camera" data-ar-camera autoplay muted playsinline></video>
      <div class="nexus-ar-immersive__overlay" data-ar-overlay>
        <div class="nexus-ar-immersive__reticle"></div>
        <div class="nexus-ar-immersive__object">${manifest.scene?.(state.experience ?? state) ?? manifest.preview?.() ?? ""}</div>
        <div class="nexus-ar-immersive__hud">
          <strong>${step?.label ?? manifest.title ?? "AR"}</strong>
          <span>${step?.instruction ?? manifest.prompt ?? ""}</span>
        </div>
      </div>
    </div>
  `;
}

export function createARRenderer(options = {}) {
  const root = resolveRoot(options.root);
  const renderExperience = options.renderExperience
    ?? (options.layout === "immersive" ? defaultRenderImmersive : defaultRenderExperience);
  let mounted = null;

  return {
    type: "ar-dom",
    mode: options.mode ?? "fallback",
    get root() {
      return root;
    },
    mount({ manifest, state, onAction }) {
      if (!root) {
        return false;
      }

      mounted = { manifest, state, onAction };
      root.innerHTML = renderExperience({ manifest, state });
      root.querySelectorAll("[data-ar-action]").forEach((button) => {
        button.addEventListener("click", () => {
          onAction?.(button.getAttribute("data-ar-action"), button.dataset);
        });
      });
      return true;
    },
    render(nextState) {
      if (!mounted || !root) {
        return false;
      }
      mounted.state = nextState;
      root.innerHTML = renderExperience(mounted);
      root.querySelectorAll("[data-ar-action]").forEach((button) => {
        button.addEventListener("click", () => {
          mounted.onAction?.(button.getAttribute("data-ar-action"), button.dataset);
        });
      });
      return true;
    },
    dispose() {
      if (root) {
        root.innerHTML = "";
      }
      mounted = null;
    }
  };
}
