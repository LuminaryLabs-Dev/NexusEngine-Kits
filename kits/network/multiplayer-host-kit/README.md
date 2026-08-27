# Multiplayer Host Kit

A provider-neutral authoritative-host controller with fixed ticks, client prediction, redundant input bundles, acknowledgements, reconciliation, full-state resync, snapshot/event buffering, continuous clock correction, reliable match events, ready/rematch/forfeit interactions, reconnect grace, and provider-assisted host migration.

Transport status and match status are separate. A versioned, nonce-bound handshake retries dropped setup messages, validates the initial state hash, establishes a shared start window, and fails with a bounded timeout instead of remaining in `syncing`.

Pass a transport provider and a game simulation adapter. Network callbacks are queued and consumed only inside fixed ticks. Applications must continue calling `tick()` while creating, waiting, connecting, and syncing so the deterministic control queue and deadlines advance.

Browser games that only need the provider-neutral controller can import `controller.js` (or the `./multiplayer-host-controller` package export). That lean entry has no NexusEngine bootstrap dependency. The normal `index.js` entry additionally exposes the installable Domain Service Kit.

The simulation may optionally implement `forfeit`, `configurePlayers`, and `setAuthority`. Its `step` receives an authoritative context with a bounded historical-state lookup so a game can perform host-side rewind without putting game rules into the networking Kit. `selectReliableEvents(before, after, tick)` promotes countdown, hit, K.O., round, and result records onto the reliable control channel.
