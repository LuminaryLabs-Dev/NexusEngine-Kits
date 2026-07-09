import { defineDomainServiceKit, defineEvent, defineResource } from "nexusengine";

export const COMPOSITION_PLANNING_DOMAIN_KIT_VERSION = "1.0.0";

export const manifest = Object.freeze({
  id: "composition-planning-domain-kit",
  domain: "composition-planning",
  domainPath: "n:registry:composition",
  parentDomain: "registry",
  scope: "control-domain",
  extendsBase: "DomainServiceKit",
  composes: ["kit-registry-domain-kit", "capability-graph-domain-kit"],
  requires: ["n:registry:kits", "n:registry:capabilities"],
  provides: ["n:registry:composition", "domain:composition-planning", "domain:install-plan", "domain:dependency-gap-report"],
  ownsLoop: false,
  snapshotPolicy: "serializable",
  resetPolicy: "engine-reset-aware",
  exportPath: "./composition-planning-domain-kit",
  sourcePath: "kits/registry/composition-planning-domain-kit/index.js",
  testPaths: ["tests/registry/registry-control-plane-smoke.mjs"],
  status: "official"
});

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const asList = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = (values) => [...new Set(values)];

function stableId(value, label = "Composition") {
  const id = String(value ?? "").trim();
  if (!id) throw new TypeError(`${label} requires a stable id.`);
  return id;
}

export function normalizeRecipe(input = {}) {
  const id = stableId(input.id ?? input.name, "Composition recipe");
  return {
    id,
    type: String(input.type ?? "stack-domain"),
    goal: String(input.goal ?? id),
    includes: unique(asList(input.includes).map(String)),
    kits: unique(asList(input.kits).map(String)),
    domains: unique(asList(input.domains).map(String)),
    bundles: unique(asList(input.bundles).map(String)),
    requires: unique(asList(input.requires).map(String)),
    provides: unique(asList(input.provides).map(String)),
    allowStatuses: unique(asList(input.allowStatuses ?? ["official"]).map(String)),
    smoke: clone(input.smoke ?? {}),
    metadata: clone(input.metadata ?? {})
  };
}

function createInitialState(config = {}) {
  const recipes = Object.fromEntries(asList(config.recipes).map(normalizeRecipe).map((recipe) => [recipe.id, recipe]));
  return {
    version: COMPOSITION_PLANNING_DOMAIN_KIT_VERSION,
    status: "ready",
    recipes,
    plans: {},
    validations: {},
    missingReports: {},
    revision: 0,
    lastReason: "initialized"
  };
}

function trimRecord(record, limit) {
  const keys = Object.keys(record);
  const overflow = keys.length - Math.max(1, Number(limit));
  for (const key of keys.slice(0, Math.max(0, overflow))) delete record[key];
}

function restoreState(snapshot) {
  if (!snapshot || snapshot.version !== COMPOSITION_PLANNING_DOMAIN_KIT_VERSION || snapshot.status !== "ready") throw new TypeError("Unsupported composition planning snapshot.");
  return {
    ...createInitialState({ recipes: Object.values(snapshot.recipes ?? {}) }),
    plans: clone(snapshot.plans ?? {}),
    validations: clone(snapshot.validations ?? {}),
    missingReports: clone(snapshot.missingReports ?? {}),
    revision: Number(snapshot.revision ?? 0),
    lastReason: String(snapshot.lastReason ?? "initialized")
  };
}

function expandSelection(recipe, registry) {
  const kits = new Set([...recipe.includes, ...recipe.kits]);
  const missing = [];
  const visitedBundles = new Set();

  function includeDomain(domainId) {
    const domain = registry.getDomain(domainId);
    if (!domain) {
      missing.push({ type: "missing-domain", id: domainId });
      return;
    }
    for (const kitId of domain.kits) kits.add(kitId);
  }

  function includeBundle(bundleId) {
    if (visitedBundles.has(bundleId)) return;
    visitedBundles.add(bundleId);
    const bundle = registry.getBundle(bundleId);
    if (!bundle) {
      missing.push({ type: "missing-bundle", id: bundleId });
      return;
    }
    for (const kitId of bundle.kits) kits.add(kitId);
    for (const domainId of bundle.domains) includeDomain(domainId);
  }

  for (const domainId of recipe.domains) includeDomain(domainId);
  for (const bundleId of recipe.bundles) includeBundle(bundleId);
  return { kits: [...kits].sort(), missing };
}

export function createInstallPlan(selection = {}, options = {}) {
  const recipe = normalizeRecipe(selection.id ? selection : { id: options.id ?? "install-plan", ...selection });
  const manifests = asList(options.manifests);
  const byId = Object.fromEntries(manifests.map((manifest) => [manifest.id, manifest]));
  const targets = unique([...recipe.includes, ...recipe.kits]).sort();
  const missing = targets.filter((id) => !byId[id]).map((id) => ({ type: "missing-kit", id }));
  return {
    id: `${recipe.id}:install-plan`,
    recipeId: recipe.id,
    ok: missing.length === 0,
    installOrder: targets.filter((id) => byId[id]),
    missing,
    cycles: [],
    provides: recipe.provides,
    smoke: recipe.smoke
  };
}

export function createCompositionPlanningDomainKit(config = {}) {
  const State = defineResource(config.resourceName ?? "compositionPlanning.state");
  const RecipeRegistered = defineEvent("compositionPlanning.recipeRegistered");
  const Planned = defineEvent("compositionPlanning.planned");
  const Validated = defineEvent("compositionPlanning.validated");
  const SnapshotLoaded = defineEvent("compositionPlanning.snapshotLoaded");
  const Reset = defineEvent("compositionPlanning.reset");

  function createApi(engine, world) {
    const get = () => world.getResource(State) ?? createInitialState(config);
    const set = (state) => (world.setResource(State, state), clone(state));
    const resolveRecipe = (idOrRecipe) => typeof idOrRecipe === "string" ? get().recipes[idOrRecipe] : normalizeRecipe(idOrRecipe);

    const api = {
      registerRecipe(input = {}) {
        const state = get();
        const recipe = normalizeRecipe(input);
        const existing = state.recipes[recipe.id];
        if (existing && JSON.stringify(existing) !== JSON.stringify(recipe)) throw new TypeError(`composition recipe id collision: ${recipe.id}`);
        if (existing) return clone(existing);
        state.recipes[recipe.id] = recipe;
        trimRecord(state.recipes, config.recipeLimit ?? 256);
        state.revision += 1;
        state.lastReason = "recipe-registered";
        set(state);
        world.emit(RecipeRegistered, { recipe: clone(recipe) });
        return clone(recipe);
      },
      planComposition(goal = {}) {
        const recipe = api.registerRecipe(goal);
        return api.createInstallPlan(recipe.id);
      },
      createInstallPlan(idOrRecipe) {
        const recipe = resolveRecipe(idOrRecipe);
        if (!recipe) return null;
        const canonicalRegistry = engine.n?.kitRegistry;
        const graphApi = engine.n?.capabilityGraph ?? engine.capabilityGraph;
        const registry = canonicalRegistry ?? {
          get: (id) => graphApi.getState().nodes[id] ?? null,
          getDomain: () => null,
          getBundle: () => null
        };
        if (canonicalRegistry) graphApi.syncRegistry();
        const expanded = expandSelection(recipe, registry);
        const graph = graphApi.buildGraph();
        const requiredProviders = [];
        const missingRequires = [];
        for (const token of recipe.requires) {
          const providers = graph.indexes.byProvides[token] ?? [];
          if (providers.length) requiredProviders.push([...providers].sort()[0]);
          else if (!graph.externalProvides.includes(token)) missingRequires.push({ type: "missing-require", token });
        }
        const targets = unique([...expanded.kits, ...requiredProviders]).sort();
        const order = graphApi.createInstallOrder(targets);
        const statusRejected = targets.flatMap((id) => {
          const manifest = registry.get(id);
          return canonicalRegistry && manifest && !recipe.allowStatuses.includes(manifest.status)
            ? [{ type: "status-not-allowed", id, status: manifest.status }]
            : [];
        });
        const missing = [...expanded.missing, ...missingRequires, ...order.missing, ...statusRejected];
        const plan = {
          id: `${recipe.id}:install-plan`,
          recipeId: recipe.id,
          ok: missing.length === 0 && order.cycles.length === 0,
          installOrder: order.installOrder,
          requestedKits: targets,
          missing,
          cycles: order.cycles,
          provides: recipe.provides,
          allowStatuses: recipe.allowStatuses,
          smoke: clone(recipe.smoke)
        };
        const state = get();
        state.plans[recipe.id] = plan;
        trimRecord(state.plans, config.planLimit ?? 256);
        state.revision += 1;
        state.lastReason = plan.ok ? "install-plan-ready" : "install-plan-blocked";
        set(state);
        world.emit(Planned, { plan: clone(plan) });
        return clone(plan);
      },
      validateComposition(idOrRecipe) {
        const recipe = resolveRecipe(idOrRecipe);
        if (!recipe) return { ok: false, reason: "missing-recipe" };
        const plan = api.createInstallPlan(recipe.id);
        const report = {
          id: `${recipe.id}:validation`,
          recipeId: recipe.id,
          ok: Boolean(plan?.ok),
          missing: clone(plan?.missing ?? []),
          missingRequires: (plan?.missing ?? []).filter((entry) => entry.type === "missing-require").map((entry) => entry.token),
          missingIncludes: (plan?.missing ?? []).filter((entry) => entry.type === "missing-kit").map((entry) => entry.id),
          cycles: clone(plan?.cycles ?? [])
        };
        const state = get();
        state.validations[recipe.id] = report;
        trimRecord(state.validations, config.validationLimit ?? 256);
        state.revision += 1;
        state.lastReason = report.ok ? "composition-valid" : "composition-invalid";
        set(state);
        world.emit(Validated, { report: clone(report) });
        return clone(report);
      },
      suggestMissingDomains(idOrRecipe) {
        const recipe = resolveRecipe(idOrRecipe);
        if (!recipe) return [];
        const plan = api.createInstallPlan(recipe.id);
        const suggestions = plan.missing.map((entry) => {
          const token = entry.token ?? entry.id;
          return { token, suggestedId: `${String(token).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-domain-kit`, reason: entry.type };
        });
        const state = get();
        state.missingReports[recipe.id] = suggestions;
        trimRecord(state.missingReports, config.reportLimit ?? 256);
        set(state);
        return clone(suggestions);
      },
      scoreComposition(idOrRecipe) {
        const report = api.validateComposition(idOrRecipe);
        const penalty = (report.missing?.length ?? 0) + (report.cycles?.length ?? 0);
        return { ...report, score: Math.max(0, 1 - penalty * 0.25) };
      },
      getState() { return clone(get()); },
      getSnapshot() { return clone(get()); },
      snapshot() { return clone(get()); },
      loadSnapshot(snapshot) {
        const next = restoreState(snapshot);
        set(next);
        world.emit(SnapshotLoaded, { recipeCount: Object.keys(next.recipes).length });
        return clone(next);
      },
      reset(payload = {}) {
        const next = createInitialState({ ...config, ...payload });
        set(next);
        world.emit(Reset, { reason: payload.reason ?? "reset" });
        return clone(next);
      }
    };
    return api;
  }

  return defineDomainServiceKit({
    id: config.kitId ?? config.id ?? "composition-planning-domain-kit",
    domain: "composition-planning",
    domainPath: "n:registry:composition",
    parentDomainPath: "n:registry",
    apiName: "compositionPlanning",
    stability: "official",
    version: COMPOSITION_PLANNING_DOMAIN_KIT_VERSION,
    services: ["recipes", "selection-expansion", "install-plans", "validation", "snapshot"],
    requires: ["n:registry:kits", "n:registry:capabilities"],
    provides: ["domain:composition-planning", "domain:install-plan", "domain:dependency-gap-report"],
    resources: { State },
    events: { RecipeRegistered, Planned, Validated, SnapshotLoaded, Reset },
    initWorld({ world }) { world.setResource(State, createInitialState(config)); },
    createApi({ engine, world }) { return createApi(engine, world); },
    install({ engine }) { engine.compositionPlanning = engine.n.compositionPlanning; },
    bindings: { State },
    metadata: {
      status: "official",
      parentDomain: "registry",
      scope: "control-domain",
      ownsLoop: false,
      boundary: "Owns deterministic install-plan data and validation. It does not fetch registries, import modules, install kits, mutate files, render, or own child behavior."
    }
  });
}

export default createCompositionPlanningDomainKit;
