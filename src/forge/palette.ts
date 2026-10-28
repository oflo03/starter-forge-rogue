// SPDX-License-Identifier: AGPL-3.0-only
import { PokemonType } from "#enums/pokemon-type";

export const FORGE_SHADES = [32, 80, 112, 144, 176, 200, 224, 248] as const;
type Rgb = [number, number, number];
/** Main body and contrasting markings for each of the 18 original types. */
export const FORGE_TYPE_COLORS: readonly (readonly [Rgb, Rgb])[] = [
  [
    [171, 143, 109],
    [104, 73, 57],
  ], // Normal: cream / cocoa
  [
    [173, 70, 56],
    [235, 188, 107],
  ], // Fighting: brick / sand
  [
    [123, 166, 204],
    [242, 219, 172],
  ], // Flying: sky / ivory
  [
    [151, 91, 180],
    [163, 207, 85],
  ], // Poison: purple / acid green
  [
    [192, 143, 77],
    [120, 63, 49],
  ], // Ground: sand / terracotta
  [
    [143, 132, 115],
    [211, 168, 84],
  ], // Rock: stone / amber
  [
    [135, 168, 64],
    [229, 184, 68],
  ], // Bug: leaf / pollen
  [
    [100, 80, 153],
    [96, 196, 176],
  ], // Ghost: violet / spectral mint
  [
    [130, 154, 175],
    [205, 153, 95],
  ], // Steel: blue steel / copper
  [
    [225, 105, 50],
    [255, 205, 77],
  ], // Fire: ember / gold
  [
    [62, 133, 202],
    [83, 202, 179],
  ], // Water: ocean / turquoise
  [
    [88, 153, 75],
    [225, 186, 91],
  ], // Grass: leaf / golden bud
  [
    [238, 198, 57],
    [113, 68, 42],
  ], // Electric: yellow / dark brown
  [
    [207, 91, 139],
    [112, 88, 173],
  ], // Psychic: rose / violet
  [
    [118, 196, 211],
    [122, 142, 197],
  ], // Ice: glacier / periwinkle
  [
    [114, 95, 185],
    [218, 160, 72],
  ], // Dragon: indigo / gold
  [
    [86, 78, 92],
    [164, 87, 108],
  ], // Dark: charcoal / muted crimson
  [
    [221, 146, 190],
    [125, 175, 169],
  ], // Fairy: rose / sage
];
const OUTLINE: Rgb = [32, 29, 35];
const HIGHLIGHT: Rgb = [248, 248, 248];
const blend = (rgb: Rgb, target: number, amount: number): Rgb =>
  rgb.map(n => Math.round(n * (1 - amount) + target * amount)) as Rgb;

/** Two anatomical color ramps, not two separately drawn halves of a creature. */
export function forgePalette(types: readonly (PokemonType | null)[]): Rgb[] {
  const regular = types.filter((t): t is PokemonType => t !== null && t >= 0 && t < 18);
  const primary = regular[0] ?? PokemonType.NORMAL;
  const secondary = regular[1] ?? primary;
  const main = FORGE_TYPE_COLORS[primary][0];
  const accent = secondary === primary ? FORGE_TYPE_COLORS[primary][1] : FORGE_TYPE_COLORS[secondary][0];
  return [
    OUTLINE,
    blend(main, 20, 0.55),
    blend(main, 40, 0.3),
    blend(main, 190, 0.15),
    blend(main, 255, 0.35),
    blend(accent, 20, 0.1),
    blend(accent, 255, 0.22),
    HIGHLIGHT,
  ];
}

export function recolorForgePixels(pixels: Uint8ClampedArray, types: readonly (PokemonType | null)[]): void {
  const palette = forgePalette(types);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (!pixels[offset + 3]) {
      continue;
    }
    const index = FORGE_SHADES.indexOf(pixels[offset] as (typeof FORGE_SHADES)[number]);
    if (index < 0) {
      continue;
    }
    [pixels[offset], pixels[offset + 1], pixels[offset + 2]] = palette[index];
  }
}
