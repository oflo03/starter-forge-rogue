// SPDX-License-Identifier: AGPL-3.0-only
import { AugmentTier, rollAugmentTier } from "#app/forge/augments";
import { FORGE_ENVIRONMENT_BENEFITS } from "#app/forge/environment-abilities";
import { FORGE_ABILITY_LEVELS, FORGE_MOVE_LEVELS } from "#app/forge/progression";
import { abilityAugmentChoices, customMoveChoices, forgeMoveCatalog } from "#app/forge/registry";
import { allAbilities, allMoves } from "#data/data-lists";
import { CustomPokemonData } from "#data/pokemon-data";
import { AbilityId } from "#enums/ability-id";
import { MoveCategory } from "#enums/move-category";
import { PokemonType } from "#enums/pokemon-type";
import { describe, expect, it } from "vitest";

const stats = [90, 120, 80, 60, 80, 100];
describe("Forge augment grades and shared ability pool", () => {
  it("publishes every current creative move family with actual registered combat values", () => {
    const catalog = forgeMoveCatalog();
    expect(new Set(catalog.map(move => `${move.name}:${move.type}:${move.category}`)).size).toBe(222);
    expect([...new Set(catalog.map(move => move.rewardLevel))].sort((a, b) => a - b)).toEqual([11, 31, 51]);
    expect(new Set(catalog.map(move => move.id)).size).toBe(catalog.length);
    for (const move of catalog) {
      expect(move.power).toBe(allMoves[move.id].power);
      expect(move.pp).toBe(allMoves[move.id].pp);
      expect(move.description).toBe(allMoves[move.id].effect);
    }
  });
  it("keeps ability-only levels and preserves both legacy and newly earned slot rewards", () => {
    expect(FORGE_ABILITY_LEVELS).toEqual([21, 41]);
    expect(FORGE_MOVE_LEVELS).toEqual([11, 31, 51]);
    const forge = { seed: "save", stage: 2 as const, baseStats: [70, 70, 70, 70, 70, 70], events: [16] };
    expect(new CustomPokemonData({ forge }).forge?.abilityReward).toBe(true);
    const current = new CustomPokemonData({ forge: { ...forge, abilityReward: false, passiveReward: false } });
    expect(new CustomPokemonData(current).forge?.abilityReward).toBe(false);
    expect(new CustomPokemonData({ forge: { ...forge, events: [16, 21, 26, 41] } }).forge?.passiveReward).toBe(true);
    expect(
      new CustomPokemonData({ forge: { ...forge, events: [16, 21], abilityReward: true, passiveReward: false } }).forge
        ?.abilityReward,
    ).toBe(true);
  });
  it("reproduces the same grade and reaches all three grades across independent reward seeds", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 1000; i++) {
      const seed = `map:partner:reward:${i}`;
      const tier = rollAugmentTier(seed);
      expect(rollAugmentTier(seed)).toBe(tier);
      counts[tier]++;
    }
    expect(counts.every(count => count > 0)).toBe(true);
  });

  it("offers originals in every grade and excludes equipped and already offered abilities", () => {
    const collected: Set<AbilityId>[] = [];
    for (const tier of [AugmentTier.SILVER, AugmentTier.GOLD, AugmentTier.PRISMATIC]) {
      const all = new Set<AbilityId>();
      for (let i = 0; i < 1000; i++) {
        const choices = abilityAugmentChoices([PokemonType.FIRE], stats, `pool-${i}`, tier);
        expect(choices).toHaveLength(3);
        choices.forEach(choice => all.add(choice.id));
      }
      expect([...all].some(id => AbilityId[id] !== undefined)).toBe(true);
      expect([...all].every(id => !allAbilities[id].unimplemented)).toBe(true);
      expect(
        [...all]
          .filter(id => AbilityId[id] === undefined)
          .every(
            id =>
              /메이커|어둠내림|바람몰이|고요한숨|매캐한숨|먹구름부름/.test(allAbilities[id].name)
              || FORGE_ENVIRONMENT_BENEFITS.some(b => b.name === allAbilities[id].name),
          ),
      ).toBe(true);
      const seen: AbilityId[] = [];
      for (let i = 0; i < 3; i++) {
        const choices = abilityAugmentChoices([PokemonType.FIRE], stats, `refresh-${i}`, tier, seen);
        expect(choices).toHaveLength(3);
        expect(choices.some(choice => seen.includes(choice.id))).toBe(false);
        seen.push(...choices.map(choice => choice.id));
      }
      collected.push(all);
    }
    expect(collected.map(pool => pool.size)).toEqual([118, 113, 36]);
    for (const id of [
      AbilityId.MAGNET_PULL,
      AbilityId.COTTON_DOWN,
      AbilityId.DAUNTLESS_SHIELD,
      AbilityId.IRON_BARBS,
      AbilityId.SAND_SPIT,
      AbilityId.SEED_SOWER,
      AbilityId.ILLUMINATE,
    ]) {
      expect(collected[0].has(id)).toBe(true);
      expect(collected[1].has(id)).toBe(false);
    }
    for (const id of [
      AbilityId.REGENERATOR,
      AbilityId.SPEED_BOOST,
      AbilityId.PARENTAL_BOND,
      AbilityId.SOUL_HEART,
      AbilityId.CONTRARY,
      AbilityId.SIMPLE,
      AbilityId.DROUGHT,
    ]) {
      expect(collected[1].has(id)).toBe(true);
      expect(collected[2].has(id)).toBe(false);
    }
    for (const id of [
      AbilityId.MULTISCALE,
      AbilityId.SHADOW_SHIELD,
      AbilityId.NEUTRALIZING_GAS,
      AbilityId.PROTOSYNTHESIS,
      AbilityId.QUARK_DRIVE,
      AbilityId.PRIMORDIAL_SEA,
      AbilityId.DELTA_STREAM,
      AbilityId.CHILLING_NEIGH,
      AbilityId.GRIM_NEIGH,
      AbilityId.OPPORTUNIST,
    ]) {
      expect(collected[2].has(id)).toBe(true);
    }
    expect(collected.every(pool => !pool.has(AbilityId.ILLUSION))).toBe(true);
    expect(collected.flatMap(pool => [...pool]).filter(id => !AbilityId[id])).toHaveLength(18);
    expect([...collected[1]].filter(id => !AbilityId[id])).toHaveLength(15);
    expect(collected.every(pool => !pool.has(AbilityId.SPICY_SPRAY))).toBe(true);
  });

  it("changes real learned move power and PP by grade while preserving effects and critical caps", () => {
    const choices = [AugmentTier.SILVER, AugmentTier.GOLD, AugmentTier.PRISMATIC].map(tier =>
      customMoveChoices([PokemonType.FIRE], stats, "same-offer", [], MoveCategory.PHYSICAL, 51, tier),
    );
    for (let i = 0; i < 3; i++) {
      expect(choices[0][i].name).toBe(choices[1][i].name);
      expect(choices[2][i].name).toBe(choices[1][i].name);
      expect(choices[0][i].power).toBeLessThanOrEqual(choices[1][i].power);
      expect(choices[2][i].power).toBeGreaterThanOrEqual(choices[1][i].power);
      const gold = allMoves[choices[1][i].id];
      const prism = allMoves[choices[2][i].id];
      expect(prism.pp).toBe(gold.pp + 5);
      expect(prism.hasAttr("MultiHitAttr")).toBe(gold.hasAttr("MultiHitAttr"));
      expect(prism.hasAttr("HitHealAttr")).toBe(gold.hasAttr("HitHealAttr"));
      expect(prism.hasAttr("RecoilAttr")).toBe(gold.hasAttr("RecoilAttr"));
    }
    for (const tier of [AugmentTier.SILVER, AugmentTier.GOLD, AugmentTier.PRISMATIC]) {
      for (let seed = 0; seed < 40; seed++) {
        const pool = customMoveChoices(
          [PokemonType.WATER],
          [90, 80, 100, 80, 90, 90],
          `crit-${seed}`,
          [],
          undefined,
          51,
          tier,
        );
        for (const choice of pool) {
          const move = allMoves[choice.id];
          if (move.hasAttr("CritOnlyAttr")) {
            expect(move.power).toBeLessThanOrEqual(70);
            expect(move.hasAttr("MultiHitAttr")).toBe(false);
          }
        }
      }
    }
  });
});
