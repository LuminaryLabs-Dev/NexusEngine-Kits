export const KitStatus = Object.freeze({
  PLANNED: "planned",
  PLACEHOLDER: "migration-placeholder",
  SCAFFOLDED: "scaffolded",
  CANDIDATE: "candidate",
  OFFICIAL: "official",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
  BLOCKED: "blocked",
  EXPERIMENTAL: "experimental"
});

export function isKitStatus(value) {
  return Object.values(KitStatus).includes(value);
}
