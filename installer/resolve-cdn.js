import { createCdnResolver } from "./cdn-resolver.js";

export function resolveCdn(target, options = {}) {
  const resolver = createCdnResolver(options);
  if (target.type === "kit") return resolver.kit(target.id);
  if (target.type === "domain") return resolver.domain(target.id);
  if (target.type === "bundle") return resolver.bundle(target.id);
  if (target.type === "installer") return resolver.installer();
  if (target.type === "catalog") return resolver.catalog();
  throw new Error(`Unknown CDN target type: ${target.type}`);
}
