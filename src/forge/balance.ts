// SPDX-License-Identifier: AGPL-3.0-only
export const FORGE_TRAINER_LEVELS: Readonly<Record<number, readonly number[]>> = {
  5: [7, 8],
  25: [25, 26, 28],
  40: [37, 38, 39, 40],
  55: [52, 53, 54, 55],
  60: [56, 57, 58, 58, 59, 60],
};

export const forgeWildLevel = (wave: number): number => Math.max(3, Math.min(58, Math.round(3 + wave * 0.9)));
export const forgeLevelCap = (wave: number): number => Math.min(60, Math.ceil(Math.max(1, wave) / 10) * 10 + 5);
export const forgeEnemyItemLimit = (wave: number): number => (wave < 25 ? 0 : wave < 55 ? 1 : 2);
export const forgeEnemyIvLimit = (wave: number): number => Math.min(28, Math.floor(8 + wave / 3));
