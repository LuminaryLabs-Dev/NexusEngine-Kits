const copy = (v) => v == null ? v : structuredClone(v);
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const tickValue = (v) => Number.isInteger(Number(v)) && Number(v) >= 0;

function simulationContract(value) {
  for (const name of ["createInitialState", "captureState", "loadState", "applyInputs", "step", "hashState"]) {
    if (typeof value?.[name] !== "function") throw new TypeError(`Multiplayer simulation requires ${name}().`);
  }
  return value;
}

const nonce = (factory) => typeof factory === "function" ? String(factory())
  : globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createMultiplayerHostController(options = {}) {
  const simulation = simulationContract(options.simulation);
  const provider = options.provider;
  if (!provider?.initialize) throw new TypeError("Multiplayer Host requires a transport provider.");

  const rate = Math.max(1, num(options.tickRate, 60));
  const delta = 1 / rate;
  const snapshotEvery = Math.max(1, Math.round(rate / Math.max(1, num(options.snapshotRate, 20))));
  const protocolVersion = Math.max(1, Math.floor(num(options.protocolVersion, 2)));
  const retryTicks = Math.max(1, Math.floor(num(options.handshakeRetryTicks, rate / 4)));
  const timeoutTicks = Math.max(retryTicks * 2, Math.floor(num(options.handshakeTimeoutTicks, rate * 10)));
  const startDelay = Math.max(retryTicks * 2, Math.floor(num(options.startDelayTicks, rate)));
  const recoveryTicks = Math.max(rate, Math.floor(num(options.recoveryGraceTicks, rate * 15)));
  const redundantInputs = Math.max(1, Math.min(16, Math.floor(num(options.redundantInputFrames, 6))));
  const snapThreshold = Math.max(0, num(options.reconciliationSnapThreshold, 96));
  const measureError = typeof options.measureStateError === "function" ? options.measureStateError : () => 0;
  const reliableEvents = typeof options.selectReliableEvents === "function" ? options.selectReliableEvents : () => [];

  let state, role, localPlayer, phase, transportPhase, tick, accumulator;
  let order, inputSequence, snapshotSequence, eventSequence;
  let localInput, inbound, pendingInputs, latestInputs, latestInputTicks, acknowledgements, snapshots, history;
  let stalePackets, hashMismatches, resyncs, reliableEventCount, lastEventSequence;
  let lastInboundTick, lastPingTick, rttTicks, jitterTicks, clockOffsetTicks, driftTicks;
  let stage, handshakeNonce, handshakeStartedTick, lastHandshakeTick, startTick, lastError, lastCorrection;
  let ready, rematch, profiles, recoveryDeadline, resumeToken, lastSessionConfig;
  const listeners = new Set(), appListeners = new Set(), seenEvents = new Set();

  function resetState() {
    state = simulation.createInitialState(copy(options.initialState));
    role = "idle"; localPlayer = null; phase = "idle"; transportPhase = "idle"; tick = 0; accumulator = 0;
    order = 0; inputSequence = 0; snapshotSequence = 0; eventSequence = 0;
    localInput = {}; inbound = []; pendingInputs = []; latestInputs = {}; latestInputTicks = {}; acknowledgements = {}; snapshots = []; history = [];
    stalePackets = 0; hashMismatches = 0; resyncs = 0; reliableEventCount = 0; lastEventSequence = 0;
    lastInboundTick = 0; lastPingTick = 0; rttTicks = 0; jitterTicks = 0; clockOffsetTicks = 0; driftTicks = 0;
    stage = "idle"; handshakeNonce = ""; handshakeStartedTick = 0; lastHandshakeTick = -Infinity; startTick = null;
    lastError = null; lastCorrection = null; ready = { 0: false, 1: false }; rematch = { 0: false, 1: false };
    profiles = { 0: { name: "Player 1", robot: "gold" }, 1: { name: "Player 2", robot: "orange" } };
    recoveryDeadline = null; resumeToken = ""; lastSessionConfig = null;
  }
  resetState();

  const emit = () => { const value = api.getStatus(); for (const fn of listeners) fn(value); };
  const setPhase = (next, error = null) => { const changed = phase !== next || (error && error !== lastError); phase = next; if (error) lastError = error; if (changed) emit(); };
  const send = (channel, payload) => Boolean(provider[channel === "control" ? "sendControl" : "sendRealtime"]?.(copy(payload)));
  const receive = (channel, payload, peerId = "remote") => inbound.push({ order: order++, channel, peerId, payload: copy(payload) });
  const notifyApp = (value) => { for (const fn of appListeners) fn(copy(value)); };

  provider.initialize({
    onMessage: receive,
    onStatus(status = {}) {
      if (!status.phase) return;
      transportPhase = status.phase;
      if (["connection-lost", "failed"].includes(status.phase) && !["idle", "closed"].includes(phase)) {
        recoveryDeadline = tick + recoveryTicks;
        setPhase("reconnecting", status.message ?? "Connection interrupted.");
      } else if (status.phase === "transport-ready" && phase === "reconnecting") {
        setPhase("resuming");
        send("control", { type: "resume", protocolVersion, token: resumeToken, player: localPlayer, tick });
      } else if (status.phase === "closed" && !["idle", "closed"].includes(phase)) setPhase("closed");
      else emit();
    }
  });

  function protocol(payload) {
    if (Number(payload.protocolVersion) === protocolVersion) return true;
    send("control", { type: "protocol-error", protocolVersion, message: `Protocol mismatch: expected ${protocolVersion}.` });
    setPhase("failed", `Protocol mismatch: expected ${protocolVersion}, received ${payload.protocolVersion ?? "none"}.`);
    return false;
  }
  function control(type, extra = {}) { lastHandshakeTick = tick; return send("control", { type, protocolVersion, nonce: handshakeNonce, ...extra }); }

  function handshake(payload) {
    if (payload.type === "protocol-error") { setPhase("failed", String(payload.message ?? "Remote protocol error.")); return true; }
    if (!["hello", "hello-ack", "ready", "start", "start-ack", "start-confirmed"].includes(payload.type)) return false;
    if (!protocol(payload)) return true;
    if (payload.type === "hello" && role === "host") {
      const next = String(payload.nonce ?? "");
      if (!next || next.length > 128) { setPhase("failed", "Handshake nonce is required."); return true; }
      if (!handshakeNonce) { handshakeNonce = next; resumeToken = nonce(options.createNonce); stage = "ack"; handshakeStartedTick = tick; setPhase("syncing"); }
      if (next === handshakeNonce) control("hello-ack", { hostTick: tick, resumeToken }); else stalePackets += 1;
      return true;
    }
    if (String(payload.nonce ?? "") !== handshakeNonce) { stalePackets += 1; return true; }
    if (payload.type === "hello-ack" && role === "client") { resumeToken = String(payload.resumeToken ?? ""); stage = "ready"; control("ready", { clientTick: tick }); return true; }
    if (payload.type === "ready" && role === "host") { if (stage !== "start") startTick = tick + startDelay; stage = "start"; control("start", { hostTick: tick, startTick, state: simulation.captureState(state), hash: simulation.hashState(state) }); return true; }
    if (payload.type === "start" && role === "client") {
      if (!tickValue(payload.startTick) || !tickValue(payload.hostTick) || Number(payload.startTick) <= Number(payload.hostTick)) { setPhase("failed", "Invalid shared start window."); return true; }
      let loaded; try { loaded = simulation.loadState(copy(payload.state)); } catch { setPhase("failed", "Invalid initial state snapshot."); return true; }
      if (simulation.hashState(loaded) !== payload.hash) { hashMismatches += 1; setPhase("failed", "Initial state hash mismatch."); return true; }
      state = loaded; clockOffsetTicks = Number(payload.hostTick) - tick; startTick = tick + Number(payload.startTick) - Number(payload.hostTick); stage = "confirm";
      control("start-ack", { clientTick: tick }); return true;
    }
    if (payload.type === "start-ack" && role === "host") { if (startTick - tick < retryTicks * 2) startTick = tick + startDelay; stage = "confirmed"; control("start-confirmed", { hostTick: tick, startTick, echoClientTick: payload.clientTick }); return true; }
    if (payload.type === "start-confirmed" && role === "client") { startTick = Math.max(tick + 1, tick + Number(payload.startTick) - Number(payload.hostTick)); stage = "confirmed"; return true; }
    return true;
  }

  function applyFullState(payload) {
    let loaded; try { loaded = simulation.loadState(copy(payload.state)); } catch { stalePackets += 1; return false; }
    if (payload.hash != null && simulation.hashState(loaded) !== payload.hash) { hashMismatches += 1; return false; }
    state = loaded; pendingInputs = pendingInputs.filter((frame) => frame.sequence > num(payload.ack, -1)); resyncs += 1; lastError = null; return true;
  }
  function snapshot(payload) {
    if (!Number.isInteger(Number(payload.sequence)) || Number(payload.sequence) <= snapshotSequence) { stalePackets += 1; return; }
    const predicted = simulation.captureState(state), beforeHash = simulation.hashState(predicted);
    let authoritative; try { authoritative = simulation.loadState(copy(payload.state)); } catch { stalePackets += 1; return; }
    if (payload.hash != null && simulation.hashState(authoritative) !== payload.hash) {
      hashMismatches += 1; lastError = "Snapshot hash mismatch; requesting full state.";
      control("resync-request", { badSequence: payload.sequence, localHash: beforeHash }); return;
    }
    snapshotSequence = Number(payload.sequence);
    const ack = num(payload.acknowledgements?.local, -1);
    pendingInputs = pendingInputs.filter((frame) => frame.sequence > ack);
    state = authoritative;
    for (const frame of pendingInputs) { state = simulation.applyInputs(state, { local: frame.input }, delta); state = simulation.step(state, delta, frame.tick, { prediction: true, localPlayer }); }
    const error = Math.max(0, num(measureError(predicted, authoritative), 0));
    lastCorrection = { mode: error >= snapThreshold ? "snap" : "blend", error, tick, sequence: payload.sequence };
    snapshots.push({ tick: payload.tick, receivedTick: tick, state: copy(payload.state), events: copy(payload.events ?? []) });
    if (snapshots.length > 12) snapshots.shift();
    const sample = num(payload.tick, tick) - tick;
    const previous = clockOffsetTicks; clockOffsetTicks += (sample - clockOffsetTicks) * 0.08; driftTicks = clockOffsetTicks - previous;
  }

  function processControl(payload) {
    if (handshake(payload)) return true;
    if (payload.protocolVersion != null && !protocol(payload)) return true;
    if (payload.type === "ping") { control("pong", { sentTick: payload.sentTick, remoteTick: tick }); return true; }
    if (payload.type === "pong") {
      const sample = Math.max(0, tick - num(payload.sentTick, tick));
      jitterTicks += (Math.abs(sample - rttTicks) - jitterTicks) * 0.2; rttTicks += (sample - rttTicks) * 0.2;
      const offsetSample = num(payload.remoteTick, tick) + sample / 2 - tick; clockOffsetTicks += (offsetSample - clockOffsetTicks) * 0.1; return true;
    }
    if (payload.type === "player-ready") { const player = role === "host" ? 1 : 0; ready[player] = Boolean(payload.ready); profiles[player] = { ...profiles[player], ...copy(payload.profile ?? {}) }; simulation.configurePlayers?.(state, copy(profiles)); emit(); return true; }
    if (payload.type === "match-event") { if (Number(payload.sequence) > lastEventSequence) { lastEventSequence = Number(payload.sequence); reliableEventCount += 1; notifyApp({ type: "match-event", events: payload.events, tick: payload.tick }); } return true; }
    if (payload.type === "resync-request" && role === "host") { control("resync-state", { state: simulation.captureState(state), hash: simulation.hashState(state), ack: acknowledgements.local ?? -1, hostTick: tick }); return true; }
    if (payload.type === "resync-state" && role === "client") { applyFullState(payload); clockOffsetTicks = num(payload.hostTick, tick) - tick; return true; }
    if (payload.type === "resume" && role === "host") { if (payload.token !== resumeToken) { control("resume-rejected", { reason: "Invalid resume token." }); } else control("resume-state", { state: simulation.captureState(state), hash: simulation.hashState(state), ack: acknowledgements.local ?? -1, hostTick: tick }); return true; }
    if (payload.type === "resume-state") { if (applyFullState(payload)) { recoveryDeadline = null; setPhase("ready"); } return true; }
    if (payload.type === "resume-rejected") { setPhase("failed", String(payload.reason ?? "Resume rejected.")); return true; }
    if (payload.type === "rematch-vote") { const player = role === "host" ? 1 : 0; rematch[player] = Boolean(payload.ready); emit(); if (role === "host" && rematch[0] && rematch[1]) startRematch(); return true; }
    if (payload.type === "rematch-start") { state = simulation.loadState(copy(payload.state)); pendingInputs = []; snapshots = []; rematch = { 0: false, 1: false }; ready = { 0: true, 1: true }; setPhase("ready"); notifyApp({ type: "rematch-start" }); return true; }
    if (payload.type === "forfeit") { const player = role === "host" ? 1 : 0; state = simulation.forfeit?.(state, player, tick) ?? state; notifyApp({ type: "forfeit", player }); return true; }
    if (payload.type === "app") { notifyApp(payload.message); return true; }
    return false;
  }

  function processInbound() {
    const batch = inbound.sort((a, b) => a.order - b.order); inbound = [];
    for (const message of batch) {
      lastInboundTick = tick; const payload = message.payload ?? {};
      if (message.channel === "control" && processControl(payload)) continue;
      if (!["ready", "lobby"].includes(phase)) { stalePackets += 1; continue; }
      if (payload.type === "input-bundle" && role === "host") {
        for (const frame of Array.isArray(payload.frames) ? payload.frames : []) {
          const sequence = Number(frame.sequence), last = acknowledgements.local ?? -1;
          if (Number.isInteger(sequence) && sequence > last) { latestInputs.local = copy(frame.input); latestInputTicks.local = num(frame.estimatedHostTick, tick); acknowledgements.local = sequence; }
          else stalePackets += 1;
        }
      } else if (payload.type === "input" && role === "host") {
        const sequence = Number(payload.sequence);
        if (Number.isInteger(sequence) && sequence > (acknowledgements.local ?? -1)) { latestInputs.local = copy(payload.input); latestInputTicks.local = num(payload.tick, tick); acknowledgements.local = sequence; }
      } else if (payload.type === "snapshot" && role === "client") snapshot(payload);
    }
  }

  function retryHandshake() {
    if (phase !== "syncing") return;
    if (tick - handshakeStartedTick >= timeoutTicks) { setPhase("failed", `Handshake timed out after ${Math.round(timeoutTicks / rate)} seconds.`); return; }
    if (tick - lastHandshakeTick < retryTicks) return;
    if (role === "client") {
      if (stage === "hello") control("hello", { sentTick: tick });
      else if (stage === "ready") control("ready", { clientTick: tick });
      else if (stage === "confirm") control("start-ack", { clientTick: tick });
    } else if (stage === "ack") control("hello-ack", { hostTick: tick, resumeToken });
    else if (stage === "start") control("start", { hostTick: tick, startTick, state: simulation.captureState(state), hash: simulation.hashState(state) });
    else if (stage === "confirmed") control("start-confirmed", { hostTick: tick, startTick });
  }

  function startRematch() {
    state = simulation.createInitialState(copy(options.initialState)); simulation.configurePlayers?.(state, copy(profiles)); pendingInputs = []; snapshots = []; seenEvents.clear(); rematch = { 0: false, 1: false };
    control("rematch-start", { state: simulation.captureState(state), hash: simulation.hashState(state), hostTick: tick });
    setPhase("ready"); notifyApp({ type: "rematch-start" });
  }
  function fixedStep() {
    tick += 1; processInbound(); retryHandshake();
    if (stage === "confirmed" && startTick != null && tick >= startTick) { stage = "complete"; setPhase(options.requireReady ? "lobby" : "ready"); }
    if (phase === "lobby" && ready[0] && ready[1]) { setPhase("ready"); control("match-event", { sequence: ++eventSequence, tick, events: [{ type: "countdown", tick }] }); }
    if (["reconnecting", "resuming"].includes(phase)) { if (recoveryDeadline != null && tick >= recoveryDeadline) setPhase("failed", "Reconnect grace period expired."); return; }
    if (phase !== "ready") return;

    const before = simulation.captureState(state);
    if (role === "client") {
      const frame = { sequence: inputSequence++, tick, estimatedHostTick: Math.round(tick + clockOffsetTicks), input: copy(localInput) }; pendingInputs.push(frame);
      send("realtime", { type: "input-bundle", protocolVersion, frames: pendingInputs.slice(-redundantInputs) });
      state = simulation.applyInputs(state, { local: localInput }, delta);
    } else state = simulation.applyInputs(state, localPlayer === 1 ? { local: localInput, host: latestInputs.host } : { host: localInput, ...latestInputs }, delta);
    const historical = (targetTick) => history.reduce((best, item) => item.tick <= targetTick ? item : best, history[0])?.state;
    state = simulation.step(state, delta, tick, { authoritative: role === "host", localPlayer, inputTicks: copy(latestInputTicks), getHistoricalState: historical });
    history.push({ tick, state: simulation.captureState(state) }); if (history.length > Math.ceil(rate * 0.5)) history.shift();

    if (role === "host") {
      const events = reliableEvents(before, state, tick) ?? [];
      const fresh = events.filter((event) => { const key = event.id ?? `${event.type}:${event.tick ?? tick}:${event.player ?? ""}`; if (seenEvents.has(key)) return false; seenEvents.add(key); return true; });
      if (fresh.length) { reliableEventCount += fresh.length; control("match-event", { sequence: ++eventSequence, tick, events: fresh }); }
    }
    if (tick - lastPingTick >= rate) { lastPingTick = tick; control("ping", { sentTick: tick }); }
    if (lastInboundTick && tick - lastInboundTick > rate * 10) { recoveryDeadline = tick + recoveryTicks; setPhase("reconnecting", "Heartbeat timed out."); return; }
    if (role === "host" && tick % snapshotEvery === 0) send("realtime", { type: "snapshot", protocolVersion, sequence: ++snapshotSequence, tick, acknowledgements: { local: acknowledgements.local ?? -1 }, state: simulation.captureState(state), hash: simulation.hashState(state) });
  }

  const api = {
    async createSession(config = {}) { role = "host"; localPlayer = 0; lastSessionConfig = copy(config); stage = "waiting"; setPhase("creating"); const result = await provider.createSession(config); setPhase("waiting"); return result; },
    async joinSession(config = {}) { role = "client"; localPlayer = 1; lastSessionConfig = copy(config); setPhase("connecting"); const result = await provider.joinSession(config); handshakeNonce = nonce(options.createNonce); handshakeStartedTick = tick; stage = "hello"; setPhase("syncing"); control("hello", { sentTick: tick }); return result; },
    receive,
    setLocalInput(input = {}) { localInput = copy(input); },
    setProfile(profile = {}) { profiles[localPlayer] = { ...profiles[localPlayer], ...copy(profile) }; simulation.configurePlayers?.(state, copy(profiles)); if (localPlayer != null) control("player-ready", { player: localPlayer, ready: ready[localPlayer], profile: profiles[localPlayer] }); },
    setReady(value = true) { if (localPlayer == null) return false; ready[localPlayer] = Boolean(value); control("player-ready", { player: localPlayer, ready: ready[localPlayer], profile: profiles[localPlayer] }); emit(); return true; },
    requestRematch(value = true) { if (localPlayer == null) return false; rematch[localPlayer] = Boolean(value); control("rematch-vote", { player: localPlayer, ready: rematch[localPlayer] }); emit(); if (role === "host" && rematch[0] && rematch[1]) startRematch(); return true; },
    forfeit() { if (localPlayer == null) return false; state = simulation.forfeit?.(state, localPlayer, tick) ?? state; control("forfeit", { player: localPlayer, tick }); notifyApp({ type: "forfeit", player: localPlayer }); return true; },
    sendAppMessage(message) { return control("app", { message: copy(message) }); },
    async reconnect() { if (!provider.reconnect) return false; setPhase("reconnecting"); await provider.reconnect(lastSessionConfig ?? {}); return true; },
    async migrateHost(sessionId = lastSessionConfig?.sessionId) {
      if (role !== "client" || typeof provider.takeoverSession !== "function") return false;
      setPhase("migrating-host");
      await provider.takeoverSession({ ...(lastSessionConfig ?? {}), sessionId });
      role = "host"; simulation.setAuthority?.(true, localPlayer); recoveryDeadline = null;
      setPhase("waiting"); return true;
    },
    tick(seconds) { accumulator += Math.min(0.25, Math.max(0, num(seconds))); const correction = role === "client" && phase === "ready" ? Math.max(0.96, Math.min(1.04, 1 + driftTicks * 0.002)) : 1; while (accumulator >= delta / correction) { fixedStep(); accumulator -= delta / correction; } return api.getRenderState(); },
    getRenderState() { return { state: simulation.captureState(state), interpolation: copy(snapshots), reconciliation: copy(lastCorrection), alpha: accumulator / delta, tick, clockOffsetTicks }; },
    getStatus() {
      const transport = copy(provider.getStats?.() ?? {}), sent = num(transport.sent?.realtime), received = num(transport.received?.realtime), dropped = num(transport.dropped);
      const lossPercent = sent + dropped ? Math.round(dropped / (sent + dropped) * 100) : 0;
      const latencyMs = Math.round(rttTicks * delta * 500), jitterMs = Math.round(jitterTicks * delta * 1000);
      return { role, localPlayer, phase, transportPhase, handshakeStage: stage, tick, startTick, pendingInputs: pendingInputs.length, latencyMs, jitterMs, lossPercent, connectionQuality: phase === "reconnecting" ? "lost" : lossPercent > 8 || latencyMs > 180 ? "poor" : lossPercent > 2 || latencyMs > 100 ? "fair" : "good", clockOffsetMs: Math.round(clockOffsetTicks * delta * 1000), driftMs: Math.round(driftTicks * delta * 1000), stalePackets, hashMismatches, resyncs, reliableEvents: reliableEventCount, ready: copy(ready), rematch: copy(rematch), profiles: copy(profiles), recoverySeconds: recoveryDeadline == null ? null : Math.max(0, Math.ceil((recoveryDeadline - tick) / rate)), lastError, hash: simulation.hashState(state), transport };
    },
    onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onAppMessage(fn) { appListeners.add(fn); return () => appListeners.delete(fn); },
    disconnect(reason = "closed") { role = "idle"; stage = "idle"; provider.close?.(); setPhase(reason); },
    reset() { provider.reset?.(); resetState(); emit(); },
    dispose() { provider.dispose?.(); resetState(); listeners.clear(); appListeners.clear(); }
  };
  return api;
}
