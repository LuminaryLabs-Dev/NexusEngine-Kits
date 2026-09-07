# WebGPU provider migration verification

Four optional providers moved from Engine Core to `n:host:gpu-providers`: Host,
Render, Frame and Compute. Concrete code lives under adapters/gpu/webgpu; four
manifest identities, factory wrappers, package exports, registry entries,
limitations and original source lineage are reconciled. No Authoring source
logic or renderer handles enter Core. No hardware promotion is claimed.

Engine dependency: `a74e8689d1a71c0b42236c009f0f4c46e9b89387`; package metadata
records registry and packed-artifact hashes. A clean npm-ci lock proof compares
all 1,886 installed Engine files against that packed commit. npm run check passes
with the exact Engine implementation, including all four preserved provider
fixtures, registry, installer, public-export and generated-file checks.

The registry has 140 identities: 23 official, 14 candidate, 8 scaffolded and 95
metadata placeholders. This change does not promote those unrelated unfinished
records. The PeerJS manifest integrity correction is standard regeneration
against its unchanged source; no PeerJS behavior changed.

This commit is the second delivery commit. Editor records its exact identity
after it exists; ordinary main push and remote verification follow final clean
consumer proof.
