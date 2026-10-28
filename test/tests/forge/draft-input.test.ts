// SPDX-License-Identifier: AGPL-3.0-only
import { DraftInputGate } from "#app/forge/draft-input";
import { describe, expect, it } from "vitest";

describe("Forge draft input guard", () => {
  it("blocks opening spam and requires a quiet gap after repeated confirmation", () => {
    const gate = new DraftInputGate();
    gate.open(0);
    for (let now = 0; now <= 2500; now += 100) {
      expect(gate.confirm(now)).toBe(false);
    }
    expect(gate.confirm(2900)).toBe(true);
  });

  it("requires keys held across the transition to be released", () => {
    const gate = new DraftInputGate();
    gate.open(0, [4, 5]);
    expect(gate.confirm(1500)).toBe(false);
    gate.release(4);
    expect(gate.confirm(2000)).toBe(false);
    gate.release(5);
    expect(gate.confirm(2500)).toBe(true);
  });

  it("requires the old pointer to be released, and re-arms on each new choice", () => {
    const gate = new DraftInputGate();
    gate.open(0, [], true);
    expect(gate.confirm(1500)).toBe(false);
    gate.releasePointer();
    expect(gate.confirm(2000)).toBe(true);
    gate.open(2000);
    expect(gate.confirm(2400)).toBe(false);
    expect(gate.confirm(3200)).toBe(true);
  });
});
