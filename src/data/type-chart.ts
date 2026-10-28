// SPDX-License-Identifier: AGPL-3.0-only
// Type chart extracted unchanged from PokéRogue src/data/type.ts.
import { PokemonType } from "../enums/pokemon-type.ts";

export type SingleTypeDamageMultiplier = 0 | 0.5 | 1 | 2;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This simulates the Pokemon type chart with nested `switch case`s
export function getTypeChartMultiplier(attackType: PokemonType, defType: PokemonType): SingleTypeDamageMultiplier {
  if (attackType === PokemonType.UNKNOWN || defType === PokemonType.UNKNOWN) {
    return 1;
  }

  switch (defType) {
    case PokemonType.NORMAL:
      switch (attackType) {
        case PokemonType.FIGHTING:
          return 2;
        case PokemonType.GHOST:
          return 0;
        default:
          return 1;
      }
    case PokemonType.FIGHTING:
      switch (attackType) {
        case PokemonType.FLYING:
        case PokemonType.PSYCHIC:
        case PokemonType.FAIRY:
          return 2;
        case PokemonType.ROCK:
        case PokemonType.BUG:
        case PokemonType.DARK:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.FLYING:
      switch (attackType) {
        case PokemonType.ROCK:
        case PokemonType.ELECTRIC:
        case PokemonType.ICE:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.BUG:
        case PokemonType.GRASS:
          return 0.5;
        case PokemonType.GROUND:
          return 0;
        default:
          return 1;
      }
    case PokemonType.POISON:
      switch (attackType) {
        case PokemonType.GROUND:
        case PokemonType.PSYCHIC:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.POISON:
        case PokemonType.BUG:
        case PokemonType.GRASS:
        case PokemonType.FAIRY:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.GROUND:
      switch (attackType) {
        case PokemonType.WATER:
        case PokemonType.GRASS:
        case PokemonType.ICE:
          return 2;
        case PokemonType.POISON:
        case PokemonType.ROCK:
          return 0.5;
        case PokemonType.ELECTRIC:
          return 0;
        default:
          return 1;
      }
    case PokemonType.ROCK:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.GROUND:
        case PokemonType.STEEL:
        case PokemonType.WATER:
        case PokemonType.GRASS:
          return 2;
        case PokemonType.NORMAL:
        case PokemonType.FLYING:
        case PokemonType.POISON:
        case PokemonType.FIRE:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.BUG:
      switch (attackType) {
        case PokemonType.FLYING:
        case PokemonType.ROCK:
        case PokemonType.FIRE:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.GROUND:
        case PokemonType.GRASS:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.GHOST:
      switch (attackType) {
        case PokemonType.GHOST:
        case PokemonType.DARK:
          return 2;
        case PokemonType.POISON:
        case PokemonType.BUG:
          return 0.5;
        case PokemonType.NORMAL:
        case PokemonType.FIGHTING:
          return 0;
        default:
          return 1;
      }
    case PokemonType.STEEL:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.GROUND:
        case PokemonType.FIRE:
          return 2;
        case PokemonType.NORMAL:
        case PokemonType.FLYING:
        case PokemonType.ROCK:
        case PokemonType.BUG:
        case PokemonType.STEEL:
        case PokemonType.GRASS:
        case PokemonType.PSYCHIC:
        case PokemonType.ICE:
        case PokemonType.DRAGON:
        case PokemonType.FAIRY:
          return 0.5;
        case PokemonType.POISON:
          return 0;
        default:
          return 1;
      }
    case PokemonType.FIRE:
      switch (attackType) {
        case PokemonType.GROUND:
        case PokemonType.ROCK:
        case PokemonType.WATER:
          return 2;
        case PokemonType.BUG:
        case PokemonType.STEEL:
        case PokemonType.FIRE:
        case PokemonType.GRASS:
        case PokemonType.ICE:
        case PokemonType.FAIRY:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.WATER:
      switch (attackType) {
        case PokemonType.GRASS:
        case PokemonType.ELECTRIC:
          return 2;
        case PokemonType.STEEL:
        case PokemonType.FIRE:
        case PokemonType.WATER:
        case PokemonType.ICE:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.GRASS:
      switch (attackType) {
        case PokemonType.FLYING:
        case PokemonType.POISON:
        case PokemonType.BUG:
        case PokemonType.FIRE:
        case PokemonType.ICE:
          return 2;
        case PokemonType.GROUND:
        case PokemonType.WATER:
        case PokemonType.GRASS:
        case PokemonType.ELECTRIC:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.ELECTRIC:
      switch (attackType) {
        case PokemonType.GROUND:
          return 2;
        case PokemonType.FLYING:
        case PokemonType.STEEL:
        case PokemonType.ELECTRIC:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.PSYCHIC:
      switch (attackType) {
        case PokemonType.BUG:
        case PokemonType.GHOST:
        case PokemonType.DARK:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.PSYCHIC:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.ICE:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.ROCK:
        case PokemonType.STEEL:
        case PokemonType.FIRE:
          return 2;
        case PokemonType.ICE:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.DRAGON:
      switch (attackType) {
        case PokemonType.ICE:
        case PokemonType.DRAGON:
        case PokemonType.FAIRY:
          return 2;
        case PokemonType.FIRE:
        case PokemonType.WATER:
        case PokemonType.GRASS:
        case PokemonType.ELECTRIC:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.DARK:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.BUG:
        case PokemonType.FAIRY:
          return 2;
        case PokemonType.GHOST:
        case PokemonType.DARK:
          return 0.5;
        case PokemonType.PSYCHIC:
          return 0;
        default:
          return 1;
      }
    case PokemonType.FAIRY:
      switch (attackType) {
        case PokemonType.POISON:
        case PokemonType.STEEL:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.BUG:
        case PokemonType.DARK:
          return 0.5;
        case PokemonType.DRAGON:
          return 0;
        default:
          return 1;
      }
    case PokemonType.STELLAR:
      return 1;
  }
}
