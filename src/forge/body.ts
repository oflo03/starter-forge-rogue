// SPDX-License-Identifier: AGPL-3.0-only
import Maker from "../../forge/vendor/engine.js";

export const FORGE_BODIES = ["agile", "standard", "sturdy", "heavy", "armored", "soft"] as const;
export type ForgeBody = (typeof FORGE_BODIES)[number];

export const BODY_ROLES: Record<ForgeBody, readonly string[]> = {
  agile: ["physical-fast", "special-fast", "mixed-fast", "speed-support"],
  standard: ["physical-mid", "special-mid", "mixed-mid", "mixed-physical", "mixed-special", "balanced"],
  sturdy: [
    "physical-bulky",
    "special-bulky",
    "mixed-bulky",
    "physical-fortress",
    "special-fortress",
    "physical-specialtank",
    "special-physicaltank",
  ],
  heavy: ["physical-slow", "special-slow", "slow-pivot"],
  armored: ["physical-wall", "special-wall", "dual-wall", "armored", "fast-physicalwall", "fast-specialwall"],
  soft: ["balloon"],
};

/** Classify the final seeded stats so evolution never changes the animal family. */
export function forgeBodyForSeed(seed: string): ForgeBody {
  const role = Maker.classify(Maker.generateStats(seed).stats).id;
  return FORGE_BODIES.find(body => BODY_ROLES[body].includes(role)) ?? "standard";
}
