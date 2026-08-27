import assert from "node:assert/strict";
import { createPeerJSTransportProvider } from "./index.js";

class Emitter { constructor() { this.handlers = {}; } on(name, handler) { (this.handlers[name] ??= []).push(handler); return this; } emit(name, ...args) { for (const handler of this.handlers[name] ?? []) handler(...args); } }
class Connection extends Emitter { constructor(peer, options) { super(); this.peer = peer; this.label = options.label; this.options = options; this.open = false; this.sent = []; queueMicrotask(() => { this.open = true; this.emit("open"); }); } send(value) { this.sent.push(value); } close() { this.open = false; this.emit("close"); } }
class Peer extends Emitter { static instances = []; constructor(id, options) { super(); this.id = id ?? `peer-${Peer.instances.length}`; this.options = options; this.open = false; this.connections = []; Peer.instances.push(this); queueMicrotask(() => { this.open = true; this.emit("open", this.id); }); } connect(id, options) { const value = new Connection(id, options); this.connections.push(value); return value; } disconnect() { this.open = false; this.emit("disconnected"); } destroy() { this.open = false; this.emit("close"); } }

const phases = [], messages = [];
const provider = createPeerJSTransportProvider({ Peer, peerOptions: { config: { iceServers: [{ urls: "turn:test" }] } } });
provider.initialize({ onStatus(value) { phases.push(value.phase); }, onMessage(...value) { messages.push(value); } });
await provider.joinSession({ sessionId: "host-room", peerId: "guest" });
const [control, realtime] = Peer.instances[0].connections;
assert.equal(control.options.reliable, true);
assert.equal(realtime.options.reliable, false);
assert.deepEqual(Peer.instances[0].options.config.iceServers, [{ urls: "turn:test" }]);
assert.equal(provider.sendControl({ type: "hello" }), true);
assert.equal(provider.sendRealtime({ type: "input" }), true);
realtime.emit("data", { type: "snapshot" });
assert.equal(messages[0][0], "realtime");
assert.ok(phases.includes("transport-ready"));
assert.ok(!phases.includes("ready"), "transport never claims match readiness");
assert.equal(provider.getStats().sent.realtime, 1);
assert.equal(provider.getStats().phase, "transport-ready");
provider.dispose();
assert.equal(Peer.instances[0].open, false);
console.log("peerjs-transport-provider-kit smoke ok");
