// SPDX-License-Identifier: AGPL-3.0-only
import { allAbilities, allMoves } from "#data/data-lists";
import { AbilityId as A, type AbilityId } from "#enums/ability-id";
import { MoveCategory as C } from "#enums/move-category";
import { MoveFlags as F } from "#enums/move-flags";
import { MoveId as M, type MoveId } from "#enums/move-id";
import { PokemonType as T } from "#enums/pokemon-type";
import { Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import Maker from "../../forge/vendor/engine.js";
import { FORGE_TERRAINS, FORGE_WEATHERS } from "./environment";
import { FORGE_ENVIRONMENT_BENEFITS, forgeEnvironmentBenefitIds } from "./environment-abilities";

export interface ForgeBuildContext {
  moves: readonly MoveId[];
  abilities: readonly AbilityId[];
}
const abilitySupport = new Map<AbilityId, readonly string[]>();
const support = (tags: string[], ...ids: AbilityId[]) =>
  ids.forEach(id => abilitySupport.set(id, [...new Set([...(abilitySupport.get(id) ?? []), ...tags])]));
support(["pivot"], A.REGENERATOR, A.NATURAL_CURE);
support(["protect"], A.SPEED_BOOST, A.POISON_HEAL, A.MOODY, A.RAIN_DISH, A.ICE_BODY);
support(["sleep"], A.BAD_DREAMS);
support(["punch"], A.IRON_FIST);
support(["sound"], A.PUNK_ROCK, A.LIQUID_VOICE);
support(["bite"], A.STRONG_JAW);
support(["pulse"], A.MEGA_LAUNCHER);
support(["slice"], A.SHARPNESS);
support(["contact"], A.TOUGH_CLAWS, A.POISON_TOUCH, A.UNSEEN_FIST);
support(["recoil"], A.ROCK_HEAD, A.RECKLESS, A.MAGIC_GUARD);
support(["multi"], A.SKILL_LINK, A.STENCH, A.TOXIC_CHAIN);
support(["weak"], A.TECHNICIAN);
support(["secondary"], A.SHEER_FORCE, A.SERENE_GRACE);
support(["inaccurate"], A.NO_GUARD, A.COMPOUND_EYES, A.VICTORY_STAR);
support(["crit"], A.SUPER_LUCK, A.SNIPER);
support(["healing"], A.TRIAGE);
support(["setup"], A.SIMPLE, A.SPEED_BOOST, A.OPPORTUNIST);
support(["selfdrop"], A.CONTRARY);
support(
  ["physical", "physicalBoost"],
  A.HUGE_POWER,
  A.PURE_POWER,
  A.MOXIE,
  A.CHILLING_NEIGH,
  A.GUTS,
  A.TOXIC_BOOST,
  A.HUSTLE,
  A.INTREPID_SWORD,
);
support(["special", "specialBoost"], A.SOUL_HEART, A.GRIM_NEIGH, A.FLARE_BOOST, A.HADRON_ENGINE);
support(["physical", "special"], A.BEAST_BOOST, A.ADAPTABILITY, A.TINTED_LENS);
support(["defenseDamage", "healing", "defenseBoost"], A.STAMINA, A.DAUNTLESS_SHIELD);
support(["healing", "defenseBoost"], A.FUR_COAT, A.MULTISCALE, A.SHADOW_SHIELD, A.ICE_SCALES, A.POISON_HEAL);
support(["rain"], A.DRIZZLE, A.PRIMORDIAL_SEA, A.SWIFT_SWIM, A.RAIN_DISH, A.HYDRATION, A.DRY_SKIN);
support(
  ["sun"],
  A.DROUGHT,
  A.DESOLATE_LAND,
  A.CHLOROPHYLL,
  A.SOLAR_POWER,
  A.FLOWER_GIFT,
  A.LEAF_GUARD,
  A.HARVEST,
  A.ORICHALCUM_PULSE,
  A.PROTOSYNTHESIS,
);
support(["sand"], A.SAND_STREAM, A.SAND_RUSH, A.SAND_FORCE, A.SAND_VEIL);
support(["snow"], A.SNOW_WARNING, A.SLUSH_RUSH, A.SNOW_CLOAK, A.ICE_BODY);
support(["electricTerrain"], A.ELECTRIC_SURGE, A.SURGE_SURFER, A.QUARK_DRIVE, A.HADRON_ENGINE);
support(["grassTerrain"], A.GRASSY_SURGE, A.GRASS_PELT);
support(["psychicTerrain"], A.PSYCHIC_SURGE);
support(["mistyTerrain"], A.MISTY_SURGE);
support(["type:" + T.FIRE], A.BLAZE, A.FLASH_FIRE);
support(["type:" + T.WATER], A.TORRENT, A.WATER_BUBBLE);
support(["type:" + T.GRASS], A.OVERGROW);
support(["type:" + T.BUG], A.SWARM);
support(["type:" + T.STEEL], A.STEELWORKER, A.STEELY_SPIRIT);
support(["type:" + T.ELECTRIC], A.TRANSISTOR);
support(["type:" + T.DRAGON], A.DRAGONS_MAW);
support(["type:" + T.ROCK], A.ROCKY_PAYLOAD);
support(["type:" + T.DARK], A.DARK_AURA);
support(["type:" + T.FAIRY], A.FAIRY_AURA);
support(["type:" + T.NORMAL], A.PIXILATE, A.AERILATE, A.REFRIGERATE, A.GALVANIZE);

const moveTagCache = new WeakMap<object, Set<string>>();
const abilityTagCache = new WeakMap<object, Set<string>>();

export function moveSynergyTags(id: MoveId): Set<string> {
  const move = allMoves[id];
  const tags = new Set<string>();
  if (!move) {
    return tags;
  }
  const cached = moveTagCache.get(move);
  if (cached) {
    return cached;
  }
  id = move.id;
  if (move.category !== C.STATUS) {
    tags.add(move.category === C.PHYSICAL ? "physical" : "special");
    tags.add("type:" + move.type);
    if (move.power > 0 && move.power <= 60) {
      tags.add("weak");
    }
    if (move.accuracy > 0 && move.accuracy < 90) {
      tags.add("inaccurate");
    }
    if (move.chance > 0) {
      tags.add("secondary");
    }
  }
  // These physical moves do not use the user's Attack stat.
  if ([M.BODY_PRESS, M.FOUL_PLAY].includes(id)) {
    tags.delete("physical");
  }
  if ([M.TERA_BLAST, M.PHOTON_GEYSER, M.SHELL_SIDE_ARM].includes(id)) {
    tags.add("physical");
  }
  for (const [flag, tag] of [
    [F.PUNCHING_MOVE, "punch"],
    [F.SOUND_BASED, "sound"],
    [F.BITING_MOVE, "bite"],
    [F.PULSE_MOVE, "pulse"],
    [F.SLICING_MOVE, "slice"],
    [F.MAKES_CONTACT, "contact"],
    [F.HEALING_MOVE, "healing"],
  ] as const) {
    if (move.hasFlag(flag)) {
      tags.add(tag);
    }
  }
  if (move.hasAttr("ProtectAttr")) {
    tags.add("protect");
  }
  if (move.hasAttr("RecoilAttr")) {
    tags.add("recoil");
  }
  if (move.hasAttr("MultiHitAttr")) {
    tags.add("multi");
  }
  if (move.hasAttr("HighCritAttr") || move.hasAttr("CritOnlyAttr")) {
    tags.add("crit");
  }
  for (const attr of move.getAttrs("StatStageChangeAttr")) {
    if (!attr.selfTarget) {
      continue;
    }
    if (attr.stages < 0 && move.category !== C.STATUS) {
      tags.add("selfdrop");
    }
    if (attr.stages > 0) {
      tags.add("setup");
      if (attr.stats.includes(Stat.ATK)) {
        tags.add("physicalBoost");
      }
      if (attr.stats.includes(Stat.SPATK)) {
        tags.add("specialBoost");
      }
      if (attr.stats.includes(Stat.DEF)) {
        tags.add("defenseBoost");
      }
    }
  }
  for (const attr of move.getAttrs("StatusEffectAttr")) {
    if (attr.effect === StatusEffect.POISON || attr.effect === StatusEffect.TOXIC) {
      tags.add("poison");
    }
    if (attr.effect === StatusEffect.SLEEP) {
      tags.add("sleep");
    }
    if (attr.effect !== StatusEffect.NONE) {
      tags.add("status");
    }
  }
  const groups: [string, MoveId[]][] = [
    [
      "pivot",
      [M.U_TURN, M.VOLT_SWITCH, M.FLIP_TURN, M.PARTING_SHOT, M.TELEPORT, M.CHILLY_RECEPTION, M.SHED_TAIL, M.BATON_PASS],
    ],
    ["rain", [M.RAIN_DANCE, M.THUNDER, M.HURRICANE]],
    ["sun", [M.SUNNY_DAY, M.SOLAR_BEAM, M.SOLAR_BLADE, M.SYNTHESIS, M.MORNING_SUN]],
    ["snow", [M.SNOWSCAPE, M.HAIL, M.BLIZZARD, M.AURORA_VEIL]],
    ["sand", [M.SANDSTORM, M.SHORE_UP]],
    ["electricTerrain", [M.ELECTRIC_TERRAIN, M.RISING_VOLTAGE]],
    ["psychicTerrain", [M.PSYCHIC_TERRAIN, M.EXPANDING_FORCE]],
    ["grassTerrain", [M.GRASSY_TERRAIN, M.GRASSY_GLIDE]],
    ["mistyTerrain", [M.MISTY_TERRAIN, M.MISTY_EXPLOSION]],
    ["defenseDamage", [M.BODY_PRESS]],
    ["statPower", [M.STORED_POWER, M.POWER_TRIP]],
    ["poisonPayoff", [M.VENOSHOCK, M.VENOM_DRENCH]],
    ["statusPayoff", [M.HEX, M.INFERNAL_PARADE]],
    ["sleepPayoff", [M.DREAM_EATER, M.NIGHTMARE]],
    ["rest", [M.REST]],
    ["sleepTalk", [M.SLEEP_TALK, M.SNORE]],
    ["stockpile", [M.STOCKPILE]],
    ["stockpilePayoff", [M.SWALLOW, M.SPIT_UP]],
  ];
  for (const [tag, ids] of groups) {
    if (ids.includes(id)) {
      tags.add(tag);
    }
  }
  if (id === M.WEATHER_BALL) {
    for (const tag of ["rain", "sun", "snow", "sand"]) {
      tags.add(tag);
    }
  }
  for (const environment of [...FORGE_WEATHERS, ...FORGE_TERRAINS]) {
    const tag = "environment:" + environment.move;
    if (
      move.name === environment.move
      || (id === M.WEATHER_BALL && FORGE_WEATHERS.some(e => e === environment))
      || (id === M.TERRAIN_PULSE && FORGE_TERRAINS.some(e => e === environment))
    ) {
      tags.add(tag);
    }
  }
  moveTagCache.set(move, tags);
  return tags;
}
export function abilitySynergyTags(id: AbilityId): Set<string> {
  const tags = new Set(abilitySupport.get(id) ?? []);
  const ability = allAbilities[id];
  const cached = ability && abilityTagCache.get(ability);
  if (cached) {
    return cached;
  }
  for (const environment of [...FORGE_WEATHERS, ...FORGE_TERRAINS]) {
    if (ability?.name === environment.name) {
      tags.add("environment:" + environment.move);
    }
  }
  const benefit = FORGE_ENVIRONMENT_BENEFITS.find(entry => forgeEnvironmentBenefitIds.get(entry.key) === id);
  if (benefit) {
    tags.add("environment:" + benefit.creator);
  }
  const starterType = (ability as typeof ability & { forgeBoostedType?: T })?.forgeBoostedType;
  if (starterType !== undefined) {
    tags.add("type:" + starterType);
  }
  if (ability) {
    abilityTagCache.set(ability, tags);
  }
  return tags;
}
const intersections = (a: Set<string>, b: Set<string>) => [...a].filter(tag => b.has(tag)).length;
export function moveRewardWeight(id: MoveId, types: readonly T[], preferred: C, context?: ForgeBuildContext): number {
  const move = allMoves[id];
  const tags = moveSynergyTags(id);
  let weight = 1 + (types.includes(move.type) ? 1 : 0) + (move.category === preferred ? 0.5 : 0);
  if (!context) {
    return weight;
  }
  const wanted = new Set<string>();
  const pairs = [
    ["physical", "physicalBoost"],
    ["special", "specialBoost"],
    ["defenseBoost", "defenseDamage"],
    ["setup", "statPower"],
    ["poison", "poisonPayoff"],
    ["status", "statusPayoff"],
    ["sleep", "sleepPayoff"],
    ["rest", "sleepTalk"],
    ["stockpile", "stockpilePayoff"],
  ];
  for (const known of context.moves) {
    const knownTags = moveSynergyTags(known);
    for (const [a, b] of pairs) {
      if (knownTags.has(a)) {
        wanted.add(b);
      }
      if (knownTags.has(b)) {
        wanted.add(a);
      }
    }
    for (const tag of knownTags) {
      if (/Terrain$|^(rain|sun|snow|sand|environment:)/.test(tag)) {
        wanted.add(tag);
      }
    }
  }
  for (const ability of context.abilities) {
    for (const tag of abilitySynergyTags(ability)) {
      wanted.add(tag);
    }
  }
  if (context.abilities.includes(A.CONTRARY) && tags.has("setup")) {
    return weight;
  }
  weight += intersections(tags, wanted) * 3;
  return Math.min(10, weight);
}
export function abilityRewardWeight(id: AbilityId, context?: ForgeBuildContext): number {
  if (!context) {
    return 1;
  }
  const tags = abilitySynergyTags(id);
  const existing = new Set<string>();
  for (const move of context.moves) {
    for (const tag of moveSynergyTags(move)) {
      existing.add(tag);
    }
  }
  for (const ability of context.abilities) {
    for (const tag of abilitySynergyTags(ability)) {
      existing.add(tag);
    }
  }
  return Math.min(10, 1 + intersections(tags, existing) * 3);
}
/** Weighted sampling without replacement; seeds stay reproducible and every eligible candidate keeps a chance. */
export function weightedRewardOrder<T>(items: readonly T[], seed: string, weight: (item: T) => number): T[] {
  const random = Maker.createRng(seed);
  return items
    .map((item, index) => ({ item, index, key: Math.log(Math.max(Number.EPSILON, random.real() / 10)) / weight(item) }))
    .sort((a, b) => b.key - a.key || a.index - b.index)
    .map(entry => entry.item);
}
