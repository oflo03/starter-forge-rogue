// SPDX-License-Identifier: AGPL-3.0-only
import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { forgeSwampTick, forgeWeatherTick } from "#app/forge/environment";
import {
  FORGE_ENVIRONMENT_BENEFITS,
  forgeAutomaticProtect,
  forgeBeginAttack,
  forgeBenefitTurnEnd,
  forgeEnvironmentBenefitIds,
  forgeGalePriority,
  forgeMistMiss,
  forgePaintBoost,
  forgePoisonAccuracy,
  forgeProtectChain,
  hasForgeBenefit,
} from "#app/forge/environment-abilities";
import { initializeForgeRegistry } from "#app/forge/registry";
import { allMoves } from "#data/data-lists";
import { Terrain, TerrainType } from "#data/terrain";
import { Weather } from "#data/weather";
import { AbilityId } from "#enums/ability-id";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveId } from "#enums/move-id";
import { MoveResult } from "#enums/move-result";
import { MoveUseMode } from "#enums/move-use-mode";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { WeatherType } from "#enums/weather-type";
import { GameManager } from "#test/framework/game-manager";
import { initSceneWithoutEncounterPhase } from "#test/utils/game-manager-utils";
import { NumberHolder } from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Forge environment beneficiary abilities", () => {
  let phaser: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaser = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaser);
    initSceneWithoutEncounterPhase(game.scene, [SpeciesId.EEVEE, SpeciesId.PIKACHU]);
    initializeForgeRegistry();
    for (const p of game.scene.getPlayerParty()) {
      p.customPokemonData.ability = AbilityId.BALL_FETCH;
    }
    vi.spyOn(game.scene, "getField").mockReturnValue(game.scene.getPlayerParty());
  });
  const equip = (key: Parameters<typeof hasForgeBenefit>[1]) => {
    const p = game.scene.getPlayerParty()[0];
    p.customPokemonData.ability = forgeEnvironmentBenefitIds.get(key)!;
    return p;
  };
  const history = (move: MoveId) => ({ move, targets: [], result: MoveResult.SUCCESS, useMode: MoveUseMode.NORMAL });
  const boosts = () => vi.spyOn(game.scene.phaseManager, "unshiftNew");
  it("registers nine distinct benefits with native suppression and passive support", () => {
    expect(FORGE_ENVIRONMENT_BENEFITS).toHaveLength(9);
    expect(new Set(forgeEnvironmentBenefitIds.values()).size).toBe(9);
    const p = equip("evil");
    p.customPokemonData.ability = AbilityId.BALL_FETCH;
    p.customPokemonData.passive = forgeEnvironmentBenefitIds.get("evil")!;
    p.passive = true;
    expect(hasForgeBenefit(p, "evil")).toBe(true);
    p.summonData.abilitySuppressed = true;
    expect(hasForgeBenefit(p, "evil")).toBe(false);
  });
  it("evil heart requires dark weather and zero actual damage even after healing", () => {
    const p = equip("evil");
    const queue = boosts();
    forgeBenefitTurnEnd(p);
    expect(queue).not.toHaveBeenCalled();
    game.scene.arena.weather = new Weather(WeatherType.DARK_AURA, 5);
    forgeBenefitTurnEnd(p);
    expect(queue).toHaveBeenCalledWith(
      "StatStageChangePhase",
      expect.objectContaining({
        changes: [
          { stat: Stat.ATK, stages: 1 },
          { stat: Stat.SPATK, stages: 1 },
        ],
      }),
    );
    queue.mockClear();
    p.damage(1, false, true, true);
    p.hp++;
    forgeBenefitTurnEnd(p);
    expect(queue).not.toHaveBeenCalled();
    p.resetTurnData();
    forgeBenefitTurnEnd(p);
    expect(queue).toHaveBeenCalled();
  });
  it("poison compression boosts only effective poison moves in active gas", () => {
    const p = equip("compress");
    game.scene.arena.weather = new Weather(WeatherType.POISON_GAS, 5);
    const damage = new NumberHolder(100);
    applyAbAttrs("MoveDamageBoostAbAttr", { pokemon: p, opponent: p, move: allMoves[MoveId.SLUDGE_BOMB], damage });
    expect(damage.value).toBe(150);
    expect(forgePoisonAccuracy(p, allMoves[MoveId.SLUDGE_BOMB])).toBe(true);
    expect(forgePoisonAccuracy(p, allMoves[MoveId.TACKLE])).toBe(false);
    game.scene.arena.terrain = new Terrain(TerrainType.WHITE_PAINT, 5);
    expect(forgePoisonAccuracy(p, allMoves[MoveId.SLUDGE_BOMB])).toBe(false);
  });
  it("earth wall halves fire and flying but not other attacks; octagon doubles speed", () => {
    const p = equip("wall");
    game.scene.arena.terrain = new Terrain(TerrainType.ANTHILL, 5);
    for (const [id, expected] of [
      [MoveId.EMBER, 50],
      [MoveId.GUST, 50],
      [MoveId.TACKLE, 100],
    ] as const) {
      const damage = new NumberHolder(100);
      applyAbAttrs("ReceivedMoveDamageMultiplierAbAttr", { pokemon: p, opponent: p, move: allMoves[id], damage });
      expect(damage.value).toBe(expected);
    }
    equip("corner");
    const speed = p.getEffectiveStat(Stat.SPD);
    game.scene.arena.terrain = new Terrain(TerrainType.OCTAGON, 5);
    expect(p.getEffectiveStat(Stat.SPD)).toBe(speed * 2);
    game.scene.arena.terrain = null;
    expect(p.getEffectiveStat(Stat.SPD)).toBe(speed);
  });
  it("miss reward is once per attack and never fires outside the mist", () => {
    const p = equip("miss");
    const queue = boosts();
    forgeMistMiss(p, allMoves[MoveId.TACKLE]);
    expect(queue).not.toHaveBeenCalled();
    game.scene.arena.weather = new Weather(WeatherType.SILENT_MIST, 5);
    forgeBeginAttack(p, allMoves[MoveId.TACKLE]);
    forgeMistMiss(p, allMoves[MoveId.TACKLE]);
    forgeMistMiss(p, allMoves[MoveId.TACKLE]);
    expect(queue).toHaveBeenCalledTimes(1);
    expect(queue).toHaveBeenCalledWith(
      "StatStageChangePhase",
      expect.objectContaining({
        changes: [
          { stat: Stat.ATK, stages: 2 },
          { stat: Stat.SPATK, stages: 2 },
        ],
      }),
    );
  });
  it("lightning blocks weather damage and stores one native charge", () => {
    const p = equip("lightning");
    game.scene.arena.weather = new Weather(WeatherType.THUNDERSTORM, 5);
    vi.spyOn(p, "randBattleSeedInt").mockReturnValue(0);
    const damage = vi.spyOn(p, "damageAndUpdate");
    forgeWeatherTick(p);
    forgeWeatherTick(p);
    expect(damage).not.toHaveBeenCalled();
    expect(p.getTag(BattlerTagType.CHARGED)).toBeDefined();
    expect(p.summonData.tags.filter(t => t.tagType === BattlerTagType.CHARGED)).toHaveLength(1);
    forgeBeginAttack(p, allMoves[MoveId.THUNDER_SHOCK]);
    p.removeTag(BattlerTagType.CHARGED);
    const power = new NumberHolder(100);
    applyAbAttrs("MovePowerBoostAbAttr", {
      pokemon: p,
      opponent: p,
      move: allMoves[MoveId.THUNDER_SHOCK],
      power,
    });
    expect(power.value).toBe(200);
    forgeBeginAttack(p, allMoves[MoveId.THUNDER_SHOCK]);
    const next = new NumberHolder(100);
    applyAbAttrs("MovePowerBoostAbAttr", {
      pokemon: p,
      opponent: p,
      move: allMoves[MoveId.THUNDER_SHOCK],
      power: next,
    });
    expect(next.value).toBe(100);
  });
  it("paint alternation uses original move types, keeps multihit snapshots and breaks on status", () => {
    const p = equip("paint");
    game.scene.arena.terrain = new Terrain(TerrainType.WHITE_PAINT, 5);
    p.summonData.moveHistory.push(history(MoveId.EMBER));
    forgeBeginAttack(p, allMoves[MoveId.WATER_GUN]);
    expect(forgePaintBoost(p, allMoves[MoveId.WATER_GUN])).toBe(true);
    const power = new NumberHolder(100);
    applyAbAttrs("MovePowerBoostAbAttr", { pokemon: p, opponent: p, move: allMoves[MoveId.WATER_GUN], power });
    expect(power.value).toBe(130);
    expect(p.getMoveType(allMoves[MoveId.WATER_GUN])).toBe(PokemonType.NORMAL);
    p.summonData.moveHistory.push(history(MoveId.WATER_GUN));
    expect(forgePaintBoost(p, allMoves[MoveId.WATER_GUN])).toBe(true);
    forgeBeginAttack(p, allMoves[MoveId.WATER_GUN]);
    expect(forgePaintBoost(p, allMoves[MoveId.WATER_GUN])).toBe(false);
    p.summonData.moveHistory.push(history(MoveId.PROTECT));
    forgeBeginAttack(p, allMoves[MoveId.EMBER]);
    expect(forgePaintBoost(p, allMoves[MoveId.EMBER])).toBe(false);
  });
  it("swamp boosts once on rainy double countdown, not when airborne or fainted at zero", () => {
    const p = equip("clock");
    const queue = boosts();
    game.scene.arena.terrain = new Terrain(TerrainType.SWAMP, 5);
    game.scene.arena.weather = new Weather(WeatherType.RAIN, 5);
    forgeSwampTick(p);
    expect(p.summonData.forgeSwampCount).toBe(3);
    expect(queue.mock.calls.filter(c => c[0] === "StatStageChangePhase")).toHaveLength(1);
    forgeSwampTick(p);
    expect(queue.mock.calls.filter(c => c[0] === "StatStageChangePhase")).toHaveLength(1);
    p.resetTurnData();
    forgeSwampTick(p);
    expect(p.hp).toBe(0);
    expect(queue.mock.calls.filter(c => c[0] === "StatStageChangePhase")).toHaveLength(1);
  });
  it("wind protection is automatic once per turn with native consecutive failure odds", () => {
    const p = equip("wind");
    game.scene.arena.weather = new Weather(WeatherType.GALE, 5);
    let found = false;
    for (let t = 1; t < 500; t++) {
      game.scene.currentBattle.turn = t;
      if (forgeGalePriority(p) !== 0) {
        continue;
      }
      game.scene.currentBattle.turn = t + 1;
      if (forgeGalePriority(p) === 0) {
        game.scene.currentBattle.turn = t;
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    const random = vi.spyOn(p, "randBattleSeedInt").mockReturnValue(1);
    forgeAutomaticProtect(p);
    expect(p.getTag(BattlerTagType.PROTECTED)).toBeDefined();
    expect(p.summonData.forgeProtectStreak).toBe(1);
    forgeAutomaticProtect(p);
    expect(p.summonData.forgeProtectStreak).toBe(1);
    p.removeTag(BattlerTagType.PROTECTED);
    p.resetTurnData();
    game.scene.currentBattle.turn++;
    forgeAutomaticProtect(p);
    expect(random).toHaveBeenCalledWith(3);
    expect(p.getTag(BattlerTagType.PROTECTED)).toBeUndefined();
    expect(p.summonData.forgeProtectStreak).toBe(0);
  });
  it("manual Protect continues the auto chain and old wave counters cannot leak", () => {
    const p = equip("wind");
    const turn = game.scene.currentBattle.turn;
    p.summonData.forgeProtectTurn = turn - 1;
    p.summonData.forgeProtectWave = game.scene.currentBattle.waveIndex;
    p.summonData.forgeProtectStreak = 1;
    const random = vi.spyOn(p, "randBattleSeedInt").mockReturnValue(0);
    const protect = allMoves[MoveId.PROTECT].getAttrs("ProtectAttr")[0];
    expect(protect.getCondition()(p, p, allMoves[MoveId.PROTECT])).toBe(true);
    expect(random).toHaveBeenCalledWith(3);
    p.summonData.moveHistory.push(history(MoveId.PROTECT));
    expect(protect.apply(p, p, allMoves[MoveId.PROTECT], [])).toBe(true);
    expect(p.summonData.forgeProtectStreak).toBe(2);
    p.summonData.moveHistory.push(history(MoveId.TACKLE));
    game.scene.currentBattle.turn++;
    protect.getCondition()(p, p, allMoves[MoveId.PROTECT]);
    expect(random).toHaveBeenCalledWith(9);
    p.summonData.forgeProtectWave--;
    expect(forgeProtectChain(p, 0)).toBe(0);
  });
});
