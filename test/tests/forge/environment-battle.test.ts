// SPDX-License-Identifier: AGPL-3.0-only
import { FORGE_TERRAINS, FORGE_WEATHERS } from "#app/forge/environment";
import { initializeForgeRegistry } from "#app/forge/registry";
import { allMoves } from "#data/data-lists";
import { TerrainType } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { WeatherType } from "#enums/weather-type";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Forge native battle phase integration", () => {
  let phaser: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaser = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaser);
    initializeForgeRegistry();
    game.override
      .battleStyle("single")
      .startingLevel(50)
      .enemyLevel(50)
      .criticalHits(false)
      .ability(AbilityId.NO_GUARD)
      .enemyAbility(AbilityId.BALL_FETCH)
      .enemySpecies(SpeciesId.SHUCKLE)
      .enemyMoveset(MoveId.SPLASH);
  });

  it.each([...FORGE_WEATHERS, ...FORGE_TERRAINS])(
    "$move deals damage and creates its environment, including repeated use",
    async definition => {
      const move = allMoves.find(move => move.name === definition.move && move.power === 95)!;
      expect(move).toBeDefined();
      game.override.moveset(MoveId.TACKLE);
      await game.classicMode.startBattle(SpeciesId.EEVEE);
      game.move.changeMoveset(game.field.getPlayerPokemon(), move.id);
      const enemy = game.field.getEnemyPokemon();
      enemy.stats[Stat.HP] = 9999;
      enemy.hp = 9999;
      game.move.select(move.id);
      await game.phaseInterceptor.to("TurnEndPhase");
      expect(enemy.hp).toBeLessThan(9999);
      const firstHp = enemy.hp;
      const weather = FORGE_WEATHERS.some(entry => entry.name === definition.name);
      expect(weather ? game.scene.arena.weatherType : game.scene.arena.terrainType).toBe(definition.type);
      expect(weather ? game.scene.arena.weather?.turnsLeft : game.scene.arena.terrain?.turnsLeft).toBe(4);
      await game.phaseInterceptor.to("CommandPhase");
      game.move.select(move.id);
      await game.phaseInterceptor.to("TurnEndPhase");
      expect(enemy.hp).toBeLessThan(firstHp);
    },
  );

  it("poison gas fails a sound move, spends PP, backfires and applies native weather damage", async () => {
    game.override.ability(AbilityId.BALL_FETCH).weather(WeatherType.POISON_GAS).moveset(MoveId.HYPER_VOICE);
    await game.classicMode.startBattle(SpeciesId.EEVEE);
    const mon = game.field.getPlayerPokemon();
    const hp = mon.hp;
    const enemy = game.field.getEnemyPokemon();
    const enemyHp = enemy.hp;
    game.move.select(MoveId.HYPER_VOICE);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(mon.hp).toBe(hp - Math.max(1, Math.floor(hp / 8)) - Math.max(1, Math.floor(hp / 16)));
    expect(enemy.hp).toBe(enemyHp - Math.max(1, Math.floor(enemyHp / 16)));
    expect(mon.getMoveset()[0].ppUsed).toBe(1);
  });

  it("rainy Swamp actually faints a water/ground Pokemon after three turns", async () => {
    game.override
      .ability(AbilityId.BALL_FETCH)
      .startingTerrain(TerrainType.SWAMP)
      .weather(WeatherType.RAIN)
      .moveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.SWAMPERT);
    const mon = game.field.getPlayerPokemon();
    for (const count of [3, 1]) {
      game.move.select(MoveId.SPLASH);
      await game.phaseInterceptor.to("CommandPhase");
      expect(mon.summonData.forgeSwampCount).toBe(count);
    }
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("FaintPhase");
    expect(mon.hp).toBe(0);
  });

  it("Forecast takes the rainy form in thunderstorms and reverts under custom non-rain weather", async () => {
    game.override.ability(AbilityId.FORECAST).weather(WeatherType.THUNDERSTORM).moveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.CASTFORM);
    const mon = game.field.getPlayerPokemon();
    expect(mon.formIndex).toBe(2);
    game.override.weather(WeatherType.NONE);
    game.scene.arena.trySetWeather(WeatherType.POISON_GAS, mon);
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(mon.formIndex).toBe(0);
  });
});
