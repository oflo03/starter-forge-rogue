// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import { PokemonType } from "#enums/pokemon-type";
import type { ForgeBody } from "./body";
import { recolorForgePixels } from "./palette";

export function forgeAppearance(
  types: readonly (PokemonType | null)[],
  icon = false,
  stage: 1 | 2 | 3 = 1,
  body: ForgeBody = "standard",
  back = false,
): string {
  const values = types.filter((type): type is PokemonType => type !== null && type >= 0 && type < 18).slice(0, 2);
  if (values.length === 0) {
    values.push(PokemonType.NORMAL);
  }
  const view = back && !icon ? "back" : "front";
  const key = `forge-partner-${body}-${view}-${values.join("-")}-stage${stage}${icon ? "-icon" : ""}`;
  if (globalScene.textures.exists(key)) {
    return key;
  }
  const size = icon ? 32 : 96;
  const texture = globalScene.textures.createCanvas(key, size, size)!;
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  if (icon) {
    const fieldKey = forgeAppearance(values, false, stage, body, false);
    context.drawImage(globalScene.textures.get(fieldKey).getSourceImage() as HTMLCanvasElement, 0, 0, size, size);
  } else {
    const sourceKey = `forge-base-${body}-stage${stage}-${view}`;
    if (!globalScene.textures.exists(sourceKey)) {
      throw new Error("Missing Forge base sprite: " + sourceKey);
    }
    context.drawImage(globalScene.textures.get(sourceKey).getSourceImage() as HTMLImageElement, 0, 0);
    const pixels = context.getImageData(0, 0, size, size);
    recolorForgePixels(pixels.data, values);
    context.putImageData(pixels, 0, 0);
  }
  // Pixel digits stay readable at party-icon size without depending on canvas fonts.
  const digits = [
    [],
    ["010", "110", "010", "010", "111"],
    ["111", "001", "111", "100", "111"],
    ["111", "001", "111", "001", "111"],
  ];
  const pixel = icon ? 1 : 3;
  const x = icon ? 24 : 73;
  const y = icon ? 2 : 7;
  context.fillStyle = "#20202a";
  context.fillRect(x - pixel, y - pixel, 5 * pixel, 7 * pixel);
  context.fillStyle = "#ffffff";
  digits[stage].forEach((row, dy) =>
    Array.from(row).forEach((value, dx) => {
      if (value === "1") {
        context.fillRect(x + dx * pixel, y + dy * pixel, pixel, pixel);
      }
    }),
  );
  texture.add("0001.png", 0, 0, 0, size, size);
  texture.refresh();
  if (!icon && !globalScene.anims.exists(key)) {
    globalScene.anims.create({ key, frames: [{ key, frame: "0001.png" }], frameRate: 10, repeat: -1 });
  }
  return key;
}
