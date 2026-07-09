import { createNexusRealtimeKitInstaller } from "./kit-installer.js";

export async function installAllKits(engine, config = {}, options = {}) {
  const kitInstaller = createNexusRealtimeKitInstaller(options);
  return kitInstaller.installAll(engine, config);
}

export { installAllKits as installAll };
