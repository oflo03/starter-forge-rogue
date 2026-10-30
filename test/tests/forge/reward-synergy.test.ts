// SPDX-License-Identifier: AGPL-3.0-only
import { AugmentTier } from "#app/forge/augments";
import { FORGE_NATIVE_MOVE_TIERS } from "#app/forge/move-rewards";
import {
  abilityAugmentChoices,
  customMoveChoices,
  forgeMoveCatalog,
  initializeForgeRegistry,
  starterAbility,
} from "#app/forge/registry";
import { abilityRewardWeight, moveRewardWeight } from "#app/forge/reward-synergy";
import { allMoves } from "#data/data-lists";
import { AbilityId as A } from "#enums/ability-id";
import { MoveCategory as C } from "#enums/move-category";
import { MoveId as M } from "#enums/move-id";
import { PokemonType as T } from "#enums/pokemon-type";
import { beforeAll, describe, expect, it } from "vitest";

const stats = [90, 120, 80, 60, 80, 100];
beforeAll(() => initializeForgeRegistry());
describe("User original move reward list and build synergy", () => {
  it("contains all requested native tiers exactly once, with no unusable entries", () => {
    expect(FORGE_NATIVE_MOVE_TIERS[AugmentTier.SILVER]).toHaveLength(400);
    expect(FORGE_NATIVE_MOVE_TIERS[AugmentTier.GOLD]).toHaveLength(331);
    expect(FORGE_NATIVE_MOVE_TIERS[AugmentTier.PRISMATIC]).toHaveLength(61);
    const ids = Object.values(FORGE_NATIVE_MOVE_TIERS).flat();
    expect(new Set(ids).size).toBe(792);
    expect(ids.every(id => allMoves[id] && !allMoves[id].isUnimplemented)).toBe(true);
    expect(forgeMoveCatalog()).toHaveLength(801);
  });
  it("matches native flags and raises related move and ability weights", () => {
    const base = moveRewardWeight(M.FIRE_PUNCH, [T.NORMAL], C.PHYSICAL);
    expect(
      moveRewardWeight(M.FIRE_PUNCH, [T.NORMAL], C.PHYSICAL, { moves: [], abilities: [A.IRON_FIST] }),
    ).toBeGreaterThan(base);
    expect(
      moveRewardWeight(M.BULLET_SEED, [T.NORMAL], C.PHYSICAL, { moves: [], abilities: [A.SKILL_LINK] }),
    ).toBeGreaterThan(moveRewardWeight(M.BULLET_SEED, [T.NORMAL], C.PHYSICAL));
    expect(
      moveRewardWeight(M.BODY_PRESS, [T.NORMAL], C.PHYSICAL, { moves: [M.IRON_DEFENSE], abilities: [] }),
    ).toBeGreaterThan(moveRewardWeight(M.BODY_PRESS, [T.NORMAL], C.PHYSICAL));
    expect(
      moveRewardWeight(M.THUNDER, [T.NORMAL], C.SPECIAL, { moves: [M.RAIN_DANCE], abilities: [] }),
    ).toBeGreaterThan(moveRewardWeight(M.THUNDER, [T.NORMAL], C.SPECIAL));
    expect(abilityRewardWeight(A.IRON_FIST, { moves: [M.FIRE_PUNCH], abilities: [] })).toBeGreaterThan(
      abilityRewardWeight(A.IRON_FIST),
    );
    expect(
      moveRewardWeight(M.DARK_PULSE, [T.NORMAL], C.SPECIAL, { moves: [], abilities: [starterAbility(T.DARK)] }),
    ).toBeGreaterThan(moveRewardWeight(M.DARK_PULSE, [T.NORMAL], C.SPECIAL));
    expect(abilityRewardWeight(A.SOLAR_POWER, { moves: [], abilities: [A.DROUGHT] })).toBeGreaterThan(1);
  });
  it("does not count Shell Smash defense losses as a Contrary reward synergy", () => {
    expect(abilityRewardWeight(A.CONTRARY, { moves: [M.SHELL_SMASH], abilities: [] })).toBe(1);
    expect(abilityRewardWeight(A.CONTRARY, { moves: [M.OVERHEAT], abilities: [] })).toBeGreaterThan(1);
    expect(
      moveRewardWeight(M.SWORDS_DANCE, [T.NORMAL], C.PHYSICAL, { moves: [M.FIRE_PUNCH], abilities: [A.CONTRARY] }),
    ).toBe(moveRewardWeight(M.SWORDS_DANCE, [T.NORMAL], C.PHYSICAL));
  });
  it("recognizes pivot regeneration and speed-boost protection", () => {
    expect(abilityRewardWeight(A.REGENERATOR, { moves: [M.VOLT_SWITCH], abilities: [] })).toBeGreaterThan(1);
    expect(
      moveRewardWeight(M.PROTECT, [T.NORMAL], C.PHYSICAL, { moves: [], abilities: [A.SPEED_BOOST] }),
    ).toBeGreaterThan(moveRewardWeight(M.PROTECT, [T.NORMAL], C.PHYSICAL));
  });
  it("does not treat Fur Coat or Huge Power as Body Press attack multipliers", () => {
    const base = moveRewardWeight(M.BODY_PRESS, [T.NORMAL], C.PHYSICAL);
    expect(moveRewardWeight(M.BODY_PRESS, [T.NORMAL], C.PHYSICAL, { moves: [], abilities: [A.FUR_COAT] })).toBe(base);
    expect(moveRewardWeight(M.BODY_PRESS, [T.NORMAL], C.PHYSICAL, { moves: [], abilities: [A.HUGE_POWER] })).toBe(base);
    expect(
      moveRewardWeight(M.BODY_PRESS, [T.NORMAL], C.PHYSICAL, { moves: [], abilities: [A.STAMINA] }),
    ).toBeGreaterThan(base);
  });
  it("uses both ability slots and known moves, keeps seeds reproducible, and never repeats learned moves", () => {
    const build = { moves: [M.FIRE_PUNCH, M.DRAIN_PUNCH], abilities: [A.HUGE_POWER, A.IRON_FIST] };
    const offer = customMoveChoices(
      [T.NORMAL],
      stats,
      "consistent",
      build.moves,
      undefined,
      31,
      AugmentTier.GOLD,
      build,
    );
    expect(offer).toHaveLength(3);
    expect(new Set(offer.map(m => m.id)).size).toBe(3);
    expect(offer.every(m => !build.moves.includes(m.id))).toBe(true);
    expect(
      customMoveChoices([T.NORMAL], stats, "consistent", build.moves, undefined, 31, AugmentTier.GOLD, build),
    ).toEqual(offer);
    expect(
      abilityAugmentChoices([T.NORMAL], stats, "ability-consistent", AugmentTier.SILVER, build.abilities, build),
    ).toEqual(
      abilityAugmentChoices([T.NORMAL], stats, "ability-consistent", AugmentTier.SILVER, build.abilities, build),
    );
  });
  it("measurably raises compatible abilities across seeds without making them guaranteed", () => {
    let baseline = 0;
    let related = 0;
    for (let seed = 0; seed < 400; seed++) {
      baseline += Number(
        abilityAugmentChoices([T.NORMAL], stats, String(seed), AugmentTier.SILVER).some(a => a.id === A.IRON_FIST),
      );
      related += Number(
        abilityAugmentChoices([T.NORMAL], stats, String(seed), AugmentTier.SILVER, [], {
          moves: [M.FIRE_PUNCH, M.DRAIN_PUNCH],
          abilities: [],
        }).some(a => a.id === A.IRON_FIST),
      );
    }
    expect(related).toBeGreaterThan(baseline * 1.8);
    expect(related).toBeLessThan(400);
  });
});
