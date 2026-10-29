// SPDX-License-Identifier: AGPL-3.0-only
import { AugmentTier, rollAugmentTier } from "#app/forge/augments";
import { abilityAugmentChoices, customMoveChoices } from "#app/forge/registry";
import { allMoves } from "#data/data-lists";
import { AbilityId } from "#enums/ability-id";
import { MoveCategory } from "#enums/move-category";
import { PokemonType } from "#enums/pokemon-type";
import { describe, expect, it } from "vitest";

const stats = [90, 120, 80, 60, 80, 100];
describe("Forge augment grades and shared ability pool", () => {
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
      for (let i = 0; i < 100; i++) {
        const choices = abilityAugmentChoices([PokemonType.FIRE], stats, `pool-${i}`, tier);
        expect(choices).toHaveLength(3);
        choices.forEach(choice => all.add(choice.id));
      }
      expect([...all].some(id => AbilityId[id] !== undefined)).toBe(true);
      const seen: AbilityId[] = [];
      for (let i = 0; i < 3; i++) {
        const choices = abilityAugmentChoices([PokemonType.FIRE], stats, `refresh-${i}`, tier, seen);
        expect(choices).toHaveLength(3);
        expect(choices.some(choice => seen.includes(choice.id))).toBe(false);
        seen.push(...choices.map(choice => choice.id));
      }
      collected.push(all);
    }
    expect(collected[0].has(AbilityId.PARENTAL_BOND)).toBe(false);
    expect(collected[1].has(AbilityId.REGENERATOR)).toBe(true);
    expect(collected[2].has(AbilityId.PARENTAL_BOND)).toBe(true);
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
