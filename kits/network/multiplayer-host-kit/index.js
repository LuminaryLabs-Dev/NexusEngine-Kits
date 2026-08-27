import { defineDomainServiceKit } from "nexusengine";

const clone = (value) => value == null ? value : structuredClone(value);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function requireSimulation(simulation) {
  for (const method of ["createInitialState", "captureState", "loadState", "applyInputs", "step", "hashState"]) if (typeof simulation?.[method] !== "function") throw new TypeError(`Multiplayer simulation requires ${method}().`);
  return simulation;
}

export function createMultiplayerHostController(options = {}) {
  const simulation = requireSimulation(options.simulation);
  const provider = options.provider;
  if (!provider || typeof provider.initialize !== "function") throw new TypeError("Multiplayer Host requires a transport provider.");
  const tickRate = Math.max(1, finite(options.tickRate, 60));
  const snapshotRate = Math.max(1, finite(options.snapshotRate, 20));
  const fixedDelta = 1 / tickRate;
  const snapshotEvery = Math.max(1, Math.round(tickRate / snapshotRate));
  let state = simulation.createInitialState(clone(options.initialState));
  let role = "idle", phase = "idle", tick = 0, accumulator = 0, queueOrder = 0, inputSequence = 0, snapshotSequence = 0;
  let localInput = {}, inbound = [], pendingInputs = [], latestInputs = {}, acknowledged = {}, snapshots = [];
  let lastInboundTick = 0, lastPingTick = 0, latencyTicks = 0;
  const listeners = new Set();

  const emit = () => { const value = api.getStatus(); for (const listener of listeners) listener(value); };
  const send = (channel, message) => provider[channel === "control" ? "sendControl" : "sendRealtime"]?.(clone(message));
  const receive = (channel, payload, peerId = "remote") => { inbound.push({ order: queueOrder++, channel, peerId, payload: clone(payload) }); };
  provider.initialize({ onMessage: receive, onStatus(status) { if (status?.phase) { phase = status.phase; emit(); } } });

  function processInbound() {
    const batch = inbound.sort((a, b) => a.order - b.order); inbound = [];
    for (const message of batch) {
      lastInboundTick = tick;
      const payload = message.payload ?? {};
      if (payload.type === "input" && role === "host") {
        const last = acknowledged[payload.peerId] ?? -1;
        if (payload.sequence > last) { latestInputs[payload.peerId] = clone(payload.input); acknowledged[payload.peerId] = payload.sequence; }
      } else if (payload.type === "snapshot" && role === "client" && payload.sequence > snapshotSequence) {
        snapshotSequence = payload.sequence;
        const authoritative = simulation.loadState(clone(payload.state));
        const ack = payload.acknowledgements?.local ?? -1;
        pendingInputs = pendingInputs.filter((entry) => entry.sequence > ack);
        state = authoritative;
        for (const entry of pendingInputs) { state = simulation.applyInputs(state, { local: entry.input }, fixedDelta); state = simulation.step(state, fixedDelta, entry.tick); }
        snapshots.push({ tick: payload.tick, state: clone(payload.state) });
        if (snapshots.length > 8) snapshots.shift();
      } else if (payload.type === "hello") send("control", { type: "hello-ack", protocolVersion: 1 });
      else if (payload.type === "hello-ack") { phase = "ready"; emit(); }
      else if (payload.type === "ping") send("control", { type: "pong", sentTick: payload.sentTick });
      else if (payload.type === "pong") latencyTicks = Math.max(0, tick - Number(payload.sentTick ?? tick));
    }
  }

  function fixedStep() {
    processInbound(); tick += 1;
    if (role === "client") {
      const frame = { type: "input", peerId: "local", sequence: inputSequence++, tick, input: clone(localInput) };
      pendingInputs.push(frame); send("realtime", frame);
      state = simulation.applyInputs(state, { local: localInput }, fixedDelta);
    } else if (role === "host") state = simulation.applyInputs(state, { host: localInput, ...latestInputs }, fixedDelta);
    state = simulation.step(state, fixedDelta, tick);
    if (phase === "ready" && tick - lastPingTick >= tickRate) { lastPingTick = tick; send("control", { type: "ping", sentTick: tick }); }
    if (phase === "ready" && lastInboundTick > 0 && tick - lastInboundTick > tickRate * 10) { phase = "connection-lost"; emit(); }
    if (role === "host" && tick % snapshotEvery === 0) send("realtime", { type: "snapshot", sequence: ++snapshotSequence, tick, acknowledgements: { ...acknowledged, local: acknowledged.local ?? -1 }, state: simulation.captureState(state), hash: simulation.hashState(state) });
  }

  const api = {
    async createSession(config = {}) { role = "host"; phase = "creating"; emit(); const result = await provider.createSession(config); phase = "waiting"; emit(); return result; },
    async joinSession(config = {}) { role = "client"; phase = "connecting"; emit(); const result = await provider.joinSession(config); phase = "syncing"; send("control", { type: "hello", protocolVersion: 1 }); emit(); return result; },
    receive,
    setLocalInput(input = {}) { localInput = clone(input); },
    tick(deltaSeconds) { accumulator += Math.min(0.25, Math.max(0, finite(deltaSeconds))); while (accumulator >= fixedDelta) { fixedStep(); accumulator -= fixedDelta; } return api.getRenderState(); },
    getRenderState() { return { state: simulation.captureState(state), interpolation: clone(snapshots), alpha: accumulator / fixedDelta, tick }; },
    getStatus() { return { role, phase, tick, pendingInputs: pendingInputs.length, latencyMs: Math.round(latencyTicks * fixedDelta * 1000 / 2), hash: simulation.hashState(state), transport: clone(provider.getStats?.() ?? {}) }; },
    onStatus(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    disconnect(reason = "closed") { provider.close?.(); role = "idle"; phase = reason; emit(); },
    reset() { provider.reset?.(); state = simulation.createInitialState(clone(options.initialState)); role = "idle"; phase = "idle"; tick = 0; accumulator = 0; queueOrder = 0; inputSequence = 0; snapshotSequence = 0; inbound = []; pendingInputs = []; latestInputs = {}; acknowledged = {}; snapshots = []; lastInboundTick = 0; lastPingTick = 0; latencyTicks = 0; },
    dispose() { api.reset(); provider.dispose?.(); listeners.clear(); }
  };
  return api;
}

export function createMultiplayerHostKit(config = {}) {
  return defineDomainServiceKit({ id: config.id ?? "multiplayer-host-kit", domain: "network-multiplayer-host", domainPath: "n:network:extensions:multiplayer-host", parentDomainPath: "n:network:extensions", apiName: "multiplayer", version: "0.1.0", stability: "candidate", requires: [], provides: ["network:multiplayer-host", "network:prediction", "network:reconciliation"], services: ["multiplayer"], metadata: { portable: true, deterministic: true }, createApi() { return config.provider && config.simulation ? createMultiplayerHostController(config) : { createController: createMultiplayerHostController }; } });
}
