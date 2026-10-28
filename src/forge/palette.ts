// SPDX-License-Identifier: AGPL-3.0-only
import { getTypeRgb } from "#data/type";
import { PokemonType } from "#enums/pokemon-type";

export const FORGE_SHADES = [32, 80, 112, 144, 176, 200, 224, 248] as const;
type Rgb = [number, number, number];
const NORMAL: Rgb[] = [
  [32, 29, 35],
  [75, 68, 64],
  [106, 96, 86],
  [147, 135, 118],
  [189, 176, 152],
  [207, 199, 184],
  [230, 223, 208],
  [248, 248, 248],
];
const blend = (rgb: Rgb, target: number, amount: number): Rgb =>
  rgb.map(n => Math.round(n * (1 - amount) + target * amount)) as Rgb;

/** Two anatomical color ramps, not two separately drawn halves of a creature. */
export function forgePalette(types: readonly (PokemonType | null)[]): Rgb[] {
  const regular = types.filter((t): t is PokemonType => t !== null && t >= 0 && t < 18);
  const primary = regular[0] ?? PokemonType.NORMAL;
  const secondary = regular[1] ?? primary;
  if (primary === PokemonType.NORMAL && secondary === PokemonType.NORMAL) {
    return NORMAL.map(color => [...color] as Rgb);
  }
  const main = getTypeRgb(primary);
  const accent = getTypeRgb(secondary);
  return [
    NORMAL[0],
    blend(main, 20, 0.55),
    blend(main, 40, 0.3),
    blend(main, 190, 0.15),
    blend(main, 255, 0.35),
    blend(accent, 200, 0.15),
    blend(accent, 255, 0.55),
    NORMAL[7],
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
