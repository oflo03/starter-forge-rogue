// SPDX-License-Identifier: AGPL-3.0-only

import type { PreAttackModifyDamageAbAttrParams, PreDefendModifyDamageAbAttrParams } from "#abilities/ab-attrs";
import {
  customAbilityChoices,
  customMoveChoices,
  initializeForgeRegistry,
  starterAbility,
  starterMoves,
} from "#app/forge/registry";
import { configureForgePartner } from "#app/forge/runtime";
import { AnimConfig, initMoveAnim, loadMoveAnimAssets, moveAnims } from "#data/battle-anims";
import { allAbilities, allMoves } from "#data/data-lists";
import { CustomPokemonData } from "#data/pokemon-data";
import { AbilityId } from "#enums/ability-id";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { Stat } from "#enums/stat";
import type { PlayerPokemon } from "#field/pokemon";
import { NumberHolder } from "#utils/common";
import { describe, expect, it } from "vitest";
import Catalog from "../../../forge/vendor/catalog.js";

describe("Forge original engine registry", () => {
  it("preserves five-level reward history when copying evolution and save data", () => {
    const forge = {
      seed: "new-rewards",
      stage: 2 as const,
      baseStats: [70, 70, 70, 70, 70, 70],
      events: [11, 16, 21, 26, 31],
    };
    const copy = new CustomPokemonData({ forge });
    expect(copy.forge).toEqual(forge);
    copy.forge!.events.push(36);
    expect(forge.events).not.toContain(36);
    expect(new CustomPokemonData({ forge: { ...forge, events: [12] } }).forge).toBeUndefined();
    expect(new CustomPokemonData({ forge: { ...forge, events: [16, 26, 36, 46, 56] } }).forge?.ivReward).toBe(true);
  });
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

  it("applies strong reward effects without modifying original abilities", () => {
    const abilities = [
      ...customAbilityChoices([PokemonType.FIRE], [90, 120, 80, 60, 80, 100], "buffs"),
      ...customAbilityChoices([PokemonType.FIRE], [90, 60, 80, 120, 80, 100], "buffs"),
    ];
    const pokemon = { getStat: (stat: Stat) => (stat === Stat.ATK ? 120 : 60), getHpRatio: () => 0.5 } as PlayerPokemon;
    const attackDamage = (name: string, id: MoveId): number => {
      const choice = abilities.find(ability => ability.name === name)!;
      const attr = allAbilities[choice.id].getAttrs("MoveDamageBoostAbAttr")[0];
      const damage = new NumberHolder(100);
      const params = { pokemon, opponent: pokemon, move: allMoves[id], damage } as PreAttackModifyDamageAbAttrParams;
      if (attr.canApply(params)) {
        attr.apply(params);
      }
      return damage.value;
    };
    expect(attackDamage("힘자랑", MoveId.TACKLE)).toBe(150);
    expect(attackDamage("힘자랑", MoveId.WATER_GUN)).toBe(100);
    expect(attackDamage("브레인파워", MoveId.WATER_GUN)).toBe(150);
    expect(attackDamage("밸런스기어", MoveId.WATER_GUN)).toBe(175);
    expect(attackDamage("밸런스기어", MoveId.TACKLE)).toBe(100);
    const coat = allAbilities[abilities.find(ability => ability.name === "겹겹코트")!.id].getAttrs(
      "ReceivedMoveDamageMultiplierAbAttr",
    )[0];
    const damage = new NumberHolder(100);
    const params = {
      pokemon,
      opponent: pokemon,
      move: allMoves[MoveId.TACKLE],
      damage,
    } as PreDefendModifyDamageAbAttrParams;
    expect(coat.canApply(params)).toBe(true);
    coat.apply(params);
    expect(damage.value).toBe(65);
    pokemon.getHpRatio = () => 0.49;
    expect(coat.canApply(params)).toBe(false);
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
    expect(customFlinches).toHaveLength(36 * 5);
    for (let type = PokemonType.NORMAL; type <= PokemonType.FAIRY; type++) {
      const variants = customFlinches.slice(0, 36).filter(move => move.type === type);
      expect(variants).toHaveLength(2);
      expect(variants.find(move => move.category === MoveCategory.PHYSICAL)?.chance).toBe(30);
      expect(variants.find(move => move.category === MoveCategory.SPECIAL)?.chance).toBe(20);
      for (const move of variants) {
        const template = move.category === MoveCategory.PHYSICAL ? "flinch" : "special-flinch";
        const source = Catalog.getLibrary().moves.find(
          m => m.templateId === template && m.type === PokemonType[type].toLowerCase(),
        );
        expect(move.power).toBe(Math.max(source.power, move.category === MoveCategory.PHYSICAL ? 80 : 75));
        expect(move.accuracy).toBe(source.accuracy);
        expect(move.pp).toBe(source.pp);
        expect(move.priority).toBe(source.priority);
      }
    }
  });

  it("offers distinct burst, utility and tempo choices and respects a chosen attack category", () => {
    for (let type = 0; type < 18; type++) {
      const choices = customMoveChoices([type], [90, 120, 80, 60, 80, 100], "strong-reward", [], MoveCategory.SPECIAL);
      expect(choices).toHaveLength(3);
      expect(choices.some(move => move.power >= 100)).toBe(true);
      expect(choices.filter(move => move.category === MoveCategory.SPECIAL).length).toBeGreaterThanOrEqual(2);
      expect(new Set(choices.map(move => move.id)).size).toBe(3);
    }
  });

  it("offers stronger awakenings as new IDs and preserves core ability identities", () => {
    const stats = [90, 120, 80, 60, 80, 100];
    const normal = customAbilityChoices([PokemonType.FIRE], stats, "awakening");
    const awakened = customAbilityChoices([PokemonType.FIRE], stats, "awakening", true);
    expect(awakened).toHaveLength(3);
    expect(awakened.every(choice => !normal.some(core => core.id === choice.id))).toBe(true);
    const attacker = awakened.find(choice => choice.name === "멈추지않는힘")!;
    expect(allAbilities[attacker.id].getAttrs("PostVictoryAbAttr")).toHaveLength(1);
    const tank = awakened.find(choice => choice.name === "끝없는숨결")!;
    expect(allAbilities[tank.id].hasAttr("BlockCritAbAttr")).toBe(true);
    expect(allAbilities[tank.id].hasAttr("PostTurnHealAbAttr")).toBe(true);
    expect(normal.find(choice => choice.name === "힘자랑")!.id).toBeLessThan(attacker.id);
    const ids = new Set(normal.map(choice => choice.id));
    for (const tier of [1, 2, 3, 4]) {
      const choices = customAbilityChoices([PokemonType.FIRE], stats, "awakening", tier);
      expect(choices).toHaveLength(3);
      for (const choice of choices) {
        expect(ids.has(choice.id)).toBe(false);
        ids.add(choice.id);
      }
      const offense = choices.find(choice => choice.name.startsWith("멈추지않는힘"))!;
      const damage = new NumberHolder(100);
      const params = { move: allMoves[MoveId.TACKLE], damage } as PreAttackModifyDamageAbAttrParams;
      const boost = allAbilities[offense.id].getAttrs("MoveDamageBoostAbAttr")[0];
      expect(boost.canApply(params)).toBe(true);
      boost.apply(params);
      expect(damage.value).toBeCloseTo([0, 165, 180, 195, 210][tier]);
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
  it("replaces all backing-species moves when a new custom partner is configured", () => {
    const pokemon = {
      moveset: [1, 2, 3, 4],
      calculateStats: () => {},
      getMaxHp: () => 25,
      hp: 1,
    } as unknown as PlayerPokemon;
    configureForgePartner(pokemon, "initial-moves-fixture", PokemonType.FIRE);
    expect(pokemon.getMaxHp()).toBe(25);
    expect(pokemon.hp).toBe(25);
    expect(pokemon.moveset.map(move => move.moveId)).toEqual(starterMoves(PokemonType.FIRE));
    expect(pokemon.customPokemonData.ability).toBe(AbilityId.BLAZE);
    expect(pokemon.customPokemonData.forge?.baseStats.reduce((sum, n) => sum + n, 0)).toBe(310);
    expect(pokemon.customPokemonData.forge?.events).toEqual([]);
  });
});
