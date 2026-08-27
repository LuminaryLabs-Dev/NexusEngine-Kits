# Multiplayer Host Kit

A provider-neutral authoritative-host controller with fixed ticks, client prediction, input acknowledgements, reconciliation, snapshot buffering, and tick-based heartbeat latency.

Pass a transport provider and a game simulation adapter. Network callbacks are queued and consumed only inside fixed ticks.
