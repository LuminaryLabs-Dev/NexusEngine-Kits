export const KitKind = Object.freeze({
  RUNTIME_KIT: "runtime-kit",
  DOMAIN_SERVICE_KIT: "domain-service-kit",
  ADAPTER: "adapter",
  PRESET: "preset",
  BUNDLE_MEMBER: "bundle-member",
  METADATA_PLACEHOLDER: "metadata-placeholder"
});

export function isKitKind(value) {
  return Object.values(KitKind).includes(value);
}
