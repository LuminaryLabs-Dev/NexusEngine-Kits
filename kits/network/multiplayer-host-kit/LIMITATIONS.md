# Limitations

- Full rollback is intentionally out of scope.
- The application must supply deterministic simulation and interpolation policy.
- Reconnect and host migration require provider support and are proven only by deterministic/in-memory tests until a production signaling deployment is supplied.
- Host rewind supplies historical states; the game simulation remains responsible for its own collision and anti-cheat policy.
- Tick-based handshake and heartbeat deadlines advance only while the application pumps the controller.
