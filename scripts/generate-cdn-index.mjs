import fs from "node:fs";
import { cdnUrlForKit, listKitIds } from "../installer/kit-catalog.js";

const lines = listKitIds().map((kitId) => `${kitId} ${cdnUrlForKit(kitId)}`);
fs.writeFileSync(new URL("../docs/CDN-INDEX.txt", import.meta.url), lines.join("\n") + "\n");
console.log("cdn index generated", { kits: lines.length });
