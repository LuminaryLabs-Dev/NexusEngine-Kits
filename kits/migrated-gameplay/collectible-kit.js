import { defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";
import { ObjectiveFlowCompleted } from "./objective-flow-kit.js";

export const CollectibleState = defineResource("collectible.state");
export const CollectibleClaimed = defineEvent("collectible.claimed");

function initialState(config = {}) {
  const dataset = config.rewardDataset ?? config;
  const persisted = readPersisted(dataset.storageKey);
  return {
    id: dataset.id ?? "collectibles",
    storageKey: dataset.storageKey ?? "",
    rewards: dataset.rewards ?? [],
    collected: Array.from(new Set([...(dataset.collected ?? []), ...persisted])),
    finaleRequirement: dataset.finaleRequirement ?? null
  };
}

function readPersisted(storageKey) {
  if (!storageKey || typeof globalThis.localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writePersisted(storageKey, collected) {
  if (!storageKey || typeof globalThis.localStorage === "undefined") return;
  try {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set(collected))));
  } catch {
    // Persistence is best effort because headless and private-browser contexts can reject storage.
  }
}

function collectibleSystem(world) {
  let state = world.getResource(CollectibleState);
  if (!state) return;

  const collected = new Set(state.collected);
  for (const completion of world.readEvents(ObjectiveFlowCompleted)) {
    const id = completion.collectibleId ?? completion.completion?.collectibleId;
    if (id) {
      collected.add(id);
      world.emit(CollectibleClaimed, { id });
    }
  }

  const next = { ...state, collected: Array.from(collected) };
  writePersisted(next.storageKey, next.collected);
  world.setResource(CollectibleState, next);
}

export function createCollectibleKit(config = {}) {
  return defineRuntimeKit({
    id: config.id ?? "collectible-kit",
    resources: { CollectibleState },
    events: { CollectibleClaimed },
    systems: [
      { phase: "cleanup", system: collectibleSystem, name: "collectibleSystem" }
    ],
    initWorld({ world }) {
      world.setResource(CollectibleState, initialState(config));
    },
    install({ engine }) {
      engine.collectibles = {
        getState() {
          return engine.world.getResource(CollectibleState);
        },
        claim(id) {
          const state = engine.world.getResource(CollectibleState);
          const collected = Array.from(new Set([...(state.collected ?? []), id].filter(Boolean)));
          writePersisted(state.storageKey, collected);
          engine.world.setResource(CollectibleState, { ...state, collected });
          engine.world.emit(CollectibleClaimed, { id });
          engine.tick(0);
          return engine.world.getResource(CollectibleState);
        }
      };
    },
    metadata: { purpose: "Generic collectible and reward state." }
  });
}
