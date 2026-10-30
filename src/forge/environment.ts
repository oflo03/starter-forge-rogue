// SPDX-License-Identifier: AGPL-3.0-only
import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getTypeDamageMultiplier } from "#data/type";
import { isWeatherSuppressed, matchesWeather } from "#data/weather";
import { BattlerTagType } from "#enums/battler-tag-type";
import { HitResult } from "#enums/hit-result";
import { MoveFlags } from "#enums/move-flags";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { TerrainType } from "#enums/terrain-type";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import type { Move } from "#moves/move";
import { toDmgValue } from "#utils/common";
import { ValueHolder } from "#utils/value-holder";
import { forgeSwampBenefit, hasForgeBenefit } from "./environment-abilities";

export const FORGE_WEATHERS = [
  {
    type: WeatherType.DARK_AURA,
    affinity: [PokemonType.DARK],
    name: "어둠내림",
    move: "밤의장막",
    description:
      "5턴 심야. 악 피해 1.2배·페어리 피해 절반. 솔라빔 위력 절반·아침햇살/달빛/광합성 회복 1/4. 웨더볼은 악.",
  },
  {
    type: WeatherType.GALE,
    affinity: [PokemonType.FLYING],
    name: "바람몰이",
    move: "하늘뒤집기",
    description: "5턴 광풍. 매 턴 무작위 한쪽 진영의 기술 우선도 +3. 웨더볼은 비행.",
  },
  {
    type: WeatherType.SILENT_MIST,
    affinity: [PokemonType.GHOST],
    name: "고요한숨",
    move: "안개너울",
    description:
      "5턴 조용한 안개. 명중률 0.7배·풀죽음 확률 2배. 솔라빔 위력 절반·아침햇살/달빛/광합성 회복 1/4. 웨더볼은 고스트.",
  },
  {
    type: WeatherType.POISON_GAS,
    affinity: [PokemonType.POISON],
    name: "매캐한숨",
    move: "매캐한물결",
    description:
      "5턴 가스 오염지대. 독 타입 매 턴 HP 1/16 회복, 독·강철 외 1/16 피해. 소리 기술·기충전·용의숨결은 실패하고 사용자 HP 1/8 피해. 바람 기술로 해제. 웨더볼은 독.",
  },
  {
    type: WeatherType.THUNDERSTORM,
    affinity: [PokemonType.ELECTRIC, PokemonType.WATER],
    name: "먹구름부름",
    move: "번개소나기",
    description:
      "5턴 뇌우. 비의 모든 효과 적용. 매 턴 각 포켓몬에게 1/3 확률로 전기 상성을 반영한 최대 HP 1/8 낙뢰 피해. 웨더볼은 전기.",
  },
] as const;

export const FORGE_TERRAINS = [
  {
    type: TerrainType.ANTHILL,
    affinity: [PokemonType.BUG, PokemonType.GROUND],
    name: "개미굴메이커",
    move: "굴속퍼레이드",
    description: "5턴 앤트힐필드. 모두 스킬링크 효과. 벌레 피해 1.2배. 땅·벌레 타입의 회피율 +1랭크 보정.",
  },
  {
    type: TerrainType.OCTAGON,
    affinity: [PokemonType.FIGHTING],
    name: "옥타곤메이커",
    move: "링아웃러시",
    description: "5턴 옥타곤필드. 격투 피해 1.2배. 교체 불가. 회피율 보정을 무시하지만 기술 명중률은 적용.",
  },
  {
    type: TerrainType.WHITE_PAINT,
    affinity: [PokemonType.NORMAL, PokemonType.FAIRY],
    name: "화이트메이커",
    move: "새하얀물결",
    description:
      "5턴 프라이머필드. 모든 포켓몬·기술이 노말 타입. 스킨·타입 변경 특성/도구 무효. 웨더볼·대지의파동 위력 증가는 유지.",
  },
  {
    type: TerrainType.SWAMP,
    affinity: [PokemonType.WATER, PokemonType.GROUND],
    name: "스왐프메이커",
    move: "늪의손짓",
    description:
      "5턴 스왐프필드. 접지한 물·땅 외 스피드 절반. 접지한 모두 5카운트, 턴마다 -1·비에는 -2, 0이면 기절. 비접지·교체·필드 해제로 초기화. 물·땅도 카운트 적용.",
  },
] as const;

export function forgeWeatherActive(type: WeatherType): boolean {
  return globalScene.arena?.weatherType === type && !isWeatherSuppressed();
}

export function clearForgeGasWithWind(pokemon: Pokemon, move: Move): void {
  if (move.hasFlag(MoveFlags.WIND_MOVE) && forgeWeatherActive(WeatherType.POISON_GAS)) {
    globalScene.arena.trySetWeather(WeatherType.NONE, pokemon);
  }
}

function indirectDamage(pokemon: Pokemon, amount: number, message: string): void {
  const cancelled = new ValueHolder(false);
  applyAbAttrs("BlockNonDirectDamageAbAttr", { pokemon, cancelled });
  if (cancelled.value) {
    return;
  }
  globalScene.phaseManager.queueMessage(message);
  pokemon.damageAndUpdate(toDmgValue(amount), { result: HitResult.INDIRECT, ignoreSegments: true });
}

export function forgeGasBackfire(pokemon: Pokemon): void {
  indirectDamage(pokemon, pokemon.getMaxHp() / 8, `${pokemon.name}는 가스 오염지대 폭발에 휘말렸다!`);
}

/** WeatherEffectPhase owns ordinary gas damage; these are its extra weather effects. */
export function forgeWeatherTick(pokemon: Pokemon): void {
  if (isWeatherSuppressed()) {
    return;
  }
  if (globalScene.arena.weatherType === WeatherType.POISON_GAS && pokemon.isOfType(PokemonType.POISON)) {
    globalScene.phaseManager.unshiftNew(
      "PokemonHealPhase",
      pokemon.getBattlerIndex(),
      toDmgValue(pokemon.getMaxHp() / 16),
      { message: `${pokemon.name}는 가스 오염지대로 회복했다!` },
    );
  }
  if (globalScene.arena.weatherType === WeatherType.THUNDERSTORM && pokemon.randBattleSeedInt(3) === 0) {
    if (hasForgeBenefit(pokemon, "lightning")) {
      pokemon.addTag(BattlerTagType.CHARGED, 0, MoveId.CHARGE, pokemon.id);
      globalScene.phaseManager.queueMessage(`${pokemon.name}는 벼락저금으로 낙뢰를 충전했다!`);
      return;
    }
    const multiplier = pokemon
      .getTypes({ returnOriginalTypesIfStellar: true })
      .reduce<number>((value, type) => value * getTypeDamageMultiplier(PokemonType.ELECTRIC, type), 1);
    if (multiplier > 0) {
      indirectDamage(pokemon, (pokemon.getMaxHp() / 8) * multiplier, `${pokemon.name}에게 번개가 내리쳤다!`);
    }
  }
}

export function forgeSwampTick(pokemon: Pokemon): void {
  if (globalScene.arena.terrainType !== TerrainType.SWAMP || !pokemon.isGrounded()) {
    pokemon.summonData.forgeSwampCount = 5;
    return;
  }
  const rain =
    !isWeatherSuppressed() && matchesWeather(globalScene.arena.weatherType, [WeatherType.RAIN, WeatherType.HEAVY_RAIN]);
  pokemon.summonData.forgeSwampCount = Math.max(0, pokemon.summonData.forgeSwampCount - (rain ? 2 : 1));
  globalScene.phaseManager.queueMessage(`${pokemon.name}의 늪 카운트: ${pokemon.summonData.forgeSwampCount}`);
  if (pokemon.summonData.forgeSwampCount === 0) {
    pokemon.damageAndUpdate(pokemon.hp, { result: HitResult.INDIRECT_KO, ignoreSegments: true });
  } else {
    forgeSwampBenefit(pokemon);
  }
}
