// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import { PokemonType } from "#enums/pokemon-type";

export function forgeAppearance(types: readonly (PokemonType | null)[], icon = false, stage: 1 | 2 | 3 = 1): string {
  const values = types.filter((type): type is PokemonType => type !== null && type >= 0 && type < 18).slice(0, 2);
  if (values.length === 0) {
    values.push(PokemonType.NORMAL);
  }
  const key = `forge-partner-${values.join("-")}-stage${stage}${icon ? "-icon" : ""}`;
  if (globalScene.textures.exists(key)) {
    return key;
  }
  const size = icon ? 32 : 96;
  const texture = globalScene.textures.createCanvas(key, size, size)!;
  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  values.forEach((type, index) => {
    const frame = globalScene.textures.getFrame("pbinfo_player_type", PokemonType[type].toLowerCase());
    const scale = icon ? 1 : 3;
    const width = frame.cutWidth * scale;
    const height = frame.cutHeight * scale;
    context.save();
    if (values.length === 2) {
      // Clip full-sized badges so each contributes exactly one half, without squeezing either image.
      context.beginPath();
      context.rect((index * size) / 2, 0, size / 2, size);
      context.clip();
    }
    context.drawImage(
      frame.source.image as HTMLImageElement,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      Math.floor((size - width) / 2),
      Math.floor((size - height) / 2),
      width,
      height,
    );
    context.restore();
  });
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
