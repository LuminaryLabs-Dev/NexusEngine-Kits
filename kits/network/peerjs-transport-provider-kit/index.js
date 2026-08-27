const clone = (value) => value == null ? value : structuredClone(value);

export function createPeerJSTransportProvider(options = {}) {
  const Peer = options.Peer;
  if (typeof Peer !== "function") throw new TypeError("PeerJS transport requires an injected Peer constructor.");
  let peer = null, control = null, realtime = null, callbacks = {}, openedAt = 0, sent = { control: 0, realtime: 0 }, received = { control: 0, realtime: 0 };

  const status = (phase, detail = {}) => callbacks.onStatus?.({ phase, ...detail });
  const bindConnection = (connection) => {
    const channel = connection.label === "nexus-control" ? "control" : "realtime";
    if (channel === "control") control = connection; else realtime = connection;
    connection.on("data", (payload) => { received[channel] += 1; callbacks.onMessage?.(channel, clone(payload), connection.peer); });
    connection.on("open", () => { if (control?.open && realtime?.open) status("ready", { peerId: connection.peer }); });
    connection.on("close", () => status("connection-lost", { peerId: connection.peer }));
    connection.on("error", (error) => status("failed", { message: String(error?.message ?? error) }));
  };
  const timeoutMs = Math.max(1000, Number(options.connectionTimeoutMs ?? 12000));
  const withTimeout = (promise, label) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms.`)), timeoutMs); promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); }); });
  const createPeer = (id) => withTimeout(new Promise((resolve, reject) => {
    peer = new Peer(id, options.peerOptions ?? {});
    peer.on("open", (peerId) => { openedAt = Date.now(); peer.on("connection", bindConnection); resolve(peerId); });
    peer.on("error", reject);
    peer.on("disconnected", () => status("connection-lost"));
  }), "PeerJS open");
  const waitOpen = (connection) => withTimeout(new Promise((resolve, reject) => { if (connection.open) return resolve(); connection.on("open", resolve); connection.on("error", reject); }), `${connection.label} connection`);
  const send = (channel, payload) => { const connection = channel === "control" ? control : realtime; if (!connection?.open) return false; connection.send(clone(payload)); sent[channel] += 1; return true; };

  return {
    id: "peerjs",
    capabilities: Object.freeze({ peerToPeer: true, control: "reliable", realtime: "latency-first", jsonPortable: true }),
    initialize(next = {}) { callbacks = next; return this; },
    async createSession(config = {}) { status("creating"); const peerId = await createPeer(config.peerId); status("waiting", { sessionId: peerId }); return { sessionId: peerId, peerId }; },
    async joinSession(config = {}) { const sessionId = String(config.sessionId ?? "").trim(); if (!sessionId) throw new TypeError("PeerJS joinSession requires sessionId."); status("connecting"); const peerId = await createPeer(config.peerId); control = peer.connect(sessionId, { label: "nexus-control", reliable: true, serialization: "json" }); realtime = peer.connect(sessionId, { label: "nexus-realtime", reliable: false, serialization: "json" }); bindConnection(control); bindConnection(realtime); await Promise.all([waitOpen(control), waitOpen(realtime)]); status("ready", { sessionId, peerId }); return { sessionId, peerId }; },
    sendControl(payload) { return send("control", payload); },
    sendRealtime(payload) { return send("realtime", payload); },
    getStats() { return { id: "peerjs", open: Boolean(peer?.open), connected: Boolean(control?.open && realtime?.open), openedAt, sent: clone(sent), received: clone(received) }; },
    close() { control?.close(); realtime?.close(); peer?.disconnect?.(); status("closed"); },
    reset() { this.close(); control = realtime = null; sent = { control: 0, realtime: 0 }; received = { control: 0, realtime: 0 }; },
    dispose() { control?.close(); realtime?.close(); peer?.destroy?.(); control = realtime = peer = null; callbacks = {}; }
  };
}
