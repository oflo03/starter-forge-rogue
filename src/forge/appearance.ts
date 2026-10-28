// SPDX-License-Identifier: AGPL-3.0-only
import { globalScene } from "#app/global-scene";
import { getTypeRgb } from "#data/type";
import { PokemonType } from "#enums/pokemon-type";

// Small monochrome symbols remain legible on both the field and party icons.
const symbols = [
  "M0 -8 A8 8 0 1 1 -0.1 -8 M-3 -3 L3 3 M3 -3 L-3 3", // normal
  "M-7 7 L-8 -1 L-5 -2 L-5 -7 L-2 -8 L0 -5 L3 -7 L6 -5 L8 1 L4 8 Z", // fighting
  "M-9 5 Q-2 -9 9 -7 L3 1 L-3 3 M-7 7 L4 -4", // flying
  "M0 -8 L7 -4 L7 3 L0 8 L-7 3 L-7 -4 Z M-3 -2 L-1 0 M3 -2 L1 0 M-3 4 L3 4", // poison
  "M-9 7 L-3 -7 L2 2 L5 -3 L10 7 Z M-4 1 L1 1", // ground
  "M-8 4 L-5 -5 L3 -8 L9 -1 L6 7 L-3 8 Z M-5 -5 L1 1 L9 -1 M1 1 L-3 8", // rock
  "M0 -4 L0 8 M-4 -5 L-7 -8 M4 -5 L7 -8 M-5 -2 Q-9 6 0 8 Q9 6 5 -2 Z M-6 1 L-10 -1 M6 1 L10 -1", // bug
  "M-8 8 L-8 0 Q-8 -9 0 -9 Q8 -9 8 0 L8 8 L4 5 L0 8 L-4 5 Z M-3 -1 L-3 1 M3 -1 L3 1", // ghost
  "M-8 -4 L0 -9 L8 -4 L8 5 L0 9 L-8 5 Z M-3 -1 L0 -3 L3 -1 L3 3 L0 5 L-3 3 Z", // steel
  "M0 -10 Q2 -4 7 0 Q11 10 0 10 Q-12 8 -6 -2 Q-5 3 -2 1 Q-4 -5 0 -10 Z", // fire
  "M0 -10 Q-15 5 -5 9 Q8 15 8 4 Q7 -1 0 -10 Z", // water
  "M-8 8 Q-13 -9 9 -9 Q12 12 -8 8 Z M-8 8 L5 -5 M-3 2 L-4 -3 M1 -1 L6 0", // grass
  "M1 -10 L-7 2 L-1 2 L-3 11 L8 -3 L2 -3 Z", // electric
  "M-9 0 Q0 -11 9 0 Q0 11 -9 0 Z M0 -4 A4 4 0 1 1 -0.1 -4", // psychic
  "M0 -10 L0 10 M-9 -5 L9 5 M-9 5 L9 -5 M-3 -8 L0 -5 L3 -8 M-3 8 L0 5 L3 8", // ice
  "M-8 8 Q-2 4 -4 -2 L0 -9 L3 -4 L8 -4 L5 2 L1 2 L3 8 Z M1 -3 L2 -3", // dragon
  "M5 -9 A10 10 0 1 0 9 5 Q-4 8 -4 -3 Q-3 -8 5 -9 Z", // dark
  "M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z", // fairy
];

export function forgeAppearance(types: readonly (PokemonType | null)[], icon = false): string {
  const values = types.filter((type): type is PokemonType => type !== null && type >= 0 && type < 18).slice(0, 2);
  if (values.length === 0) {
    values.push(PokemonType.NORMAL);
  }
  const key = `forge-partner-${values.join("-")}${icon ? "-icon" : ""}`;
  if (globalScene.textures.exists(key)) {
    return key;
  }
  const size = icon ? 32 : 96;
  const texture = globalScene.textures.createCanvas(key, size, size)!;
  const context = texture.getContext();
  context.save();
  context.translate(size / 2, size / 2);
  context.scale(size / 96, size / 96);
  context.beginPath();
  context.arc(0, 0, 35, 0, Math.PI * 2);
  context.fillStyle = `rgb(${getTypeRgb(values[0]).join(",")})`;
  context.fill();
  if (values.length > 1) {
    context.save();
    context.clip();
    context.fillStyle = `rgb(${getTypeRgb(values[1]).join(",")})`;
    context.fillRect(0, -36, 36, 72);
    context.restore();
  }
  context.lineWidth = 2;
  context.strokeStyle = "#fff";
  context.stroke();
  values.forEach((type, i) => {
    context.save();
    context.translate(values.length === 1 ? 0 : i === 0 ? -16 : 16, 0);
    context.scale(values.length === 1 ? 1.8 : 1.2, values.length === 1 ? 1.8 : 1.2);
    context.strokeStyle = "#fff";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke(new Path2D(symbols[type]));
    context.restore();
  });
  context.restore();
  texture.add("0001.png", 0, 0, 0, size, size);
  texture.refresh();
  if (!icon && !globalScene.anims.exists(key)) {
    globalScene.anims.create({ key, frames: [{ key, frame: "0001.png" }], frameRate: 10, repeat: -1 });
  }
  return key;
}
