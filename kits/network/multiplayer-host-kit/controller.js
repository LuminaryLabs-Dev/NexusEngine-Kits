
const clone = (value) => value == null ? value : structuredClone(value);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const validTick = (value) => Number.isInteger(Number(value)) && Number(value) >= 0;

function requireSimulation(simulation) {
  for (const method of ["createInitialState", "captureState", "loadState", "applyInputs", "step", "hashState"]) {
    if (typeof simulation?.[method] !== "function") throw new TypeError(`Multiplayer simulation requires ${method}().`);
  }
  return simulation;
}

function createNonce(factory) {
  if (typeof factory === "function") return String(factory());
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createMultiplayerHostController(options = {}) {
  const simulation = requireSimulation(options.simulation);
  const provider = options.provider;
  if (!provider || typeof provider.initialize !== "function") throw new TypeError("Multiplayer Host requires a transport provider.");

  const tickRate = Math.max(1, finite(options.tickRate, 60));
  const snapshotRate = Math.max(1, finite(options.snapshotRate, 20));
  const fixedDelta = 1 / tickRate;
  const snapshotEvery = Math.max(1, Math.round(tickRate / snapshotRate));
  const protocolVersion = Math.max(1, Math.floor(finite(options.protocolVersion, 1)));
  const handshakeRetryTicks = Math.max(1, Math.floor(finite(options.handshakeRetryTicks, tickRate / 4)));
  const handshakeTimeoutTicks = Math.max(handshakeRetryTicks * 2, Math.floor(finite(options.handshakeTimeoutTicks, tickRate * 10)));
  const startDelayTicks = Math.max(handshakeRetryTicks * 2, Math.floor(finite(options.startDelayTicks, tickRate)));
  const snapThreshold = Math.max(0, finite(options.reconciliationSnapThreshold, 96));
  const measureStateError = typeof options.measureStateError === "function" ? options.measureStateError : null;

  let state = simulation.createInitialState(clone(options.initialState));
  let role = "idle", phase = "idle", transportPhase = "idle", tick = 0, accumulator = 0;
  let queueOrder = 0, inputSequence = 0, snapshotSequence = 0;
  let localInput = {}, inbound = [], pendingInputs = [], latestInputs = {}, acknowledged = {}, snapshots = [];
  let lastInboundTick = 0, lastPingTick = 0, latencyTicks = 0, stalePackets = 0, hashMismatches = 0;
  let handshakeStage = "idle", handshakeNonce = "", handshakeStartedTick = 0, lastHandshakeSendTick = -Infinity;
  let startTick = null, remoteStartTick = null, lastError = null, lastCorrection = null;
  const listeners = new Set();

  const emit = () => {
    const value = api.getStatus();
    for (const listener of listeners) listener(value);
  };
  const setPhase = (next, error = null) => {
    const changed = phase !== next || (error && lastError !== error);
    phase = next;
    if (error) lastError = error;
    if (changed) emit();
  };
  const send = (channel, message) => Boolean(provider[channel === "control" ? "sendControl" : "sendRealtime"]?.(clone(message)));
  const receive = (channel, payload, peerId = "remote") => {
    inbound.push({ order: queueOrder++, channel, peerId, payload: clone(payload) });
  };

  provider.initialize({
    onMessage: receive,
    onStatus(status) {
      if (!status?.phase) return;
      transportPhase = status.phase;
      if (status.phase === "connection-lost" || status.phase === "failed") {
        setPhase(status.phase, status.message ?? null);
      } else if (status.phase === "closed" && phase !== "idle" && phase !== "closed") {
        setPhase("closed");
      } else emit();
    }
  });

  function failHandshake(message, notifyRemote = true) {
    if (notifyRemote) send("control", { type: "protocol-error", protocolVersion, message });
    handshakeStage = "failed";
    setPhase("failed", message);
  }

  function validateProtocol(payload) {
    if (Number(payload.protocolVersion) === protocolVersion) return true;
    failHandshake(`Protocol mismatch: expected ${protocolVersion}, received ${payload.protocolVersion ?? "none"}.`);
    return false;
  }

  function sendHello() {
    lastHandshakeSendTick = tick;
    send("control", { type: "hello", protocolVersion, nonce: handshakeNonce, sentTick: tick });
  }
  function sendHelloAck() {
    lastHandshakeSendTick = tick;
    send("control", { type: "hello-ack", protocolVersion, nonce: handshakeNonce, hostTick: tick });
  }
  function sendReady() {
    lastHandshakeSendTick = tick;
    send("control", { type: "ready", protocolVersion, nonce: handshakeNonce, clientTick: tick });
  }
  function sendStart() {
    lastHandshakeSendTick = tick;
    send("control", { type: "start", protocolVersion, nonce: handshakeNonce, hostTick: tick, startTick, state: simulation.captureState(state), hash: simulation.hashState(state) });
  }
  function sendStartAck() {
    lastHandshakeSendTick = tick;
    send("control", { type: "start-ack", protocolVersion, nonce: handshakeNonce, clientTick: tick });
  }
  function sendStartConfirmed(echoClientTick) {
    lastHandshakeSendTick = tick;
    send("control", { type: "start-confirmed", protocolVersion, nonce: handshakeNonce, hostTick: tick, startTick, echoClientTick });
  }

  function processHandshake(payload) {
    if (payload.type === "protocol-error") {
      handshakeStage = "failed";
      setPhase("failed", String(payload.message ?? "Remote protocol error."));
      return true;
    }
    if (!["hello", "hello-ack", "ready", "start", "start-ack", "start-confirmed"].includes(payload.type)) return false;
    if (!validateProtocol(payload)) return true;

    if (payload.type === "hello" && role === "host") {
      const nonce = String(payload.nonce ?? "");
      if (!nonce || nonce.length > 128) {
        failHandshake("Handshake nonce is required.");
        return true;
      }
      if (handshakeNonce && nonce !== handshakeNonce && handshakeStage !== "waiting") {
        stalePackets += 1;
        return true;
      }
      if (!handshakeNonce) {
        handshakeNonce = nonce;
        handshakeStartedTick = tick;
        handshakeStage = "ack";
        setPhase("syncing");
      }
      sendHelloAck();
      return true;
    }

    if (String(payload.nonce ?? "") !== handshakeNonce) {
      stalePackets += 1;
      return true;
    }
    if (payload.type === "hello-ack" && role === "client" && ["hello", "ready"].includes(handshakeStage)) {
      handshakeStage = "ready";
      sendReady();
      return true;
    }
    if (payload.type === "ready" && role === "host" && ["ack", "start"].includes(handshakeStage)) {
      if (handshakeStage !== "start") {
        startTick = tick + startDelayTicks;
        handshakeStage = "start";
      }
      sendStart();
      return true;
    }
    if (payload.type === "start" && role === "client" && ["ready", "confirm"].includes(handshakeStage)) {
      if (!validTick(payload.startTick) || !validTick(payload.hostTick) || Number(payload.startTick) <= Number(payload.hostTick)) {
        failHandshake("Invalid shared start window.");
        return true;
      }
      let authoritative;
      try { authoritative = simulation.loadState(clone(payload.state)); }
      catch { failHandshake("Invalid initial state snapshot."); return true; }
      if (payload.hash != null && simulation.hashState(authoritative) !== payload.hash) {
        hashMismatches += 1;
        failHandshake("Initial state hash mismatch.");
        return true;
      }
      state = authoritative;
      remoteStartTick = Number(payload.startTick);
      const lead = Math.max(1, remoteStartTick - Number(payload.hostTick ?? remoteStartTick));
      startTick = tick + lead;
      handshakeStage = "confirm";
      sendStartAck();
      return true;
    }
    if (payload.type === "start-ack" && role === "host" && ["start", "confirmed"].includes(handshakeStage)) {
      if (startTick - tick < handshakeRetryTicks * 2) startTick = tick + startDelayTicks;
      handshakeStage = "confirmed";
      sendStartConfirmed(Number(payload.clientTick ?? tick));
      return true;
    }
    if (payload.type === "start-confirmed" && role === "client" && handshakeStage === "confirm") {
      if (!validTick(payload.startTick) || !validTick(payload.hostTick)) {
        failHandshake("Invalid start confirmation.");
        return true;
      }
      remoteStartTick = Number(payload.startTick);
      startTick = Math.max(tick + 1, tick + remoteStartTick - Number(payload.hostTick ?? remoteStartTick));
      handshakeStage = "confirmed";
      return true;
    }
    return true;
  }

  function reconcileSnapshot(payload) {
    if (!Number.isInteger(Number(payload.sequence)) || Number(payload.sequence) <= snapshotSequence) {
      stalePackets += 1;
      return;
    }
    const predicted = simulation.captureState(state);
    let authoritative;
    try { authoritative = simulation.loadState(clone(payload.state)); }
    catch { stalePackets += 1; lastError = "Invalid snapshot state."; return; }
    const authoritativeHash = simulation.hashState(authoritative);
    if (payload.hash != null && authoritativeHash !== payload.hash) {
      hashMismatches += 1;
      lastError = "Snapshot hash mismatch.";
      return;
    }
    snapshotSequence = Number(payload.sequence);
    const ack = Number(payload.acknowledgements?.local ?? -1);
    pendingInputs = pendingInputs.filter((entry) => entry.sequence > ack);
    state = authoritative;
    for (const entry of pendingInputs) {
      state = simulation.applyInputs(state, { local: entry.input }, fixedDelta);
      state = simulation.step(state, fixedDelta, entry.tick);
    }
    const error = Math.max(0, finite(measureStateError?.(predicted, authoritative), 0));
    lastCorrection = { mode: error >= snapThreshold ? "snap" : "blend", error, tick, sequence: payload.sequence };
    snapshots.push({ tick: payload.tick, receivedTick: tick, state: clone(payload.state) });
    if (snapshots.length > 8) snapshots.shift();
  }

  function processInbound() {
    const batch = inbound.sort((a, b) => a.order - b.order);
    inbound = [];
    for (const message of batch) {
      lastInboundTick = tick;
      const payload = message.payload ?? {};
      if (processHandshake(payload)) continue;
      if (phase !== "ready") {
        stalePackets += 1;
        continue;
      }
      if (payload.type === "input" && role === "host") {
        const sequence = Number(payload.sequence);
        const peerKey = "local";
        const last = acknowledged[peerKey] ?? -1;
        if (Number.isInteger(sequence) && sequence > last) {
          latestInputs[peerKey] = clone(payload.input);
          acknowledged[peerKey] = sequence;
        } else stalePackets += 1;
      } else if (payload.type === "snapshot" && role === "client") reconcileSnapshot(payload);
      else if (payload.type === "ping") send("control", { type: "pong", sentTick: payload.sentTick });
      else if (payload.type === "pong") latencyTicks = Math.max(0, tick - Number(payload.sentTick ?? tick));
    }
  }

  function advanceHandshake() {
    if (phase !== "syncing") return;
    if (tick - handshakeStartedTick >= handshakeTimeoutTicks) {
      failHandshake(`Handshake timed out after ${Math.round(handshakeTimeoutTicks / tickRate)} seconds.`);
      return;
    }
    if (tick - lastHandshakeSendTick < handshakeRetryTicks) return;
    if (role === "client") {
      if (handshakeStage === "hello") sendHello();
      else if (handshakeStage === "ready") sendReady();
      else if (handshakeStage === "confirm") sendStartAck();
    } else if (role === "host") {
      if (handshakeStage === "ack") sendHelloAck();
      else if (handshakeStage === "start") sendStart();
      else if (handshakeStage === "confirmed") sendStartConfirmed(tick);
    }
  }

  function advanceStart() {
    if (handshakeStage !== "confirmed" || startTick == null || tick < startTick) return;
    handshakeStage = "complete";
    setPhase("ready");
  }

  function fixedStep() {
    tick += 1;
    processInbound();
    advanceHandshake();
    advanceStart();
    if (phase !== "ready") return;

    if (role === "client") {
      const frame = { type: "input", peerId: "local", sequence: inputSequence++, tick, input: clone(localInput) };
      pendingInputs.push(frame);
      send("realtime", frame);
      state = simulation.applyInputs(state, { local: localInput }, fixedDelta);
    } else if (role === "host") state = simulation.applyInputs(state, { host: localInput, ...latestInputs }, fixedDelta);
    state = simulation.step(state, fixedDelta, tick);

    if (tick - lastPingTick >= tickRate) {
      lastPingTick = tick;
      send("control", { type: "ping", sentTick: tick });
    }
    if (lastInboundTick > 0 && tick - lastInboundTick > tickRate * 10) {
      setPhase("connection-lost", "Heartbeat timed out.");
      return;
    }
    if (role === "host" && tick % snapshotEvery === 0) {
      send("realtime", {
        type: "snapshot", protocolVersion, sequence: ++snapshotSequence, tick,
        acknowledgements: { ...acknowledged, local: acknowledged.local ?? -1 },
        state: simulation.captureState(state), hash: simulation.hashState(state)
      });
    }
  }

  function resetController() {
    state = simulation.createInitialState(clone(options.initialState));
    role = "idle"; phase = "idle"; transportPhase = "idle"; tick = 0; accumulator = 0;
    queueOrder = 0; inputSequence = 0; snapshotSequence = 0; localInput = {}; inbound = [];
    pendingInputs = []; latestInputs = {}; acknowledged = {}; snapshots = [];
    lastInboundTick = 0; lastPingTick = 0; latencyTicks = 0; stalePackets = 0; hashMismatches = 0;
    handshakeStage = "idle"; handshakeNonce = ""; handshakeStartedTick = 0; lastHandshakeSendTick = -Infinity;
    startTick = null; remoteStartTick = null; lastError = null; lastCorrection = null;
  }

  const api = {
    async createSession(config = {}) {
      role = "host";
      handshakeStage = "waiting";
      setPhase("creating");
      const result = await provider.createSession(config);
      setPhase("waiting");
      return result;
    },
    async joinSession(config = {}) {
      role = "client";
      setPhase("connecting");
      const result = await provider.joinSession(config);
      handshakeNonce = createNonce(options.createNonce);
      handshakeStartedTick = tick;
      handshakeStage = "hello";
      setPhase("syncing");
      sendHello();
      return result;
    },
    receive,
    setLocalInput(input = {}) { localInput = clone(input); },
    tick(deltaSeconds) {
      accumulator += Math.min(0.25, Math.max(0, finite(deltaSeconds)));
      while (accumulator >= fixedDelta) {
        fixedStep();
        accumulator -= fixedDelta;
      }
      return api.getRenderState();
    },
    getRenderState() {
      return { state: simulation.captureState(state), interpolation: clone(snapshots), reconciliation: clone(lastCorrection), alpha: accumulator / fixedDelta, tick };
    },
    getStatus() {
      return {
        role, phase, transportPhase, handshakeStage, tick, startTick, remoteStartTick,
        pendingInputs: pendingInputs.length,
        latencyMs: Math.round(latencyTicks * fixedDelta * 1000 / 2),
        stalePackets, hashMismatches, lastError,
        hash: simulation.hashState(state), transport: clone(provider.getStats?.() ?? {})
      };
    },
    onStatus(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    disconnect(reason = "closed") {
      role = "idle";
      handshakeStage = "idle";
      provider.close?.();
      setPhase(reason);
      emit();
    },
    reset() { provider.reset?.(); resetController(); emit(); },
    dispose() { provider.dispose?.(); resetController(); listeners.clear(); }
  };
  return api;
}
