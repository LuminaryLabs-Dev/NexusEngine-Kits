# Failure Modes

Common failure modes:

- package export points to a missing file
- docs imply real behavior for a placeholder kit
- installer falls back to metadata-only behavior when real behavior is expected
- domain install succeeds while most members are placeholders
- parity status does not match kit status
- CDN path resolves but behavior is not production-ready

Use `npm run audit` to detect contradictions where possible.
