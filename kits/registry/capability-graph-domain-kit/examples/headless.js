import { createCapabilityGraph } from "../index.js";

const graph = createCapabilityGraph([
  { id: "provider-kit", domain: "example", provides: ["example:provider"] },
  { id: "consumer-kit", domain: "example", requires: ["example:provider"] }
]);
console.log(graph.edges);
