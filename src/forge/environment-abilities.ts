// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import { isWeatherSuppressed } from "#data/weather";
import type { AbilityId } from "#enums/ability-id";
import { BattlerTagType } from "#enums/battler-tag-type";
import { CommonAnim } from "#enums/move-anims-common";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { MoveResult } from "#enums/move-result";
import { PokemonType } from "#enums/pokemon-type";
import { Stat } from "#enums/stat";
import { TerrainType } from "#enums/terrain-type";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import type { Move } from "#moves/move";
import { AugmentTier } from "./augments";

export const FORGE_ENVIRONMENT_BENEFITS = [
  {
    key: "evil",
    name: "악한 마음",
    tier: AugmentTier.PRISMATIC,
    description: "어두운 오라에서 원인 불문 실제 HP 피해를 받지 않은 턴 종료 시 공격·특공 +1.",
  },
  {
    key: "compress",
    name: "맹독압축",
    tier: AugmentTier.GOLD,
    description: "독가스에서 독 타입 기술 피해 1.5배·필중. 방어·타입 무효·공중 등 회피 상태는 무시하지 않음.",
  },
  {
    key: "wall",
    name: "흙벽",
    tier: AugmentTier.GOLD,
    description: "개미굴 필드에서 받는 불꽃·비행 타입 공격 피해 절반.",
  },
  {
    key: "wind",
    name: "바람읽기",
    tier: AugmentTier.PRISMATIC,
    description:
      "강풍이 상대 진영에 우선도를 준 턴 시작 시 자동 방어. 행동·PP 소모 없음. 연속 성공 시 다음 성공률 1/3, 1/9…; 일반 방어와 판정 공유.",
  },
  {
    key: "miss",
    name: "헛발받기",
    tier: AugmentTier.PRISMATIC,
    description:
      "조용한 안개에서 공격이 명중 실패하면 공격·특공 +2. 기술 1회당 한 번; 방어·타입 무효에는 발동하지 않음.",
  },
  {
    key: "lightning",
    name: "벼락저금",
    tier: AugmentTier.GOLD,
    description: "뇌우의 낙뢰 피해를 막고 충전. 다음 전기 공격 위력 2배, 중첩 없음.",
  },
  { key: "corner", name: "코너워크", tier: AugmentTier.GOLD, description: "옥타곤 필드에서 스피드 2배." },
  {
    key: "paint",
    name: "밑그림",
    tier: AugmentTier.GOLD,
    description:
      "화이트 페인트에서 원래 타입이 다른 공격기를 연속 사용하면 두 번째부터 위력 1.3배. 실제 타입은 노말 유지; 변화기를 쓰면 연속이 끊김.",
  },
  {
    key: "clock",
    name: "진흙시계",
    tier: AugmentTier.GOLD,
    description: "스왐프 카운트가 감소한 턴 공격·특공 +1. 비로 2가 줄어도 턴당 한 번. 카운트 0의 기절은 유지.",
  },
] as const;
export type ForgeEnvironmentBenefit = (typeof FORGE_ENVIRONMENT_BENEFITS)[number]["key"];
export const forgeEnvironmentBenefitIds = new Map<ForgeEnvironmentBenefit, AbilityId>();

export function hasForgeBenefit(pokemon: Pokemon, key: ForgeEnvironmentBenefit): boolean {
  const id = forgeEnvironmentBenefitIds.get(key);
  return id !== undefined && pokemon.hasAbility(id);
}
export function benefitWeather(type: WeatherType): boolean {
  return globalScene.arena?.weatherType === type && !isWeatherSuppressed();
}
export function benefitTerrain(type: TerrainType): boolean {
  return globalScene.arena?.terrainType === type;
}
/** Pure side choice shared by priority, messages, protection and AI previews. */
export function forgeGalePriority(pokemon: Pokemon): number {
  if (!benefitWeather(WeatherType.GALE)) {
    return 0;
  }
  let hash = 2166136261;
  for (const char of `${globalScene.seed}:${globalScene.currentBattle.waveIndex}:${globalScene.currentBattle.turn}:gale`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  // Mix the low bit so consecutive turn numbers do not simply alternate sides.
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash ^= hash >>> 13;
  return pokemon.isPlayer() === ((hash & 1) === 0) ? 3 : 0;
}
function boostOffenses(pokemon: Pokemon, stages: number): void {
  globalScene.phaseManager.unshiftNew("StatStageChangePhase", {
    battlerIndex: pokemon.getBattlerIndex(),
    changes: [
      { stat: Stat.ATK, stages },
      { stat: Stat.SPATK, stages },
    ],
    sourcePokemon: pokemon,
  });
}
export function forgeBenefitTurnEnd(pokemon: Pokemon): void {
  if (
    benefitWeather(WeatherType.DARK_AURA)
    && hasForgeBenefit(pokemon, "evil")
    && pokemon.turnData.forgeHpDamageTaken === 0
  ) {
    boostOffenses(pokemon, 1);
  }
}
export function forgeSwampBenefit(pokemon: Pokemon): void {
  if (hasForgeBenefit(pokemon, "clock") && !pokemon.turnData.forgeSwampRewarded) {
    pokemon.turnData.forgeSwampRewarded = true;
    boostOffenses(pokemon, 1);
  }
}

/** Include automatic protection in the native manual Protect success check. */
export function forgeProtectChain(pokemon: Pokemon, nativeCount: number): number {
  if (!globalScene.currentBattle) {
    return nativeCount;
  }
  const data = pokemon.summonData;
  return Math.max(
    nativeCount,
    data.forgeProtectWave === globalScene.currentBattle.waveIndex
      && data.forgeProtectTurn >= globalScene.currentBattle.turn - 1
      ? data.forgeProtectStreak
      : 0,
  );
}
function nativeProtectCount(pokemon: Pokemon): number {
  let nativeCount = 0;
  for (const previous of pokemon.getLastXMoves(-1)) {
    if (
      previous.result !== MoveResult.SUCCESS
      || !(
        allMoves[previous.move].hasAttr("ProtectAttr")
        || [MoveId.QUICK_GUARD, MoveId.WIDE_GUARD].includes(previous.move)
      )
    ) {
      break;
    }
    nativeCount++;
  }
  return nativeCount;
}
export function forgeRecordManualProtect(pokemon: Pokemon): void {
  if (!hasForgeBenefit(pokemon, "wind") && forgeProtectChain(pokemon, 0) === 0) {
    return;
  }
  const nativeCount = nativeProtectCount(pokemon);
  const chain = forgeProtectChain(pokemon, 0);
  pokemon.summonData.forgeProtectTurn = globalScene.currentBattle.turn;
  pokemon.summonData.forgeProtectWave = globalScene.currentBattle.waveIndex;
  pokemon.summonData.forgeProtectStreak = Math.max(nativeCount, chain + 1);
}
export function forgeAutomaticProtect(pokemon: Pokemon): void {
  if (!hasForgeBenefit(pokemon, "wind") || !benefitWeather(WeatherType.GALE) || forgeGalePriority(pokemon) !== 0) {
    return;
  }
  if (pokemon.turnData.forgeWindAttempted) {
    return;
  }
  pokemon.turnData.forgeWindAttempted = true;
  const nativeCount = nativeProtectCount(pokemon);
  const count = forgeProtectChain(pokemon, nativeCount);
  const protect = allMoves[MoveId.PROTECT];
  const success = protect.getAttrs("ProtectAttr")[0].getCondition()(pokemon, pokemon, protect);
  pokemon.summonData.forgeProtectTurn = globalScene.currentBattle.turn;
  pokemon.summonData.forgeProtectWave = globalScene.currentBattle.waveIndex;
  pokemon.summonData.forgeProtectStreak = success ? count + 1 : 0;
  if (success) {
    pokemon.addTag(BattlerTagType.PROTECTED, 0, MoveId.PROTECT, pokemon.id);
    globalScene.phaseManager.unshiftNew("CommonAnimPhase", pokemon.getBattlerIndex(), undefined, CommonAnim.PROTECT);
  }
  globalScene.phaseManager.queueMessage(`${pokemon.name}의 바람읽기${success ? "!" : "는 실패했다!"}`);
}

export function forgePoisonAccuracy(pokemon: Pokemon, move: Move): boolean {
  return (
    hasForgeBenefit(pokemon, "compress")
    && benefitWeather(WeatherType.POISON_GAS)
    && pokemon.getMoveType(move) === PokemonType.POISON
  );
}
export function forgeBeginAttack(pokemon: Pokemon, move: Move): void {
  pokemon.turnData.forgeMissRewarded = false;
  pokemon.turnData.forgePaintMove = move.id;
  pokemon.turnData.forgeLightningMulti =
    !!pokemon.getTag(BattlerTagType.CHARGED)
    && hasForgeBenefit(pokemon, "lightning")
    && pokemon.getMoveType(move) === PokemonType.ELECTRIC;
  const previous = pokemon.getLastXMoves(1)[0];
  const oldMove = previous && allMoves[previous.move];
  pokemon.turnData.forgePaintBoost =
    !!oldMove
    && oldMove.category !== MoveCategory.STATUS
    && move.category !== MoveCategory.STATUS
    && oldMove.type !== allMoves[move.id].type;
}
export function forgeLightningFollowup(pokemon: Pokemon, move: Move): boolean {
  return (
    pokemon.turnData.forgeLightningMulti
    && pokemon.turnData.forgePaintMove === move.id
    && !pokemon.getTag(BattlerTagType.CHARGED)
    && pokemon.getMoveType(move) === PokemonType.ELECTRIC
  );
}
export function forgePaintBoost(pokemon: Pokemon, move: Move): boolean {
  if (!benefitTerrain(TerrainType.WHITE_PAINT)) {
    return false;
  }
  if (pokemon.turnData.forgePaintMove === move.id) {
    return pokemon.turnData.forgePaintBoost;
  }
  const previous = pokemon.getLastXMoves(1)[0];
  const oldMove = previous && allMoves[previous.move];
  return (
    !!oldMove
    && oldMove.category !== MoveCategory.STATUS
    && move.category !== MoveCategory.STATUS
    && oldMove.type !== allMoves[move.id].type
  );
}
export function forgeMistMiss(pokemon: Pokemon, move: Move): void {
  if (
    move.category === MoveCategory.STATUS
    || pokemon.turnData.forgeMissRewarded
    || !benefitWeather(WeatherType.SILENT_MIST)
    || !hasForgeBenefit(pokemon, "miss")
  ) {
    return;
  }
  pokemon.turnData.forgeMissRewarded = true;
  boostOffenses(pokemon, 2);
}
