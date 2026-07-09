export const KIT_CATALOG = {
  name: "@luminarylabs/nexusengine-kits",
  repository: "LuminaryLabs-Dev/NexusEngine-Kits",
  branch: "main",
  status: "migration-bootstrap",
  promotion: {
    baselineCount: 120,
    approvedAdditionIds: [
      "kit-registry-domain-kit",
      "capability-graph-domain-kit",
      "composition-planning-domain-kit"
    ],
    activeCapability: "kit-registry-domain-kit"
  },
  domains: {
    foundation: ["protokit-core", "seed-kit", "clock-kit", "state-digest-kit", "replay-test-kit", "health-report-kit", "performance-budget-kit"],
    input: ["action-input-kit", "input-context-kit", "input-buffer-kit", "view-rig-kit"],
    spatial: ["spatial-index-kit", "interactable-registry-kit", "spatial-interaction-kit", "hold-action-kit", "completion-ledger-kit"],
    progression: ["objective-bridge-kit", "objective-kit", "mission-phase-kit", "lock-group-kit", "fail-state-kit", "score-summary-kit"],
    "hazard-combat": ["hazard-director-kit", "damage-health-kit", "encounter-director-kit", "light-combat-kit"],
    "economy-resources": ["inventory-kit", "cargo-kit", "currency-kit", "market-kit", "upgrade-kit", "resource-node-kit", "recovery-site-kit", "cargo-transfer-kit"],
    building: ["build-placement-kit", "structure-runtime-kit", "station-interaction-kit"],
    "camera-feedback": ["camera-state-kit", "camera-mode-kit", "camera-collision-kit", "camera-comfort-kit", "camera-sequence-kit", "diegetic-feedback-signal-kit"],
    "render-descriptors": ["render-descriptor-kit", "asset-descriptor-kit", "visual-pipeline-kit", "render-layer-kit", "material-palette-kit", "lighting-descriptor-kit", "sky-atmosphere-kit"],
    aerial: ["aerial-canyon-kits", "aerial-biome-fidelity-kits", "aerial-cel-flight-feel-kits", "aerial-render-bundle-kits", "aerial-ui-interaction-kits", "aerial-patch-window-domain-kit", "canyon-terrain-domain-kit", "flight-corridor-domain-kit", "powered-aerial-flight-domain-kit", "aerial-vegetation-placement-domain-kit", "aerial-procedural-object-domain-kit", "aerial-projectile-system-kit", "aerial-combat-domain-kit", "aerial-encounter-director-kit", "aerial-camera-rig-domain-kit", "aerial-mission-sequence-kit", "environment-kits"],
    xr: ["stereoscopic-render-domain-kit", "hand-input-adapter-kit", "xr-ray-interaction-kit", "webxr-hand-adapter-dsk", "openxr-hand-adapter-dsk", "hand-gesture-dsk", "spatial-scene-graph-dsk", "spatial-scene-graph-kit", "selection-dsk", "selection-domain-service-kit", "transform-dsk", "transform-domain-service-kit", "widget-dsk", "widget-domain-service-kit", "interaction-dsk", "interaction-domain-service-kit", "persistence-dsk", "persistence-domain-service-kit"],
    "rpg-social": ["dialogue-line-domain-kit", "relationship-state-domain-kit", "npc-schedule-domain-kit", "shop-inventory-domain-kit", "quest-thread-domain-kit"],
    "rpg-combat": ["enemy-object-domain-kit", "enemy-agent-domain-kit", "damage-health-domain-kit", "guard-domain-kit", "parry-window-domain-kit", "mana-meter-domain-kit", "status-effect-domain-kit", "vegetation-placement-domain-kit", "route-clearance-domain-kit", "terrain-ground-contact-domain-kit", "world-zone-domain-kit", "interaction-domain-kit"],
    "generic-defense": ["generic-defense-project-kits", "generic-defense-project-bridge", "generic-defense-aaa-dsk-bridge", "generic-defense-dsk-boundaries", "generic-defense-map-dsk", "generic-defense-economy-wallet-dsk", "generic-defense-build-placement-dsk", "generic-defense-wave-agent-director-dsk", "generic-defense-combat-resolver-dsk", "generic-defense-session-facade-dsk", "generic-defense-render-descriptor-dsk", "generic-defense-session-command-kit"],
    "route-extraction": ["generic-route-cargo-extraction-kit"],
    "project-deployment": ["project-batch-deploy-bridge"],
    simulation: ["generic-pressure-loop-kit", "generic-resource-loop-kit", "generic-action-window-kit", "generic-affordance-descriptor-kit"]
  },
  bundles: {
    all: ["foundation", "input", "spatial", "progression", "hazard-combat", "economy-resources", "building", "camera-feedback", "render-descriptors", "aerial", "xr", "rpg-social", "rpg-combat", "generic-defense", "route-extraction", "project-deployment", "simulation"],
    "default-game-stack": ["foundation", "input", "spatial", "progression", "camera-feedback", "render-descriptors"],
    "aerial-game-stack": ["foundation", "input", "spatial", "camera-feedback", "render-descriptors", "aerial"],
    "rpg-game-stack": ["foundation", "input", "spatial", "progression", "hazard-combat", "rpg-social", "rpg-combat"],
    "defense-game-stack": ["foundation", "input", "spatial", "progression", "hazard-combat", "economy-resources", "building", "generic-defense"],
    "xr-authoring-stack": ["foundation", "input", "spatial", "camera-feedback", "render-descriptors", "xr"]
  }
};

const SCAFFOLDED_KIT_IDS = new Set([
  "spatial-interaction-kit",
  "objective-bridge-kit",
  "lock-group-kit",
  "damage-health-kit",
  "resource-node-kit",
  "build-placement-kit",
  "structure-runtime-kit",
  "asset-descriptor-kit",
  "diegetic-feedback-signal-kit"
]);

export const KIT_MANIFEST_OVERRIDES = Object.freeze({
  "completion-ledger-kit": Object.freeze({
    kind: "runtime-kit",
    stability: "candidate",
    realBehavior: true,
    factory: "createCompletionLedgerKit",
    entry: "./kits/spatial/completion-ledger-kit/index.js"
  }),
  "generic-resource-loop-kit": Object.freeze({
    kind: "domain-service-kit",
    stability: "official",
    version: "1.0.0",
    realBehavior: true,
    factory: "createGenericResourceLoopKit",
    entry: "./kits/simulation/generic-resource-loop-kit/index.js",
    domainPath: "n:simulation:resource-meter-service",
    apiName: "resourceMeter",
    sourceProtoKit: "LuminaryLabs-Agents/NexusEngine-ProtoKits@9da1fdb979a878dff8f50565fec4a4952e58af5e/generic-resource-loop-kit",
    provides: [
      "n:simulation:resource-meter-service",
      "resource:loop",
      "resource:meters",
      "resource:meter-service",
      "validation:resources"
    ]
  })
});

export function createNexusEngineKitCatalog() {
  return typeof structuredClone === "function"
    ? structuredClone(KIT_CATALOG)
    : JSON.parse(JSON.stringify(KIT_CATALOG));
}

export function listDomainIds(catalog = KIT_CATALOG) {
  return Object.keys(catalog.domains ?? {});
}

export function listKitIds(catalog = KIT_CATALOG) {
  return Object.values(catalog.domains ?? {}).flat();
}

export function findKitDomain(kitId, catalog = KIT_CATALOG) {
  for (const [domainId, kitIds] of Object.entries(catalog.domains ?? {})) {
    if (kitIds.includes(kitId)) return domainId;
  }
  return null;
}

function pascalCase(value) {
  return String(value)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function factoryNameForKit(kitId) {
  return `create${pascalCase(kitId)}`;
}

export function cdnUrlForKit(kitId, options = {}) {
  const domain = findKitDomain(kitId, options.catalog ?? KIT_CATALOG);
  if (!domain) return null;
  const repo = options.repository ?? KIT_CATALOG.repository;
  const ref = options.ref ?? KIT_CATALOG.branch ?? "main";
  return `https://cdn.jsdelivr.net/gh/${repo}@${ref}/kits/${domain}/${kitId}/index.js`;
}

export function resolveKitManifest(kitId, catalog = KIT_CATALOG) {
  const domain = findKitDomain(kitId, catalog);
  if (!domain) {
    throw new Error(`Unknown NexusEngine kit: ${kitId}`);
  }
  const override = KIT_MANIFEST_OVERRIDES[kitId] ?? {};
  const stability = override.stability ?? (SCAFFOLDED_KIT_IDS.has(kitId) ? "scaffolded" : "migration-placeholder");
  return {
    id: kitId,
    domain,
    kind: override.kind ?? "runtime-kit",
    stability,
    version: override.version,
    realBehavior: Boolean(override.realBehavior),
    factory: override.factory ?? factoryNameForKit(kitId),
    entry: override.entry ?? `./kits/${domain}/${kitId}/index.js`,
    domainPath: override.domainPath,
    apiName: override.apiName,
    sourceProtoKit: override.sourceProtoKit ?? `@luminarylabs/nexusengine-protokits/${kitId}`,
    cdn: { jsdelivr: cdnUrlForKit(kitId, { catalog }) },
    provides: override.provides ?? [`kit:${kitId}`, `domain:${domain}`],
    requires: []
  };
}

export function getKitProgress(catalog = KIT_CATALOG) {
  const additionIds = new Set(catalog.promotion?.approvedAdditionIds ?? []);
  const manifests = listKitIds(catalog).map((kitId) => resolveKitManifest(kitId, catalog));
  const baseline = manifests.filter((manifest) => !additionIds.has(manifest.id));
  const additions = manifests.filter((manifest) => additionIds.has(manifest.id));
  const statuses = {};
  for (const manifest of manifests) {
    statuses[manifest.stability] = (statuses[manifest.stability] ?? 0) + 1;
  }
  const resolvedStatuses = new Set(["official", "deprecated", "archived"]);
  const baselineResolved = baseline.filter((manifest) => resolvedStatuses.has(manifest.stability)).length;
  const additionsResolved = additions.filter((manifest) => resolvedStatuses.has(manifest.stability)).length;
  return {
    baselineTotal: catalog.promotion?.baselineCount ?? baseline.length,
    baselineResolved,
    baselineRemaining: Math.max(0, (catalog.promotion?.baselineCount ?? baseline.length) - baselineResolved),
    official: statuses.official ?? 0,
    candidate: statuses.candidate ?? 0,
    scaffolded: statuses.scaffolded ?? 0,
    placeholder: statuses["migration-placeholder"] ?? 0,
    deprecated: statuses.deprecated ?? 0,
    archived: statuses.archived ?? 0,
    blocked: statuses.blocked ?? 0,
    approvedAdditionsTotal: additionIds.size,
    approvedAdditionsResolved: additionsResolved,
    activeCapability: catalog.promotion?.activeCapability ?? null
  };
}

export function getDomainKitIds(domainId, catalog = KIT_CATALOG) {
  const kitIds = catalog.domains?.[domainId];
  if (!kitIds) throw new Error(`Unknown NexusEngine kit domain: ${domainId}`);
  return kitIds.slice();
}

export function getBundleDomainIds(bundleId, catalog = KIT_CATALOG) {
  const domains = catalog.bundles?.[bundleId];
  if (!domains) throw new Error(`Unknown NexusEngine kit bundle: ${bundleId}`);
  return domains.slice();
}
