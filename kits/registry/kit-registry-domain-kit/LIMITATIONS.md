# Limitations

- Owns serializable metadata only; it does not fetch repositories, import modules, execute code, install kits, or write lockfiles.
- A registry template with `resolvedCommit: null` is discovery metadata only. A source adapter must hydrate and verify a full commit SHA before trust or installation.
- Search is linear in manifest count; hosts should filter or index externally for very large federated catalogs.
