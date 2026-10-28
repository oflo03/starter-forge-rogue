// SPDX-License-Identifier: AGPL-3.0-only

import {
  LowHpMoveTypePowerBoostAbAttr,
  MoveDamageBoostAbAttr,
  ReceivedMoveDamageMultiplierAbAttr,
} from "#abilities/ab-attrs";
import { AbBuilder, type Ability } from "#abilities/ability";
import { allAbilities, allMoves } from "#data/data-lists";
import { AbilityId } from "#enums/ability-id";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { Stat } from "#enums/stat";
import {
  AttackMove,
  CritOnlyAttr,
  FlinchAttr,
  HighCritAttr,
  HitHealAttr,
  type Move,
  RecoilAttr,
  StatStageChangeAttr,
} from "#moves/move";
// Catalog data supplies names and parameters; all battle effects below use upstream attributes.
import Catalog from "../../forge/vendor/catalog.js";
import Maker from "../../forge/vendor/engine.js";

export interface ForgeMoveChoice {
  id: MoveId;
  name: string;
  description: string;
  type: PokemonType;
  category: MoveCategory;
  power: number;
}
export interface ForgeAbilityChoice {
  id: AbilityId;
  name: string;
  description: string;
  /** Damage category to support with at least two learned attacks. */
  enhancedCategory?: MoveCategory;
}
type Stats = number[] | { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
interface CatalogMove {
  id: string;
  templateId: string;
  name: string;
  effect: string;
  type: string;
  category: string;
  power: number;
  accuracy: number | string;
  pp: number;
  priority: number;
  source: string;
  alwaysCrit?: boolean;
  debuffChance?: number;
  flinchChance?: number;
  targetDebuffs?: Record<string, number>;
}

const typeIds = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
];
const initialMoves: MoveId[] = [
  MoveId.POUND,
  MoveId.KARATE_CHOP,
  MoveId.PECK,
  MoveId.POISON_STING,
  MoveId.MUD_SLAP,
  MoveId.ROCK_THROW,
  MoveId.STRUGGLE_BUG,
  MoveId.ASTONISH,
  MoveId.METAL_CLAW,
  MoveId.EMBER,
  MoveId.WATER_GUN,
  MoveId.LEAFAGE,
  MoveId.THUNDER_SHOCK,
  MoveId.CONFUSION,
  MoveId.POWDER_SNOW,
  MoveId.DRAGON_BREATH,
  MoveId.BITE,
  MoveId.FAIRY_WIND,
];
const starterAbilities = new Map<PokemonType, AbilityId>([
  [PokemonType.FIRE, AbilityId.BLAZE],
  [PokemonType.WATER, AbilityId.TORRENT],
  [PokemonType.GRASS, AbilityId.OVERGROW],
  [PokemonType.BUG, AbilityId.SWARM],
]);
const registeredMoves: (ForgeMoveChoice & { source: CatalogMove })[] = [];
const registeredAbilities = new Map<string, ForgeAbilityChoice>();
let initialized = false;

function addAbility(builder: AbBuilder, name: string, description: string): ForgeAbilityChoice {
  const ability = builder.build();
  const id = allAbilities.length as AbilityId;
  // Construct against an original ID first: Ability's constructor requires a real enum localization key.
  Object.defineProperties(ability, {
    id: { value: id },
    name: { get: () => name },
    description: { get: () => description },
  });
  (allAbilities as Ability[]).push(ability);
  return { id, name, description };
}

/** Call after upstream initMoves/initAbilities. Never mutate original registries at import time. */
export function initializeForgeRegistry(): void {
  if (initialized) {
    return;
  }
  if (!allMoves[MoveId.TACKLE] || !allAbilities[AbilityId.BLAZE]) {
    throw new Error("Forge registry requires initialized original moves and abilities.");
  }
  const library = Catalog.getLibrary();
  for (const [type, key] of typeIds.entries()) {
    if (!starterAbilities.has(type as PokemonType)) {
      const source = library.abilities.find(ability => ability.id === `surge-${key}`);
      const name = source?.name ?? `${library.types.find(entry => entry.id === key)?.stem ?? key}의힘`;
      const description = `HP가 1/3 이하일 때 ${library.types.find(entry => entry.id === key)?.name} 기술의 위력이 1.5배가 됩니다.`;
      const choice = addAbility(
        new AbBuilder(AbilityId.BLAZE, 9).attr(LowHpMoveTypePowerBoostAbAttr, type as PokemonType),
        name,
        description,
      );
      starterAbilities.set(type as PokemonType, choice.id);
    }
  }
  const rewardDescriptions: Record<string, string> = {
    "muscle-focus": "물리 기술의 피해가 1.3배가 됩니다.",
    "mind-focus": "특수 기술의 피해가 1.3배가 됩니다.",
    "twin-shell":
      "HP가 최대치의 절반 이상일 때 받는 공격 피해가 25% 감소합니다. 다단 공격은 각 타격 직전에 판정합니다.",
    "balanced-gears":
      "공격과 특공 중 낮은 능력치를 쓰는 타격의 피해가 1.5배가 됩니다. 두 능력치가 같으면 모든 공격 타격에 적용합니다.",
  };
  for (const key of ["muscle-focus", "mind-focus", "twin-shell", "balanced-gears"]) {
    const source = library.abilities.find(ability => ability.id === key);
    if (!source || source.source === "원작 기반") {
      continue;
    }
    const builder = new AbBuilder(AbilityId.BLAZE, 9);
    switch (key) {
      case "muscle-focus":
        builder.attr(MoveDamageBoostAbAttr, 1.3, (_user, _target, move) => move.category === MoveCategory.PHYSICAL);
        break;
      case "mind-focus":
        builder.attr(MoveDamageBoostAbAttr, 1.3, (_user, _target, move) => move.category === MoveCategory.SPECIAL);
        break;
      case "twin-shell":
        builder.attr(ReceivedMoveDamageMultiplierAbAttr, pokemon => pokemon.getHpRatio() >= 0.5, 0.75);
        break;
      case "balanced-gears":
        builder.attr(MoveDamageBoostAbAttr, 1.5, (pokemon, _target, move) => {
          if (!pokemon || move.category === MoveCategory.STATUS) {
            return false;
          }
          const attack = pokemon.getStat(Stat.ATK, false);
          const special = pokemon.getStat(Stat.SPATK, false);
          return move.category === MoveCategory.PHYSICAL ? attack <= special : special <= attack;
        });
        break;
    }
    registeredAbilities.set(key, addAbility(builder, source.name, rewardDescriptions[key]));
  }
  // Explicit support list prevents catalog effects from being offered without engine implementations.
  const templates = new Set([
    "strike",
    "beam",
    "recoil",
    "recoil-light",
    "sure",
    "quick",
    "drain",
    "siphon",
    "erode",
    "crush",
    "critical",
    "flinch",
    "special-flinch",
  ]);
  // Source flags are locale-independent, so saved custom numeric IDs survive language changes.
  const sources = (library.moves as CatalogMove[])
    .filter(source => templates.has(source.templateId) && source.source !== "원작 기반")
    .sort((left, right) => left.id.localeCompare(right.id, "en"));
  for (const source of sources) {
    const type = typeIds.indexOf(source.type) as PokemonType;
    const category = source.category === "물리" ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
    if (type < 0 || !["물리", "특수"].includes(source.category)) {
      continue;
    }
    const isFlinch = source.templateId === "flinch" || source.templateId === "special-flinch";
    if (
      !Number.isFinite(source.power)
      || source.power <= 0
      || !Number.isInteger(source.pp)
      || source.pp < 1
      || !Number.isInteger(source.priority)
      || (source.templateId !== "sure"
        && (typeof source.accuracy !== "number"
          || !Number.isFinite(source.accuracy)
          || source.accuracy < 1
          || source.accuracy > 100))
      || (source.debuffChance !== undefined
        && (!Number.isFinite(source.debuffChance) || source.debuffChance < 0 || source.debuffChance > 1))
      || (isFlinch
        && (typeof source.flinchChance !== "number"
          || !Number.isFinite(source.flinchChance)
          || source.flinchChance < 0
          || source.flinchChance > 1))
    ) {
      continue;
    }
    if (["beam", "erode", "crush"].includes(source.templateId)) {
      const expectedStat = source.templateId === "crush" ? "def" : "spd";
      // Do not quietly substitute a different status effect if the catalog changes.
      if (
        !source.targetDebuffs
        || Object.keys(source.targetDebuffs).length !== 1
        || source.targetDebuffs[expectedStat] !== -1
      ) {
        continue;
      }
    }
    const chance = isFlinch
      ? Math.round(source.flinchChance! * 100)
      : ["beam", "erode", "crush"].includes(source.templateId)
        ? Math.round((source.debuffChance ?? 1) * 100)
        : -1;
    const move = new AttackMove(
      MoveId.TACKLE,
      type,
      category,
      source.power,
      source.templateId === "sure" ? -1 : (source.accuracy as number),
      source.pp,
      chance,
      source.priority,
      9,
    );
    switch (source.templateId) {
      case "drain":
      case "siphon":
        move.attr(HitHealAttr, 0.5).healingMove();
        break;
      case "recoil":
      case "recoil-light":
        move.attr(RecoilAttr, false, source.templateId === "recoil" ? 1 / 3 : 1 / 4).recklessMove();
        break;
      case "beam":
      case "erode":
        move.attr(StatStageChangeAttr, [Stat.SPDEF], -1);
        break;
      case "crush":
        move.attr(StatStageChangeAttr, [Stat.DEF], -1);
        break;
      case "critical":
        move.attr(source.alwaysCrit ? CritOnlyAttr : HighCritAttr);
        break;
      case "flinch":
      case "special-flinch":
        move.attr(FlinchAttr);
        break;
    }
    move.id = allMoves.length as MoveId;
    // Preserve custom text if a language refresh invokes Move.localize later.
    Object.defineProperty(move, "localize", {
      value: () => {
        move.name = source.name;
        move.effect = source.effect;
      },
    });
    move.localize();
    Object.defineProperty(move, "forgeAnimation", { value: MoveId.TACKLE });
    (allMoves as Move[]).push(move);
    registeredMoves.push({
      id: move.id,
      name: source.name,
      description: source.effect,
      type,
      category,
      power: source.power,
      source,
    });
  }
  initialized = true;
}

export function starterAbility(type: PokemonType): AbilityId {
  initializeForgeRegistry();
  const ability = starterAbilities.get(type);
  if (ability === undefined) {
    throw new Error("Unsupported starter type.");
  }
  return ability;
}

/** All initial moves are unmodified original-engine moves. */
export function starterMoves(type: PokemonType): MoveId[] {
  const stab = initialMoves[type];
  if (stab === undefined) {
    throw new Error("Unsupported starter type.");
  }
  return [stab, MoveId.TACKLE, MoveId.GROWL];
}

function statsPair(stats: Stats): [number, number] {
  return Array.isArray(stats) ? [stats[1], stats[3]] : [stats.atk, stats.spa];
}

function seededOrder<T>(items: T[], seed: string): T[] {
  const random = Maker.createRng(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = random.int(0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function customMoveChoices(
  types: PokemonType[],
  stats: Stats,
  seed: string,
  excludedIds: readonly MoveId[] = [],
): ForgeMoveChoice[] {
  initializeForgeRegistry();
  const [attack, special] = statsPair(stats);
  const candidates = registeredMoves.filter(
    move =>
      types.includes(move.type)
      && !excludedIds.includes(move.id)
      && (!move.source.alwaysCrit
        || (move.power <= 70 && (move.category === MoveCategory.PHYSICAL ? attack : special) <= 110)),
  );
  const shuffled = seededOrder(candidates, `${seed}:moves`);
  const preferred = attack >= special ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
  const ordered = [
    ...shuffled.filter(move => move.category === preferred),
    ...shuffled.filter(move => move.category !== preferred),
  ];
  const choices = ordered.slice(0, 3);
  if (types.length > 1 && !choices.some(move => move.type === types[1])) {
    const secondary = ordered.find(move => move.type === types[1]);
    if (secondary) {
      choices[choices.length - 1] = secondary;
    }
  }
  return choices.map(({ source: _source, ...choice }) => choice);
}

export function customAbilityChoices(_types: PokemonType[], stats: Stats, seed: string): ForgeAbilityChoice[] {
  initializeForgeRegistry();
  const [attack, special] = statsPair(stats);
  const keys = [attack >= special ? "muscle-focus" : "mind-focus", "twin-shell", "balanced-gears"];
  return seededOrder(
    keys.map(key => {
      const choice = registeredAbilities.get(key)!;
      if (key === "twin-shell") {
        return { ...choice };
      }
      const enhancedCategory =
        key === "balanced-gears"
          ? attack <= special
            ? MoveCategory.PHYSICAL
            : MoveCategory.SPECIAL
          : key === "muscle-focus"
            ? MoveCategory.PHYSICAL
            : MoveCategory.SPECIAL;
      return { ...choice, enhancedCategory };
    }),
    `${seed}:abilities`,
  );
}
