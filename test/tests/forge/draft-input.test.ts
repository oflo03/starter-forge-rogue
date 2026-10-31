// SPDX-License-Identifier: AGPL-3.0-only
import { DRAFT_INPUT_DELAY, DraftInputGate } from "#app/forge/draft-input";
import { describe, expect, it } from "vitest";

describe("Forge draft input guard", () => {
  it("uses a short opening delay that attempts do not extend", () => {
    const gate = new DraftInputGate();
    expect(DRAFT_INPUT_DELAY).toBe(350);
    gate.open(0);
    for (const now of [0, 100, 200, 349]) {
      expect(gate.confirm(now)).toBe(false);
    }
    expect(gate.confirm(350)).toBe(true);
    expect(gate.confirm(351)).toBe(true);
  });
  it("requires keys held across the transition to be released", () => {
    const gate = new DraftInputGate();
    gate.open(0, [4, 5]);
    expect(gate.confirm(500)).toBe(false);
    gate.release(4);
    expect(gate.confirm(500)).toBe(false);
    gate.release(5);
    expect(gate.confirm(500)).toBe(true);
  });
  it("requires the old pointer to release and rearms only when a new screen opens", () => {
    const gate = new DraftInputGate();
    gate.open(0, [], true);
    expect(gate.confirm(500)).toBe(false);
    gate.releasePointer();
    expect(gate.confirm(500)).toBe(true);
    expect(gate.confirm(501)).toBe(true);
    gate.open(1000);
    expect(gate.confirm(1349)).toBe(false);
    expect(gate.confirm(1350)).toBe(true);
  });
});
