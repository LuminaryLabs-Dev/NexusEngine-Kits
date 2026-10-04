import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createHash } from "node:crypto";
import { adapterKit } from "../../emulation/kit-factory.js";
const formats = { ".gb": "gb", ".gbc": "gbc", ".nes": "nes", ".fds": "fds", ".sfc": "snes", ".smc": "snes", ".gba": "gba", ".z64": "n64", ".v64": "n64", ".n64": "n64", ".nds": "nds", ".3ds": "3ds", ".nsp": "switch", ".xci": "switch" };
export async function loadNintendoContent(path, { maxBytes = 128 * 1024 * 1024 } = {}) {
  const absolute = resolve(path), info = await stat(absolute);
  if (!info.isFile() || info.size === 0 || info.size > maxBytes) throw new Error("Invalid content size/type.");
  const bytes = await readFile(absolute); if (bytes.length > maxBytes) throw new Error("Content changed beyond byte budget.");
  const extension = extname(absolute).toLowerCase(); let system = formats[extension];
  if (bytes.subarray(0, 4).equals(Buffer.from([78, 69, 83, 26]))) system = "nes";
  if (!system) throw new Error("Unrecognized content format; optical images need an explicit system provider.");
  if (["gb", "gbc"].includes(system) && bytes.length < 0x150) throw new Error("Truncated Game Boy header.");
  if (system === "nes" && bytes.length < 16) throw new Error("Truncated NES header.");
  return { path: absolute, system, extension, bytes: bytes.length, contentHash: `sha256:${createHash("sha256").update(bytes).digest("hex")}` };
}
export function createNintendoContentLoaderKit(config = {}) {
  return adapterKit({ id: "nintendo-content-loader-kit", domain: "nintendo-content-loader", domainPath: "n:asset:extensions:nintendo-content", parentDomainPath: "n:asset:extensions", apiName: "nintendoContent", requires: ["n:asset"], provides: ["emulation:content-loader"], config, createApi({ engine }) { return { async load(path) { const content = await loadNintendoContent(path, config); engine.n.asset.registerAsset({ id: content.contentHash, kind: "rom", contentHash: content.contentHash, sources: [{ uri: content.path }], metadata: { system: content.system, bytes: content.bytes } }); return content; } }; } });
}
