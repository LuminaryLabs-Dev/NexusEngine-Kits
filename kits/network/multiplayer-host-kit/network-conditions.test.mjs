import assert from "node:assert/strict";
import { createMultiplayerHostController } from "./controller.js";

function createNetwork() {
  let now = 0, packet = 0;
  const queue = [], endpoints = [];
  const delays = [80, 110, 145, 200, 90, 175, 125];
  function endpoint() {
    let callbacks = {}, remote, dropped = 0, sent = { control: 0, realtime: 0 }, received = { control: 0, realtime: 0 };
    const api = {
      initialize(next) { callbacks = next; }, pair(other) { remote = other; },
      async createSession() { callbacks.onStatus?.({ phase: "listening" }); return { sessionId: "jitter-room" }; },
      async joinSession() { callbacks.onStatus?.({ phase: "transport-ready" }); remote.ready(); return { sessionId: "jitter-room" }; },
      ready() { callbacks.onStatus?.({ phase: "transport-ready" }); },
      sendControl(value) { sent.control += 1; queue.push({ at: now + delays[packet++ % delays.length], remote, channel: "control", value: structuredClone(value) }); return true; },
      sendRealtime(value) {
        sent.realtime += 1;
        if (++packet % 11 === 0) { dropped += 1; return false; }
        queue.push({ at: now + delays[packet % delays.length], remote, channel: "realtime", value: structuredClone(value) }); return true;
      },
      deliver(channel, value) { received[channel] += 1; callbacks.onMessage?.(channel, value); },
      getStats() { return { sent, received, dropped }; }, close() {}, reset() {}, dispose() {}
    };
    endpoints.push(api); return api;
  }
  return {
    endpoint,
    advance(ms) {
      now += ms;
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        if (queue[index].at <= now) { const [message] = queue.splice(index, 1); message.remote.deliver(message.channel, message.value); }
      }
    }
  };
}

const simulation = {
  createInitialState: () => ({ x0: 0, x1: 0 }), captureState: structuredClone, loadState: structuredClone,
  applyInputs(state, inputs) { return { ...state, v0: Number(inputs.host?.move ?? state.v0 ?? 0), v1: Number(inputs.local?.move ?? state.v1 ?? 0) }; },
  step(state) { return { ...state, x0: (state.x0 ?? 0) + (state.v0 ?? 0), x1: (state.x1 ?? 0) + (state.v1 ?? 0) }; },
  hashState: JSON.stringify
};
const network = createNetwork(), hostTransport = network.endpoint(), clientTransport = network.endpoint();
hostTransport.pair(clientTransport); clientTransport.pair(hostTransport);
const options = { simulation, tickRate: 60, snapshotRate: 20, handshakeRetryTicks: 12, handshakeTimeoutTicks: 900, startDelayTicks: 30, redundantInputFrames: 8 };
const host = createMultiplayerHostController({ ...options, provider: hostTransport });
const client = createMultiplayerHostController({ ...options, provider: clientTransport, createNonce: () => "jitter-test" });
await host.createSession(); await client.joinSession();
client.setLocalInput({ move: 1 });
for (let frame = 0; frame < 720; frame += 1) { network.advance(1000 / 60); host.tick(1 / 60); client.tick(1 / 60); if (frame === 500) client.setLocalInput({ move: 0 }); }
assert.equal(host.getStatus().phase, "ready", "host remains ready under sustained delay and jitter");
assert.equal(client.getStatus().phase, "ready", "client remains ready under sustained delay and jitter");
assert.ok(client.getStatus().pendingInputs < 30, "redundancy allows acknowledgements to drain under loss");
assert.ok(client.getStatus().latencyMs >= 50, "continuous ping samples reflect network latency");
assert.ok(client.getStatus().jitterMs > 0, "continuous ping samples expose jitter");
assert.ok(client.getStatus().lossPercent > 0, "transport loss is exposed");
for (let frame = 0; frame < 180; frame += 1) { network.advance(1000 / 60); host.tick(1 / 60); client.tick(1 / 60); }
assert.ok(Math.abs(host.getRenderState().state.x1 - client.getRenderState().state.x1) < 3, "settled peers converge after 80-200 ms delay, jitter, and loss");
console.log("multiplayer-host-kit network conditions ok");
