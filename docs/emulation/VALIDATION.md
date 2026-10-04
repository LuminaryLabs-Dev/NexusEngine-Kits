# Emulation adapter validation

Ten new adapter Kits remain candidates and are not automatically installable through registry hydration. Their public factories are explicitly composed by NexusRetroHost. The full `npm run check` passes, including generated catalogs/self-lock, boundaries, manifests/exports, docs, existing behavioral suites and emulation boundary proofs.

The integration pair pins NexusEngine commit `2b5e070fab8c73986174b842559b96a7fd2db662`. Core history, rollback/finalization and resolution snapshots are required. Uses only public Engine exports.

NexusRetroHost executed a real C++ worker with pinned SameBoy and 50 hash-verified MIT GBMicrotest ROMs: 49 PASS, 1 FAIL, no TIMEOUT/UNSUPPORTED/HOST_ERROR. The failure is halt_op_dupe_delay.gb (actual 1, expected 85, marker 255), retained as an emulator qualification failure. Native frame commits, save/restore, deterministic replay, reset, bounded rewind and browser upload/playback/inspection passed. bsnes compiled and handshaked; SNES title compatibility is not established.

The PCM proof checks fractional-window continuity, stereo polarity and output length for 2,097,152 Hz input downsampled to 48 kHz. High-rate conversion uses streaming area averaging; it is not a high-order mastering filter. Hardware/device audio quality, complete Nintendo compatibility and game-specific actor extraction remain unqualified. The application's immutable report/lock is the integration evidence location; these results do not promote Kits to official automatically.
