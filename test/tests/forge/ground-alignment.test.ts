// SPDX-License-Identifier: AGPL-3.0-only
import { forgeGroundAlignment } from "#app/forge/appearance";
import { globalScene, initGlobalScene } from "#app/global-scene";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => initGlobalScene({ textures: { get: vi.fn() } } as never));
describe("Forge battle feet and native shadow alignment", () => {
  it("moves the shadow with the ground anchor, independently of transparent sprite padding", () => {
    for (const bottom of [95, 73, 50]) {
      const data = new Uint8ClampedArray(96 * 96 * 4);
      data[(bottom * 96 + 48) * 4 + 3] = 255;
      vi.mocked(globalScene.textures.get).mockReturnValue({
        getSourceImage: () => ({ getContext: () => ({ getImageData: () => ({ data }) }) }),
      } as never);
      for (const view of ["front", "back"]) {
        const result = forgeGroundAlignment(`forge-partner-sturdy-${view}-10-stage1`);
        const feet = result.spriteY - (95 - bottom);
        expect(feet).toBe(view === "back" ? -16 : 0);
        expect(result.shadowY).toBe(feet);
      }
    }
  });
  it("does not add an offset for an empty texture", () => {
    vi.mocked(globalScene.textures.get).mockReturnValue({
      getSourceImage: () => ({
        getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray(96 * 96 * 4) }) }),
      }),
    } as never);
    expect(forgeGroundAlignment("forge-partner-sturdy-back-10-stage1")).toEqual({ spriteY: 0, shadowY: 0 });
  });
});
