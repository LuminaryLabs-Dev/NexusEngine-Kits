import { createNexusEngineKitInstaller } from "../../installer/index.js";

export async function runHeadlessSmoke() {
  const engine = {
    kits: [],
    installKit(kit) {
      this.kits.push(kit);
      return kit;
    }
  };

  const installer = createNexusEngineKitInstaller();
  await installer.installKit(engine, "completion-ledger-kit");
  await installer.installDomain(engine, "input");
  return engine.kits.map((kit) => kit.id);
}
