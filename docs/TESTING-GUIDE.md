# Testing Guide

Testing proves that the catalog is installable and that rebuilt kits match intended behavior.

## Test areas

- installer smoke
- kit smoke
- domain smoke
- bundle smoke
- CDN smoke
- snapshot and reset
- parity
- exports

## Kit test rule

Every real kit should have a smoke test that imports the kit factory, creates the kit, and checks its ID, domain, metadata, and runtime shape.

## Domain test rule

Every domain should have a smoke test that imports all member kits and verifies that they install together without duplicate IDs.

## Bundle test rule

Every bundle should prove that its domains can be created together and that the installer can produce an install report.
