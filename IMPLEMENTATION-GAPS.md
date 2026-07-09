# Implementation Gaps

This file tracks areas where the catalog shape exists but implementation is incomplete.

| Area | Current state | Missing | Risk | Next fix |
|---|---|---|---|---|
| completion-ledger-kit | candidate real behavior | full ProtoKits parity and domain validation | medium | complete source parity comparison |
| generic-resource-loop-kit | official real behavior | no current behavior gap | low | keep source/core/package/replay gates green |
| spatial domain | installable | most members are placeholders | high | rebuild spatial-interaction-kit |
| installer | resolves official factories and fails closed on unready statuses | dependency lock, remote registry loading, richer reports | medium | registry control plane and install-plan support |
| bundles | scaffolded | real gameplay behavior across member domains | high | first bundle smoke tests after domain behavior exists |
| package exports | mostly wired | publication and tag stability | medium | release checklist and tagged CDN |
| docs | broad scaffold exists | per-kit behavior docs for most kits | medium | expand as each kit becomes real |
| parity | visible | full behavior comparisons | high | add source-notes per rebuilt kit |

## Rule

A gap is acceptable when it is documented and audited. A contradiction is not acceptable.
