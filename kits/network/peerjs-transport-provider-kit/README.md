# PeerJS Transport Provider Kit

Inject the PeerJS `Peer` constructor to create a replaceable transport provider. Control messages use a reliable data connection; realtime inputs and snapshots use a latency-first connection. PeerJS handles remain private, open/connect/reconnect operations have bounded timeouts, and `transport-ready` is reported without claiming that the multiplayer match handshake is complete. `takeoverSession()` lets a surviving peer reclaim a known room ID when the signaling service permits it.
