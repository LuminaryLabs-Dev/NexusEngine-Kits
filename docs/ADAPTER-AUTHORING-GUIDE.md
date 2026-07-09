# Adapter Guide

Adapters connect official kits to host, renderer, storage, input, or XR surfaces.

## Adapter owns

- host integration
- renderer integration
- device integration
- storage integration
- conversion from kit descriptors to host behavior

## Adapter does not own

- reusable domain rules
- progression rules
- simulation rules
- state that belongs in a kit

## Required files

```txt
adapters/<adapter-name>/
├─ README.md
├─ adapter.json
├─ index.js
└─ examples/
```
