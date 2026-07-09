import {
  KIT_CATALOG,
  NEXUSENGINE_REPOSITORY_REGISTRY,
  getBundleDomainIds,
  getDomainKitIds
} from "./kit-catalog.js";
import { loadKitFactory } from "./kit-manifest-loader.js";
import { KIT_FACTORY_REGISTRY } from "./rebuilt-factories.js";
import { createInstallPlan } from "../registry/composition.js";
import { createInstallPlanFromLockfile } from "../registry/lockfile.js";
import { assertRegistryTrust, createRepositoryRegistry } from "../registry/repository-registry.js";

function installIntoEngine(engine, kit, options = {}) {
  if (!engine || typeof engine !== "object") throw new TypeError("installIntoEngine expects a NexusEngine engine object.");
  if (!engine.__nexusEngineKitsInstalled) engine.__nexusEngineKitsInstalled = new Set();
  if (kit.id && engine.__nexusEngineKitsInstalled.has(kit.id) && options.allowDuplicateKitIds !== true) {
    return { kit, installed: false, duplicate: true };
  }
  const installed = typeof engine.installKit === "function" ? engine.installKit(kit, options) : fallbackInstall(engine, kit);
  if (kit.id) engine.__nexusEngineKitsInstalled.add(kit.id);
  return { kit: installed ?? kit, installed: true, duplicate: false };
}

function fallbackInstall(engine, kit) {
  if (!Array.isArray(engine.kits)) engine.kits = [];
  engine.kits.push(kit);
  if (typeof kit.initWorld === "function") kit.initWorld({ engine, world: engine.world ?? {}, kit, options: {} });
  if (typeof kit.install === "function") kit.install({ engine, world: engine.world ?? {}, kit, options: {} });
  return kit;
}

function issueMessage(issue) {
  if (issue.type === "status-not-allowed") return `${issue.id} has status ${issue.status}`;
  if (issue.type === "unresolved-runtime") return `${issue.id} has no validated runtime behavior`;
  if (issue.type === "missing-require") return `${issue.id} is missing provider ${issue.token}`;
  return `${issue.type}: ${issue.id ?? issue.token ?? "unknown"}`;
}

export function createNexusEngineKitInstaller(options = {}) {
  const catalog = options.catalog ?? KIT_CATALOG;
  const registry = createRepositoryRegistry(options.registry ?? NEXUSENGINE_REPOSITORY_REGISTRY);
  assertRegistryTrust(registry, { ...options, allowLocalTemplate: options.registry == null });
  const allowedStatuses = [...new Set(options.allowStatuses ?? ["official"])];
  const manifestById = new Map(registry.kits.map((manifest) => [manifest.id, manifest]));
  const factoryRegistry = options.factoryRegistry ?? KIT_FACTORY_REGISTRY;

  function resolveManifest(kitId) {
    const manifest = manifestById.get(String(kitId));
    if (!manifest) throw new Error(`Unknown NexusEngine kit: ${kitId}`);
    return manifest;
  }

  async function createKit(kitId, config = {}) {
    const manifest = resolveManifest(kitId);
    if (!allowedStatuses.includes(manifest.status)) {
      throw new TypeError(`NexusEngine kit ${kitId} has unready status ${manifest.status}; allowed statuses: ${allowedStatuses.join(", ")}.`);
    }
    if (!manifest.realBehavior) throw new TypeError(`NexusEngine kit ${kitId} has no validated runtime behavior.`);
    const factory = await loadKitFactory(manifest, { ...options, factoryRegistry });
    const kit = factory(config);
    if (!kit || typeof kit !== "object") throw new TypeError(`NexusEngine kit factory ${manifest.factory} returned no runtime kit.`);
    return kit;
  }

  function plan(engine, selection) {
    if (options.lockfile) {
      return createInstallPlanFromLockfile(options.lockfile, registry, { engine, allowStatuses: allowedStatuses });
    }
    return createInstallPlan(selection, { registry, engine, allowStatuses: allowedStatuses, coreProvides: options.coreProvides });
  }

  async function installSelection(engine, selection, config = {}) {
    let installPlan;
    try {
      installPlan = plan(engine, selection);
    } catch (error) {
      return {
        ok: false,
        registryId: registry.id,
        resolvedCommit: registry.resolvedCommit,
        selection,
        plan: null,
        resolvedSources: [],
        installed: [],
        skipped: [],
        warnings: [],
        errors: [{ type: "plan-error", message: error.message }],
        coreDependencies: []
      };
    }

    const report = {
      ok: installPlan.ok,
      registryId: registry.id,
      resolvedCommit: registry.resolvedCommit,
      selection: installPlan.selection,
      plan: installPlan,
      resolvedSources: installPlan.resolvedSources,
      installed: [],
      skipped: installPlan.skipped.map((issue) => ({
        id: issue.id,
        manifest: manifestById.get(issue.id) ?? null,
        kit: null,
        installed: false,
        duplicate: false,
        skipped: true,
        reason: issue.type,
        context: issue.context ?? null
      })),
      warnings: [...installPlan.warnings],
      errors: [...installPlan.missing, ...installPlan.rejected, ...installPlan.cycles].map((issue) => ({ ...issue, message: issueMessage(issue) })),
      coreDependencies: [...installPlan.coreDependencies]
    };
    if (!installPlan.ok) return report;

    for (const kitId of installPlan.installOrder) {
      const manifest = resolveManifest(kitId);
      try {
        const kitConfig = config[kitId] ?? config;
        const kit = await createKit(kitId, kitConfig);
        const result = installIntoEngine(engine, kit, options);
        const record = { id: kitId, manifest, ...result };
        if (result.duplicate) report.skipped.push({ ...record, reason: "duplicate-kit" });
        else report.installed.push(record);
      } catch (error) {
        report.errors.push({ type: "installation-error", id: kitId, message: error.message });
        report.ok = false;
        break;
      }
    }
    return report;
  }

  async function installKit(engine, kitOrId, config = {}) {
    if (typeof kitOrId !== "string") {
      const result = installIntoEngine(engine, kitOrId, options);
      return { ...result, skipped: result.duplicate, reason: result.duplicate ? "duplicate-kit" : null, report: null };
    }
    const report = await installSelection(engine, { kits: [kitOrId] }, { [kitOrId]: config });
    const installed = report.installed.find((entry) => entry.id === kitOrId);
    const skipped = report.skipped.find((entry) => entry.id === kitOrId);
    const rejected = report.plan?.rejected.find((entry) => entry.id === kitOrId);
    return installed
      ? { ...installed, skipped: false, reason: null, report }
      : skipped
        ? { ...skipped, installed: false, skipped: true, report }
        : {
            kit: null,
            manifest: manifestById.get(kitOrId) ?? null,
            installed: false,
            duplicate: false,
            skipped: true,
            reason: rejected?.type ?? report.errors[0]?.type ?? "installation-failed",
            report
          };
  }

  async function installDomain(engine, domainId, config = {}) {
    const report = await installSelection(engine, { domains: [domainId] }, config);
    return { domainId, results: [...report.installed, ...report.skipped], report };
  }

  async function installBundle(engine, bundleId, config = {}) {
    const report = await installSelection(engine, { bundles: [bundleId] }, config);
    return { bundleId, results: [...report.installed, ...report.skipped], report };
  }

  async function installAll(engine, config = {}) {
    return installBundle(engine, "all", config);
  }

  return {
    catalog,
    registry,
    allowedStatuses,
    createKit,
    createInstallPlan(engine, selection) { return plan(engine, selection); },
    installSelection,
    installKit,
    installDomain,
    installBundle,
    installAll,
    resolveKit: resolveManifest,
    createPlaceholderKit() {
      throw new TypeError("Placeholder runtime creation is disabled; promote validated behavior or use ProtoKits.");
    },
    getDomainKitIds(domainId) { return getDomainKitIds(domainId, catalog); },
    getBundleDomainIds(bundleId) { return getBundleDomainIds(bundleId, catalog); }
  };
}
