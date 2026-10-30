// SPDX-License-Identifier: AGPL-3.0-only

import {
  BlockCritAbAttr,
  LowHpMoveTypePowerBoostAbAttr,
  MoveDamageBoostAbAttr,
  MovePowerBoostAbAttr,
  PostBiomeChangeTerrainChangeAbAttr,
  PostBiomeChangeWeatherChangeAbAttr,
  PostSummonTerrainChangeAbAttr,
  PostSummonWeatherChangeAbAttr,
  PostTurnHealAbAttr,
  PostVictoryStatStageChangeAbAttr,
  ReceivedMoveDamageMultiplierAbAttr,
  StatMultiplierAbAttr,
} from "#abilities/ab-attrs";
import { AbBuilder, type Ability } from "#abilities/ability";
import { allAbilities, allMoves } from "#data/data-lists";
import type { TerrainType } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { MoveTarget } from "#enums/move-target";
import { MultiHitType } from "#enums/multi-hit-type";
import { PokemonType } from "#enums/pokemon-type";
import { Stat } from "#enums/stat";
import { TerrainType as ForgeTerrainType } from "#enums/terrain-type";
import type { WeatherType } from "#enums/weather-type";
import { WeatherType as ForgeWeatherType } from "#enums/weather-type";
import {
  AttackMove,
  CritOnlyAttr,
  FlinchAttr,
  HighCritAttr,
  HitHealAttr,
  type Move,
  MultiHitAttr,
  RecoilAttr,
  StatStageChangeAttr,
  StatusMove,
  TerrainChangeAttr,
  WeatherChangeAttr,
} from "#moves/move";
// Catalog data supplies names and parameters; all battle effects below use upstream attributes.
import Catalog from "../../forge/vendor/catalog.js";
import Maker from "../../forge/vendor/engine.js";
import { AugmentTier } from "./augments";
import { FORGE_TERRAINS, FORGE_WEATHERS } from "./environment";
import {
  benefitTerrain,
  benefitWeather,
  FORGE_ENVIRONMENT_BENEFITS,
  forgeEnvironmentBenefitIds,
  forgeLightningFollowup,
  forgePaintBoost,
} from "./environment-abilities";
import { FORGE_NATIVE_MOVE_TIERS } from "./move-rewards";
import { abilityRewardWeight, type ForgeBuildContext, moveRewardWeight, weightedRewardOrder } from "./reward-synergy";

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
const registeredMoves: (ForgeMoveChoice & { source: CatalogMove; rewardStage: number; augmentTier?: AugmentTier })[] =
  [];
const registeredAbilities = new Map<string, ForgeAbilityChoice>();
const registeredPassives: (ForgeAbilityChoice & {
  affinity: readonly PokemonType[];
  environment: "weather" | "terrain" | "support";
})[] = [];
let initialized = false;
const registeredEnvironmentBenefits: (ForgeAbilityChoice & { tier: AugmentTier })[] = [];

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
      Object.defineProperty(allAbilities[choice.id], "forgeBoostedType", { value: type });
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
  // Preserve legacy awakening IDs; new runs choose one active ability and one passive instead.
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
  for (let rewardStage = 0; rewardStage <= 4; rewardStage++) {
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
      let chance = isFlinch
        ? Math.round(source.flinchChance! * 100)
        : ["beam", "erode", "crush"].includes(source.templateId)
          ? Math.round((source.debuffChance ?? 1) * 100)
          : -1;
      const dropsDefense = ["beam", "erode", "crush"].includes(source.templateId);
      if (dropsDefense && rewardStage >= 2) {
        chance = Math.max(chance, [0, 0, 50, 75, 100][rewardStage]);
      }
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
      const basePower = source.alwaysCrit
        ? Math.min(70, source.power)
        : Math.max(source.power, powerFloors[source.templateId] ?? 0);
      let power = source.alwaysCrit
        ? basePower
        : Math.round(
            Math.min(
              source.templateId.includes("recoil") ? 200 : source.priority > 0 ? 100 : 170,
              basePower * (1 + rewardStage * 0.15),
            ) / 5,
          ) * 5;
      const doubleStrike = source.templateId === "strike" && rewardStage >= 3;
      if (doubleStrike) {
        power = Math.round((power * 0.65) / 5) * 5;
      }
      const priority = source.priority + (source.templateId === "quick" && rewardStage === 4 ? 1 : 0);
      let description = source.effect;
      if (doubleStrike) {
        description = "2번 연속 공격한다. 위력은 1타 기준.";
      }
      if (dropsDefense && rewardStage >= 2) {
        description = `${chance}% 확률로 대상의 ${source.templateId === "crush" ? "방어를" : "특방을"} 1단계 내린다.`;
      }
      if (["drain", "siphon"].includes(source.templateId) && rewardStage === 4) {
        description = "실제로 준 HP 피해의 3/4만큼 자신의 HP를 회복한다.";
      }
      if (source.templateId === "quick") {
        description = `우선도 +${priority}로 공격한다.`;
      }
      const move = new AttackMove(
        MoveId.TACKLE,
        type,
        category,
        power,
        source.templateId === "sure" ? -1 : (source.accuracy as number),
        source.pp,
        chance,
        priority,
        9,
      );
      switch (source.templateId) {
        case "drain":
        case "siphon":
          move.attr(HitHealAttr, rewardStage === 4 ? 0.75 : 0.5).healingMove();
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
      if (doubleStrike) {
        move.attr(MultiHitAttr, MultiHitType.TWO);
      }
      move.id = allMoves.length as MoveId;
      // Preserve custom text if a language refresh invokes Move.localize later.
      Object.defineProperty(move, "localize", {
        value: () => {
          move.name = source.name;
          move.effect = description;
        },
      });
      move.localize();
      Object.defineProperty(move, "forgeAnimation", { value: MoveId.TACKLE });
      (allMoves as Move[]).push(move);
      registeredMoves.push({
        id: move.id,
        name: source.name,
        description,
        type,
        category,
        power,
        source,
        rewardStage,
      });
    }
  }
  initializeEnvironmentRewards();
  initializeGradedMoves();
  for (const definition of FORGE_ENVIRONMENT_BENEFITS) {
    const builder = new AbBuilder(AbilityId.BLAZE, 9);
    if (definition.key === "compress") {
      builder.conditionalAttr(
        () => benefitWeather(ForgeWeatherType.POISON_GAS),
        MoveDamageBoostAbAttr,
        1.5,
        (user, _target, move) => user.getMoveType(move) === PokemonType.POISON,
      );
    }
    if (definition.key === "wall") {
      builder
        .conditionalAttr(
          () => benefitTerrain(ForgeTerrainType.ANTHILL),
          ReceivedMoveDamageMultiplierAbAttr,
          (_target, user, move) =>
            [PokemonType.FIRE, PokemonType.FLYING].includes(user?.getMoveType(move) ?? move.type),
          0.5,
        )
        .ignorable();
    }
    if (definition.key === "corner") {
      builder.conditionalAttr(() => benefitTerrain(ForgeTerrainType.OCTAGON), StatMultiplierAbAttr, Stat.SPD, 2);
    }
    if (definition.key === "paint") {
      builder.attr(MovePowerBoostAbAttr, (user, _target, move) => forgePaintBoost(user, move), 1.3);
    }
    if (definition.key === "lightning") {
      builder.attr(MovePowerBoostAbAttr, (user, _target, move) => forgeLightningFollowup(user, move), 2);
    }
    const ability = addAbility(builder, definition.name, definition.description);
    forgeEnvironmentBenefitIds.set(definition.key, ability.id);
    registeredEnvironmentBenefits.push({ ...ability, tier: definition.tier });
  }
  migrateRetiredMoveDefinitions();
  initialized = true;
}

/** Retain numeric slots for old saves, but retire their creative names and effects. */
function migrateRetiredMoveDefinitions(): void {
  const nativeIds = Object.values(FORGE_NATIVE_MOVE_TIERS).flat();
  for (const choice of registeredMoves) {
    if (choice.category === MoveCategory.STATUS) {
      continue;
    }
    const sameCategory = nativeIds.filter(id => allMoves[id].category === choice.category);
    const sameType = sameCategory.filter(id => allMoves[id].type === choice.type);
    const candidates = sameType.length > 0 ? sameType : sameCategory;
    const expectedAttr = ["drain", "siphon"].includes(choice.source.templateId)
      ? "HitHealAttr"
      : choice.source.templateId.includes("flinch")
        ? "FlinchAttr"
        : undefined;
    const cost = (id: MoveId) =>
      Math.abs(allMoves[id].power - choice.source.power)
      + (expectedAttr && !allMoves[id].hasAttr(expectedAttr) ? 50 : 0);
    const replacement = [...candidates].sort((a, b) => cost(a) - cost(b) || a - b)[0];
    if (replacement === undefined) {
      throw new Error("Missing native replacement for retired move.");
    }
    (allMoves as Move[])[choice.id] = allMoves[replacement];
  }
}

/** Append variants, preserving every previously saved numeric move ID. */
function initializeGradedMoves(): void {
  for (const choice of [...registeredMoves]) {
    const original = allMoves[choice.id];
    for (const tier of [AugmentTier.SILVER, AugmentTier.PRISMATIC]) {
      const factor = tier === AugmentTier.SILVER ? 0.85 : 1.2;
      const power =
        original.category === MoveCategory.STATUS
          ? original.power
          : Math.min(choice.source.alwaysCrit ? 70 : 240, Math.max(5, Math.round((original.power * factor) / 5) * 5));
      const chance =
        original.chance > 0 && original.chance < 100
          ? Math.min(100, Math.max(1, Math.round(original.chance * (tier === AugmentTier.SILVER ? 0.75 : 1.25))))
          : original.chance;
      const description = chance === original.chance ? original.effect : original.effect.replace(/\d+%/, `${chance}%`);
      const move = Object.assign(
        original.category === MoveCategory.STATUS
          ? new StatusMove(MoveId.TACKLE, original.type, original.accuracy, original.pp, chance, original.priority, 9)
          : new AttackMove(
              MoveId.TACKLE,
              original.type,
              original.category,
              power,
              original.accuracy,
              original.pp,
              chance,
              original.priority,
              9,
            ),
        original,
      );
      move.id = allMoves.length as MoveId;
      move.power = power;
      move.chance = chance;
      move.pp = original.pp + (tier === AugmentTier.PRISMATIC && original.category !== MoveCategory.STATUS ? 5 : 0);
      // Reuse the base move's effects; only power, PP and chance differ.
      Object.defineProperty(move, "localize", {
        value: () => {
          move.name = choice.name;
          move.effect = description;
        },
      });
      Object.defineProperty(move, "forgeAnimation", {
        value:
          original.category === MoveCategory.STATUS
            ? choice.source.templateId === "weather"
              ? MoveId.RAIN_DANCE
              : MoveId.MISTY_TERRAIN
            : MoveId.TACKLE,
      });
      move.localize();
      (allMoves as Move[]).push(move);
      registeredMoves.push({ ...choice, id: move.id, power, description, augmentTier: tier });
    }
  }
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

function initializeEnvironmentRewards(): void {
  for (const definition of FORGE_WEATHERS) {
    const ability = addAbility(
      new AbBuilder(AbilityId.BLAZE, 9)
        .attr(PostSummonWeatherChangeAbAttr, definition.type)
        .attr(PostBiomeChangeWeatherChangeAbAttr, definition.type),
      definition.name,
      `등장 시 ${definition.description}`,
    );
    registeredPassives.push({ ...ability, affinity: definition.affinity, environment: "weather" });
  }
  for (const definition of FORGE_TERRAINS) {
    const ability = addAbility(
      new AbBuilder(AbilityId.BLAZE, 9)
        .attr(PostSummonTerrainChangeAbAttr, definition.type)
        .attr(PostBiomeChangeTerrainChangeAbAttr, definition.type),
      definition.name,
      `등장 시 ${definition.description}`,
    );
    registeredPassives.push({ ...ability, affinity: definition.affinity, environment: "terrain" });
  }
  for (const definition of [...FORGE_WEATHERS, ...FORGE_TERRAINS]) {
    const weather = FORGE_WEATHERS.some(entry => entry === definition);
    for (const category of [MoveCategory.PHYSICAL, MoveCategory.SPECIAL]) {
      for (let rewardStage = 2; rewardStage <= 4; rewardStage++) {
        const type = definition.affinity[0];
        const power = -1;
        // Keep the old ID order for saves, but all old environment attacks now create only.
        const move = new StatusMove(MoveId.TACKLE, type, -1, 10, -1, 0, 9).target(MoveTarget.BOTH_SIDES);
        if (weather) {
          move.attr(WeatherChangeAttr, definition.type as WeatherType);
        } else {
          move.attr(TerrainChangeAttr, definition.type as TerrainType);
        }
        const name = definition.move;
        const description = definition.description;
        move.id = allMoves.length as MoveId;
        Object.defineProperty(move, "localize", {
          value: () => {
            move.name = name;
            move.effect = description;
          },
        });
        Object.defineProperty(move, "forgeAnimation", { value: weather ? MoveId.RAIN_DANCE : MoveId.MISTY_TERRAIN });
        move.localize();
        (allMoves as Move[]).push(move);
        registeredMoves.push({
          id: move.id,
          name,
          description,
          type,
          category: MoveCategory.STATUS,
          power,
          rewardStage,
          source: {
            id: `environment-${definition.move}-${category}`,
            name,
            effect: description,
            type: typeIds[type],
            category: category === MoveCategory.PHYSICAL ? "물리" : "특수",
            power,
            accuracy: 100,
            pp: 10,
            priority: 0,
            source: "창작",
            templateId: weather ? "weather" : "terrain",
          },
        });
      }
    }
  }
}

export function customPassiveChoices(types: PokemonType[], stats: Stats, seed: string): ForgeAbilityChoice[] {
  initializeForgeRegistry();
  const choices: ForgeAbilityChoice[] = [];
  for (const environment of ["weather", "terrain"] as const) {
    const pool = registeredPassives.filter(choice => choice.environment === environment);
    const matching = pool.filter(choice => choice.affinity.some(type => types.includes(type)));
    choices.push(seededOrder(matching.length > 0 ? matching : pool, `${seed}:${environment}`)[0]);
  }
  const [attack, special] = statsPair(stats);
  const supports =
    attack + special >= 190
      ? [AbilityId.SPEED_BOOST, AbilityId.SERENE_GRACE]
      : [AbilityId.MAGIC_GUARD, AbilityId.REGENERATOR];
  const id = seededOrder(supports, seed)[0];
  const ability = allAbilities[id];
  choices.push({ id, name: ability.name, description: ability.description });
  return seededOrder(choices, `${seed}:passives`);
}

// User-defined tiers; explicit entries override the general weather/terrain rule.
const originalAugmentAbilities: Record<AugmentTier, AbilityId[]> = {
  [AugmentTier.SILVER]: [
    AbilityId.MAGNET_PULL,
    AbilityId.COTTON_DOWN,
    AbilityId.LIMBER,
    AbilityId.INSOMNIA,
    AbilityId.VITAL_SPIRIT,
    AbilityId.IMMUNITY,
    AbilityId.PASTEL_VEIL,
    AbilityId.MAGMA_ARMOR,
    AbilityId.WATER_VEIL,
    AbilityId.OWN_TEMPO,
    AbilityId.OBLIVIOUS,
    AbilityId.AROMA_VEIL,
    AbilityId.SWEET_VEIL,
    AbilityId.INNER_FOCUS,
    AbilityId.SHIELD_DUST,
    AbilityId.CLEAR_BODY,
    AbilityId.WHITE_SMOKE,
    AbilityId.FULL_METAL_BODY,
    AbilityId.MIRROR_ARMOR,
    AbilityId.HYPER_CUTTER,
    AbilityId.KEEN_EYE,
    AbilityId.ILLUMINATE,
    AbilityId.BIG_PECKS,
    AbilityId.BATTLE_ARMOR,
    AbilityId.SHELL_ARMOR,
    AbilityId.SUCTION_CUPS,
    AbilityId.STICKY_HOLD,
    AbilityId.WONDER_SKIN,
    AbilityId.SCRAPPY,
    AbilityId.MINDS_EYE,
    AbilityId.SOUNDPROOF,
    AbilityId.OVERCOAT,
    AbilityId.BULLETPROOF,
    AbilityId.GUARD_DOG,
    AbilityId.DAMP,
    AbilityId.CLOUD_NINE,
    AbilityId.AIR_LOCK,
    AbilityId.ROUGH_SKIN,
    AbilityId.IRON_BARBS,
    AbilityId.FLAME_BODY,
    AbilityId.STATIC,
    AbilityId.POISON_POINT,
    AbilityId.EFFECT_SPORE,
    AbilityId.CUTE_CHARM,
    AbilityId.GOOEY,
    AbilityId.TANGLING_HAIR,
    AbilityId.AFTERMATH,
    AbilityId.INNARDS_OUT,
    AbilityId.CURSED_BODY,
    AbilityId.PERISH_BODY,
    AbilityId.MUMMY,
    AbilityId.WANDERING_SPIRIT,
    AbilityId.LINGERING_AROMA,
    AbilityId.WEAK_ARMOR,
    AbilityId.SAND_SPIT,
    AbilityId.SEED_SOWER,
    AbilityId.ELECTROMORPHOSIS,
    AbilityId.WIND_POWER,
    AbilityId.SYNCHRONIZE,
    AbilityId.DAUNTLESS_SHIELD,
    AbilityId.JUSTIFIED,
    AbilityId.RATTLED,
    AbilityId.STEADFAST,
    AbilityId.BERSERK,
    AbilityId.THERMAL_EXCHANGE,
    AbilityId.WATER_COMPACTION,
    AbilityId.STEAM_ENGINE,
    AbilityId.ANGER_POINT,
    AbilityId.DANCER,
    AbilityId.IRON_FIST,
    AbilityId.PUNK_ROCK,
    AbilityId.NEUROFORCE,
    AbilityId.ANALYTIC,
    AbilityId.SOLAR_POWER,
    AbilityId.SAND_FORCE,
    AbilityId.HUSTLE,
    AbilityId.RIVALRY,
    AbilityId.VICTORY_STAR,
    AbilityId.SUPER_LUCK,
    AbilityId.SNIPER,
    AbilityId.MERCILESS,
    AbilityId.CORROSION,
    AbilityId.POISON_TOUCH,
    AbilityId.STENCH,
    AbilityId.LONG_REACH,
    AbilityId.LIQUID_VOICE,
    AbilityId.MARVEL_SCALE,
    AbilityId.QUICK_FEET,
    AbilityId.GRASS_PELT,
    AbilityId.HEATPROOF,
    AbilityId.SHED_SKIN,
    AbilityId.EARLY_BIRD,
    AbilityId.HYDRATION,
    AbilityId.LEAF_GUARD,
    AbilityId.RAIN_DISH,
    AbilityId.ICE_BODY,
    AbilityId.LIQUID_OOZE,
    AbilityId.SAND_VEIL,
    AbilityId.SNOW_CLOAK,
    AbilityId.TANGLED_FEET,
    AbilityId.SUPERSWEET_SYRUP,
    AbilityId.FRISK,
    AbilityId.FOREWARN,
    AbilityId.ANTICIPATION,
    AbilityId.UNNERVE,
    AbilityId.RIPEN,
    AbilityId.CUD_CHEW,
    AbilityId.CHEEK_POUCH,
    AbilityId.GLUTTONY,
    AbilityId.SCREEN_CLEANER,
    AbilityId.PRESSURE,
    AbilityId.BAD_DREAMS,
    AbilityId.QUICK_DRAW,
    AbilityId.COLOR_CHANGE,
    AbilityId.MIMICRY,
    AbilityId.HEAVY_METAL,
    AbilityId.LIGHT_METAL,
    AbilityId.FLOWER_GIFT,
  ],
  [AugmentTier.GOLD]: [
    AbilityId.COMPOUND_EYES,
    AbilityId.SHADOW_TAG,
    AbilityId.ARENA_TRAP,
    AbilityId.REGENERATOR,
    AbilityId.POISON_HEAL,
    AbilityId.PICKPOCKET,
    AbilityId.MAGICIAN,
    AbilityId.PRANKSTER,
    AbilityId.SPEED_BOOST,
    AbilityId.IMPOSTER,
    AbilityId.PICKUP,
    AbilityId.PARENTAL_BOND,
    AbilityId.DRIZZLE,
    AbilityId.DROUGHT,
    AbilityId.SAND_STREAM,
    AbilityId.SNOW_WARNING,
    AbilityId.ELECTRIC_SURGE,
    AbilityId.PSYCHIC_SURGE,
    AbilityId.MISTY_SURGE,
    AbilityId.GRASSY_SURGE,
    AbilityId.SWIFT_SWIM,
    AbilityId.CHLOROPHYLL,
    AbilityId.SAND_RUSH,
    AbilityId.SLUSH_RUSH,
    AbilityId.SURGE_SURFER,
    AbilityId.LEVITATE,
    AbilityId.VOLT_ABSORB,
    AbilityId.WATER_ABSORB,
    AbilityId.EARTH_EATER,
    AbilityId.FLASH_FIRE,
    AbilityId.LIGHTNING_ROD,
    AbilityId.STORM_DRAIN,
    AbilityId.SAP_SIPPER,
    AbilityId.MOTOR_DRIVE,
    AbilityId.DRY_SKIN,
    AbilityId.WELL_BAKED_BODY,
    AbilityId.WIND_RIDER,
    AbilityId.PURIFYING_SALT,
    AbilityId.THICK_FAT,
    AbilityId.WATER_BUBBLE,
    AbilityId.FLUFFY,
    AbilityId.SOLID_ROCK,
    AbilityId.FILTER,
    AbilityId.PRISM_ARMOR,
    AbilityId.INTIMIDATE,
    AbilityId.STURDY,
    AbilityId.NATURAL_CURE,
    AbilityId.TRACE,
    AbilityId.ILLUSION,
    AbilityId.STAMINA,
    AbilityId.TOXIC_DEBRIS,
    AbilityId.SOUL_HEART,
    AbilityId.CONTRARY,
    AbilityId.SIMPLE,
    AbilityId.ANGER_SHELL,
    AbilityId.DOWNLOAD,
    AbilityId.DEFIANT,
    AbilityId.COMPETITIVE,
    AbilityId.UNBURDEN,
    AbilityId.MOLD_BREAKER,
    AbilityId.TURBOBLAZE,
    AbilityId.TERAVOLT,
    AbilityId.INFILTRATOR,
    AbilityId.UNSEEN_FIST,
    AbilityId.QUEENLY_MAJESTY,
    AbilityId.DAZZLING,
    AbilityId.ARMOR_TAIL,
    AbilityId.ADAPTABILITY,
    AbilityId.SHEER_FORCE,
    AbilityId.TECHNICIAN,
    AbilityId.SKILL_LINK,
    AbilityId.TOUGH_CLAWS,
    AbilityId.SHARPNESS,
    AbilityId.STRONG_JAW,
    AbilityId.MEGA_LAUNCHER,
    AbilityId.RECKLESS,
    AbilityId.ROCK_HEAD,
    AbilityId.NO_GUARD,
    AbilityId.SERENE_GRACE,
    AbilityId.SUPREME_OVERLORD,
    AbilityId.STAKEOUT,
    AbilityId.TINTED_LENS,
    AbilityId.STEELWORKER,
    AbilityId.TRANSISTOR,
    AbilityId.DRAGONS_MAW,
    AbilityId.ROCKY_PAYLOAD,
    AbilityId.DARK_AURA,
    AbilityId.FAIRY_AURA,
    AbilityId.PIXILATE,
    AbilityId.AERILATE,
    AbilityId.REFRIGERATE,
    AbilityId.GALVANIZE,
    AbilityId.GALE_WINGS,
    AbilityId.TRIAGE,
    AbilityId.GUTS,
    AbilityId.TOXIC_BOOST,
    AbilityId.FLARE_BOOST,
    AbilityId.HARVEST,
    AbilityId.TOXIC_CHAIN,
  ],
  [AugmentTier.PRISMATIC]: [
    AbilityId.WONDER_GUARD,
    AbilityId.MULTISCALE,
    AbilityId.SHADOW_SHIELD,
    AbilityId.FUR_COAT,
    AbilityId.ICE_SCALES,
    AbilityId.MAGIC_GUARD,
    AbilityId.GOOD_AS_GOLD,
    AbilityId.MAGIC_BOUNCE,
    AbilityId.UNAWARE,
    AbilityId.NEUTRALIZING_GAS,
    AbilityId.PROTEAN,
    AbilityId.LIBERO,
    AbilityId.HUGE_POWER,
    AbilityId.PURE_POWER,
    AbilityId.ORICHALCUM_PULSE,
    AbilityId.HADRON_ENGINE,
    AbilityId.PROTOSYNTHESIS,
    AbilityId.QUARK_DRIVE,
    AbilityId.VESSEL_OF_RUIN,
    AbilityId.SWORD_OF_RUIN,
    AbilityId.TABLETS_OF_RUIN,
    AbilityId.BEADS_OF_RUIN,
    AbilityId.INTREPID_SWORD,
    AbilityId.AS_ONE_GLASTRIER,
    AbilityId.AS_ONE_SPECTRIER,
    AbilityId.PRIMORDIAL_SEA,
    AbilityId.DESOLATE_LAND,
    AbilityId.DELTA_STREAM,
    AbilityId.MOXIE,
    AbilityId.CHILLING_NEIGH,
    AbilityId.GRIM_NEIGH,
    AbilityId.BEAST_BOOST,
    AbilityId.OPPORTUNIST,
  ],
};

/** Both native slots draw from exactly the same curated original/custom pool. */
export function abilityAugmentChoices(
  _types: PokemonType[],
  _stats: Stats,
  seed: string,
  tier: AugmentTier,
  excluded: readonly AbilityId[] = [],
  context?: ForgeBuildContext,
): ForgeAbilityChoice[] {
  initializeForgeRegistry();
  const originals = originalAugmentAbilities[tier]
    .filter(id => !allAbilities[id].unimplemented)
    .map(id => ({
      id,
      name: allAbilities[id].name,
      description: allAbilities[id].description,
    }));
  const environment = tier === AugmentTier.GOLD ? registeredPassives : [];
  const benefits = registeredEnvironmentBenefits.filter(choice => choice.tier === tier);
  const pool = [...originals, ...environment, ...benefits].filter(choice => !excluded.includes(choice.id));
  const ordered = weightedRewardOrder(pool, `${seed}:unified-abilities`, choice =>
    abilityRewardWeight(choice.id, context),
  );
  return ordered.slice(0, 3);
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

function moveFamily(source: CatalogMove): string {
  return ["weather", "terrain"].includes(source.templateId) ? source.id.replace(/-[01]$/, "") : source.id;
}

export function customMoveChoices(
  types: PokemonType[],
  stats: Stats,
  seed: string,
  excludedIds: readonly MoveId[] = [],
  preferredCategory?: MoveCategory,
  _rewardLevel = 11,
  augmentTier = AugmentTier.GOLD,
  context?: ForgeBuildContext,
): ForgeMoveChoice[] {
  initializeForgeRegistry();
  const known = new Set(excludedIds.map(id => allMoves[id]?.id ?? id));
  const [attack, special] = statsPair(stats);
  const preferred = preferredCategory ?? (attack >= special ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL);
  const candidates = forgeMoveCatalog().filter(move => move.augmentTier === augmentTier && !known.has(move.id));
  return weightedRewardOrder(candidates, `${seed}:moves`, move => moveRewardWeight(move.id, types, preferred, context))
    .slice(0, 3)
    .map(({ id, name, description, type, category, power }) => ({ id, name, description, type, category, power }));
}

/** Native requested moves plus the nine fixed Silver environment setters. */
export function forgeMoveCatalog() {
  initializeForgeRegistry();
  const native = Object.entries(FORGE_NATIVE_MOVE_TIERS).flatMap(([tier, ids]) =>
    ids.map(id => {
      const move = allMoves[id];
      return {
        id,
        name: move.name,
        description: move.effect,
        type: move.type,
        category: move.category,
        power: move.power,
        augmentTier: Number(tier) as AugmentTier,
        templateId: "native",
        accuracy: move.accuracy,
        pp: move.pp,
        chance: move.chance,
        priority: move.priority,
      };
    }),
  );
  const setters = registeredMoves
    .filter(
      move =>
        move.category === MoveCategory.STATUS
        && move.rewardStage === 2
        && move.augmentTier === undefined
        && move.source.id.endsWith(`-${MoveCategory.PHYSICAL}`),
    )
    .map(({ source, rewardStage: _stage, ...move }) => ({
      ...move,
      augmentTier: AugmentTier.SILVER,
      templateId: source.templateId,
      accuracy: allMoves[move.id].accuracy,
      pp: allMoves[move.id].pp,
      chance: allMoves[move.id].chance,
      priority: allMoves[move.id].priority,
    }));
  return [...native, ...setters];
}

/** Associated creator is a fixed Silver move, even when the ability itself is Gold/Prismatic. */
export function environmentCreatorForAbility(ability: AbilityId, known: readonly MoveId[] = []): MoveId | undefined {
  initializeForgeRegistry();
  const definition = FORGE_ENVIRONMENT_BENEFITS.find(entry => forgeEnvironmentBenefitIds.get(entry.key) === ability);
  if (!definition) {
    return;
  }
  const creator = registeredMoves.find(
    move => move.name === definition.creator && move.rewardStage === 2 && move.augmentTier === undefined,
  );
  if (
    !creator
    || registeredMoves.some(move => known.includes(move.id) && moveFamily(move.source) === moveFamily(creator.source))
  ) {
    return;
  }
  return creator.id;
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
