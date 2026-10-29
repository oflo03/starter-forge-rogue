// SPDX-License-Identifier: AGPL-3.0-only
import Maker from "../../forge/vendor/engine.js";

export enum AugmentTier {
  SILVER,
  GOLD,
  PRISMATIC,
}
export const AUGMENT_TIER_NAMES = ["실버", "골드", "프리즘"];
export const AUGMENT_REROLLS = 2;

/** One grade per reward; card rerolls keep that reward's grade. */
export function rollAugmentTier(seed: string): AugmentTier {
  const roll = Maker.createRng(seed).int(1, 100);
  return roll <= 50 ? AugmentTier.SILVER : roll <= 85 ? AugmentTier.GOLD : AugmentTier.PRISMATIC;
}
