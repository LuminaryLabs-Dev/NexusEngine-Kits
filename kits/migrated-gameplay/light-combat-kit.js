import { defineComponent, defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

export function createLightCombatKit(options = {}) {
  const components = {
    Combatant: defineComponent("light-combatant"),
    EnemyHealth: defineComponent("light-enemy-health"),
    DamageWindow: defineComponent("light-damage-window")
  };
  const resources = {
    CombatInput: defineResource("light-combat-input"),
    CombatState: defineResource("light-combat-state")
  };
  const events = {
    StrikePerformed: defineEvent("light-strike-performed"),
    EnemyDefeated: defineEvent("light-enemy-defeated")
  };

  function combatSystem(world) {
    const input = world.getResource(resources.CombatInput) ?? {};
    const state = world.getResource(resources.CombatState);
    if (!state || state.enemyDefeated) return;

    if (input.strike && !state.__strikeWasPressed) {
      state.combo += 1;
      state.enemyHealth = Math.max(0, state.enemyHealth - state.strikeDamage);
      world.emit(events.StrikePerformed, { combo: state.combo, enemyHealth: state.enemyHealth });
      if (state.enemyHealth <= 0) {
        state.enemyDefeated = true;
        world.emit(events.EnemyDefeated, { combo: state.combo });
      }
    }
    state.__strikeWasPressed = Boolean(input.strike);
  }

  return defineRuntimeKit({
    id: options.id ?? "light-combat-kit",
    components,
    resources,
    events,
    systems: [{ phase: "simulate", name: "LightCombatSystem", system: combatSystem }],
    initWorld({ world }) {
      world.setResource(resources.CombatInput, { strike: false });
      world.setResource(resources.CombatState, {
        combo: 0,
        enemyHealth: options.enemyHealth ?? 3,
        strikeDamage: options.strikeDamage ?? 1,
        enemyDefeated: false
      });
    },
    metadata: { domain: "combat", reusable: true }
  });
}
