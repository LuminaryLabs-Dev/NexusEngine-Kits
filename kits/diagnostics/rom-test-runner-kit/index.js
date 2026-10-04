import { adapterKit } from "../../emulation/kit-factory.js";
export function evaluateMemoryOracle(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 3) throw new Error("Oracle requires actual, expected and completion bytes.");
  return { status: bytes[2] === 1 ? "PASS" : bytes[2] === 255 ? "FAIL" : "RUNNING", actual: bytes[0], expected: bytes[1], marker: bytes[2] };
}
export async function runRomCase({ session, path, profile, maxFrames = 120, warmupFrames = 0, oracleSegment = "oracle", expectedCompletionPc = null }) {
  try {
    await session.load(path, profile);
    let armed = false, previous = null;
    for (let frame = 0; frame < maxFrames; frame++) {
      const receipt = await session.step([]), value = receipt.segments.get(oracleSegment), verdict = evaluateMemoryOracle(value);
      if (verdict.status === "RUNNING") armed = true;
      // Source-verified tests write a final marker then leave the result unchanged.
      // Warmup covers boot; two stable samples avoid accepting a transient initial marker.
      const stable = previous && previous.status === verdict.status && previous.actual === verdict.actual && previous.expected === verdict.expected;
      if (frame >= warmupFrames && stable && verdict.status !== "RUNNING" && (armed || profile.oracle?.completion === "source-verified-stable-marker")) return { ...verdict, sourceFrame: receipt.sourceFrame, completionPc: expectedCompletionPc };
      previous = verdict;
    }
    return { status: "TIMEOUT", sourceFrame: session.sourceFrame };
  } catch (error) { return { status: /UNSUPPORTED_MEMORY|unsupported|no provider/i.test(error.message) ? "UNSUPPORTED" : "HOST_ERROR", error: error.message }; }
}
export function createRomTestRunnerKit() { return adapterKit({ id: "rom-test-runner-kit", domain: "rom-test-runner", domainPath: "n:diagnostics:extensions:rom-tests", parentDomainPath: "n:diagnostics:extensions", apiName: "romTests", provides: ["diagnostics:rom-tests"], createApi() { return { run: runRomCase, evaluate: evaluateMemoryOracle }; } }); }
