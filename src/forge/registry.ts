// SPDX-License-Identifier: AGPL-3.0-only

import {
  BlockCritAbAttr,
  LowHpMoveTypePowerBoostAbAttr,
  MoveDamageBoostAbAttr,
  PostTurnHealAbAttr,
  PostVictoryStatStageChangeAbAttr,
  ReceivedMoveDamageMultiplierAbAttr,
  StatMultiplierAbAttr,
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
    "muscle-focus": "물리 기술 피해 1.5배. 직접 상대를 쓰러뜨리면 공격 +1.",
    "mind-focus": "특수 기술 피해 1.5배. 직접 상대를 쓰러뜨리면 특공 +1.",
    "twin-shell": "HP가 절반 이상이면 받는 피해 35% 감소. 턴 종료 시 최대 HP의 1/16 회복. 다단 공격은 매 타격 판정.",
    "balanced-gears": "낮은 공격 능력치를 쓰는 타격 피해 1.75배. 스피드 1.15배. 공격·특공이 같으면 양쪽 모두 강화.",
  };
  for (const key of ["muscle-focus", "mind-focus", "twin-shell", "balanced-gears"]) {
    const source = library.abilities.find(ability => ability.id === key);
    if (!source || source.source === "원작 기반") {
      continue;
    }
    const builder = new AbBuilder(AbilityId.BLAZE, 9);
    switch (key) {
      case "muscle-focus":
        builder
          .attr(MoveDamageBoostAbAttr, 1.5, (_user, _target, move) => move.category === MoveCategory.PHYSICAL)
          .attr(PostVictoryStatStageChangeAbAttr, [{ stat: Stat.ATK, stages: 1 }]);
        break;
      case "mind-focus":
        builder
          .attr(MoveDamageBoostAbAttr, 1.5, (_user, _target, move) => move.category === MoveCategory.SPECIAL)
          .attr(PostVictoryStatStageChangeAbAttr, [{ stat: Stat.SPATK, stages: 1 }]);
        break;
      case "twin-shell":
        builder
          .attr(ReceivedMoveDamageMultiplierAbAttr, pokemon => pokemon.getHpRatio() >= 0.5, 0.65)
          .attr(PostTurnHealAbAttr);
        break;
      case "balanced-gears":
        builder
          .attr(MoveDamageBoostAbAttr, 1.75, (pokemon, _target, move) => {
            if (!pokemon || move.category === MoveCategory.STATUS) {
              return false;
            }
            const attack = pokemon.getStat(Stat.ATK, false);
            const special = pokemon.getStat(Stat.SPATK, false);
            return move.category === MoveCategory.PHYSICAL ? attack <= special : special <= attack;
          })
          .attr(StatMultiplierAbAttr, Stat.SPD, 1.15);
        break;
    }
    registeredAbilities.set(key, addAbility(builder, source.name, rewardDescriptions[key]));
  }
  // Append awakenings after the original abilities so existing save IDs remain stable.
  for (let tier = 1; tier <= 4; tier++) {
    const suffix = tier === 1 ? "-awakened" : `-awakened-${tier}`;
    const damage = [0, 1.65, 1.8, 1.95, 2.1][tier];
    const gear = [0, 1.9, 2.1, 2.3, 2.5][tier];
    const speed = [0, 1.3, 1.4, 1.5, 1.6][tier];
    const reduction = [0, 0.75, 0.7, 0.65, 0.6][tier];
    const grade = tier === 1 ? "" : ` ${["", "", "Ⅱ", "Ⅲ", "Ⅳ"][tier]}`;
    for (const [key, name, category] of [
      ["muscle-focus", "멈추지않는힘", MoveCategory.PHYSICAL],
      ["mind-focus", "솟구치는마음", MoveCategory.SPECIAL],
    ] as const) {
      const stat = category === MoveCategory.PHYSICAL ? Stat.ATK : Stat.SPATK;
      const builder = new AbBuilder(AbilityId.BLAZE, 9)
        .attr(MoveDamageBoostAbAttr, damage, (_user, _target, move) => move.category === category)
        .attr(PostVictoryStatStageChangeAbAttr, [
          { stat, stages: 1 },
          { stat: Stat.SPD, stages: 1 },
        ]);
      registeredAbilities.set(
        key + suffix,
        addAbility(
          builder,
          name + grade,
          `${category === MoveCategory.PHYSICAL ? "물리" : "특수"} 피해 ${damage}배. 직접 상대를 쓰러뜨리면 ${category === MoveCategory.PHYSICAL ? "공격" : "특공"}·스피드 +1.`,
        ),
      );
    }
    registeredAbilities.set(
      "twin-shell" + suffix,
      addAbility(
        new AbBuilder(AbilityId.BLAZE, 9)
          .attr(ReceivedMoveDamageMultiplierAbAttr, () => true, reduction)
          .attr(PostTurnHealAbAttr)
          .attr(BlockCritAbAttr),
        "끝없는숨결" + grade,
        `항상 받는 피해 ${Math.round((1 - reduction) * 100)}% 감소. 턴 종료 시 최대 HP의 1/16 회복. 급소에 맞지 않음.`,
      ),
    );
    registeredAbilities.set(
      "balanced-gears" + suffix,
      addAbility(
        new AbBuilder(AbilityId.BLAZE, 9)
          .attr(MoveDamageBoostAbAttr, gear, (pokemon, _target, move) => {
            if (!pokemon || move.category === MoveCategory.STATUS) {
              return false;
            }
            const attack = pokemon.getStat(Stat.ATK, false);
            const special = pokemon.getStat(Stat.SPATK, false);
            return move.category === MoveCategory.PHYSICAL ? attack <= special : special <= attack;
          })
          .attr(StatMultiplierAbAttr, Stat.SPD, speed),
        "빈틈없는박자" + grade,
        `낮은 공격 능력치를 쓰는 타격 피해 ${gear}배. 스피드 ${speed}배. 공격·특공이 같으면 양쪽 모두 강화.`,
      ),
    );
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
    const powerFloors: Record<string, number> = {
      strike: 100,
      beam: 110,
      recoil: 140,
      "recoil-light": 120,
      sure: 90,
      quick: 70,
      drain: 90,
      siphon: 90,
      erode: 95,
      crush: 110,
      flinch: 80,
      "special-flinch": 75,
      critical: 90,
    };
    const power = source.alwaysCrit
      ? Math.min(70, source.power)
      : Math.max(source.power, powerFloors[source.templateId] ?? 0);
    const move = new AttackMove(
      MoveId.TACKLE,
      type,
      category,
      power,
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
      power,
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
  preferredCategory?: MoveCategory,
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
  const preferred = preferredCategory ?? (attack >= special ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL);
  const ordered = [
    ...shuffled.filter(move => move.category === preferred),
    ...shuffled.filter(move => move.category !== preferred),
  ];
  const choices: typeof ordered = [];
  for (const predicate of [
    (move: (typeof ordered)[number]) => move.power >= 100,
    (move: (typeof ordered)[number]) => ["drain", "siphon", "erode", "crush", "beam"].includes(move.source.templateId),
    (move: (typeof ordered)[number]) =>
      move.source.priority > 0
      || move.source.templateId === "sure"
      || move.source.templateId === "critical"
      || move.source.templateId.includes("flinch"),
  ]) {
    const candidate = ordered.find(
      move => predicate(move) && !choices.some(other => other.source.templateId === move.source.templateId),
    );
    if (candidate) {
      choices.push(candidate);
    }
  }
  for (const candidate of ordered) {
    if (choices.length === 3) {
      break;
    }
    if (!choices.some(move => move.id === candidate.id)) {
      choices.push(candidate);
    }
  }
  if (types.length > 1 && !choices.some(move => move.type === types[1])) {
    const secondary = ordered.find(move => move.type === types[1]);
    if (secondary) {
      choices[choices.length - 1] = secondary;
    }
  }
  return choices.map(({ source: _source, ...choice }) => choice);
}

export function customAbilityChoices(
  _types: PokemonType[],
  stats: Stats,
  seed: string,
  awakened: boolean | number = false,
): ForgeAbilityChoice[] {
  initializeForgeRegistry();
  const [attack, special] = statsPair(stats);
  const keys = [attack >= special ? "muscle-focus" : "mind-focus", "twin-shell", "balanced-gears"];
  return seededOrder(
    keys.map(key => {
      const choice = registeredAbilities.get(
        key + (Number(awakened) > 1 ? `-awakened-${Number(awakened)}` : awakened ? "-awakened" : ""),
      )!;
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
