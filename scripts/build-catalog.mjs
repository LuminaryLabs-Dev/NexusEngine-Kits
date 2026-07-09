import fs from "node:fs";
import { KIT_CATALOG } from "../installer/kit-catalog.js";

fs.writeFileSync(new URL("../kit-catalog.json", import.meta.url), JSON.stringify(KIT_CATALOG, null, 2) + "\n");
console.log("catalog written", { domains: Object.keys(KIT_CATALOG.domains).length });
