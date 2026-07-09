import { createCompletionLedgerKit } from "../kits/spatial/completion-ledger-kit/index.js";
import { createGenericResourceLoopKit } from "../kits/simulation/generic-resource-loop-kit/index.js";

export const REBUILT_FACTORIES = Object.freeze({
  "completion-ledger-kit": createCompletionLedgerKit,
  "generic-resource-loop-kit": createGenericResourceLoopKit
});

export function getRebuiltKitFactory(kitId) {
  return REBUILT_FACTORIES[kitId] ?? null;
}

export function hasRebuiltKitFactory(kitId) {
  return typeof getRebuiltKitFactory(kitId) === "function";
}
