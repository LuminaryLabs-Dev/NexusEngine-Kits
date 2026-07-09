import { createNexusEngineKitInstaller } from "./kit-installer.js";

export async function installAllKits(engine, config = {}, options = {}) {
  const kitInstaller = createNexusEngineKitInstaller(options);
  return kitInstaller.installAll(engine, config);
}

export { installAllKits as installAll };
