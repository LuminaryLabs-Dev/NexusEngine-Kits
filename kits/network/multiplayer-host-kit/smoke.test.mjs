import assert from "node:assert/strict";
import { createMultiplayerHostController } from "./index.js";

function transport() {
  let receiver = null, remote = null, dropped = 0;
  return {
    id: "memory", capabilities: {},
    initialize({ onMessage }) { receiver = onMessage; },
    pair(value) { remote = value; },
    async createSession() { return { sessionId: "room" }; }, async joinSession() { return { sessionId: "room" }; },
    sendControl(value) { remote.deliver("control", value); return true; },
    sendRealtime(value) { if (++dropped % 5 === 0) return false; remote.deliver("realtime", value); return true; },
    deliver(channel, value) { receiver(channel, value); }, getStats() { return { dropped }; }, close() {}, reset() {}, dispose() {}
  };
}
const simulation = {
  createInitialState() { return { x: 0, velocity: 0 }; }, captureState: structuredClone, loadState: structuredClone,
  applyInputs(state, inputs) { const input = inputs.local ?? inputs.host ?? {}; return { ...state, velocity: Number(input.move ?? 0) }; },
  step(state, dt) { return { ...state, x: Math.round((state.x + state.velocity * dt * 60) * 1000) / 1000 }; },
  hashState(state) { return JSON.stringify(state); }
};
const hostTransport = transport(), clientTransport = transport(); hostTransport.pair(clientTransport); clientTransport.pair(hostTransport);
const host = createMultiplayerHostController({ provider: hostTransport, simulation, tickRate: 60, snapshotRate: 20 });
const client = createMultiplayerHostController({ provider: clientTransport, simulation, tickRate: 60, snapshotRate: 20 });
await host.createSession(); await client.joinSession();
client.setLocalInput({ move: 1 });
client.tick(1 / 60);
assert.equal(client.getRenderState().state.x, 1, "guest predicts immediately");
for (let index = 0; index < 12; index += 1) { host.tick(1 / 60); client.tick(1 / 60); }
assert.ok(client.getRenderState().interpolation.length > 0, "guest buffers host snapshots");
assert.ok(client.getStatus().pendingInputs < 12, "host acknowledgements prune predicted inputs");
const pendingBefore = client.getStatus().pendingInputs; client.tick(1 / 60); assert.ok(client.getStatus().pendingInputs >= pendingBefore, "new inputs continue after full acknowledgement");
assert.equal(host.getStatus().tick, 12);
client.disconnect(); host.disconnect();
console.log("multiplayer-host-kit smoke ok");
