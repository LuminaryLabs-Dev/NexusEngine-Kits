import { createNexusEngineKitInstaller } from "./kit-installer.js";

export async function installKit(engine, kitOrId, config = {}, options = {}) {
  return createNexusEngineKitInstaller(options).installKit(engine, kitOrId, config);
}
