import { createNexusRealtimeKitInstaller } from "./kit-installer.js";

export async function installKit(engine, kitOrId, config = {}, options = {}) {
  return createNexusRealtimeKitInstaller(options).installKit(engine, kitOrId, config);
}
