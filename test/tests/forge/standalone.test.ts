// SPDX-License-Identifier: AGPL-3.0-only
import { getGameMode } from "#app/game-mode";
import { handleTutorial, Tutorial } from "#app/tutorial";
import { GameModes } from "#enums/game-modes";
import { SpeciesId } from "#enums/species-id";
import { UiMode } from "#enums/ui-mode";
import { TitlePhase } from "#phases/title-phase";
import { GameManager } from "#test/framework/game-manager";
import { initSceneWithoutEncounterPhase } from "#test/utils/game-manager-utils";
import type { OptionSelectModeConfig } from "#types/ui-types";
import Phaser from "phaser";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Forge standalone experience", () => {
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

  it("starts Forge directly without a mode or starter selection menu", async () => {
    const title = new TitlePhase();
    const end = vi.spyOn(title, "end").mockImplementation(() => {});
    const mode = vi.spyOn(game.scene.ui, "setMode").mockResolvedValue();
    await title["showOptions"](-1);
    expect(mode.mock.calls[0][0]).toBe(UiMode.TITLE);
    const config = mode.mock.calls[0][1] as OptionSelectModeConfig;
    expect(config.options).toHaveLength(4);
    expect(config.options[0].label).toBe("모험 시작");
    config.options[0].handler();
    expect(title.gameMode).toBe(GameModes.FORGE);
    expect(end).toHaveBeenCalledOnce();
    expect(mode.mock.calls.map(call => call[0])).not.toContain(UiMode.STARTER_SELECT);
  });

  it("skips tutorials and capture registration without modifying starter data", async () => {
    const pokemon = game.scene.getPlayerParty()[0];
    const root = pokemon.species.getRootSpeciesId();
    const before = structuredClone(game.scene.gameData.starterData[root]);
    expect(await handleTutorial(Tutorial.INTRO)).toBe(false);
    expect(await game.scene.gameData.setPokemonCaught(pokemon)).toBe(false);
    expect(game.scene.gameData.addStarterCandy(root, 5)).toBe(false);
    expect(game.scene.gameData.starterData[root]).toEqual(before);
  });
});
