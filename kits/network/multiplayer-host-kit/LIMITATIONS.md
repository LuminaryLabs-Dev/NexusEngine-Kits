# Limitations

- Full rollback is intentionally out of scope.
- The application must supply deterministic simulation and interpolation policy.
- Production reconnect and host migration are not yet proven.
- Tick-based handshake and heartbeat deadlines advance only while the application pumps the controller.
