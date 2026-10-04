import { mkdir, writeFile, readFile, stat, rename, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { adapterKit } from "../../emulation/kit-factory.js";
const hash = bytes => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
export async function writeSnapshotBundle(path, bundle) {
  const blob = Buffer.from(bundle.binary);
  const metadata = { ...bundle.metadata, schema: "nexusretro.save/1", binaryHash: hash(blob), binaryBytes: blob.length };
  const header = Buffer.from(JSON.stringify(metadata)); if (header.length > 16 * 1024 * 1024 || blob.length > 128 * 1024 * 1024) throw new Error("Snapshot exceeds budget.");
  const prefix = Buffer.alloc(4); prefix.writeUInt32LE(header.length); const target = resolve(path), temporary = `${target}.${randomUUID()}.tmp`;
  await mkdir(dirname(target), { recursive: true });
  try { await writeFile(temporary, Buffer.concat([prefix, header, blob]), { flag: "wx", mode: 0o600 }); await rename(temporary, target); } finally { await rm(temporary, { force: true }); }
  return metadata;
}
export async function readSnapshotBundle(path) {
  const info = await stat(path); if (info.size < 4 || info.size > 144 * 1024 * 1024) throw new Error("Invalid save size.");
  const bytes = await readFile(path); if (bytes.length < 4 || bytes.length > 144 * 1024 * 1024) throw new Error("Invalid save size.");
  const size = bytes.readUInt32LE(); if (size > 16 * 1024 * 1024 || size > bytes.length - 4) throw new Error("Invalid save header.");
  const metadata = JSON.parse(bytes.subarray(4, 4 + size).toString("utf8")), binary = bytes.subarray(4 + size);
  if (metadata.schema !== "nexusretro.save/1" || metadata.binaryBytes !== binary.length || metadata.binaryHash !== hash(binary)) throw new Error("Snapshot integrity mismatch.");
  return { metadata, binary };
}
export function createFilesystemSnapshotAdapterKit() {
  return adapterKit({ id: "filesystem-snapshot-adapter-kit", domain: "filesystem-snapshot-adapter", domainPath: "n:runtime:persistence:extensions:filesystem-snapshot", parentDomainPath: "n:runtime:persistence:extensions", apiName: "snapshotFiles", requires: ["n:runtime:persistence"], provides: ["persistence:filesystem-snapshot"], createApi({ engine }) { return { async save(path, bundle) { const metadata = await writeSnapshotBundle(path, bundle); engine.n.persistence.setDescriptor("slots", resolve(path), { contentHash: metadata.contentHash, sourceFrame: metadata.sourceFrame }); return metadata; }, load: readSnapshotBundle }; } });
}
