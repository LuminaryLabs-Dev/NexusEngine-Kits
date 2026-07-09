export const KitStability = Object.freeze({
  EXPERIMENTAL: "experimental",
  PLANNED: "planned",
  CANDIDATE: "candidate",
  OFFICIAL: "official",
  LEGACY: "legacy",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived"
});

export function isKitStability(value) {
  return Object.values(KitStability).includes(value);
}
