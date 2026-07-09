# Limitations

- Graph analysis is metadata-only and does not load or install modules.
- When multiple kits provide one token, deterministic planning selects the lexicographically first provider unless the host supplies an explicit selection policy.
- Very large federated graphs should be partitioned or cached after construction.
