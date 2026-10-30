// SPDX-License-Identifier: AGPL-3.0-only
import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import {
  clearForgeGasWithWind,
  FORGE_TERRAINS,
  FORGE_WEATHERS,
  forgeGasBackfire,
  forgeSwampTick,
  forgeWeatherTick,
} from "#app/forge/environment";
import { forgeGalePriority } from "#app/forge/environment-abilities";
import { customMoveChoices, customPassiveChoices, initializeForgeRegistry } from "#app/forge/registry";
import { allAbilities, allMoves } from "#data/data-lists";
import { CustomPokemonData, PokemonSummonData } from "#data/pokemon-data";
import { Terrain, TerrainType } from "#data/terrain";
import { getWeatherMultiplierForMove, Weather } from "#data/weather";
import { AbilityId } from "#enums/ability-id";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { WeatherType } from "#enums/weather-type";
import { PokemonData } from "#system/pokemon-data";
import { GameManager } from "#test/framework/game-manager";
import { initSceneWithoutEncounterPhase } from "#test/utils/game-manager-utils";
import { NumberHolder } from "#utils/common";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Forge native environments and reward slots", () => {
  let phaser: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaser = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaser);
    initSceneWithoutEncounterPhase(game.scene, [SpeciesId.EEVEE, SpeciesId.PIKACHU]);
    initializeForgeRegistry();
    for (const mon of game.scene.getPlayerParty()) {
      mon.customPokemonData.ability = AbilityId.BALL_FETCH;
    }
    vi.spyOn(game.scene, "getField").mockReturnValue(game.scene.getPlayerParty());
  });
  const stats = [90, 120, 80, 60, 80, 100];

  it("uses native active and passive effects together without replacing the active slot", () => {
    const mon = game.scene.getPlayerParty()[0];
    mon.customPokemonData.ability = AbilityId.HUGE_POWER;
    const choices = customPassiveChoices([PokemonType.DARK], stats, "passive");
    const weather = choices.find(choice => allAbilities[choice.id].hasAttr("PostSummonWeatherChangeAbAttr"))!;
    mon.customPokemonData.passive = weather.id;
    mon.passive = true;
    expect(mon.getAbility().id).toBe(AbilityId.HUGE_POWER);
    expect(mon.getPassiveAbility().id).toBe(weather.id);
    expect(mon.getAbilityAttrs("StatMultiplierAbAttr")).not.toHaveLength(0);
    expect(mon.getAbilityAttrs("PostSummonWeatherChangeAbAttr")).toHaveLength(1);
    applyAbAttrs("PostSummonWeatherChangeAbAttr", { pokemon: mon });
    expect(game.scene.arena.weatherType).toBe(WeatherType.DARK_AURA);
    expect(game.scene.arena.weather?.turnsLeft).toBe(5);
    const restored = new CustomPokemonData(JSON.parse(JSON.stringify(mon.customPokemonData)));
    expect(restored.passive).toBe(weather.id);
    expect(restored.ability).toBe(AbilityId.HUGE_POWER);
    const copy = new PokemonData(mon).toPokemon();
    expect(copy.hasPassive()).toBe(true);
    expect(copy.getAbility().id).toBe(AbilityId.HUGE_POWER);
    expect(copy.getPassiveAbility().id).toBe(weather.id);
    copy.destroy();
  });

  it("registers all five weathers and four fields as usable native summon effects", () => {
    const mon = game.scene.getPlayerParty()[0];
    for (const definition of [...FORGE_WEATHERS, ...FORGE_TERRAINS]) {
      const choices = Array.from({ length: 20 }, (_, i) =>
        customPassiveChoices([...definition.affinity], stats, `environment-${i}`),
      ).flat();
      expect(choices.some(choice => choice.name === definition.name)).toBe(true);
    }
    for (const definition of FORGE_WEATHERS) {
      game.scene.arena.trySetWeather(definition.type, mon);
      expect(game.scene.arena.weather?.lapse()).toBe(true);
      expect(game.scene.arena.weather?.turnsLeft).toBe(4);
    }
    for (const definition of FORGE_TERRAINS) {
      game.scene.arena.trySetTerrain(definition.type, true, mon);
      expect(game.scene.arena.terrain?.turnsLeft).toBe(5);
    }
  });

  it("applies dark damage, mist accuracy/flinch and suppression", () => {
    const mon = game.scene.getPlayerParty()[0];
    game.scene.arena.weather = new Weather(WeatherType.DARK_AURA, 5);
    expect(getWeatherMultiplierForMove(mon, allMoves[MoveId.BITE])).toBe(1.2);
    expect(getWeatherMultiplierForMove(mon, allMoves[MoveId.MOONBLAST])).toBe(0.5);
    const solar = new NumberHolder(120);
    allMoves[MoveId.SOLAR_BEAM]
      .getAttrs("AntiSunlightPowerDecreaseAttr")[0]
      .apply(mon, mon, allMoves[MoveId.SOLAR_BEAM], [solar]);
    expect(solar.value).toBe(60);
    game.scene.arena.weather = new Weather(WeatherType.SILENT_MIST, 5);
    expect(allMoves[MoveId.TACKLE].calculateBattleAccuracy(mon, mon)).toBe(70);
    const headbutt = allMoves[MoveId.HEADBUTT];
    expect(headbutt.getAttrs("FlinchAttr")[0].getMoveChance(mon, mon, headbutt)).toBe(60);
    mon.customPokemonData.ability = AbilityId.CLOUD_NINE;
    expect(allMoves[MoveId.TACKLE].calculateBattleAccuracy(mon, mon)).toBe(100);
  });

  it("maps Weather Ball and Terrain Pulse to the custom types", () => {
    const mon = game.scene.getPlayerParty()[0];
    for (const [weather, type] of [
      [WeatherType.DARK_AURA, PokemonType.DARK],
      [WeatherType.GALE, PokemonType.FLYING],
      [WeatherType.SILENT_MIST, PokemonType.GHOST],
      [WeatherType.POISON_GAS, PokemonType.POISON],
      [WeatherType.THUNDERSTORM, PokemonType.ELECTRIC],
    ] as const) {
      game.scene.arena.weather = new Weather(weather, 5);
      expect(mon.getMoveType(allMoves[MoveId.WEATHER_BALL])).toBe(type);
    }
    for (const [terrain, type] of [
      [TerrainType.ANTHILL, PokemonType.BUG],
      [TerrainType.OCTAGON, PokemonType.FIGHTING],
      [TerrainType.SWAMP, PokemonType.GROUND],
    ] as const) {
      game.scene.arena.terrain = new Terrain(terrain, 5);
      expect(mon.getMoveType(allMoves[MoveId.TERRAIN_PULSE])).toBe(type);
    }
  });

  it("keeps rain damage, guaranteed Thunder and Swift Swim in thunderstorms", () => {
    const mon = game.scene.getPlayerParty()[0];
    game.scene.arena.weather = new Weather(WeatherType.THUNDERSTORM, 5);
    expect(getWeatherMultiplierForMove(mon, allMoves[MoveId.WATER_GUN])).toBe(1.5);
    expect(getWeatherMultiplierForMove(mon, allMoves[MoveId.EMBER])).toBe(0.5);
    expect(allMoves[MoveId.THUNDER].calculateBattleAccuracy(mon, mon)).toBe(-1);
    const speed = mon.getEffectiveStat(Stat.SPD);
    mon.customPokemonData.ability = AbilityId.SWIFT_SWIM;
    expect(mon.getEffectiveStat(Stat.SPD)).toBe(speed * 2);
  });

  it("rolls one stable gale side for the entire turn", () => {
    const [mon, other] = game.scene.getPlayerParty();
    vi.spyOn(other, "isPlayer").mockReturnValue(false);
    game.scene.arena.weather = new Weather(WeatherType.GALE, 5);
    const priority = forgeGalePriority(mon);
    expect(forgeGalePriority(other) + priority).toBe(3);
    expect(forgeGalePriority(mon)).toBe(priority);
    expect(allMoves[MoveId.TACKLE].getPriority(mon)).toBe(priority);
  });

  it("makes poison gas block sound and backfire, heal poison and clear with wind", () => {
    const mon = game.scene.getPlayerParty()[0];
    game.scene.arena.weather = new Weather(WeatherType.POISON_GAS, 5);
    expect(game.scene.arena.isMoveWeatherCancelled(mon, allMoves[MoveId.HYPER_VOICE])).toBe(true);
    expect(game.scene.arena.isMoveWeatherCancelled(mon, allMoves[MoveId.FOCUS_ENERGY])).toBe(true);
    expect(game.scene.arena.isMoveWeatherCancelled(mon, allMoves[MoveId.DRAGON_BREATH])).toBe(true);
    expect(game.scene.arena.isMoveWeatherCancelled(mon, allMoves[MoveId.TACKLE])).toBe(false);
    const damage = vi.spyOn(mon, "damageAndUpdate").mockReturnValue(1);
    forgeGasBackfire(mon);
    expect(damage.mock.calls[0][0]).toBe(Math.max(1, Math.floor(mon.getMaxHp() / 8)));
    mon.customPokemonData.types = [PokemonType.POISON];
    const phase = vi.spyOn(game.scene.phaseManager, "unshiftNew");
    forgeWeatherTick(mon);
    expect(phase.mock.calls.some(call => call[0] === "PokemonHealPhase")).toBe(true);
    clearForgeGasWithWind(mon, allMoves[MoveId.GUST]);
    expect(game.scene.arena.weatherType).toBe(WeatherType.NONE);
  });

  it("applies thunderstorm lightning using electric resistances and ground immunity", () => {
    const mon = game.scene.getPlayerParty()[0];
    game.scene.arena.weather = new Weather(WeatherType.THUNDERSTORM, 5);
    vi.spyOn(mon, "randBattleSeedInt").mockReturnValue(0);
    const damage = vi.spyOn(mon, "damageAndUpdate").mockReturnValue(1);
    mon.customPokemonData.types = [PokemonType.GROUND];
    forgeWeatherTick(mon);
    expect(damage).not.toHaveBeenCalled();
    mon.customPokemonData.types = [PokemonType.WATER, PokemonType.FLYING];
    forgeWeatherTick(mon);
    expect(damage.mock.calls[0][0]).toBe(Math.max(1, Math.floor(mon.getMaxHp() / 2)));
  });

  it("forces maximum multi-hit and grants temporary anthill evasion", () => {
    const [mon, target] = game.scene.getPlayerParty();
    game.scene.arena.terrain = new Terrain(TerrainType.ANTHILL, 5);
    const hit = new NumberHolder(0);
    allMoves[MoveId.FURY_SWIPES].getAttrs("MultiHitAttr")[0].apply(mon, target, allMoves[MoveId.FURY_SWIPES], [hit]);
    expect(hit.value).toBe(5);
    target.customPokemonData.types = [PokemonType.BUG];
    expect(mon.getAccuracyMultiplier(target, allMoves[MoveId.TACKLE])).toBe(0.75);
    expect(target.getStatStage(Stat.EVA)).toBe(0);
    expect(game.scene.arena.getTerrainPowerMultiplier(PokemonType.BUG)).toBe(1.2);
  });

  it("locks octagon switches and ignores evasion while keeping accuracy stages", () => {
    const [mon, target] = game.scene.getPlayerParty();
    game.scene.arena.terrain = new Terrain(TerrainType.OCTAGON, 5);
    mon.customPokemonData.types = [PokemonType.GHOST];
    target.setStatStage(Stat.EVA, 6);
    mon.setStatStage(Stat.ACC, -1);
    expect(mon.isTrapped()).toBe(true);
    expect(mon.getAccuracyMultiplier(target, allMoves[MoveId.TACKLE])).toBe(0.75);
  });

  it("temporarily paints all types normal and disables skin conversion and its bonus", () => {
    const mon = game.scene.getPlayerParty()[0];
    mon.customPokemonData.types = [PokemonType.FIRE, PokemonType.FLYING];
    mon.customPokemonData.ability = AbilityId.PIXILATE;
    game.scene.arena.terrain = new Terrain(TerrainType.WHITE_PAINT, 5);
    expect(mon.getTypes()).toEqual([PokemonType.NORMAL]);
    expect(mon.getMoveType(allMoves[MoveId.WEATHER_BALL])).toBe(PokemonType.NORMAL);
    const power = new NumberHolder(100);
    applyAbAttrs("MovePowerBoostAbAttr", {
      pokemon: mon,
      opponent: mon,
      move: allMoves[MoveId.TACKLE],
      power,
      simulated: true,
    });
    expect(power.value).toBe(100);
    game.scene.arena.terrain = null;
    expect(mon.getTypes()).toEqual([PokemonType.FIRE, PokemonType.FLYING]);
    expect(mon.getMoveType(allMoves[MoveId.TACKLE])).toBe(PokemonType.FAIRY);
  });

  it("counts Swamp for water/ground too, resets in air and accelerates in rain", () => {
    const mon = game.scene.getPlayerParty()[0];
    game.scene.arena.terrain = new Terrain(TerrainType.SWAMP, 5);
    mon.customPokemonData.types = [PokemonType.WATER];
    const damage = vi.spyOn(mon, "damageAndUpdate").mockReturnValue(1);
    forgeSwampTick(mon);
    expect(mon.summonData.forgeSwampCount).toBe(4);
    const speed = mon.getEffectiveStat(Stat.SPD);
    mon.customPokemonData.types = [PokemonType.NORMAL];
    expect(mon.getEffectiveStat(Stat.SPD)).toBe(Math.floor(speed / 2));
    mon.customPokemonData.ability = AbilityId.LEVITATE;
    forgeSwampTick(mon);
    expect(mon.summonData.forgeSwampCount).toBe(5);
    mon.customPokemonData.ability = AbilityId.BALL_FETCH;
    game.scene.arena.weather = new Weather(WeatherType.THUNDERSTORM, 5);
    forgeSwampTick(mon);
    forgeSwampTick(mon);
    forgeSwampTick(mon);
    expect(mon.summonData.forgeSwampCount).toBe(0);
    expect(damage).toHaveBeenCalledWith(mon.hp, expect.any(Object));
    expect(new PokemonSummonData(JSON.parse(JSON.stringify(mon.summonData))).forgeSwampCount).toBe(0);
    game.scene.arena.trySetTerrain(TerrainType.NONE, true, mon);
    expect(mon.summonData.forgeSwampCount).toBe(5);
  });

  it("provides stronger late moves, environment attacks and capped single-hit criticals", () => {
    for (const level of [11, 21, 31, 41, 51]) {
      for (const definition of FORGE_WEATHERS) {
        const choices = customMoveChoices(
          [...definition.affinity],
          stats,
          "late-reward",
          [],
          MoveCategory.PHYSICAL,
          level,
        );
        expect(choices).toHaveLength(3);
        if (level >= 31) {
          expect(
            choices.some(
              choice =>
                allMoves[choice.id].hasAttr("WeatherChangeAttr") || allMoves[choice.id].hasAttr("TerrainChangeAttr"),
            ),
          ).toBe(true);
        }
        for (const choice of choices) {
          const move = allMoves[choice.id];
          if (move.hasAttr("CritOnlyAttr")) {
            expect(move.power).toBeLessThanOrEqual(70);
            expect(move.hasAttr("MultiHitAttr")).toBe(false);
          }
        }
      }
    }
    const early = customMoveChoices([PokemonType.FIRE], stats, "strong", [], undefined, 11);
    const late = customMoveChoices([PokemonType.FIRE], stats, "strong", [], undefined, 51);
    expect(Math.max(...late.map(move => move.power))).toBeGreaterThan(Math.max(...early.map(move => move.power)));
  });
});
