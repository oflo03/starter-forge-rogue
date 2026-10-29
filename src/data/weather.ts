import type { PreAttackWeatherOverrideAbAttr } from "#abilities/ab-attrs";
import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { CommonAnim } from "#enums/move-anims-common";
import { MoveFlags } from "#enums/move-flags";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import type { Move } from "#moves/move";
import { ValueHolder } from "#utils/value-holder";
import i18next from "i18next";

export interface SerializedWeather {
  weatherType: WeatherType;
  turnsLeft: number;
}

export function getCustomWeatherName(type: WeatherType): string | undefined {
  return (
    {
      [WeatherType.DARK_AURA]: "어두운 오라",
      [WeatherType.GALE]: "강풍",
      [WeatherType.SILENT_MIST]: "조용한 안개",
      [WeatherType.POISON_GAS]: "독가스",
      [WeatherType.THUNDERSTORM]: "뇌우",
    } as Partial<Record<WeatherType, string>>
  )[type];
}

/** Thunderstorms inherit every ordinary-rain rule while retaining their own identity. */
export function matchesWeather(actual: WeatherType, expected: readonly WeatherType[]): boolean {
  return expected.includes(actual) || (actual === WeatherType.THUNDERSTORM && expected.includes(WeatherType.RAIN));
}

/** Castform uses its rainy form in storms, and its ordinary form in the other custom weathers. */
export function getWeatherForForms(type: WeatherType): WeatherType {
  return type === WeatherType.THUNDERSTORM ? WeatherType.RAIN : type >= WeatherType.DARK_AURA ? WeatherType.NONE : type;
}

export class Weather {
  public readonly weatherType: Exclude<WeatherType, WeatherType.NONE>;
  public turnsLeft: number;
  public readonly maxDuration: number;

  constructor(weatherType: Exclude<WeatherType, WeatherType.NONE>, turnsLeft = 0, maxDuration: number = turnsLeft) {
    this.weatherType = weatherType;
    this.turnsLeft = this.isImmutable() ? 0 : turnsLeft;
    this.maxDuration = this.isImmutable() ? 0 : maxDuration;
  }

  /**
   * Tick down this weather's duration.
   * @returns Whether the current weather should remain active (`turnsLeft > 0`)
   */
  lapse(): boolean {
    if (this.isImmutable()) {
      return true;
    }
    // TODO: Add a flag for infinite duration weathers separate from "0 turn count"
    if (this.turnsLeft) {
      return !!--this.turnsLeft;
    }

    return true;
  }

  isImmutable(): boolean {
    switch (this.weatherType) {
      case WeatherType.HEAVY_RAIN:
      case WeatherType.HARSH_SUN:
      case WeatherType.STRONG_WINDS:
        return true;
    }

    return false;
  }

  isDamaging(): boolean {
    switch (this.weatherType) {
      case WeatherType.SANDSTORM:
      case WeatherType.HAIL:
      case WeatherType.POISON_GAS:
        return true;
    }

    return false;
  }

  isTypeDamageImmune(type: PokemonType): boolean {
    switch (this.weatherType) {
      case WeatherType.SANDSTORM:
        return type === PokemonType.GROUND || type === PokemonType.ROCK || type === PokemonType.STEEL;
      case WeatherType.HAIL:
        return type === PokemonType.ICE;
      case WeatherType.POISON_GAS:
        return type === PokemonType.POISON || type === PokemonType.STEEL;
    }

    return false;
  }

  isMoveWeatherCancelled(user: Pokemon, move: Move): boolean {
    const moveType = user.getMoveType(move);

    switch (this.weatherType) {
      case WeatherType.POISON_GAS:
        return (
          move.hasFlag(MoveFlags.SOUND_BASED) || move.id === MoveId.FOCUS_ENERGY || move.id === MoveId.DRAGON_BREATH
        );
      case WeatherType.HARSH_SUN:
        return move.is("AttackMove") && moveType === PokemonType.WATER;
      case WeatherType.HEAVY_RAIN:
        return move.is("AttackMove") && moveType === PokemonType.FIRE;
    }

    return false;
  }
}

export function getWeatherStartMessage(weatherType: Exclude<WeatherType, WeatherType.NONE>): string {
  const custom = getCustomWeatherName(weatherType);
  if (custom) {
    return `${custom}에 휩싸였다!`;
  }
  switch (weatherType) {
    case WeatherType.SUNNY:
      return i18next.t("weather:sunnyStartMessage");
    case WeatherType.RAIN:
      return i18next.t("weather:rainStartMessage");
    case WeatherType.SANDSTORM:
      return i18next.t("weather:sandstormStartMessage");
    case WeatherType.HAIL:
      return i18next.t("weather:hailStartMessage");
    case WeatherType.SNOW:
      return i18next.t("weather:snowStartMessage");
    case WeatherType.FOG:
      return i18next.t("weather:fogStartMessage");
    case WeatherType.HEAVY_RAIN:
      return i18next.t("weather:heavyRainStartMessage");
    case WeatherType.HARSH_SUN:
      return i18next.t("weather:harshSunStartMessage");
    case WeatherType.STRONG_WINDS:
      return i18next.t("weather:strongWindsStartMessage");
  }
  return "";
}

export function getWeatherLapseMessage(weatherType: Exclude<WeatherType, WeatherType.NONE>): string {
  const custom = getCustomWeatherName(weatherType);
  if (custom) {
    return `${custom}가 계속되고 있다.`;
  }
  switch (weatherType) {
    case WeatherType.SUNNY:
      return i18next.t("weather:sunnyLapseMessage");
    case WeatherType.RAIN:
      return i18next.t("weather:rainLapseMessage");
    case WeatherType.SANDSTORM:
      return i18next.t("weather:sandstormLapseMessage");
    case WeatherType.HAIL:
      return i18next.t("weather:hailLapseMessage");
    case WeatherType.SNOW:
      return i18next.t("weather:snowLapseMessage");
    case WeatherType.FOG:
      return i18next.t("weather:fogLapseMessage");
    case WeatherType.HEAVY_RAIN:
      return i18next.t("weather:heavyRainLapseMessage");
    case WeatherType.HARSH_SUN:
      return i18next.t("weather:harshSunLapseMessage");
    case WeatherType.STRONG_WINDS:
      return i18next.t("weather:strongWindsLapseMessage");
  }
  return "";
}

export function getWeatherDamageMessage(weatherType: WeatherType, pokemon: Pokemon): string {
  if (weatherType === WeatherType.POISON_GAS) {
    return `${getPokemonNameWithAffix(pokemon)}는 독가스에 피해를 입었다!`;
  }
  switch (weatherType) {
    case WeatherType.SANDSTORM:
      return i18next.t("weather:sandstormDamageMessage", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      });
    case WeatherType.HAIL:
      return i18next.t("weather:hailDamageMessage", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      });
  }

  return "";
}

export function getWeatherClearMessage(weatherType: Exclude<WeatherType, WeatherType.NONE>): string {
  const custom = getCustomWeatherName(weatherType);
  if (custom) {
    return `${custom}가 사라졌다!`;
  }
  switch (weatherType) {
    case WeatherType.SUNNY:
      return i18next.t("weather:sunnyClearMessage");
    case WeatherType.RAIN:
      return i18next.t("weather:rainClearMessage");
    case WeatherType.SANDSTORM:
      return i18next.t("weather:sandstormClearMessage");
    case WeatherType.HAIL:
      return i18next.t("weather:hailClearMessage");
    case WeatherType.SNOW:
      return i18next.t("weather:snowClearMessage");
    case WeatherType.FOG:
      return i18next.t("weather:fogClearMessage");
    case WeatherType.HEAVY_RAIN:
      return i18next.t("weather:heavyRainClearMessage");
    case WeatherType.HARSH_SUN:
      return i18next.t("weather:harshSunClearMessage");
    case WeatherType.STRONG_WINDS:
      return i18next.t("weather:strongWindsClearMessage");
  }
  return "";
}

export function getLegendaryWeatherContinuesMessage(weatherType: WeatherType): string {
  switch (weatherType) {
    case WeatherType.HARSH_SUN:
      return i18next.t("weather:harshSunContinueMessage");
    case WeatherType.HEAVY_RAIN:
      return i18next.t("weather:heavyRainContinueMessage");
    case WeatherType.STRONG_WINDS:
      return i18next.t("weather:strongWindsContinueMessage");
  }

  return "";
}

export function getWeatherBlockMessage(weatherType: WeatherType): string {
  if (weatherType === WeatherType.POISON_GAS) {
    return "독가스 속에서 기술이 터져 버렸다!";
  }
  switch (weatherType) {
    case WeatherType.HARSH_SUN:
      return i18next.t("weather:harshSunEffectMessage");
    case WeatherType.HEAVY_RAIN:
      return i18next.t("weather:heavyRainEffectMessage");
  }

  return i18next.t("weather:defaultEffectMessage");
}

/**
 * Determine whether any effects that suppress weather are active;
 * does not check if there is actually any weather currently active.
 *
 * @remarks
 * Currently, the only source of weather suppression are the abilities Cloud Nine and Air Lock.
 *
 * @returns Whether there is any active effect suppressing weather.
 */
export function isWeatherSuppressed(): boolean {
  for (const pokemon of globalScene.getField(true)) {
    if (pokemon.hasAbilityWithAttr("SuppressWeatherEffectAbAttr")) {
      return true;
    }
  }
  return false;
}

/**
 * Determine the effective weather type for moves that the user will use
 *
 * @param user - The Pokemon using the move
 * @returns The effective weather type for the user's moves
 *
 * @see {@linkcode PreAttackWeatherOverrideAbAttr}
 */
export function getEffectiveWeatherForMove(user: Pokemon): WeatherType {
  const weatherHolder = new ValueHolder(WeatherType.NONE);
  applyAbAttrs("PreAttackWeatherOverrideAbAttr", {
    pokemon: user,
    weatherHolder,
  });

  // Weather override supercedes weather suppression.
  if (weatherHolder.value !== WeatherType.NONE) {
    return weatherHolder.value;
  }

  const weather = globalScene.arena.weather;
  if (!weather || isWeatherSuppressed()) {
    return WeatherType.NONE;
  }

  return weather.weatherType;
}

/**
 * Compute the damage multiplier for a move based on the current weather,
 * respecting relevant abilities and move attributes.
 * @param user - The Pokémon using the move
 * @param move - The move being invoked
 * @returns The damage multiplier to apply
 */
export function getWeatherMultiplierForMove(user: Pokemon, move: Move): number {
  const weatherType = getEffectiveWeatherForMove(user);
  const attackType = user.getMoveType(move);

  for (const weatherMultiplierAttr of move.getAttrs("OverrideWeatherMultiplierAttr")) {
    if (matchesWeather(weatherType, [weatherMultiplierAttr.weather])) {
      return 1.5;
    }
  }

  switch (weatherType) {
    case WeatherType.DARK_AURA:
      return attackType === PokemonType.DARK ? 1.2 : attackType === PokemonType.FAIRY ? 0.5 : 1;
    case WeatherType.SUNNY:
    case WeatherType.HARSH_SUN:
      if (attackType === PokemonType.FIRE) {
        return 1.5;
      }
      if (attackType === PokemonType.WATER) {
        return 0.5;
      }
      break;
    case WeatherType.RAIN:
    case WeatherType.HEAVY_RAIN:
    case WeatherType.THUNDERSTORM:
      if (attackType === PokemonType.FIRE) {
        return 0.5;
      }
      if (attackType === PokemonType.WATER) {
        return 1.5;
      }
      break;
  }

  return 1;
}

/**
 * Gets the animation associated with the given weather type
 * @param weatherType - The {@linkcode WeatherType} to get the animiation for
 * @returns The {@linkcode CommonAnim} for the given weather
 */
export function getWeatherAnim(weatherType: WeatherType): CommonAnim {
  if (weatherType === WeatherType.THUNDERSTORM) {
    return getWeatherAnim(WeatherType.RAIN);
  }
  if (weatherType >= WeatherType.DARK_AURA) {
    return getWeatherAnim(WeatherType.FOG);
  }
  return (CommonAnim.SUNNY + (weatherType - 1)) as CommonAnim;
}
