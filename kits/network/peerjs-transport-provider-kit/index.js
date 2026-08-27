const clone = (value) => value == null ? value : structuredClone(value);

export function createPeerJSTransportProvider(options = {}) {
  const Peer = options.Peer;
  if (typeof Peer !== "function") throw new TypeError("PeerJS transport requires an injected Peer constructor.");

  let peer = null, control = null, realtime = null, callbacks = {}, openedAt = 0, generation = 0;
  let phase = "idle", sent = { control: 0, realtime: 0 }, received = { control: 0, realtime: 0 };
  const timeoutMs = Math.max(1000, Number(options.connectionTimeoutMs ?? 12000));

  const status = (next, detail = {}) => {
    phase = next;
    callbacks.onStatus?.({ phase: next, ...detail });
  };
  const withTimeout = (promise, label) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms.`)), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
  const maybeReady = (peerId) => {
    if (control?.open && realtime?.open && phase !== "transport-ready") status("transport-ready", { peerId });
  };

  const bindConnection = (connection, connectionGeneration = generation) => {
    if (!connection || !["nexus-control", "nexus-realtime"].includes(connection.label)) {
      connection?.close?.();
      return;
    }
    const channel = connection.label === "nexus-control" ? "control" : "realtime";
    const previous = channel === "control" ? control : realtime;
    if (previous && previous !== connection) previous.close?.();
    if (channel === "control") control = connection; else realtime = connection;
    connection.on("data", (payload) => {
      if (connectionGeneration !== generation) return;
      received[channel] += 1;
      callbacks.onMessage?.(channel, clone(payload), connection.peer);
    });
    connection.on("open", () => {
      if (connectionGeneration !== generation) return;
      maybeReady(connection.peer);
    });
    connection.on("close", () => {
      if (connectionGeneration !== generation) return;
      status("connection-lost", { peerId: connection.peer });
    });
    connection.on("error", (error) => {
      if (connectionGeneration !== generation) return;
      status("failed", { message: String(error?.message ?? error) });
    });
  };

  const createPeer = (id) => {
    const peerGeneration = ++generation;
    return withTimeout(new Promise((resolve, reject) => {
      let opened = false;
      peer = new Peer(id, options.peerOptions ?? {});
      peer.on("connection", (connection) => bindConnection(connection, peerGeneration));
      peer.on("open", (peerId) => {
        if (peerGeneration !== generation) return;
        opened = true;
        openedAt = Date.now();
        resolve(peerId);
      });
      peer.on("error", (error) => {
        if (peerGeneration !== generation) return;
        if (!opened) reject(error);
        else status("failed", { message: String(error?.message ?? error) });
      });
      peer.on("disconnected", () => {
        if (peerGeneration === generation) status("connection-lost");
      });
      peer.on("close", () => {
        if (peerGeneration === generation) status("closed");
      });
    }), "PeerJS open");
  };
  const waitOpen = (connection) => withTimeout(new Promise((resolve, reject) => {
    if (connection.open) return resolve();
    connection.on("open", resolve);
    connection.on("error", reject);
  }), `${connection.label} connection`);
  const send = (channel, payload) => {
    const connection = channel === "control" ? control : realtime;
    if (!connection?.open) return false;
    try {
      connection.send(clone(payload));
      sent[channel] += 1;
      return true;
    } catch (error) {
      status("failed", { message: String(error?.message ?? error) });
      return false;
    }
  };

  function closeConnections(nextPhase = "closed") {
    generation += 1;
    const oldControl = control, oldRealtime = realtime, oldPeer = peer;
    control = realtime = peer = null;
    oldControl?.close?.();
    oldRealtime?.close?.();
    oldPeer?.disconnect?.();
    status(nextPhase);
  }

  return {
    id: "peerjs",
    capabilities: Object.freeze({ peerToPeer: true, control: "reliable", realtime: "latency-first", jsonPortable: true }),
    initialize(next = {}) { callbacks = next; return this; },
    async createSession(config = {}) {
      status("opening");
      try {
        const peerId = await createPeer(config.peerId);
        status("listening", { sessionId: peerId });
        return { sessionId: peerId, peerId };
      } catch (error) {
        status("failed", { message: String(error?.message ?? error) });
        throw error;
      }
    },
    async joinSession(config = {}) {
      const sessionId = String(config.sessionId ?? "").trim();
      if (!sessionId) throw new TypeError("PeerJS joinSession requires sessionId.");
      status("connecting");
      try {
        const peerId = await createPeer(config.peerId);
        const connectionGeneration = generation;
        control = peer.connect(sessionId, { label: "nexus-control", reliable: true, serialization: "json" });
        realtime = peer.connect(sessionId, { label: "nexus-realtime", reliable: false, serialization: "json" });
        bindConnection(control, connectionGeneration);
        bindConnection(realtime, connectionGeneration);
        await Promise.all([waitOpen(control), waitOpen(realtime)]);
        maybeReady(sessionId);
        return { sessionId, peerId };
      } catch (error) {
        status("failed", { message: String(error?.message ?? error) });
        throw error;
      }
    },
    sendControl(payload) { return send("control", payload); },
    sendRealtime(payload) { return send("realtime", payload); },
    getStats() {
      return {
        id: "peerjs", phase, open: Boolean(peer?.open),
        connected: Boolean(control?.open && realtime?.open), openedAt,
        sent: clone(sent), received: clone(received)
      };
    },
    close() { closeConnections("closed"); },
    reset() {
      closeConnections("closed");
      openedAt = 0;
      sent = { control: 0, realtime: 0 };
      received = { control: 0, realtime: 0 };
      phase = "idle";
    },
    dispose() {
      generation += 1;
      control?.close?.();
      realtime?.close?.();
      peer?.destroy?.();
      control = realtime = peer = null;
      callbacks = {};
      phase = "disposed";
    }
  };
}
