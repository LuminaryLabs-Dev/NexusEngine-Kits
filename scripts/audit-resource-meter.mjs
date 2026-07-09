import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createAudit, writeText } from "./audit-utils.mjs";
import { createNexusEngineKitInstaller } from "../installer/index.js";

const audit = createAudit("Resource Meter Behavior Audit");

try {
  const engine = createRealtimeGame({ kits: [createCoreSimulationKit()] });
  const installer = createNexusEngineKitInstaller();
  const report = await installer.installKit(engine, "generic-resource-loop-kit", {
    resources: [{ id: "fuel", max: 100, initial: 60, ratePerSecond: -5 }]
  });
  assert.equal(report.installed, true);
  assert.equal(engine.n.resourceMeter.get("fuel").value, 60);
  engine.tick(1);
  assert.equal(engine.n.resourceMeter.get("fuel").value, 55);
  engine.n.resourceMeter.spend("fuel", 10);
  const snapshot = engine.n.resourceMeter.getSnapshot();
  engine.n.resourceMeter.reset();
  engine.n.resourceMeter.loadSnapshot(snapshot);
  assert.equal(engine.n.resourceMeter.get("fuel").value, 45);
  assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");
} catch (error) {
  audit.error(error?.message ?? String(error));
}

writeText("audit/reports/resource-meter-behavior-report.md", `# Resource Meter Behavior Report

Validated behaviors:

- official installer resolution
- native NexusEngine DSK installation
- coexistence with core simulation
- passive rate and explicit spend
- snapshot, reset, and exact restore

Status: ${audit.ok() ? "passing" : "failing"}
`);

audit.finish("resource-meter-behavior-report");
