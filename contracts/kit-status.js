export const KitStatus = Object.freeze({
  PLANNED: "planned",
  PLACEHOLDER: "migration-placeholder",
  CANDIDATE: "candidate",
  OFFICIAL: "official",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived"
});

export function isKitStatus(value) {
  return Object.values(KitStatus).includes(value);
}
