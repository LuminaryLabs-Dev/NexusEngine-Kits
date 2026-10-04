import { adapterKit } from "../../emulation/kit-factory.js";
const buttons = { b: 0, select: 2, start: 3, up: 4, down: 5, left: 6, right: 7, a: 8, x: 9, l: 10, r: 11, y: 1 };
export function encodeConsoleInput(actions = []) {
  let mask = 0; for (const action of actions) { if (!(action in buttons)) throw new Error(`Unknown console action: ${action}.`); mask |= 1 << buttons[action]; }
  return [mask];
}
export function createConsoleInputAdapterKit() {
  return adapterKit({ id: "console-input-adapter-kit", domain: "console-input-adapter", domainPath: "n:interaction:input:extensions:console", parentDomainPath: "n:interaction:input:extensions", apiName: "consoleInput", requires: ["n:interaction:input"], provides: ["emulation:console-input"], createApi({ engine }) { return { encode(actions = []) { return encodeConsoleInput(actions); } }; } });
}
