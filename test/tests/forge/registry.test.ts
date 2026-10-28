// SPDX-License-Identifier: AGPL-3.0-only

import {
  customAbilityChoices,
  customMoveChoices,
  initializeForgeRegistry,
  starterAbility,
  starterMoves,
} from "#app/forge/registry";
import { AnimConfig, initMoveAnim, loadMoveAnimAssets, moveAnims } from "#data/battle-anims";
import { allAbilities, allMoves } from "#data/data-lists";
import { AbilityId } from "#enums/ability-id";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { describe, expect, it } from "vitest";
import Catalog from "../../../forge/vendor/catalog.js";

describe("Forge original engine registry", () => {
  it("adds custom effects once without replacing any original entry", () => {
    const originalMove = allMoves[MoveId.TACKLE];
    const originalAbility = allAbilities[AbilityId.BLAZE];
    initializeForgeRegistry();
    const lengths = [allMoves.length, allAbilities.length];
    initializeForgeRegistry();
    expect([allMoves.length, allAbilities.length]).toEqual(lengths);
    expect(allMoves[MoveId.TACKLE]).toBe(originalMove);
    expect(allAbilities[AbilityId.BLAZE]).toBe(originalAbility);
    expect(starterAbility(PokemonType.FIRE)).toBe(AbilityId.BLAZE);
    expect(starterAbility(PokemonType.WATER)).toBe(AbilityId.TORRENT);
    expect(starterAbility(PokemonType.GRASS)).toBe(AbilityId.OVERGROW);
    expect(starterAbility(PokemonType.BUG)).toBe(AbilityId.SWARM);
  });

  it("starts all eighteen types with existing original moves and a low HP starter ability", () => {
    for (let type = PokemonType.NORMAL; type <= PokemonType.FAIRY; type++) {
      const moves = starterMoves(type);
      expect(moves).toHaveLength(3);
      expect(allMoves[moves[0]].type).toBe(type);
      expect(moves.slice(1)).toEqual([MoveId.TACKLE, MoveId.GROWL]);
      for (const id of moves) {
        expect(MoveId[id]).toBeDefined();
      }
      expect(allAbilities[starterAbility(type)].hasAttr("LowHpMoveTypePowerBoostAbAttr")).toBe(true);
    }
  });

  it("offers three distinct deterministic implemented rewards for every type and offense", () => {
    for (let type = PokemonType.NORMAL; type <= PokemonType.FAIRY; type++) {
      for (const stats of [
        [90, 120, 80, 60, 80, 100],
        [90, 60, 80, 120, 80, 100],
      ]) {
        const moves = customMoveChoices([type], stats, "reward-fixture");
        expect(moves).toHaveLength(3);
        expect(new Set(moves.map(move => move.id)).size).toBe(3);
        expect(customMoveChoices([type], stats, "reward-fixture")).toEqual(moves);
        for (const choice of moves) {
          const move = allMoves[choice.id];
          expect(move.type).toBe(type);
          expect(move.name).toBe(choice.name);
          expect(move.is("AttackMove")).toBe(true);
          expect((move as unknown as { forgeAnimation: MoveId }).forgeAnimation).toBe(MoveId.TACKLE);
        }
        const abilities = customAbilityChoices([type], stats, "reward-fixture");
        expect(abilities).toHaveLength(3);
        expect(new Set(abilities.map(ability => ability.id)).size).toBe(3);
        expect(customAbilityChoices([type], stats, "reward-fixture")).toEqual(abilities);
        for (const choice of abilities) {
          expect(allAbilities[choice.id].name).toBe(choice.name);
          expect(allAbilities[choice.id].attrs.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("includes a secondary type option and only original move attributes", () => {
    const moves = customMoveChoices([PokemonType.FIRE, PokemonType.WATER], [90, 120, 80, 60, 80, 100], "dual-fixture");
    expect(moves.some(move => move.type === PokemonType.WATER)).toBe(true);
    for (const choice of moves) {
      const registered = allMoves[choice.id];
      registered.localize();
      expect(registered.name).toBe(choice.name);
      expect(registered.effect).toBe(choice.description);
    }
  });

  it("filters previously learned custom moves before selecting all three rewards", () => {
    const stats = [90, 120, 80, 60, 80, 100];
    for (let type = PokemonType.NORMAL; type <= PokemonType.FAIRY; type++) {
      const learned = customMoveChoices([type], stats, "first-reward")[0].id;
      const choices = customMoveChoices([type], stats, "second-reward", [learned]);
      expect(choices).toHaveLength(3);
      expect(choices.some(choice => choice.id === learned)).toBe(false);
      expect(new Set(choices.map(choice => choice.id)).size).toBe(3);
    }
  });

  it("labels offensive abilities with the exact category their bundle must support", () => {
    const choices = customAbilityChoices([PokemonType.FIRE], [90, 120, 80, 60, 80, 100], "category-fixture");
    expect(choices.find(choice => choice.name === "힘자랑")?.enhancedCategory).toBe(MoveCategory.PHYSICAL);
    expect(choices.find(choice => choice.name === "밸런스기어")?.enhancedCategory).toBe(MoveCategory.SPECIAL);
    expect(choices.find(choice => choice.name === "겹겹코트")?.enhancedCategory).toBeUndefined();
  });

  it("keeps three distinct rewards after three custom moves were already learned", () => {
    for (let type = PokemonType.NORMAL; type <= PokemonType.FAIRY; type++) {
      for (const stats of [
        [90, 120, 80, 60, 80, 100],
        [90, 60, 80, 120, 80, 100],
      ]) {
        const learned = customMoveChoices([type], stats, "three-learned").map(move => move.id);
        expect(learned).toHaveLength(3);
        const choices = customMoveChoices([type], stats, "later-reward", learned);
        expect(choices).toHaveLength(3);
        expect(new Set(choices.map(move => move.id)).size).toBe(3);
        expect(choices.every(move => !learned.includes(move.id))).toBe(true);
        expect(customMoveChoices([type], stats, "later-reward", learned)).toEqual(choices);
      }
    }
  });

  it("registers both flinch variants for every type with the original flinch attribute", () => {
    const customFlinches = allMoves.filter(move => MoveId[move.id] === undefined && move.hasAttr("FlinchAttr"));
    expect(customFlinches).toHaveLength(36);
    for (let type = PokemonType.NORMAL; type <= PokemonType.FAIRY; type++) {
      const variants = customFlinches.filter(move => move.type === type);
      expect(variants).toHaveLength(2);
      expect(variants.find(move => move.category === MoveCategory.PHYSICAL)?.chance).toBe(30);
      expect(variants.find(move => move.category === MoveCategory.SPECIAL)?.chance).toBe(20);
      for (const move of variants) {
        const template = move.category === MoveCategory.PHYSICAL ? "flinch" : "special-flinch";
        const source = Catalog.getLibrary().moves.find(
          m => m.templateId === template && m.type === PokemonType[type].toLowerCase(),
        );
        expect(move.power).toBe(source.power);
        expect(move.accuracy).toBe(source.accuracy);
        expect(move.pp).toBe(source.pp);
        expect(move.priority).toBe(source.priority);
      }
    }
  });
  it("reuses valid original animations on first load, repeated load and saved move asset reload", async () => {
    const id = customMoveChoices([PokemonType.FIRE], [90, 100, 80, 100, 80, 80], "animation-test")[0].id;
    const oldOriginal = moveAnims.get(MoveId.TACKLE);
    const oldCustom = moveAnims.get(id);
    const original = new AnimConfig({ id: MoveId.TACKLE, frames: [], frameTimedEvents: {} });
    moveAnims.set(MoveId.TACKLE, original);
    moveAnims.delete(id);
    try {
      for (let repeat = 0; repeat < 3; repeat++) {
        await initMoveAnim(id);
        expect(moveAnims.get(id)).toBe(original);
        await expect(loadMoveAnimAssets([id])).resolves.toBeUndefined();
      }
    } finally {
      if (oldOriginal === undefined) {
        moveAnims.delete(MoveId.TACKLE);
      } else {
        moveAnims.set(MoveId.TACKLE, oldOriginal);
      }
      if (oldCustom === undefined) {
        moveAnims.delete(id);
      } else {
        moveAnims.set(id, oldCustom);
      }
    }
  });
});
