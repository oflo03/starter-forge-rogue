// SPDX-License-Identifier: AGPL-3.0-only
import { BODY_ROLES, FORGE_BODIES, forgeBodyForSeed } from "#app/forge/body";
import { FORGE_SHADES, forgePalette, recolorForgePixels } from "#app/forge/palette";
import { CustomPokemonData } from "#data/pokemon-data";
import { PokemonType } from "#enums/pokemon-type";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import Maker from "../../../forge/vendor/engine.js";

describe("Forge reusable sprite system", () => {
  it("has exactly 36 static 96px frames, one for every body, stage and view", () => {
    const directory = resolve("src/forge/sprites");
    const expected = FORGE_BODIES.flatMap(body =>
      [1, 2, 3].flatMap(stage => ["front", "back"].map(view => `${body}-stage${stage}-${view}.png`)),
    );
    expect(
      readdirSync(directory)
        .filter(file => file.endsWith(".png"))
        .sort(),
    ).toEqual(expected.sort());
    for (const file of expected) {
      const bytes = readFileSync(join(directory, file));
      expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([96, 96]);
    }
  });

  it("maps all 27 forms exactly once to six stable body families", () => {
    const roles = Object.values(BODY_ROLES).flat();
    expect(roles).toHaveLength(27);
    expect(new Set(roles).size).toBe(27);
    expect([...roles].sort()).toEqual(
      Maker.getRules()
        .templates.map(role => role.id)
        .sort(),
    );
    for (let i = 0; i < 100; i++) {
      const seed = `sprite-body-${i}`;
      const body = forgeBodyForSeed(seed);
      expect(forgeBodyForSeed(seed)).toBe(body);
      expect(BODY_ROLES[body]).toContain(Maker.classify(Maker.generateStats(seed).stats).id);
    }
  });

  it("uses only palette changes across all 18 types and preserves transparency", () => {
    for (let type = 0; type < 18; type++) {
      const palette = forgePalette([type]);
      expect(palette).toHaveLength(8);
      expect(palette.flat().every(n => Number.isInteger(n) && n >= 0 && n <= 255)).toBe(true);
      const pixels = new Uint8ClampedArray([
        ...FORGE_SHADES.flatMap(shade => [shade, shade, shade, 255]),
        13,
        17,
        19,
        0,
      ]);
      recolorForgePixels(pixels, [type]);
      expect(Array.from(pixels.filter((_, i) => i % 4 === 3))).toEqual([...FORGE_SHADES.map(() => 255), 0]);
      expect(Array.from(pixels.slice(-4))).toEqual([13, 17, 19, 0]);
      for (let i = 0; i < 8; i++) {
        expect(Array.from(pixels.slice(i * 4, i * 4 + 3))).toEqual(palette[i]);
      }
    }
    const dual = forgePalette([PokemonType.FIRE, PokemonType.WATER]);
    expect(dual[3]).toEqual(forgePalette([PokemonType.FIRE])[3]);
    expect(dual[5]).toEqual(forgePalette([PokemonType.WATER])[5]);
    expect(dual[0]).toEqual(forgePalette([PokemonType.NORMAL])[0]);
    expect(dual[7]).toEqual(forgePalette([PokemonType.NORMAL])[7]);
  });

  it("preserves a saved body family and supports older saves without it", () => {
    const forge = {
      seed: "body-save",
      baseStats: [90, 100, 90, 90, 80, 80],
      stage: 3 as const,
      events: [16, 26, 36],
      body: "soft" as const,
    };
    const saved = new CustomPokemonData({ forge });
    const restored = new CustomPokemonData(JSON.parse(JSON.stringify(saved)));
    expect(restored.forge?.body).toBe("soft");
    const { body: _body, ...legacy } = forge;
    expect(new CustomPokemonData({ forge: legacy }).forge?.seed).toBe("body-save");
  });
});
