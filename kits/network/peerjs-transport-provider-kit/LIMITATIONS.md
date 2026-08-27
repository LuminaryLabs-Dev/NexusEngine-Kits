# Limitations

- Signaling availability is controlled by the configured PeerJS service.
- Restrictive networks require application-supplied TURN servers.
- Durable room discovery and migration arbitration are not provided; the controller/game must decide when the surviving peer may call `takeoverSession()`.
