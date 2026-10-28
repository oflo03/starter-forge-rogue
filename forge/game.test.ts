// SPDX-License-Identifier: AGPL-3.0-only

import assert from "node:assert/strict";
// biome-ignore lint/style/noRestrictedImports: The asset-free mode uses the Node runner without the Phaser test bootstrap.
import test from "node:test";
// biome-ignore lint/performance/noNamespaceImport: The test suite exercises the complete public mode API.
import * as G from "./game.ts";
import { SPECIES } from "./species.ts";
import Catalog from "./vendor/catalog.js";
import Maker from "./vendor/engine.js";

const L = Catalog.getLibrary();
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const move = (id: string) => {
  const m = L.moves.find(x => x.id === id);
  assert.ok(m, id);
  return { ...copy(m), currentPp: m.pp } as G.Move;
};
const ability = (id: string) => copy(L.abilities.find(x => x.id === id));
const run = () => G.createRun({ mapSeed: "검증-맵", pokemonSeed: "검증-개체", type: "fire" });
function fixture() {
  const r = run();
  for (const m of [...r.team, r.enemy!]) {
    m.level = 50;
    m.stage = 3;
    m.base = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
    m.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    m.maxHp = G.battleStats(m).hp;
    m.hp = m.maxHp;
    m.types = ["normal"];
    m.ability = { id: "unawakened", name: "없음", description: "없음" };
  }
  r.enemy!.moves = [{ ...move("quick-normal"), power: 1, priority: -5, accuracy: 100 }];
  r.team[0].moves = [move("guard-normal"), move("purify-water")];
  return r;
}
function resolveGrowth(r: G.Run) {
  while (r.phase === "draft") {
    const d = r.draft!;
    const mon = r.team.find(m => m.id === d.memberId)!;
    const o = d.options[0];
    G.chooseOption(r, o.id, {
      slot:
        d.kind === "move" && mon.moves.length === 4
          ? mon.moves.findIndex((_m, i) => G.canReplaceMove(mon, o.move, i))
          : undefined,
      stat: d.kind === "type" ? o.choices[0] : undefined,
    });
  }
}
test("same seeds reproduce team and battle, different maps preserve the creatures", () => {
  const a = run();
  const b = run();
  assert.deepEqual(a, b);
  G.attack(a, 0);
  G.attack(b, 0);
  assert.deepEqual(a, b);
  const other = G.createRun({ mapSeed: "다른-맵", pokemonSeed: "검증-개체", type: "fire" });
  assert.deepEqual(run().team, other.team);
  assert.notDeepEqual(run().enemy, other.enemy);
  for (const m of other.team) {
    assert.equal(
      Object.values(m.base).reduce((a, b) => a + b, 0),
      530,
    );
  }
  assert.deepEqual(
    other.team.map(m => m.base),
    other.team.map(m => Maker.generateStats(m.seed).stats),
  );
});
test("all 18 type choices work and the upstream chart handles immunities and corrosion", () => {
  for (const type of G.TYPES) {
    const r = G.createRun({ mapSeed: "types", pokemonSeed: type.id, type: type.id });
    assert.equal(r.team[0].types[0], type.id);
  }
  const r = run();
  const target = r.enemy!;
  target.types = ["steel", "grass"];
  assert.equal(G.typeEffectiveness(move("corrode"), "poison", target), 4);
  target.types = ["steel", "poison"];
  assert.equal(G.typeEffectiveness(move("corrode"), "poison", target), 1);
  target.types = ["ghost"];
  assert.equal(G.typeEffectiveness(move("quick-normal"), "normal", target), 0);
  assert.equal(G.typeEffectiveness({ ...move("quick-normal"), id: "struggle" }, "normal", target), 1);
});
test("exact wave schedule", () => {
  assert.deepEqual(
    Array.from({ length: 60 }, (_, i) => i + 1)
      .filter(w => G.matchKind(w) !== "normal")
      .map(w => [w, G.matchKind(w)]),
    [
      [5, "rival"],
      [25, "rival"],
      [40, "evil"],
      [55, "rival"],
      [60, "boss"],
    ],
  );
});
test("all five growth events are queued exactly once per creature, level ends at60", () => {
  const r = run();
  for (let wave = 2; wave <= 60; wave++) {
    r.phase = "between";
    r.cleared = r.wave;
    G.advance(r);
    assert.equal(r.wave, wave);
    assert.ok(r.team.every(m => m.level === Math.max(5, wave)));
    if ([16, 26, 36, 46, 56].includes(wave)) {
      assert.equal(r.phase, "draft");
      assert.equal(r.draftQueue.length, 2);
      assert.equal(r.draft!.options.length, 3);
      resolveGrowth(r);
    } else {
      assert.equal(r.phase, "battle");
    }
    assert.ok(r.team.every(m => m.stage === (wave >= 36 ? 3 : wave >= 16 ? 2 : 1)));
  }
  assert.equal(r.events.length, 15);
  assert.equal(new Set(r.events.map(e => e.id)).size, 15);
  assert.ok(r.team.every(m => m.types.length === 2 && m.moves.length <= 4));
  r.phase = "between";
  assert.throws(() => G.advance(r), /마지막/);
});
test("reward candidate lists use creature seed and reward tier, not battle RNG", () => {
  const a = run();
  const b = run();
  a.turn = 99;
  b.turn = 1;
  for (const level of [16, 26, 36, 46, 56]) {
    assert.deepEqual(G.makeDraft(a, a.team[0], level), G.makeDraft(b, b.team[0], level));
  }
  const changed = new Set<string>();
  for (let i = 0; i < 20; i++) {
    b.mapSeed = "grade:" + i;
    changed.add(G.makeDraft(b, b.team[0], 26).rarity);
  }
  assert.ok(changed.size >= 2);
});
test("IV reward adjusts only IVs; all+5 and focus31 are distinct", () => {
  for (const id of ["ivs-all", "ivs-offense", "ivs-focus"]) {
    const r = run();
    const m = r.team[0];
    const base = copy(m.base);
    const ivs = copy(m.ivs);
    r.draft = G.makeDraft(r, m, 56);
    r.phase = "draft";
    G.chooseOption(r, id, { stat: "spe" });
    assert.deepEqual(m.base, base);
    if (id === "ivs-all") {
      for (const key of Object.keys(ivs)) {
        assert.equal(m.ivs[key], Math.min(31, ivs[key] + 5));
      }
    } else {
      const k = id === "ivs-focus" ? "spe" : m.base.atk >= m.base.spa ? "atk" : "spa";
      assert.equal(m.ivs[k], 31);
      assert.equal(Object.keys(ivs).filter(s => ivs[s] !== m.ivs[s]).length, 1);
    }
  }
});
test("generation filters low-defense and high-offense guaranteed crit users", () => {
  const r = run();
  const m = r.team[0];
  m.base = { hp: 100, atk: 140, def: 45, spa: 130, spd: 45, spe: 70 };
  for (let i = 0; i < 25; i++) {
    m.seed = "filter:" + i;
    const d = G.makeDraft(r, m, 16);
    assert.ok(d.options.every(o => !o.move.alwaysCrit && !["body", "spirit"].includes(o.move.templateId)));
  }
});
test("damage-lowering attacks apply one stage, not twice", () => {
  const r = fixture();
  r.team[0].moves = [{ ...move("crush-normal"), accuracy: 100, priority: 1, power: 1 }];
  G.attack(r, 0);
  assert.equal(r.enemy!.stages.def, -1);
});
test("wrong damage category does not consume a first-hit defensive ability", () => {
  const r = fixture();
  r.team[0].ability = ability("thought-pad");
  G.attack(r, 0);
  assert.equal(r.team[0].padUsed, false);
  r.enemy!.moves = [{ ...move("sure-normal"), power: 1, accuracy: 100, priority: -5 }];
  G.attack(r, 1);
  assert.equal(r.team[0].padUsed, true);
  const x = fixture();
  x.team[0].ability = ability("last-shield");
  x.team[0].moves = [{ ...move("quick-normal"), power: 1, accuracy: 100 }];
  G.attack(x, 0);
  assert.equal(x.team[0].padUsed, false);
  x.team[0].hp = Math.floor(x.team[0].maxHp / 3);
  G.attack(x, 0);
  assert.equal(x.team[0].padUsed, true);
});
test("healing breaks Protect streak; last status PP does not trigger Last Drop", () => {
  const r = fixture();
  G.attack(r, 0);
  assert.equal(r.team[0].protectChain, 1);
  G.attack(r, 1);
  assert.equal(r.team[0].protectChain, 0);
  G.attack(r, 0);
  assert.equal(r.team[0].protectChain, 1);
  const x = fixture();
  x.team[0].ability = ability("last-drop");
  x.team[0].moves = [
    { ...move("purify-water"), currentPp: 1 },
    { ...move("quick-normal"), currentPp: 1 },
  ];
  G.attack(x, 0);
  assert.equal(x.team[0].moves[1].currentPp, 1);
  assert.equal(x.team[0].ppRestored, false);
});
test("rooms count their casting turn and Persistent adds exactly2", () => {
  for (const id of ["unawakened", "persistent"]) {
    const r = fixture();
    if (id === "persistent") {
      r.team[0].ability = ability(id);
    }
    r.team[0].moves = [move("original-trick-room"), move("purify-water")];
    G.attack(r, 0);
    assert.equal(r.rooms["room-trick"], id === "persistent" ? 6 : 4);
    const turns = id === "persistent" ? 6 : 4;
    for (let i = 0; i < turns; i++) {
      G.attack(r, 1);
    }
    assert.equal(r.rooms["room-trick"], undefined);
  }
});
test("delayed attacks schedule2/5 or resolve immediately, and perform accuracy checks", () => {
  for (const id of ["periodic-orbit", "early-comet"]) {
    const r = fixture();
    r.team[0].ability = ability(id);
    r.team[0].moves = [{ ...move("original-future-sight"), accuracy: 0 }, move("purify-water")];
    G.attack(r, 0);
    assert.deepEqual(
      r.scheduled.map(e => e.turn),
      id === "periodic-orbit" ? [3, 6] : [],
    );
    if (id === "periodic-orbit") {
      G.attack(r, 1);
      G.attack(r, 1);
      assert.ok(r.log.some(l => l === "지연 공격이 빗나갔습니다."));
      assert.equal(r.enemy!.hp, r.enemy!.maxHp);
    } else {
      assert.equal(r.enemy!.hp, r.enemy!.maxHp);
    }
  }
});
test("switching consumes an enemy action, faint replacement and between-wave lead do not", () => {
  const r = fixture();
  const before = r.team[1].hp;
  G.switchMember(r, 1);
  assert.equal(r.turn, 1);
  assert.ok(r.team[1].hp < before);
  r.team[1].hp = 0;
  r.pendingSwitch = true;
  G.switchMember(r, 2);
  assert.equal(r.turn, 1);
  r.phase = "between";
  G.switchMember(r, 0);
  assert.equal(r.turn, 1);
});
test("exhausted PP exposes Struggle rather than an unwinnable menu", () => {
  const r = run();
  r.team[0].moves.forEach(m => (m.currentPp = 0));
  assert.equal(G.availableMoves(r.team[0])[0].id, "struggle");
  assert.doesNotThrow(() => G.attack(r, 0));
});
test("valid saves reproduce states, corrupt combat shapes fail before play", () => {
  const r = run();
  G.attack(r, 0);
  assert.deepEqual(G.restoreRun(JSON.stringify(r)), r);
  for (const mutate of [
    (s: any) => (s.team[0].ability = null),
    (s: any) => (s.enemy = null),
    (s: any) => (s.team[0].hp = Number.NaN),
    (s: any) => (s.team[0].moves[0].currentPp = -1),
    (s: any) => (s.rooms = { "room-trick": 999 }),
  ]) {
    const x = copy(r);
    mutate(x);
    assert.throws(() => G.restoreRun(JSON.stringify(x)));
  }
  assert.throws(() => G.restoreRun("{broken"));
  assert.throws(() => G.restoreRun(JSON.stringify({ ...r, version: "old" })));
});
test("enhancement companions cannot be dropped by an invalid move replacement", () => {
  const r = run();
  const m = r.team[0];
  m.ability = ability("periodic-orbit");
  m.moves = [move("quick-fire"), move("sure-fire"), move("original-future-sight"), move("original-doom-desire")];
  const candidate = move("corrode");
  assert.equal(G.canReplaceMove(m, candidate, 2), false);
  assert.equal(G.canReplaceMove(m, candidate, 0), true);
});

test("every offered enhancement has two compatible unique moves, and later rewards remain selectable", () => {
  for (let seed = 0; seed < 150; seed++) {
    const r = G.createRun({ mapSeed: "links:" + seed, pokemonSeed: "links:" + seed, type: G.TYPES[seed % 18].id });
    assert.equal(new Set(r.team.map(m => m.name)).size, 3);
    for (const m of r.team) {
      const d = G.makeDraft(r, m, 26);
      for (const o of d.options) {
        if (!o.linkedMoves?.length) {
          continue;
        }
        const c = { types: m.types, stats: m.base, classification: Maker.classify(m.base) };
        assert.ok(o.linkedMoves.filter(v => Catalog.enhancedBy(o.ability, v, c)).length >= 2, o.id);
        const x = copy(r);
        x.phase = "draft";
        x.draft = copy(d);
        G.chooseOption(x, o.id);
        const mon = x.team.find(v => v.id === m.id)!;
        assert.equal(new Set(mon.moves.map(v => v.id)).size, mon.moves.length);
        mon.types.push(G.TYPES.find(t => t.id !== mon.types[0])!.id);
        const next = G.makeDraft(x, mon, 46);
        assert.ok(next.options.some(v => v.move.type === mon.types[1] && v.move.category !== "변화"));
        assert.ok(next.options.every(v => mon.moves.some((_, i) => G.canReplaceMove(mon, v.move, i))));
      }
    }
  }
});

test("opponents use real species types and base stats through all 60 waves", () => {
  assert.equal(SPECIES.length, 151);
  for (const species of SPECIES) {
    assert.ok(species.types.length > 0 && species.types.length <= 2);
    assert.equal(new Set(species.types).size, species.types.length);
    assert.ok(species.types.every(t => G.TYPES.some(v => v.id === t)));
  }
  const r = run();
  for (let wave = 1; wave <= 60; wave++) {
    for (const m of [r.enemy!, ...r.enemyQueue]) {
      const species = SPECIES.find(s => s.id === m.speciesId)!;
      assert.ok(species);
      assert.equal(m.name, species.name);
      assert.deepEqual(m.types, species.types);
      assert.deepEqual(m.base, species.base);
      assert.equal(m.image, "/pokemon/" + species.id + ".png");
      assert.ok(species.minLevel <= m.level);
      assert.equal(m.maxHp, Math.floor(((2 * m.base.hp + m.ivs.hp) * m.level) / 100) + m.level + 10);
    }
    assert.ok(r.team.every(m => m.image === null && !m.speciesId));
    assert.deepEqual(G.restoreRun(JSON.stringify(r)), r);
    if (wave < 60) {
      r.phase = "between";
      r.cleared = r.wave;
      G.advance(r);
      resolveGrowth(r);
    }
  }
});
test("legacy saves migrate only opponent species and preserve HP ratio and the custom team", () => {
  const r = run();
  const before = copy(r.team);
  r.version = "0.1.0";
  r.enemy!.speciesId = undefined;
  r.enemy!.image = null;
  r.enemy!.hp = Math.floor(r.enemy!.maxHp / 2);
  const ratio = r.enemy!.hp / r.enemy!.maxHp;
  const restored = G.restoreRun(JSON.stringify(r));
  assert.equal(restored.version, G.VERSION);
  assert.ok(restored.enemy!.speciesId);
  assert.deepEqual(restored.team, before);
  assert.ok(Math.abs(restored.enemy!.hp / restored.enemy!.maxHp - ratio) <= 1 / restored.enemy!.maxHp);
});
