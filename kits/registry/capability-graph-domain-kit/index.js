import { defineDomainServiceKit, defineEvent, defineResource } from "nexusengine";

export const CAPABILITY_GRAPH_DOMAIN_KIT_VERSION = "1.0.0";

export const manifest = Object.freeze({
  id: "capability-graph-domain-kit",
  domain: "capability-graph",
  domainPath: "n:registry:capabilities",
  parentDomain: "registry",
  scope: "control-domain",
  extendsBase: "DomainServiceKit",
  composes: ["kit-registry-domain-kit"],
  requires: ["n:registry:kits"],
  provides: ["n:registry:capabilities", "domain:capability-graph", "domain:dependency-graph"],
  ownsLoop: false,
  snapshotPolicy: "serializable",
  resetPolicy: "engine-reset-aware",
  exportPath: "./capability-graph-domain-kit",
  sourcePath: "kits/registry/capability-graph-domain-kit/index.js",
  testPaths: ["tests/registry/registry-control-plane-smoke.mjs"],
  status: "official"
});

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const asList = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = (values) => [...new Set(values)];

function stableId(value, label = "Capability") {
  const id = String(value ?? "").trim();
  if (!id) throw new TypeError(`${label} requires a stable id.`);
  return id;
}

export function normalizeCapability(input = {}) {
  const id = stableId(input.id ?? input.name, "Capability manifest");
  return {
    id,
    domain: String(input.domain ?? id.replace(/-(domain-)?kit$/, "")),
    domainPath: String(input.domainPath ?? `n:${String(input.domain ?? id.replace(/-(domain-)?kit$/, "")).replace(/[^a-z0-9:.-]+/gi, "-").toLowerCase()}`),
    apiName: input.apiName == null ? null : String(input.apiName),
    scope: String(input.scope ?? "feature-domain"),
    kind: String(input.kind ?? input.type ?? "domain-service-kit"),
    requires: unique(asList(input.requires).map(String)),
    provides: unique(asList(input.provides).map(String)),
    composes: unique(asList(input.composes ?? input.children).map(String)),
    status: String(input.status ?? input.stability ?? "experimental"),
    source: clone(input.source ?? {}),
    metadata: clone(input.metadata ?? {})
  };
}

function createInitialState(config = {}) {
  const nodes = Object.fromEntries(asList(config.manifests ?? config.nodes).map(normalizeCapability).map((node) => [node.id, node]));
  return {
    version: CAPABILITY_GRAPH_DOMAIN_KIT_VERSION,
    status: "ready",
    nodes,
    externalProvides: unique(asList(config.externalProvides).map(String)),
    edges: [],
    indexes: { byProvides: {}, byRequires: {}, byDomain: {}, byDomainPath: {}, byApiName: {} },
    missing: [],
    cycles: [],
    missingReports: [],
    clusters: [],
    revision: 0,
    lastReason: "initialized"
  };
}

function buildIndexes(nodes = {}) {
  const indexes = { byProvides: {}, byRequires: {}, byDomain: {}, byDomainPath: {}, byApiName: {} };
  for (const node of Object.values(nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    indexes.byDomain[node.domain] = [...(indexes.byDomain[node.domain] ?? []), node.id];
    indexes.byDomainPath[node.domainPath] = node.id;
    if (node.apiName) indexes.byApiName[node.apiName] = node.id;
    for (const token of node.provides) indexes.byProvides[token] = [...(indexes.byProvides[token] ?? []), node.id];
    for (const token of node.requires) indexes.byRequires[token] = [...(indexes.byRequires[token] ?? []), node.id];
  }
  return indexes;
}

function dependencyEdges(nodes, indexes, externalProvides) {
  const external = new Set(externalProvides);
  const edges = [];
  const missing = [];
  for (const node of Object.values(nodes).sort((a, b) => a.id.localeCompare(b.id))) {
    for (const token of node.requires) {
      const providers = indexes.byProvides[token] ?? [];
      if (providers.length) {
        for (const providerId of providers) edges.push({ from: providerId, to: node.id, token, type: "provides-requires" });
      } else if (!external.has(token)) {
        const edge = { from: null, to: node.id, token, type: "missing-require" };
        edges.push(edge);
        missing.push(edge);
      }
    }
    for (const composedId of node.composes) {
      if (nodes[composedId]) edges.push({ from: composedId, to: node.id, token: composedId, type: "composes" });
      else {
        const edge = { from: null, to: node.id, token: composedId, type: "missing-compose" };
        edges.push(edge);
        missing.push(edge);
      }
    }
  }
  return { edges, missing };
}

function canonicalCycle(path) {
  const body = path.slice(0, -1);
  const rotations = body.map((_, index) => [...body.slice(index), ...body.slice(0, index)]);
  rotations.sort((a, b) => a.join("\0").localeCompare(b.join("\0")));
  return [...rotations[0], rotations[0][0]];
}

function findCycles(nodes, edges) {
  const adjacency = Object.fromEntries(Object.keys(nodes).map((id) => [id, []]));
  for (const edge of edges) if (edge.from && edge.to) adjacency[edge.from].push(edge.to);
  for (const values of Object.values(adjacency)) values.sort();
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = new Map();
  function visit(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      const cycle = canonicalCycle([...stack.slice(start), id]);
      cycles.set(cycle.join("->"), cycle);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const next of adjacency[id] ?? []) visit(next);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of Object.keys(nodes).sort()) visit(id);
  return [...cycles.values()];
}

export function createCapabilityGraph(manifests = [], options = {}) {
  const nodes = Object.fromEntries(asList(manifests).map(normalizeCapability).map((node) => [node.id, node]));
  const indexes = buildIndexes(nodes);
  const { edges, missing } = dependencyEdges(nodes, indexes, unique(asList(options.externalProvides).map(String)));
  const cycles = findCycles(nodes, edges);
  return { nodes, indexes, edges, missing, cycles };
}

function topologicalOrder(graph, selectedIds = Object.keys(graph.nodes)) {
  const selected = new Set(selectedIds);
  const dependencies = Object.fromEntries([...selected].map((id) => [id, new Set()]));
  for (const edge of graph.edges) {
    if (edge.from && selected.has(edge.from) && selected.has(edge.to)) dependencies[edge.to].add(edge.from);
  }
  const order = [];
  const remaining = new Set(selected);
  while (remaining.size) {
    const ready = [...remaining].filter((id) => [...dependencies[id]].every((dependency) => !remaining.has(dependency))).sort();
    if (!ready.length) return { ok: false, order, cycles: graph.cycles };
    for (const id of ready) {
      order.push(id);
      remaining.delete(id);
    }
  }
  return { ok: true, order, cycles: [] };
}

function resolveTargets(graph, targetIds) {
  const selected = new Set();
  const missing = [];
  function include(id, chain = []) {
    if (selected.has(id)) return;
    const node = graph.nodes[id];
    if (!node) {
      missing.push({ id, chain, type: "missing-kit" });
      return;
    }
    selected.add(id);
    for (const token of node.requires) {
      const providers = graph.indexes.byProvides[token] ?? [];
      if (providers.length) include([...providers].sort()[0], [...chain, id]);
      else if (graph.missing.some((entry) => entry.to === id && entry.token === token)) missing.push({ id, token, chain, type: "missing-require" });
    }
    for (const childId of node.composes) include(childId, [...chain, id]);
  }
  for (const id of unique(asList(targetIds).map(String)).sort()) include(id);
  return { selected: [...selected], missing };
}

function restoreState(snapshot) {
  if (!snapshot || snapshot.version !== CAPABILITY_GRAPH_DOMAIN_KIT_VERSION || snapshot.status !== "ready") throw new TypeError("Unsupported capability graph snapshot.");
  const state = createInitialState({ manifests: Object.values(snapshot.nodes ?? {}), externalProvides: snapshot.externalProvides });
  state.missingReports = clone(snapshot.missingReports ?? []);
  state.clusters = clone(snapshot.clusters ?? []);
  state.revision = Number(snapshot.revision ?? 0);
  state.lastReason = String(snapshot.lastReason ?? state.lastReason);
  const graph = createCapabilityGraph(Object.values(state.nodes), { externalProvides: state.externalProvides });
  return { ...state, ...graph };
}

export function createCapabilityGraphDomainKit(config = {}) {
  const State = defineResource(config.resourceName ?? "capabilityGraph.state");
  const NodeRegistered = defineEvent("capabilityGraph.nodeRegistered");
  const NodeRemoved = defineEvent("capabilityGraph.nodeRemoved");
  const GraphBuilt = defineEvent("capabilityGraph.built");
  const ClusterFound = defineEvent("capabilityGraph.clusterFound");
  const SnapshotLoaded = defineEvent("capabilityGraph.snapshotLoaded");
  const Reset = defineEvent("capabilityGraph.reset");

  function rebuild(state, reason = "graph-built") {
    const graph = createCapabilityGraph(Object.values(state.nodes), { externalProvides: state.externalProvides });
    return { ...state, ...graph, revision: state.revision + 1, lastReason: reason };
  }

  function createApi(engine, world) {
    const get = () => world.getResource(State) ?? createInitialState(config);
    const set = (state) => (world.setResource(State, state), clone(state));
    const api = {
      registerDomain(input = {}) {
        const state = get();
        const node = normalizeCapability(input);
        const existingPath = Object.values(state.nodes).find((entry) => entry.domainPath === node.domainPath && entry.id !== node.id);
        const existingApi = node.apiName && Object.values(state.nodes).find((entry) => entry.apiName === node.apiName && entry.id !== node.id);
        if (existingPath) throw new TypeError(`domain path collision: ${node.domainPath}`);
        if (existingApi) throw new TypeError(`api name collision: ${node.apiName}`);
        if (state.nodes[node.id] && JSON.stringify(state.nodes[node.id]) !== JSON.stringify(node)) throw new TypeError(`capability id collision: ${node.id}`);
        if (state.nodes[node.id]) return clone(state.nodes[node.id]);
        state.nodes[node.id] = node;
        set(rebuild(state, "node-registered"));
        world.emit(NodeRegistered, { node: clone(node) });
        return clone(node);
      },
      registerManifest(input) { return api.registerDomain(input); },
      registerMany(inputs = []) {
        const state = get();
        const nodes = asList(inputs).map(normalizeCapability);
        const nextNodes = { ...state.nodes };
        const pathOwners = new Map(Object.values(nextNodes).map((node) => [node.domainPath, node.id]));
        const apiOwners = new Map(Object.values(nextNodes).filter((node) => node.apiName).map((node) => [node.apiName, node.id]));
        const added = [];
        for (const node of nodes) {
          const existing = nextNodes[node.id];
          if (existing && JSON.stringify(existing) !== JSON.stringify(node)) throw new TypeError(`capability id collision: ${node.id}`);
          const pathOwner = pathOwners.get(node.domainPath);
          if (pathOwner && pathOwner !== node.id) throw new TypeError(`domain path collision: ${node.domainPath}`);
          const apiOwner = node.apiName ? apiOwners.get(node.apiName) : null;
          if (apiOwner && apiOwner !== node.id) throw new TypeError(`api name collision: ${node.apiName}`);
          if (!existing) {
            nextNodes[node.id] = node;
            pathOwners.set(node.domainPath, node.id);
            if (node.apiName) apiOwners.set(node.apiName, node.id);
            added.push(node);
          }
        }
        if (added.length) {
          state.nodes = nextNodes;
          set(rebuild(state, "nodes-registered"));
          for (const node of added) world.emit(NodeRegistered, { node: clone(node) });
        }
        return nodes.map(clone);
      },
      remove(id) {
        const state = get();
        if (!state.nodes[id]) return false;
        delete state.nodes[id];
        set(rebuild(state, "node-removed"));
        world.emit(NodeRemoved, { id });
        return true;
      },
      syncRegistry() {
        return api.registerMany(engine.n.kitRegistry?.list?.() ?? []);
      },
      setExternalProvides(tokens = []) {
        const state = get();
        state.externalProvides = unique(asList(tokens).map(String));
        return set(rebuild(state, "external-provides-updated"));
      },
      buildGraph() {
        const next = rebuild(get());
        set(next);
        world.emit(GraphBuilt, { nodeCount: Object.keys(next.nodes).length, edgeCount: next.edges.length, missingCount: next.missing.length, cycleCount: next.cycles.length });
        return clone(next);
      },
      listByProvides(token) { const graph = api.buildGraph(); return (graph.indexes.byProvides[token] ?? []).map((id) => clone(graph.nodes[id])); },
      listByDomain(domain) { const graph = api.buildGraph(); return (graph.indexes.byDomain[domain] ?? []).map((id) => clone(graph.nodes[id])); },
      findMissingRequires(id) {
        const graph = api.buildGraph();
        const missing = graph.missing.filter((entry) => entry.to === String(id));
        const report = { id: `missing-requires-${get().missingReports.length + 1}`, domainId: String(id), ok: missing.length === 0, missing: missing.map((entry) => entry.token), entries: missing };
        const state = get();
        state.missingReports = [report, ...state.missingReports].slice(0, Number(config.reportLimit ?? 128));
        set(state);
        return clone(report);
      },
      findCycles() { return clone(api.buildGraph().cycles); },
      createInstallOrder(targetIds) {
        const graph = api.buildGraph();
        const resolved = resolveTargets(graph, targetIds);
        const ordered = topologicalOrder(graph, resolved.selected);
        return { ok: resolved.missing.length === 0 && ordered.ok, installOrder: ordered.order, missing: resolved.missing, cycles: ordered.cycles };
      },
      findClusters(seedTokens = []) {
        const graph = api.buildGraph();
        const ids = unique(asList(seedTokens).flatMap((token) => graph.indexes.byProvides[String(token)] ?? [])).sort();
        const cluster = { id: `capability-cluster-${get().clusters.length + 1}`, tokens: asList(seedTokens).map(String), domainIds: ids, domains: ids.map((id) => graph.nodes[id]) };
        const state = get();
        state.clusters = [cluster, ...state.clusters].slice(0, Number(config.clusterLimit ?? 64));
        set(state);
        world.emit(ClusterFound, { cluster: clone(cluster) });
        return clone(cluster);
      },
      getState() { return clone(get()); },
      getSnapshot() { return clone(get()); },
      snapshot() { return clone(get()); },
      loadSnapshot(snapshot) {
        const next = restoreState(snapshot);
        set(next);
        world.emit(SnapshotLoaded, { nodeCount: Object.keys(next.nodes).length });
        return clone(next);
      },
      reset(payload = {}) {
        const next = rebuild(createInitialState({ ...config, ...payload }), "reset");
        set(next);
        world.emit(Reset, { reason: payload.reason ?? "reset" });
        return clone(next);
      }
    };
    return api;
  }

  return defineDomainServiceKit({
    id: config.kitId ?? config.id ?? "capability-graph-domain-kit",
    domain: "capability-graph",
    domainPath: "n:registry:capabilities",
    parentDomainPath: "n:registry",
    apiName: "capabilityGraph",
    stability: "official",
    version: CAPABILITY_GRAPH_DOMAIN_KIT_VERSION,
    services: ["nodes", "dependencies", "cycles", "install-order", "clusters", "snapshot"],
    requires: ["n:registry:kits"],
    provides: ["domain:capability-graph", "domain:dependency-graph"],
    resources: { State },
    events: { NodeRegistered, NodeRemoved, GraphBuilt, ClusterFound, SnapshotLoaded, Reset },
    initWorld({ world }) { world.setResource(State, rebuild(createInitialState(config), "initialized")); },
    createApi({ engine, world }) { return createApi(engine, world); },
    install({ engine }) { engine.capabilityGraph = engine.n.capabilityGraph; },
    bindings: { State },
    metadata: {
      status: "official",
      parentDomain: "registry",
      scope: "control-domain",
      ownsLoop: false,
      boundary: "Owns serializable capability dependency graphs, missing requirements, cycle detection, and deterministic ordering. It does not fetch, import, install, render, or own kit behavior."
    }
  });
}

export default createCapabilityGraphDomainKit;
