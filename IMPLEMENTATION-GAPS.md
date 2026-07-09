# Implementation Gaps

This file tracks areas where the catalog shape exists but implementation is incomplete.

| Area | Current state | Missing | Risk | Next fix |
|---|---|---|---|---|
| completion-ledger-kit | candidate real behavior | full ProtoKits parity and domain validation | medium | complete source parity comparison |
| spatial domain | installable | most members are placeholders | high | rebuild spatial-interaction-kit |
| installer | works for candidate and placeholders | dependency lock, remote catalog loading, richer reports | medium | install-plan support |
| bundles | scaffolded | real gameplay behavior across member domains | high | first bundle smoke tests after domain behavior exists |
| package exports | mostly wired | publication and tag stability | medium | release checklist and tagged CDN |
| docs | broad scaffold exists | per-kit behavior docs for most kits | medium | expand as each kit becomes real |
| parity | visible | full behavior comparisons | high | add source-notes per rebuilt kit |

## Rule

A gap is acceptable when it is documented and audited. A contradiction is not acceptable.
