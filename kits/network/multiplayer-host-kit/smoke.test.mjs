import assert from "node:assert/strict";
import { createMultiplayerHostController } from "./controller.js";

function transport(drop = () => false) {
  let receiver = null, status = null, remote = null, sent = 0, dropped = 0;
  const api = {
    id: "memory",
    capabilities: {},
    initialize(callbacks) { receiver = callbacks.onMessage; status = callbacks.onStatus; },
    pair(value) { remote = value; },
    async createSession() { status?.({ phase: "listening" }); return { sessionId: "room" }; },
    async joinSession() { status?.({ phase: "transport-ready" }); remote.transportReady(); return { sessionId: "room" }; },
    transportReady() { status?.({ phase: "transport-ready" }); },
    sendControl(value) {
      sent += 1;
      if (drop("control", value, sent)) { dropped += 1; return false; }
      remote.deliver("control", value);
      return true;
    },
    sendRealtime(value) {
      sent += 1;
      if (drop("realtime", value, sent)) { dropped += 1; return false; }
      remote.deliver("realtime", value);
      return true;
    },
    deliver(channel, value) { receiver(channel, value); },
    getStats() { return { dropped, sent }; },
    close() { status?.({ phase: "closed" }); },
    reset() {},
    dispose() {}
  };
  return api;
}

const simulation = {
  createInitialState() { return { x: 0, velocity: 0 }; },
  captureState: structuredClone,
  loadState: structuredClone,
  applyInputs(state, inputs) {
    const input = inputs.local ?? inputs.host ?? {};
    return { ...state, velocity: Number(input.move ?? 0) };
  },
  step(state, dt) {
    return { ...state, x: Math.round((state.x + state.velocity * dt * 60) * 1000) / 1000 };
  },
  hashState(state) { return JSON.stringify(state); }
};

let droppedHelloAck = false, droppedStartConfirmed = false;
const hostTransport = transport((channel, value) => {
  if (channel === "control" && value.type === "hello-ack" && !droppedHelloAck) { droppedHelloAck = true; return true; }
  if (channel === "control" && value.type === "start-confirmed" && !droppedStartConfirmed) { droppedStartConfirmed = true; return true; }
  return channel === "realtime" && value.sequence % 5 === 0;
});
const clientTransport = transport();
hostTransport.pair(clientTransport);
clientTransport.pair(hostTransport);

const common = {
  simulation,
  tickRate: 60,
  snapshotRate: 20,
  handshakeRetryTicks: 3,
  handshakeTimeoutTicks: 90,
  startDelayTicks: 12,
  measureStateError(predicted, authoritative) { return Math.abs(predicted.x - authoritative.x); },
  reconciliationSnapThreshold: 5
};
const host = createMultiplayerHostController({ ...common, provider: hostTransport });
const client = createMultiplayerHostController({ ...common, provider: clientTransport, createNonce: () => "test-nonce" });

await host.createSession();
await client.joinSession();
client.setLocalInput({ move: 1 });
assert.equal(client.getRenderState().state.x, 0, "simulation stays paused while the match is syncing");
for (let index = 0; index < 60 && (host.getStatus().phase !== "ready" || client.getStatus().phase !== "ready"); index += 1) {
  host.tick(1 / 60);
  client.tick(1 / 60);
}
assert.equal(host.getStatus().phase, "ready", "host completes the retried handshake");
assert.equal(client.getStatus().phase, "ready", "client completes the retried handshake");
assert.equal(host.getStatus().transportPhase, "transport-ready", "transport readiness remains separate");
assert.equal(droppedHelloAck, true, "test dropped the first hello acknowledgement");
assert.equal(droppedStartConfirmed, true, "test dropped the first start confirmation");

const predictedBefore = client.getRenderState().state.x;
client.tick(1 / 60);
assert.equal(client.getRenderState().state.x, predictedBefore + 1, "guest predicts immediately after match readiness");
for (let index = 0; index < 40; index += 1) {
  host.tick(1 / 60);
  client.tick(1 / 60);
}
assert.ok(client.getRenderState().interpolation.length > 0, "guest buffers host snapshots");
assert.ok(client.getStatus().pendingInputs < 20, "host acknowledgements prune predicted inputs");

client.setLocalInput({ move: 0 });
for (let index = 0; index < 30; index += 1) {
  host.tick(1 / 60);
  client.tick(1 / 60);
}
assert.equal(client.getRenderState().state.x, host.getRenderState().state.x, "settled peers converge to the same state");

const staleBefore = client.getStatus().stalePackets;
const current = host.getRenderState().state;
client.receive("realtime", { type: "snapshot", sequence: 1, tick: 1, acknowledgements: { local: -1 }, state: current, hash: simulation.hashState(current) });
client.tick(1 / 60);
assert.equal(client.getStatus().stalePackets, staleBefore + 1, "stale snapshots are rejected");

client.receive("realtime", { type: "snapshot", sequence: 9999, tick: 9999, acknowledgements: { local: 9999 }, state: current, hash: "corrupt" });
client.tick(1 / 60);
assert.equal(client.getStatus().hashMismatches, 1, "snapshot hashes are validated");
host.tick(1 / 60);
client.tick(1 / 60);
assert.equal(client.getStatus().resyncs, 1, "a hash mismatch automatically requests and applies a full authoritative state");

const realtimeMessages = [];
const originalRealtime = clientTransport.sendRealtime;
clientTransport.sendRealtime = (value) => { realtimeMessages.push(structuredClone(value)); return originalRealtime(value); };
client.setLocalInput({ move: 1 });
for (let index = 0; index < 8; index += 1) { client.tick(1 / 60); host.tick(1 / 60); }
assert.ok(realtimeMessages.some((message) => message.type === "input-bundle" && message.frames.length > 1), "recent inputs are bundled redundantly");
assert.ok(client.getStatus().jitterMs >= 0 && client.getStatus().connectionQuality, "quality metrics are exposed");

host.receive("control", { type: "player-ready", protocolVersion: 2, player: 0, ready: true, profile: { name: "Guest" } });
host.tick(1 / 60);
assert.equal(host.getStatus().profiles[0].name, "Player 1", "a peer cannot spoof the host player index");
assert.equal(host.getStatus().profiles[1].name, "Guest", "remote profile changes are bound to the transport role");

client.requestRematch();
host.requestRematch();
host.tick(1 / 60); client.tick(1 / 60);
assert.deepEqual(client.getStatus().rematch, { 0: false, 1: false }, "two votes restart a match in the same room");

const timeoutTransport = transport(() => true);
timeoutTransport.pair({ deliver() {}, transportReady() {} });
const timeoutClient = createMultiplayerHostController({ ...common, provider: timeoutTransport, handshakeTimeoutTicks: 8, createNonce: () => "timeout" });
await timeoutClient.joinSession();
for (let index = 0; index < 9; index += 1) timeoutClient.tick(1 / 60);
assert.equal(timeoutClient.getStatus().phase, "failed", "a silent peer cannot leave syncing stuck forever");

const versionHostTransport = transport(), versionClientTransport = transport();
versionHostTransport.pair(versionClientTransport); versionClientTransport.pair(versionHostTransport);
const versionHost = createMultiplayerHostController({ ...common, provider: versionHostTransport, protocolVersion: 1 });
const versionClient = createMultiplayerHostController({ ...common, provider: versionClientTransport, protocolVersion: 2, createNonce: () => "version" });
await versionHost.createSession(); await versionClient.joinSession();
versionHost.tick(1 / 60); versionClient.tick(1 / 60);
assert.equal(versionHost.getStatus().phase, "failed", "protocol mismatches fail explicitly");
assert.equal(versionClient.getStatus().phase, "failed", "protocol mismatch reaches both peers");

client.disconnect(); host.disconnect();
console.log("multiplayer-host-kit smoke ok");
