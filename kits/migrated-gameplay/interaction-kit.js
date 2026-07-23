import { defineComponent, defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

function createInteractionRuntimeKit(options = {}, kitId = "interaction-kit") {
  const components = {
    Interactable: defineComponent("interaction-target"),
    Scanner: defineComponent("interaction-scanner"),
    Gatherable: defineComponent("interaction-gatherable"),
    PromptSurface: defineComponent("interaction-prompt-surface")
  };
  const resources = {
    InteractionInput: defineResource("interaction-input"),
    CharacterInteractionInput: defineResource("interaction-input"),
    InteractionState: defineResource("interaction-state"),
    CharacterInteractionState: defineResource("interaction-state"),
    InventoryState: defineResource("interaction-inventory-state"),
    PromptState: defineResource("interaction-prompt-state")
  };
  const events = {
    Scanned: defineEvent("interaction-scanned"),
    Gathered: defineEvent("interaction-gathered"),
    Activated: defineEvent("interaction-activated"),
    PromptChanged: defineEvent("interaction-prompt-changed")
  };

  function interactionSystem(world) {
    const input = world.getResource(resources.InteractionInput) ?? world.getResource(resources.CharacterInteractionInput) ?? {};
    const state = world.getResource(resources.InteractionState) ?? world.getResource(resources.CharacterInteractionState);
    const inventory = world.getResource(resources.InventoryState);
    const promptState = world.getResource(resources.PromptState);
    if (!state || !inventory) return;

    const nextTarget = input.target ?? state.activeTarget ?? null;
    const nextPrompt = input.prompt ?? state.prompt ?? "";
    if (promptState && (promptState.target !== nextTarget || promptState.prompt !== nextPrompt)) {
      promptState.target = nextTarget;
      promptState.prompt = nextPrompt;
      promptState.actions = Array.isArray(input.actions) ? [...input.actions] : [];
      world.emit(events.PromptChanged, { target: nextTarget, prompt: nextPrompt });
    }

    if (input.scan && !state.scanned) {
      state.scanned = true;
      state.lastAction = "scan";
      state.prompt = nextPrompt || "route mapped";
      world.emit(events.Scanned, { target: nextTarget ?? "nearby" });
    }

    if (input.gather && inventory.relicSeeds < inventory.maxRelicSeeds) {
      inventory.relicSeeds += 1;
      state.lastAction = "gather";
      state.prompt = "relic seed secured";
      world.emit(events.Gathered, { item: "relic-seed", count: inventory.relicSeeds });
    }

    if (input.activate) {
      state.activated = true;
      state.lastAction = "activate";
      state.prompt = input.prompt ?? "activated";
      world.emit(events.Activated, { target: nextTarget ?? "active-target" });
    }

    state.activeTarget = nextTarget;
    state.availableActions = Array.isArray(input.actions) ? [...input.actions] : state.availableActions ?? [];
    state.lastPrompt = nextPrompt;
  }

  return defineRuntimeKit({
    id: options.id ?? kitId,
    components,
    resources,
    events,
    systems: [{ phase: "simulate", name: "InteractionSystem", system: interactionSystem }],
    initWorld({ world }) {
      const input = {
        actions: [],
        activate: false,
        gather: false,
        prompt: "",
        scan: false,
        target: null
      };
      const state = {
        activated: false,
        activeTarget: null,
        availableActions: [],
        lastAction: "none",
        lastPrompt: "",
        prompt: "",
        scanned: false
      };

      world.setResource(resources.InteractionInput, input);
      world.setResource(resources.CharacterInteractionInput, input);
      world.setResource(resources.InteractionState, state);
      world.setResource(resources.CharacterInteractionState, state);
      world.setResource(resources.InventoryState, { relicSeeds: 0, maxRelicSeeds: options.maxRelicSeeds ?? 3 });
      world.setResource(resources.PromptState, { actions: [], prompt: "", target: null });
    },
    metadata: { domain: "interaction", reusable: true, promptAware: true }
  });
}

export function createInteractionKit(options = {}) {
  return createInteractionRuntimeKit(options, "interaction-kit");
}

export function createCharacterInteractionKit(options = {}) {
  return createInteractionRuntimeKit(options, "character-interaction-kit");
}
