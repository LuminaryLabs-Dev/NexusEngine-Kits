export const DomainKind = Object.freeze({
  FOUNDATION: "foundation",
  RUNTIME_DOMAIN: "runtime-domain",
  SIMULATION_DOMAIN: "simulation-domain",
  DESCRIPTOR_DOMAIN: "descriptor-domain",
  PRESENTATION_DOMAIN: "presentation-domain",
  ADAPTER_DOMAIN: "adapter-domain",
  GAME_FAMILY_DOMAIN: "game-family-domain",
  BRIDGE_DOMAIN: "bridge-domain"
});

export function isDomainKind(value) {
  return Object.values(DomainKind).includes(value);
}
