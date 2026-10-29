import { getPokemonNameWithAffix } from "#app/messages";
import { CommonAnim } from "#enums/move-anims-common";
import { TerrainType } from "#enums/terrain-type";

// biome-ignore lint/performance/noBarrelFile: Preserve upstream imports while keeping environment enums free of battle dependencies.
export { TerrainType } from "#enums/terrain-type";

import type { Pokemon } from "#field/pokemon";
import type { RGBArray } from "#types/sprite-types";
import i18next from "i18next";

export interface SerializedTerrain {
  terrainType: TerrainType;
  turnsLeft: number;
}

export class Terrain {
  public readonly terrainType: TerrainType;
  public turnsLeft: number;
  public readonly maxDuration: number;

  constructor(terrainType: TerrainType, turnsLeft = 0, maxDuration: number = turnsLeft) {
    this.terrainType = terrainType;
    this.turnsLeft = turnsLeft;
    this.maxDuration = maxDuration;
  }

  /**
   * Tick down this terrain's duration.
   * @returns Whether the current terrain should remain active (`turnsLeft > 0`)
   */
  public lapse(): boolean {
    // TODO: Add separate flag for infinite duration terrains
    if (this.turnsLeft) {
      return !!--this.turnsLeft;
    }

    return true;
  }
}

export function getTerrainName(terrainType: TerrainType): string {
  switch (terrainType) {
    case TerrainType.MISTY:
      return i18next.t("terrain:misty");
    case TerrainType.ELECTRIC:
      return i18next.t("terrain:electric");
    case TerrainType.GRASSY:
      return i18next.t("terrain:grassy");
    case TerrainType.PSYCHIC:
      return i18next.t("terrain:psychic");
    case TerrainType.ANTHILL:
      return "개미굴 필드";
    case TerrainType.OCTAGON:
      return "옥타곤 필드";
    case TerrainType.WHITE_PAINT:
      return "화이트 페인트 필드";
    case TerrainType.SWAMP:
      return "스왐프 필드";
    case TerrainType.NONE:
      return "";
  }
}

export function getTerrainColor(terrainType: TerrainType): RGBArray {
  switch (terrainType) {
    case TerrainType.MISTY:
      return [232, 136, 200];
    case TerrainType.ELECTRIC:
      return [248, 248, 120];
    case TerrainType.GRASSY:
      return [120, 200, 80];
    case TerrainType.PSYCHIC:
      return [160, 64, 160];
    case TerrainType.ANTHILL:
      return [168, 120, 72];
    case TerrainType.OCTAGON:
      return [200, 80, 64];
    case TerrainType.WHITE_PAINT:
      return [240, 240, 240];
    case TerrainType.SWAMP:
      return [88, 112, 72];
    case TerrainType.NONE:
      return [0, 0, 0];
  }
}

/**
 * Return the message associated with a terrain effect starting.
 * @param terrainType - The {@linkcode TerrainType} starting.
 * @returns A string containing the appropriate terrain start text.
 */
export function getTerrainStartMessage(terrainType: TerrainType): string {
  if (terrainType >= TerrainType.ANTHILL) {
    return `${getTerrainName(terrainType)}가 펼쳐졌다!`;
  }
  switch (terrainType) {
    case TerrainType.MISTY:
      return i18next.t("terrain:mistyStartMessage");
    case TerrainType.ELECTRIC:
      return i18next.t("terrain:electricStartMessage");
    case TerrainType.GRASSY:
      return i18next.t("terrain:grassyStartMessage");
    case TerrainType.PSYCHIC:
      return i18next.t("terrain:psychicStartMessage");
    case TerrainType.NONE:
      return "";
  }
  return "";
}

/**
 * Return the message associated with a terrain effect ceasing to exist.
 * @param terrainType - The {@linkcode TerrainType} being cleared.
 * @returns A string containing the appropriate terrain clear text.
 */
export function getTerrainClearMessage(terrainType: TerrainType): string {
  if (terrainType >= TerrainType.ANTHILL) {
    return `${getTerrainName(terrainType)}가 사라졌다!`;
  }
  switch (terrainType) {
    case TerrainType.MISTY:
      return i18next.t("terrain:mistyClearMessage");
    case TerrainType.ELECTRIC:
      return i18next.t("terrain:electricClearMessage");
    case TerrainType.GRASSY:
      return i18next.t("terrain:grassyClearMessage");
    case TerrainType.PSYCHIC:
      return i18next.t("terrain:psychicClearMessage");
    case TerrainType.NONE:
      return "";
  }
  return "";
}

/**
 * Return the message associated with a terrain-induced move/effect blockage.
 * @param pokemon - The {@linkcode Pokemon} being protected.
 * @param terrainType - The {@linkcode TerrainType} in question
 * @returns A string containing the appropriate terrain block text.
 */
export function getTerrainBlockMessage(pokemon: Pokemon, terrainType: TerrainType): string {
  if (terrainType >= TerrainType.ANTHILL) {
    return `${getTerrainName(terrainType)}의 효과로 막혔다!`;
  }
  switch (terrainType) {
    case TerrainType.MISTY:
      return i18next.t("terrain:mistyBlockMessage", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      });
    case TerrainType.ELECTRIC:
    case TerrainType.GRASSY:
    case TerrainType.PSYCHIC:
      return i18next.t("terrain:defaultBlockMessage", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        terrainName: getTerrainName(terrainType),
      });
    case TerrainType.NONE:
      return "";
  }
  return "";
}

/**
 * Gets the animation associated with the given terrain type
 * @param terrainType - The {@linkcode TerrainType} to get the animiation for
 * @returns The {@linkcode CommonAnim} for the given terrain
 */
export function getTerrainAnim(terrainType: TerrainType): CommonAnim {
  if (terrainType >= TerrainType.ANTHILL) {
    return CommonAnim.GRASSY_TERRAIN;
  }
  return (CommonAnim.MISTY_TERRAIN + (terrainType - 1)) as CommonAnim;
}
