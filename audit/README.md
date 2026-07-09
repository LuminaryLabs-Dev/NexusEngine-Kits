# Audit

This folder tracks truth between docs, catalogs, manifests, package exports, installer behavior, physical files, and real kit behavior.

## Rule

Fail on contradiction. Warn on incompleteness.

Contradictions include missing package export targets, candidate kits without smoke tests, and docs that claim real behavior when manifests say placeholder.

Incompleteness includes planned future kits, placeholder domains, and docs that are intentionally listed before behavior exists.
