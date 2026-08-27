# Multiplayer Host Kit

A provider-neutral authoritative-host controller with fixed ticks, client prediction, input acknowledgements, reconciliation, snapshot buffering, and tick-based heartbeat latency.

Transport status and match status are separate. A versioned, nonce-bound handshake retries dropped setup messages, validates the initial state hash, establishes a shared start window, and fails with a bounded timeout instead of remaining in `syncing`.

Pass a transport provider and a game simulation adapter. Network callbacks are queued and consumed only inside fixed ticks. Applications must continue calling `tick()` while creating, waiting, connecting, and syncing so the deterministic control queue and deadlines advance.
