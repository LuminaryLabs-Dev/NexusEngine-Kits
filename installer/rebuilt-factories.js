import { GENERATED_KIT_FACTORIES } from "./generated-factories.js";

export const KIT_FACTORY_REGISTRY = GENERATED_KIT_FACTORIES;
export const REBUILT_FACTORIES = KIT_FACTORY_REGISTRY;

export function getKitFactory(kitId) {
  return KIT_FACTORY_REGISTRY[kitId] ?? null;
}

export const getRebuiltKitFactory = getKitFactory;

export function hasKitFactory(kitId) {
  return typeof getKitFactory(kitId) === "function";
}

export const hasRebuiltKitFactory = hasKitFactory;
