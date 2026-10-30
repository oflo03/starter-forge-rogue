// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import type { MoveId } from "#enums/move-id";
import type { PlayerPokemon } from "#field/pokemon";
import { LearnMovePhase } from "#phases/learn-move-phase";

/** The growth phase waits while the original phase owns all learn/forget/decline UI. */
class ForgeLearnMove extends LearnMovePhase {
  constructor(
    index: number,
    move: MoveId,
    private readonly complete: () => void,
  ) {
    super(index, move);
  }
  override end(): void {
    this.complete();
  }
}
export function learnForgeMove(pokemon: PlayerPokemon, move: MoveId): Promise<void> {
  const index = globalScene.getPlayerParty().indexOf(pokemon);
  if (index < 0) {
    throw new Error("The learning partner is no longer in the party.");
  }
  return new Promise(resolve => new ForgeLearnMove(index, move, resolve).start());
}
