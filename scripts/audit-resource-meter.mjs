import assert from "node:assert/strict";
import { createRealtimeGame } from "nexusengine";
import { createCoreSimulationKit } from "nexusengine/core-kits";
import { createAudit, writeText } from "./audit-utils.mjs";
import { createNexusEngineKitInstaller } from "../installer/index.js";

const audit = createAudit("Resource Meter Behavior Audit");

try {
  const engine = createRealtimeGame({
    tick: { maxDelta: 1 },
    kits: [createCoreSimulationKit({
      resourceMeters: [{ id: "fuel", max: 100, initial: 60, ratePerSecond: -5 }]
    })]
  });
  const installer = createNexusEngineKitInstaller();
  const report = await installer.installKit(engine, "generic-resource-loop-kit", {
    resources: [{ id: "fuel", max: 100, initial: 60, ratePerSecond: -5 }]
  });
  assert.equal(report.installed, false);
  assert.equal(report.reason, "status-not-allowed");
  assert.equal(engine.n.resourceMeter.get("fuel").value, 60);
  engine.tick(1);
  assert.equal(engine.n.resourceMeter.get("fuel").value, 55);
  engine.n.resourceMeter.spend("fuel", 10);
  const snapshot = engine.n.resourceMeter.getSnapshot();
  engine.n.resourceMeter.reset();
  engine.n.resourceMeter.loadSnapshot(snapshot);
  assert.equal(engine.n.resourceMeter.get("fuel").value, 45);
  assert.equal(typeof engine.n.coreSimulation.getSnapshot, "function");

  const compatibilityEngine = createRealtimeGame({ tick: { maxDelta: 1 } });
  const compatibilityInstaller = createNexusEngineKitInstaller({
    allowStatuses: ["official", "deprecated"]
  });
  const compatibility = await compatibilityInstaller.installKit(
    compatibilityEngine,
    "generic-resource-loop-kit",
    { resources: [{ id: "legacy-fuel", max: 10, initial: 8 }] }
  );
  assert.equal(compatibility.installed, true);
  assert.equal(compatibilityEngine.n.resourceMeter.spend("legacy-fuel", 3).value, 5);
} catch (error) {
  audit.error(error?.message ?? String(error));
}

writeText("audit/reports/resource-meter-behavior-report.md", `# Resource Meter Behavior Report

Validated behaviors:

- Core Simulation owns the canonical resource service
- default installation rejects the deprecated duplicate
- explicit compatibility installation remains available
- passive rate and explicit spend
- snapshot, reset, and exact restore

Status: ${audit.ok() ? "passing" : "failing"}
`);

audit.finish("resource-meter-behavior-report");
