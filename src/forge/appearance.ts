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
  texture.add("0001.png", 0, 0, 0, size, size);
  texture.refresh();
  if (!icon && !globalScene.anims.exists(key)) {
    globalScene.anims.create({ key, frames: [{ key, frame: "0001.png" }], frameRate: 10, repeat: -1 });
  }
  return key;
}

/** Encounter choices reveal only the original type symbol, never the creature. */
export function forgeTypeChoice(type: PokemonType): string {
  const key = `forge-type-choice-${type}`;
  if (globalScene.textures.exists(key)) {
    return key;
  }
  const frame = globalScene.textures.getFrame("pbinfo_player_type", PokemonType[type].toLowerCase());
  const texture = globalScene.textures.createCanvas(key, 64, 64)!;
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  const width = frame.cutWidth * 2;
  const height = frame.cutHeight * 2;
  context.drawImage(
    frame.source.image as HTMLImageElement,
    frame.cutX,
    frame.cutY,
    frame.cutWidth,
    frame.cutHeight,
    (64 - width) / 2,
    (64 - height) / 2,
    width,
    height,
  );
  texture.refresh();
  return key;
}

/** Battle sprites rest on the ground; summary and naming textures stay centered. */
export function forgeGroundAlignment(key: string): { spriteY: number; shadowY: number } {
  const canvas = globalScene.textures.get(key).getSourceImage() as HTMLCanvasElement;
  const pixels = canvas.getContext("2d")!.getImageData(0, 0, 96, 96).data;
  for (let y = 95; y >= 0; y--) {
    for (let x = 0; x < 96; x++) {
      if (pixels[(y * 96 + x) * 4 + 3]) {
        // Keep both the visible feet and native shadow on the player platform at y132.
        const shadowY = key.includes("-back-") ? -16 : 0;
        return { spriteY: 95 - y + shadowY, shadowY };
      }
    }
  }
  return { spriteY: 0, shadowY: 0 };
}
