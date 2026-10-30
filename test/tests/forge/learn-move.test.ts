// SPDX-License-Identifier: AGPL-3.0-only
import { learnForgeMove } from "#app/forge/learn-move";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { LearnMovePhase } from "#phases/learn-move-phase";
import { GameManager } from "#test/framework/game-manager";
import { initSceneWithoutEncounterPhase } from "#test/utils/game-manager-utils";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Forge native move learning bridge", () => {
  let phaser: Phaser.Game;
  let game: GameManager;
  beforeAll(() => {
    phaser = new Phaser.Game({ type: Phaser.HEADLESS });
  });
  beforeEach(() => {
    game = new GameManager(phaser);
    initSceneWithoutEncounterPhase(game.scene, [SpeciesId.EEVEE, SpeciesId.PIKACHU]);
  });
  it("uses the real native phase for the correct party member and waits for its UI to finish", async () => {
    let native: LearnMovePhase | undefined;
    vi.spyOn(LearnMovePhase.prototype, "start").mockImplementation(function (this: LearnMovePhase) {
      native = this;
    });
    const shift = vi.spyOn(game.scene.phaseManager, "shiftPhase");
    const pokemon = game.scene.getPlayerParty()[1];
    const old = pokemon.getMoveset().map(m => m.moveId);
    let done = false;
    const pending = learnForgeMove(pokemon, MoveId.WATER_GUN).then(() => {
      done = true;
    });
    await Promise.resolve();
    expect(native).toBeInstanceOf(LearnMovePhase);
    expect(native!.getPlayerPokemon()).toBe(pokemon);
    expect(done).toBe(false);
    expect(pokemon.getMoveset().map(m => m.moveId)).toEqual(old);
    native!.end();
    native!.end();
    await pending;
    expect(done).toBe(true);
    expect(shift).not.toHaveBeenCalled();
  });
  it("rejects a removed partner instead of opening the wrong Pokemon", () => {
    const pokemon = game.scene.getPlayerParty()[0];
    vi.spyOn(game.scene, "getPlayerParty").mockReturnValue([]);
    expect(() => learnForgeMove(pokemon, MoveId.WATER_GUN)).toThrow("no longer in the party");
  });
});
