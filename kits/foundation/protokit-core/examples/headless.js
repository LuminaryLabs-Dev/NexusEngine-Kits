import { createRealtimeGame } from "nexusengine";
import { createNexusEngineKitInstaller } from "@luminarylabs/nexusengine-kits/installer";

const engine = createRealtimeGame();
const installer = createNexusEngineKitInstaller({
  allowStatuses: ["official", "deprecated"]
});

await installer.installKit(engine, "protokit-core");
console.log(engine.n.protokitCore.getSnapshot());
