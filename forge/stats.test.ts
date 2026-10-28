// SPDX-License-Identifier: AGPL-3.0-only

import assert from "node:assert/strict";
// biome-ignore lint/style/noRestrictedImports: Pure allocation checks run without Phaser initialization.
import test from "node:test";
import { evolutionStats, STAT_MINIMUMS } from "./stats.ts";
import Maker from "./vendor/engine.js";

test("stage totals, minima, preserved low values and monotonic growth across10000 seeded creatures", () => {
  for (let seed = 0; seed < 10000; seed++) {
    const s = Maker.generateStats("evolution:" + seed).stats;
    const final = ["hp", "atk", "def", "spa", "spd", "spe"].map(k => s[k]);
    const stages = ([1, 2, 3] as const).map(stage => evolutionStats(final, stage));
    assert.deepEqual(
      stages.map(v => v.reduce((a, b) => a + b, 0)),
      [310, 420, 530],
    );
    for (let i = 0; i < 6; i++) {
      assert.ok(stages[0][i] >= STAT_MINIMUMS[i]);
      assert.ok(stages[0][i] <= stages[1][i] && stages[1][i] <= final[i]);
      if (final[i] <= 40) {
        assert.ok(stages.every(v => v[i] === final[i]));
      }
    }
  }
});
test("floor saturation reallocates cuts and preserves extremely low stats", () => {
  const final = [40, 150, 150, 150, 10, 30];
  for (const stage of [1, 2] as const) {
    const scaled = evolutionStats(final, stage);
    assert.equal(scaled[0], 40);
    assert.equal(scaled[4], 10);
    assert.equal(scaled[5], 30);
    assert.equal(
      scaled.reduce((a, b) => a + b, 0),
      stage === 1 ? 310 : 420,
    );
  }
});
