import { defineEvent, defineResource } from "nexusengine/ecs";
import { defineRuntimeKit } from "nexusengine/runtime-kit";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function vecCopy(vector) {
  return {
    x: number(vector?.x, 0),
    y: number(vector?.y, 0),
    z: number(vector?.z, 0)
  };
}

function calcImpulseSource(state, character, input) {
  const source = input.source ?? {};
  const facing = character?.facing ?? { x: 0, z: 1 };
  const impact = number(input.impact, number(state.impact, 1));
  const impulse = input.impulse ?? {};
  return {
    x: number(impulse.x, facing.x * impact * 4.5 + number(source.x, 0)),
    y: number(impulse.y, impact * 2.2),
    z: number(impulse.z, facing.z * impact * 4.5 + number(source.z, 0))
  };
}

export function createCharacterRagdollKit(options = {}) {
  const resources = {
    RagdollInput: defineResource("character-ragdoll-input"),
    CharacterRagdollInput: defineResource("character-ragdoll-input"),
    RagdollState: defineResource("character-ragdoll-state"),
    CharacterRagdollState: defineResource("character-ragdoll-state")
  };
  const events = {
    KnockedDown: defineEvent("character-knocked-down"),
    Recovered: defineEvent("character-recovered"),
    Staggered: defineEvent("character-staggered")
  };

  function ragdollSystem(world) {
    const input = world.getResource(resources.RagdollInput) ?? world.getResource(resources.CharacterRagdollInput) ?? {};
    const state = world.getResource(resources.RagdollState) ?? world.getResource(resources.CharacterRagdollState);
    const character = options.characterStateResource
      ? world.getResource(options.characterStateResource)
      : null;
    if (!state || !character) return;

    const delta = world.__nexusClock?.delta ?? 1 / 60;
    const groundHeightAt = options.groundHeightAt ?? ((x, z) => character.groundHeight ?? 0);
    const groundOffset = number(options.groundOffset, number(character.groundOffset, 1.2));
    const gravity = number(options.gravity, 22);
    const recoverDelay = number(options.recoverDelay, 0.8);
    const recoveryDuration = number(options.recoveryDuration, 0.95);

    if (input.knockdown && !state.active && !state.recovering) {
      state.active = true;
      state.recovering = false;
      state.timer = 0;
      state.recoveryProgress = 0;
      state.impact = Math.max(0.25, number(input.impact, 1));
      state.position = vecCopy(character.position);
      state.position.y = Math.max(state.position.y, groundHeightAt(state.position.x, state.position.z) + groundOffset);
      state.velocity = calcImpulseSource(state, character, input);
      state.grounded = false;
      state.collapse = 0;
      state.phase = "falling";
      character.isRagdolled = true;
      character.controlLocked = true;
      character.isDashing = false;
      character.isGliding = false;
      character.isJumping = false;
      world.emit(events.KnockedDown, {
        impact: state.impact,
        position: { ...state.position },
        source: input.source ?? null
      });
    }

    if (!state.active && !state.recovering) {
      state.impact = Math.max(0, number(state.impact, 0) - delta * 0.55);
      character.isRagdolled = false;
      character.controlLocked = false;
      character.recoveryBlend = 0;
      return;
    }

    state.timer += delta;
    state.velocity.y -= gravity * delta;
    state.position.x += state.velocity.x * delta;
    state.position.y += state.velocity.y * delta;
    state.position.z += state.velocity.z * delta;

    const groundHeight = groundHeightAt(state.position.x, state.position.z) + groundOffset;
    if (state.position.y <= groundHeight) {
      state.position.y = groundHeight;
      state.velocity.x *= Math.pow(0.68, delta * 60);
      state.velocity.z *= Math.pow(0.68, delta * 60);
      state.velocity.y = Math.max(0, state.velocity.y * -0.18);
      state.grounded = true;
      state.phase = state.recovering ? "recovering" : (state.timer < recoverDelay ? "impact" : "settled");
    } else {
      state.grounded = false;
      state.phase = "air";
    }

    const settle = clamp(state.timer / Math.max(0.45, recoverDelay), 0, 1);
    state.collapse = clamp(state.collapse + delta * 1.1, 0, 1);
    state.spinePitch = state.recovering ? -0.38 * (1 - state.recoveryProgress) : 0.22 + settle * 0.72;
    state.spineRoll = Math.sin(state.timer * 3.2) * 0.1 * state.impact;
    state.spineYaw = Math.sin(state.timer * 1.7) * 0.08 * state.impact;
    state.headTilt = state.recovering ? -0.08 + state.recoveryProgress * 0.18 : -0.32 - settle * 0.28;
    state.headRoll = Math.sin(state.timer * 2.7) * 0.12 * state.impact;
    state.headYaw = Math.cos(state.timer * 1.4) * 0.07 * state.impact;
    state.leftArmSpread = clamp(0.65 + settle * 0.4 + state.impact * 0.25, 0.55, 1.6);
    state.rightArmSpread = clamp(0.55 + settle * 0.45 + state.impact * 0.2, 0.5, 1.5);
    state.leftLegSpread = clamp(0.35 + settle * 0.2, 0.25, 1.05);
    state.rightLegSpread = clamp(0.28 + settle * 0.2, 0.2, 0.98);
    state.armSwing = Math.sin(state.timer * 8.1) * 0.12 * state.impact;
    state.legSwing = Math.cos(state.timer * 7.2) * 0.09 * state.impact;
    state.recoveryReady = state.timer >= recoverDelay;
    state.recoveryBlend = state.recovering ? clamp(state.recoveryProgress, 0, 1) : 0;
    state.position.x = character.position.x = state.position.x;
    state.position.z = character.position.z = state.position.z;
    character.position.y = state.position.y;
    character.velocity.x = state.velocity.x;
    character.velocity.y = state.velocity.y;
    character.velocity.z = state.velocity.z;
    character.animation = {
      ...(character.animation ?? {}),
      pose: state.recovering ? "recover" : "ragdoll",
      moveBlend: 0,
      airBlend: state.grounded ? 0 : 1,
      dashBlend: 0,
      lean: 0,
      bob: 0,
      stride: 0,
      turn: character.animation?.turn ?? 0
    };
    character.recoveryBlend = state.recoveryBlend;

    if (input.recover && state.recoveryReady && state.grounded) {
      state.recovering = true;
      state.phase = "recovering";
    }

    if (state.recovering) {
      state.recoveryProgress = clamp(state.recoveryProgress + delta / recoveryDuration, 0, 1);
      state.spinePitch = -0.32 + state.recoveryProgress * 0.86;
      state.headTilt = -0.22 + state.recoveryProgress * 0.72;
      state.leftArmSpread = 0.5 + (1 - state.recoveryProgress) * 0.4;
      state.rightArmSpread = 0.48 + (1 - state.recoveryProgress) * 0.35;
      state.leftLegSpread = 0.4 + (1 - state.recoveryProgress) * 0.16;
      state.rightLegSpread = 0.34 + (1 - state.recoveryProgress) * 0.16;
      character.recoveryBlend = state.recoveryProgress;
      if (state.recoveryProgress >= 1) {
        state.active = false;
        state.recovering = false;
        state.phase = "recovered";
        state.impact = 0;
        character.isRagdolled = false;
        character.controlLocked = false;
        character.recoveryBlend = 0;
        character.velocity.x *= 0.35;
        character.velocity.y = 0;
        character.velocity.z *= 0.35;
        world.emit(events.Recovered, { position: { ...character.position } });
      }
    } else if (state.timer > recoverDelay) {
      world.emit(events.Staggered, { phase: state.phase, impact: state.impact });
    }
  }

  return defineRuntimeKit({
    id: options.id ?? "character-ragdoll-kit",
    resources,
    events,
    systems: [{ phase: "resolve", name: "CharacterRagdollSystem", system: ragdollSystem }],
    initWorld({ world }) {
      const input = {
        impact: 0,
        impulse: { x: 0, y: 0, z: 0 },
        knockdown: false,
        recover: false,
        source: null
      };
      const state = {
        active: false,
        armSwing: 0,
        collapse: 0,
        grounded: true,
        headRoll: 0,
        headTilt: 0,
        headYaw: 0,
        impact: 0,
        leftArmSpread: 0.55,
        leftLegSpread: 0.34,
        phase: "idle",
        position: { x: 0, y: 0, z: 0 },
        recoveryBlend: 0,
        recoveryProgress: 0,
        recoveryReady: false,
        recovering: false,
        rightArmSpread: 0.5,
        rightLegSpread: 0.32,
        spinePitch: 0,
        spineRoll: 0,
        spineYaw: 0,
        timer: 0,
        velocity: { x: 0, y: 0, z: 0 }
      };

      world.setResource(resources.RagdollInput, input);
      world.setResource(resources.CharacterRagdollInput, input);
      world.setResource(resources.RagdollState, state);
      world.setResource(resources.CharacterRagdollState, state);
    },
    metadata: { domain: "character-control", reusable: true, ragdoll: true }
  });
}
