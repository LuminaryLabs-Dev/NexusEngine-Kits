# Docs Index

This index tracks the documentation layer for NexusRealtime Kits.

## Root docs

- `README.md` — clean rebuild overview.
- `AGENTS.md` — agent operating rules.
- `KIT-CATALOG.md` — catalog overview.
- `KIT-INSTALLER.md` — installer overview.
- `REBUILD-PARITY.md` — ProtoKits parity model.
- `AAA-READINESS.md` — AAA-readiness status.
- `ROADMAP.md` — rebuild roadmap.
- `RELEASE-CHECKLIST.md` — release checklist.
- `KNOWN-LIMITATIONS.md` — current limitations.
- `IMPLEMENTATION-GAPS.md` — implementation gap tracker.
- `FAILURE-MODES.md` — known failure modes.
- `PLACEHOLDER-MATRIX.md` — placeholder and candidate matrix.
- `READINESS-MATRIX.md` — readiness status definitions.
- `AAA-GAP-REGISTER.md` — why this is not AAA-ready yet.

## Core docs

- `docs/START-HERE.md`
- `docs/REBUILD-NOT-MIGRATION.md`
- `docs/AAA-READINESS.md`
- `docs/HOW-TO-INSTALL-ONE-KIT.md`
- `docs/HOW-TO-INSTALL-A-DOMAIN.md`
- `docs/HOW-TO-INSTALL-A-BUNDLE.md`
- `docs/HOW-TO-INSTALL-ALL-KITS.md`
- `docs/CDN-INSTALLATION.md`
- `docs/KIT-NAMING-GRAMMAR.md`
- `docs/KIT-AUTHORING-GUIDE.md`
- `docs/DOMAIN-AUTHORING-GUIDE.md`
- `docs/BUNDLE-AUTHORING-GUIDE.md`
- `docs/ADAPTER-AUTHORING-GUIDE.md`
- `docs/PRESET-AUTHORING-GUIDE.md`
- `docs/PROTOKITS-PARITY-GUIDE.md`
- `docs/TESTING-GUIDE.md`
- `docs/SNAPSHOT-RESET-GUIDE.md`
- `docs/INSTALL-REPORT-GUIDE.md`
- `docs/PACKAGE-EXPORTS-GUIDE.md`
- `docs/DOMAIN-SCOPE-GUIDE.md`
- `docs/VERSIONING-GUIDE.md`
- `docs/KNOWN-LIMITATIONS.md`
- `docs/IMPLEMENTATION-GAPS.md`
- `docs/FAILURE-MODES.md`
- `docs/PLACEHOLDER-MATRIX.md`
- `docs/READINESS-MATRIX.md`
- `docs/AAA-GAP-REGISTER.md`
- `docs/WHAT-INSTALLABLE-MEANS.md`
- `docs/WHAT-CANDIDATE-MEANS.md`
- `docs/WHAT-OFFICIAL-MEANS.md`

## Failure and readiness docs

- `KNOWN-LIMITATIONS.md`
- `IMPLEMENTATION-GAPS.md`
- `FAILURE-MODES.md`
- `PLACEHOLDER-MATRIX.md`
- `READINESS-MATRIX.md`
- `AAA-GAP-REGISTER.md`
- `docs/WHAT-INSTALLABLE-MEANS.md`
- `docs/WHAT-CANDIDATE-MEANS.md`
- `docs/WHAT-OFFICIAL-MEANS.md`

## Contract docs

- `contracts/KIT-MANIFEST.md`
- `contracts/DOMAIN-MANIFEST.md`
- `contracts/REPORT.md` — alias for install report contract.
- `contracts/STATUS-VALUES.md`

## Installer docs

- `installer/INSTALLER-API.md`
- `installer/DYNAMIC-INSTALL.md`
- `installer/CDN.md` — alias for CDN resolution.
- `installer/DOMAIN-INSTALL.md`
- `installer/BUNDLE-INSTALL.md`
- `installer/INSTALL-PLAN.md`
- `installer/ERRORS.md` — alias for error codes.
- `installer/EXAMPLES.md`

## Parity docs

- `parity/OVERVIEW.md`
- `parity/PROTOKITS-SOURCE-MAP.md`
- `parity/source-notes/*.md`

## Domain docs

Each domain should have `README.md` or `DOCS.md`; limitation docs are added first for high-risk domains.

- foundation
- input
- spatial
- progression
- hazard-combat
- economy-resources
- building
- camera-feedback
- render-descriptors
- aerial
- xr
- rpg-social
- rpg-combat
- generic-defense
- route-extraction
- project-deployment
- simulation

## Bundle docs

Each bundle should have `README.md`, `bundle.json`, and examples.

- all
- default-game-stack
- aerial-game-stack
- rpg-game-stack
- defense-game-stack
- xr-authoring-stack
- lightweight-web-stack

## First-wave kit docs

Each first-wave kit should have `README.md` or `LIMITATIONS.md`, `kit.json` when physical, `source-parity.md` when behavior is rebuilt, smoke test when candidate, and examples.

- completion-ledger-kit
- spatial-interaction-kit
- objective-bridge-kit
- lock-group-kit
- damage-health-kit
- resource-node-kit
- build-placement-kit
- structure-runtime-kit
- asset-descriptor-kit
- diegetic-feedback-signal-kit

## Rule

Docs can be scaffolded before behavior is complete, but they must clearly mark placeholder, candidate, official, deprecated, and archived status.
