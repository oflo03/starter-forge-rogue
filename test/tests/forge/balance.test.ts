// SPDX-License-Identifier: AGPL-3.0-only
import { Battle } from "#app/battle";
import { FORGE_TRAINER_LEVELS, forgeEnemyItemLimit, forgeLevelCap, forgeWildLevel } from "#app/forge/balance";
import { getGameMode } from "#app/game-mode";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { SpeciesId } from "#enums/species-id";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { Trainer } from "#field/trainer";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import { regenerateModifierPoolThresholds } from "#modifiers/modifier-type";
import { GameManager } from "#test/framework/game-manager";
import { initSceneWithoutEncounterPhase } from "#test/utils/game-manager-utils";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const leaders = [
  TrainerType.ROCKET_BOSS_GIOVANNI_1,
  TrainerType.MAXIE,
  TrainerType.ARCHIE,
  TrainerType.CYRUS,
  TrainerType.GHETSIS,
  TrainerType.LYSANDRE,
  TrainerType.LUSAMINE,
  TrainerType.GUZMA,
  TrainerType.ROSE,
  TrainerType.PENNY,
];

describe("Forge 60-wave difficulty", () => {
  let phaser: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaser = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaser);
    initSceneWithoutEncounterPhase(game.scene, [SpeciesId.EEVEE]);
    game.scene.gameMode = getGameMode(GameModes.FORGE);
  });

  it("scales ordinary enemies and growth caps through all 60 waves without spikes", () => {
    for (let wave = 1; wave <= 60; wave++) {
      const battle = new Battle(game.scene.gameMode, { waveIndex: wave, battleType: BattleType.WILD, double: false });
      expect(battle.enemyLevels).toEqual([forgeWildLevel(wave)]);
      expect(forgeWildLevel(wave)).toBeLessThanOrEqual(forgeLevelCap(wave));
      if (wave > 1) {
        expect(forgeWildLevel(wave) - forgeWildLevel(wave - 1)).toBeLessThanOrEqual(1);
      }
    }
    expect([5, 25, 40, 55, 60].map(wave => Math.max(...FORGE_TRAINER_LEVELS[wave]))).toEqual([8, 28, 40, 55, 60]);
    expect(forgeLevelCap(51)).toBe(60);
  });

  it("gives every evil leader four level-37-to-40 normal-HP opponents without legendaries", () => {
    for (const type of leaders) {
      game.scene.currentBattle.waveIndex = 40;
      const trainer = new Trainer(type, TrainerVariant.DEFAULT);
      const battle = new Battle(game.scene.gameMode, {
        waveIndex: 40,
        battleType: BattleType.TRAINER,
        trainer,
        double: false,
      });
      game.scene.currentBattle = battle;
      battle.incrementTurn();
      expect(trainer.getPartyTemplate().size).toBe(4);
      expect(battle.enemyLevels).toEqual([37, 38, 39, 40]);
      for (let i = 0; i < 4; i++) {
        const mon = trainer.genPartyMember(i);
        battle.enemyParty.push(mon);
        expect(mon.bossSegments).toBe(0);
        expect(mon.species.legendary || mon.species.subLegendary || mon.species.mythical).toBeFalsy();
        expect(Math.max(...mon.ivs)).toBeLessThanOrEqual(21);
      }
      battle.enemyParty.forEach(mon => mon.destroy());
    }
  });

  it("caps original enemy held items instead of stacking late-game boss equipment", async () => {
    game.scene.currentBattle.waveIndex = 40;
    const trainer = new Trainer(TrainerType.MAXIE, TrainerVariant.DEFAULT);
    const battle = new Battle(game.scene.gameMode, {
      waveIndex: 40,
      battleType: BattleType.TRAINER,
      trainer,
      double: false,
    });
    game.scene.currentBattle = battle;
    battle.incrementTurn();
    for (let i = 0; i < 4; i++) {
      battle.enemyParty.push(trainer.genPartyMember(i));
    }
    regenerateModifierPoolThresholds(battle.enemyParty, ModifierPoolType.TRAINER);
    await game.scene.generateEnemyModifiers();
    for (const mon of battle.enemyParty) {
      const held = game.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.pokemonId === mon.id, false);
      expect(held.length).toBeLessThanOrEqual(forgeEnemyItemLimit(40));
      expect(held.every(m => m.stackCount === 1)).toBe(true);
    }
  });

  it("keeps the original classic evil boss roster and HP segments", () => {
    game.scene.gameMode = getGameMode(GameModes.CLASSIC);
    game.scene.currentBattle.waveIndex = 115;
    const trainer = new Trainer(TrainerType.MAXIE, TrainerVariant.DEFAULT);
    game.scene.currentBattle = new Battle(game.scene.gameMode, {
      waveIndex: 115,
      battleType: BattleType.TRAINER,
      trainer,
      double: false,
    });
    expect(trainer.getPartyTemplate().size).toBe(6);
    expect(trainer.genPartyMember(5).bossSegments).toBe(2);
  });
});
