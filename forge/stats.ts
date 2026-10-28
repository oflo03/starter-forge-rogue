// SPDX-License-Identifier: AGPL-3.0-only
/** HP, Attack, Defense, Sp. Attack, Sp. Defense, Speed. */
export const STAT_MINIMUMS = [40, 50, 40, 30, 10, 10] as const;
export const STAGE_TOTALS = [310, 420, 530] as const;
export const PRESERVED_STAT_MAX = 40;
/** Scale unlocked values proportionally; lock low values and floor-bound stats first. */
export function evolutionStats(finalStats: readonly number[], stage: 1 | 2 | 3): number[] {
  if (
    finalStats.length !== 6
    || finalStats.some(n => !Number.isInteger(n) || n <= 0)
    || finalStats.reduce((a, b) => a + b, 0) !== 530
  ) {
    throw new Error("Final base stats must be six positive integers totaling530.");
  }
  const target = STAGE_TOTALS[stage - 1];
  if (target === undefined) {
    throw new Error("Unknown evolution stage.");
  }
  if (stage === 3) {
    return [...finalStats];
  }
  const values = new Array<number>(6).fill(0);
  const locked = finalStats.map(n => n <= PRESERVED_STAT_MAX);
  const minimum = finalStats.map((n, i) => Math.min(n, STAT_MINIMUMS[i]));
  for (let i = 0; i < 6; i++) {
    if (locked[i]) {
      values[i] = finalStats[i];
    }
  }
  while (true) {
    const remaining = target - values.reduce((sum, n, i) => sum + (locked[i] ? n : 0), 0);
    const weight = finalStats.reduce((sum, n, i) => sum + (locked[i] ? 0 : n), 0);
    if (remaining < 0 || weight === 0) {
      throw new Error("Cannot fit evolution stats within preserved values.");
    }
    const ratio = remaining / weight;
    let changed = false;
    for (let i = 0; i < 6; i++) {
      if (!locked[i] && finalStats[i] * ratio < minimum[i]) {
        locked[i] = true;
        values[i] = minimum[i];
        changed = true;
      }
    }
    if (changed) {
      continue;
    }
    for (let i = 0; i < 6; i++) {
      if (!locked[i]) {
        values[i] = finalStats[i] * ratio;
      }
    }
    break;
  }
  const result = values.map(Math.floor);
  const order = values
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .filter(x => !locked[x.i])
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  let remainder = target - result.reduce((a, b) => a + b, 0);
  for (const { i } of order) {
    if (remainder <= 0) {
      break;
    }
    result[i]++;
    remainder--;
  }
  if (
    remainder !== 0
    || result.some((n, i) => n < minimum[i] || n > finalStats[i])
    || result.reduce((a, b) => a + b, 0) !== target
  ) {
    throw new Error("Cannot allocate exact evolution total.");
  }
  return result;
}
