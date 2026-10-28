// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import type { CustomPokemonData } from "#data/pokemon-data";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon } from "#field/pokemon";
import { EvolutionPhase } from "#phases/evolution-phase";
import { PokemonData } from "#system/pokemon-data";

/** Reuse the native evolution scene, particles, cycling silhouettes, sounds and fanfare. */
class ForgeEvolutionAnimation extends EvolutionPhase {
  private complete: () => void;
  private fail: (error: unknown) => void;

  constructor(
    pokemon: PlayerPokemon,
    private readonly stage: 2 | 3,
    private readonly stats: number[],
    private readonly types: CustomPokemonData["types"] = [...pokemon.customPokemonData.types],
  ) {
    super(pokemon, null, pokemon.level - 1, false);
  }

  play(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.complete = resolve;
      this.fail = reject;
      this.start().catch(reject);
    });
  }

  override validate(): boolean {
    return !!this.pokemon.customPokemonData.forge;
  }

  override doEvolution(): void {
    const preview = new PokemonData(this.pokemon).toPokemon() as PlayerPokemon;
    preview.customPokemonData.forge!.stage = this.stage;
    preview.customPokemonData.forge!.baseStats = [...this.stats];
    preview.customPokemonData.types = [...this.types];
    preview.calculateStats();
    preview
      .loadAssets()
      .then(() => {
        this.configureSprite(preview, this.pokemonEvoSprite, false);
        this.configureSprite(preview, this.pokemonEvoTintSprite, false);
        this.playEvolutionAnimation(preview);
      })
      .catch(this.fail);
  }

  protected override async applyEvolution(): Promise<void> {
    const data = this.pokemon.customPokemonData.forge!;
    data.stage = this.stage;
    data.baseStats = [...this.stats];
    this.pokemon.customPokemonData.types = [...this.types];
    this.pokemon.calculateStats();
    await this.pokemon.loadAssets();
    await this.pokemon.updateInfo();
  }

  protected override queuePostEvolutionPhases(): void {
    // The waiting Forge growth phase owns its rewards and continuation.
  }

  protected override getEvolutionDoneMessage(): string {
    return `${this.pokemon.getNameToRender({ useIllusion: false })}의 진화가 완료됐다!`;
  }

  override end(): void {
    this.evolutionOverlay?.destroy();
    globalScene.ui.setModeForceTransition(UiMode.MESSAGE).then(this.complete).catch(this.fail);
  }
}

export function animateForgeEvolution(
  pokemon: PlayerPokemon,
  stage: 2 | 3,
  stats: number[],
  types?: CustomPokemonData["types"],
): Promise<void> {
  return new ForgeEvolutionAnimation(pokemon, stage, stats, types).play();
}
