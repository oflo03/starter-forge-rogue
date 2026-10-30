// SPDX-License-Identifier: AGPL-3.0-only
import { FORGE_TERRAINS, FORGE_WEATHERS } from "#app/forge/environment";
import { forgeEnvironmentBenefitIds, forgeGalePriority } from "#app/forge/environment-abilities";
import { initializeForgeRegistry } from "#app/forge/registry";
import { allMoves } from "#data/data-lists";
import { TerrainType } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { WeatherType } from "#enums/weather-type";
import { GameManager } from "#test/framework/game-manager";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
    "$move creates its environment without attack damage",
    async definition => {
      const move = allMoves.find(move => move.name === definition.move && move.power <= 0)!;
      expect(move).toBeDefined();
      game.override.moveset(MoveId.TACKLE);
      await game.classicMode.startBattle(SpeciesId.EEVEE);
      game.move.changeMoveset(game.field.getPlayerPokemon(), move.id);
      const enemy = game.field.getEnemyPokemon();
      enemy.stats[Stat.HP] = 9999;
      enemy.hp = 9999;
      game.move.select(move.id);
      await game.phaseInterceptor.to("MoveEndPhase");
      expect(enemy.hp).toBe(9999);
      const weather = FORGE_WEATHERS.some(entry => entry.name === definition.name);
      expect(weather ? game.scene.arena.weatherType : game.scene.arena.terrainType).toBe(definition.type);
      expect(weather ? game.scene.arena.weather?.turnsLeft : game.scene.arena.terrain?.turnsLeft).toBe(5);
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
  it("dark heart evaluates all actual HP damage and grows only on an undamaged dark turn", async () => {
    game.override.ability(AbilityId.NONE).weather(WeatherType.DARK_AURA).moveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.EEVEE);
    const p = game.field.getPlayerPokemon();
    p.customPokemonData.ability = forgeEnvironmentBenefitIds.get("evil")!;
    p.damage(1, false, true, true);
    p.hp++;
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(p.getStatStage(Stat.ATK)).toBe(0);
    await game.phaseInterceptor.to("CommandPhase");
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("TurnEndPhase");
    await game.phaseInterceptor.to("CommandPhase");
    expect(p.getStatStage(Stat.ATK)).toBe(1);
    expect(p.getStatStage(Stat.SPATK)).toBe(1);
  });
  it("dark heart also sees later end-of-turn damage from the opponent", async () => {
    game.override
      .ability(AbilityId.NONE)
      .enemyAbility(AbilityId.BAD_DREAMS)
      .weather(WeatherType.DARK_AURA)
      .moveset(MoveId.SPLASH);
    await game.classicMode.startBattle(SpeciesId.EEVEE);
    const p = game.field.getPlayerPokemon();
    p.customPokemonData.ability = forgeEnvironmentBenefitIds.get("evil")!;
    p.customPokemonData.passive = AbilityId.COMATOSE;
    p.passive = true;
    expect(p.hasAbility(AbilityId.COMATOSE)).toBe(true);
    const hp = p.hp;
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("CommandPhase");
    expect(p.hp).toBeLessThan(hp);
    expect(p.getStatStage(Stat.ATK)).toBe(0);
    expect(p.getStatStage(Stat.SPATK)).toBe(0);
  });
  it("real mist misses grant both +2 while protection does not count as a miss", async () => {
    game.override.ability(AbilityId.NONE).weather(WeatherType.SILENT_MIST).moveset(MoveId.STONE_EDGE);
    await game.classicMode.startBattle(SpeciesId.EEVEE);
    const p = game.field.getPlayerPokemon();
    p.customPokemonData.ability = forgeEnvironmentBenefitIds.get("miss")!;
    vi.spyOn(p, "randBattleSeedInt").mockImplementation(range => range - 1);
    game.move.select(MoveId.STONE_EDGE);
    await game.phaseInterceptor.to("CommandPhase");
    expect(p.getStatStage(Stat.ATK)).toBe(2);
    expect(p.getStatStage(Stat.SPATK)).toBe(2);
    game.override.enemyMoveset(MoveId.PROTECT);
    game.move.changeMoveset(game.field.getEnemyPokemon(), MoveId.PROTECT);
    game.move.select(MoveId.STONE_EDGE);
    await game.phaseInterceptor.to("CommandPhase");
    expect(p.getStatStage(Stat.ATK)).toBe(2);
  });
  it("reveals gale direction only after commands are committed, on each turn", async () => {
    game.override.weather(WeatherType.GALE).moveset(MoveId.SPLASH);
    const messages = vi.spyOn(game.scene.phaseManager, "queueMessage");
    const announcements = () => messages.mock.calls.filter(([text]) => text.includes("우선도가 3 올랐다"));
    await game.classicMode.startBattle(SpeciesId.EEVEE);
    expect(announcements()).toHaveLength(0);
    for (let turn = 1; turn <= 2; turn++) {
      const favored = forgeGalePriority(game.field.getPlayerPokemon()) > 0 ? "아군" : "상대";
      game.move.select(MoveId.SPLASH);
      await game.phaseInterceptor.to("TurnEndPhase");
      expect(announcements()).toHaveLength(turn);
      expect(announcements().at(-1)![0]).toContain(favored);
      await game.phaseInterceptor.to("CommandPhase");
      expect(announcements()).toHaveLength(turn);
    }
  });
  it("wind reading protects before the priority attack without replacing the selected action", async () => {
    game.override.ability(AbilityId.NONE).weather(WeatherType.GALE).moveset(MoveId.SPLASH).enemyMoveset(MoveId.TACKLE);
    await game.classicMode.startBattle(SpeciesId.EEVEE);
    const p = game.field.getPlayerPokemon();
    p.customPokemonData.ability = forgeEnvironmentBenefitIds.get("wind")!;
    for (let t = 1; t < 100; t++) {
      game.scene.currentBattle.turn = t;
      if (forgeGalePriority(p) === 0) {
        break;
      }
    }
    const hp = p.hp;
    const pp = p.getMoveset()[0].ppUsed;
    game.move.select(MoveId.SPLASH);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(p.hp).toBe(hp);
    expect(p.getMoveset()[0].ppUsed).toBe(pp + 1);
  });
  it("poison compression really hits at extreme accuracy stages but cannot hit steel immunity", async () => {
    game.override.ability(AbilityId.NONE).weather(WeatherType.POISON_GAS).moveset(MoveId.SLUDGE_BOMB);
    await game.classicMode.startBattle(SpeciesId.EEVEE);
    const p = game.field.getPlayerPokemon();
    p.customPokemonData.ability = forgeEnvironmentBenefitIds.get("compress")!;
    const e = game.field.getEnemyPokemon();
    p.setStatStage(Stat.ACC, -6);
    e.setStatStage(Stat.EVA, 6);
    vi.spyOn(p, "randBattleSeedInt").mockImplementation(range => range - 1);
    const hp = e.hp;
    game.move.select(MoveId.SLUDGE_BOMB);
    await game.phaseInterceptor.to("CommandPhase");
    expect(e.hp).toBeLessThan(hp);
    e.customPokemonData.types = [PokemonType.STEEL];
    const immuneHp = e.hp;
    game.move.select(MoveId.SLUDGE_BOMB);
    await game.phaseInterceptor.to("TurnEndPhase");
    expect(e.hp).toBe(immuneHp);
  });
});
