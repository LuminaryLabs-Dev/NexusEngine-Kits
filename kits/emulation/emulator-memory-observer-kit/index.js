import { adapterKit } from "../kit-factory.js";
export function extractMemorySegments(receipt) {
  const binary = receipt.binary; if (!(binary instanceof Uint8Array)) throw new TypeError("Receipt requires binary payload.");
  const segments = new Map(), occupied = [];
  for (const segment of receipt.result.segments ?? []) {
    if (typeof segment.id !== "string" || segments.has(segment.id) || !Number.isSafeInteger(segment.offset) || !Number.isSafeInteger(segment.length) || segment.offset < 0 || segment.length < 0 || segment.offset + segment.length > binary.length) throw new Error("Invalid memory/output segment.");
    if (occupied.some(other => segment.offset < other.end && segment.offset + segment.length > other.start)) throw new Error("Overlapping payload segments.");
    occupied.push({ start: segment.offset, end: segment.offset + segment.length });
    segments.set(segment.id, Uint8Array.from(binary.subarray(segment.offset, segment.offset + segment.length)));
  }
  return segments;
}
export function createEmulatorMemoryObserverKit() {
  return adapterKit({ id: "emulator-memory-observer-kit", domain: "emulator-memory-observer", domainPath: "n:host:extensions:emulator-memory", parentDomainPath: "n:host:extensions", apiName: "emulatorMemory", requires: ["emulation:frame-step"], provides: ["emulation:memory-observation"], createApi() { return { extract: extractMemorySegments }; } });
}
