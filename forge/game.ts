// SPDX-License-Identifier: AGPL-3.0-only
// Text battle mode in the PokéRogue fork. Shared upstream type chart, maker v1.10 rules.
import { getTypeChartMultiplier } from "../src/data/type-chart.ts";
import { PokemonType } from "../src/enums/pokemon-type.ts";
import Catalog from "./vendor/catalog.js";
import Maker from "./vendor/engine.js";
import Fan from "./vendor/fan-content.js";

export const VERSION = "0.1.0";
export const STAT_LABELS = { hp: "HP", atk: "공격", def: "방어", spa: "특공", spd: "특방", spe: "스피드" };
export type Stat = keyof typeof STAT_LABELS;
export type Stats = Record<Stat, number>;
export interface Move {
  id: string;
  name: string;
  type: string;
  category: string;
  power: number | string;
  accuracy: number | null;
  pp: number;
  currentPp: number;
  priority: number;
  effect: string;
  [key: string]: any;
}
export interface Ability {
  id: string;
  name: string;
  description: string;
  [key: string]: any;
}
export interface Mon {
  id: string;
  seed: string;
  name: string;
  types: string[];
  level: number;
  stage: number;
  base: Stats;
  ivs: Stats;
  hp: number;
  maxHp: number;
  moves: Move[];
  ability: Ability;
  stages: Stats;
  [key: string]: any;
}
export interface Option {
  id: string;
  name: string;
  description: string;
  detail?: string;
  changes?: string[];
  [key: string]: any;
}
export interface Draft {
  id: string;
  memberId: string;
  level: number;
  kind: "move" | "ability" | "type" | "ivs";
  rarity: "silver" | "gold" | "prismatic";
  title: string;
  description: string;
  options: Option[];
}
export interface Run {
  version: string;
  mapSeed: string;
  pokemonSeed: string;
  wave: number;
  cleared: number;
  turn: number;
  phase: "battle" | "between" | "draft" | "won" | "lost";
  team: Mon[];
  active: number;
  enemy: Mon | null;
  enemyQueue: Mon[];
  log: string[];
  draft: Draft | null;
  draftQueue: Draft[];
  events: any[];
  rooms: Record<string, number>;
  scheduled: any[];
  [key: string]: any;
}
const L = Catalog.getLibrary();
export const TYPES = L.types.map(t => ({ id: t.id, name: t.name, color: t.color }));
const IDS = TYPES.map(t => t.id);
const STATS = Object.keys(STAT_LABELS) as Stat[];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const zero = (): Stats => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
const rng = (seed: string) => {
  const source = Maker.createRng(seed);
  return { ...source, real: (min = 0, max = 1) => min + (source.real() / 10) * (max - min) };
};
const neutral: Ability = { id: "unawakened", name: "아직 잠든 힘", description: "Lv.26에 특성을 선택합니다." };
const stages = (n: number) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const typeEnum = (id: string) => PokemonType[id.toUpperCase() as keyof typeof PokemonType] as PokemonType;
const moveById = (id: string): Move => {
  const m = L.moves.find(m => m.id === id);
  if (!m) {
    throw new Error("기술 데이터가 없습니다: " + id);
  }
  return { ...clone(m), currentPp: m.pp };
};
const typeName = (id: string) => TYPES.find(t => t.id === id)?.name || id;
const clampStage = (value: number) => Math.max(-6, Math.min(6, value));
export const QUIZ = [
  {
    question: "지도에 없는 갈림길을 발견했다. 가장 먼저 하는 일은?",
    answers: [
      { text: "먼저 가 보고 돌아온다.", scores: { fire: 2, flying: 2, fighting: 1 } },
      { text: "바닥과 주변의 흔적을 살핀다.", scores: { ground: 2, rock: 2, bug: 1 } },
      { text: "친구들과 이야기를 나눈다.", scores: { fairy: 2, normal: 2, water: 1 } },
    ],
  },
  {
    question: "갑자기 쏟아지는 비. 어디에서 잠시 쉴까?",
    answers: [
      { text: "나무와 풀 냄새가 나는 숲.", scores: { grass: 2, bug: 2, poison: 1 } },
      { text: "빗소리가 울리는 조용한 동굴.", scores: { ghost: 2, dark: 2, ice: 1 } },
      { text: "멀리까지 내다보이는 높은 곳.", scores: { flying: 2, electric: 2, dragon: 1 } },
    ],
  },
  {
    question: "친구가 어려운 부탁을 해 왔다.",
    answers: [
      { text: "일단 같이 해 보자고 한다.", scores: { normal: 2, fighting: 2, fire: 1 } },
      { text: "다른 해결책을 먼저 떠올린다.", scores: { psychic: 2, electric: 2, poison: 1 } },
      { text: "차분하게 준비부터 돕는다.", scores: { steel: 2, water: 2, grass: 1 } },
    ],
  },
  {
    question: "모험에서 가장 갖고 싶은 것은?",
    answers: [
      { text: "아직 아무도 모르는 비밀.", scores: { ghost: 2, psychic: 2, dark: 1 } },
      { text: "어떤 길에서도 버틸 단단함.", scores: { steel: 2, rock: 2, ground: 1 } },
      { text: "먼 곳까지 갈 수 있는 힘.", scores: { dragon: 2, flying: 1, ice: 2 } },
    ],
  },
  {
    question: "새로운 동료에게 어떤 말을 해 주고 싶을까?",
    answers: [
      { text: "실수해도 괜찮아. 같이 가자.", scores: { fairy: 2, water: 1, normal: 2 } },
      { text: "우리만의 방법을 찾아보자.", scores: { dragon: 2, psychic: 1, poison: 2 } },
      { text: "천천히 가도 끝까지 가자.", scores: { ice: 2, grass: 1, steel: 2 } },
    ],
  },
];
export function quizType(answers: number[], seed: string): string {
  if (answers.length !== QUIZ.length || answers.some((a, i) => !Number.isInteger(a) || !QUIZ[i].answers[a])) {
    throw new Error("질문에 모두 답해 주세요.");
  }
  const score = Object.fromEntries(IDS.map(id => [id, 0]));
  answers.forEach((a, i) => Object.entries(QUIZ[i].answers[a].scores).forEach(([t, n]) => (score[t] += n)));
  const max = Math.max(...Object.values(score));
  return rng(seed + ":quiz").pick(IDS.filter(id => score[id] === max));
}
export function matchKind(wave: number): "normal" | "rival" | "evil" | "boss" {
  return wave === 60 ? "boss" : wave === 40 ? "evil" : [5, 25, 55].includes(wave) ? "rival" : "normal";
}
export function battleStats(mon: Mon): Stats {
  const factor = mon.stage === 1 ? 0.6 : mon.stage === 2 ? 0.8 : 1;
  return Object.fromEntries(
    STATS.map(key => {
      const base = Math.floor(mon.base[key] * factor);
      const core = Math.floor(((2 * base + mon.ivs[key]) * mon.level) / 100);
      return [key, key === "hp" ? core + mon.level + 10 : core + 5];
    }),
  ) as Stats;
}
export function intel(mon: Mon): string[] {
  const a = mon.base.atk;
  const c = mon.base.spa;
  const info = [
    mon.level < 16
      ? "아직 성장의 윤곽을 알아가는 중입니다."
      : Math.abs(a - c) < 15
        ? "몸과 마음, 두 공격의 균형이 비슷합니다."
        : a > c
          ? "몸으로 부딪칠 때 더 큰 힘이 느껴집니다."
          : "집중해서 힘을 보낼 때 더 큰 힘이 느껴집니다.",
  ];
  if (mon.level >= 26) {
    info.push(
      mon.base.def > mon.base.spd + 15
        ? "물리 공격을 받아내는 쪽에 더 익숙합니다."
        : mon.base.spd > mon.base.def + 15
          ? "특수 공격을 받아내는 쪽에 더 익숙합니다."
          : "두 종류의 공격을 고르게 받아냅니다.",
    );
  }
  if (mon.level >= 36) {
    info.push(
      mon.base.spe >= 105
        ? "발걸음이 매우 빠릅니다."
        : mon.base.spe <= 55
          ? "행동은 느리지만 자기 페이스가 확실합니다."
          : "속도는 중간 정도입니다.",
    );
  }
  if (mon.level >= 56) {
    info.push("개체값 조정을 마쳤습니다. 종족값은 모험 종료 후 공개됩니다.");
  }
  return info;
}
function resetEntry(mon: Mon) {
  mon.stages = zero();
  mon.entryTurns = 0;
  mon.padUsed = false;
  mon.lastDamageType = "";
  mon.lastCategory = "";
  mon.lastMove = "";
  mon.repeatUses = 0;
  mon.substitute = 0;
  mon.protectChain = 0;
  mon.selfSwitchUntil = 0;
  mon.healLockUntil = 0;
  mon.ppRestored = false;
}
const names = ["도란", "여울", "아롱", "누리", "이솔", "가람", "마루", "소담", "하늬", "나래", "모루", "새봄"];
function creature(seed: string, type: string, level: number, id: string): Mon {
  const r = rng(seed + ":identity");
  const base = Maker.generateStats(seed).stats as Stats;
  const main = base.atk > base.spa ? "crush" : "erode";
  const mon = {
    id,
    seed,
    name: names[r.int(0, names.length - 1)],
    types: [type],
    level,
    stage: level >= 36 ? 3 : level >= 16 ? 2 : 1,
    base,
    ivs: Object.fromEntries(STATS.map(k => [k, r.int(8, 20)])) as Stats,
    hp: 0,
    maxHp: 0,
    moves: [
      moveById(main + "-" + type),
      moveById((main === "crush" ? "quick" : "sure") + "-" + type),
      moveById("purify-water"),
    ],
    ability: clone(neutral),
    stages: zero(),
    image: null,
  } as Mon;
  resetEntry(mon);
  mon.maxHp = battleStats(mon).hp;
  mon.hp = mon.maxHp;
  return mon;
}
const TEMPLATES = new Set([
  "strike",
  "beam",
  "sure",
  "quick",
  "recoil",
  "recoil-light",
  "nova",
  "drain",
  "siphon",
  "erode",
  "crush",
  "critical",
  "mixed-twin",
  "dual-twin",
  "body",
  "spirit",
  "gyro",
  "revenge",
  "vital",
  "finish",
  "heal",
  "purify",
  "cocoon-rest",
  "guard",
  "flurry",
  "volley",
  "rankup",
]);
const FIXED = new Set([
  "corrode",
  "surge-drumming",
  "vine-stitching",
  "tiny-stampede",
  "scale-volley",
  "slime-shower",
  "feather-wave",
  "spark-opener",
  "sprout-dash",
  "shade-overtake",
  "frost-spur",
  "jump-the-line",
  "underfoot-strike",
  "ash-breakthrough",
  "surge-collapse",
  "scale-plunge",
  "all-in-thrust",
  "ridge-collapse",
  "wish-overload",
  "decisive-fist",
  "frost-petal-breath",
  "shadow-awl",
  "gold-dust-awl",
  "mind-awl",
  "silver-flash",
]);
const ABILITIES = new Set([
  "muscle-focus",
  "mind-focus",
  "first-step",
  "late-force",
  "impact-pad",
  "thought-pad",
  "twin-shell",
  "elastic-core",
  "thorns",
  "echo-ward",
  "recoil-balance",
  "drain-cycle",
  "weak-point",
  "small-engine",
  "recovery-pulse",
  "last-shield",
  "balanced-gears",
  "syncopation",
  "memory-scales",
  "overflow-bank",
  "patient-growth",
  "last-drop",
  "persistent",
  "pendulum",
  "periodic-orbit",
  "early-comet",
  "two-rhythms",
]);
function validMove(mon: Mon, m: Move): boolean {
  if (!TEMPLATES.has(m.templateId) && !FIXED.has(m.id)) {
    return false;
  }
  if (m.templateId === "body" && !(mon.base.def >= 100 && mon.base.def >= mon.base.atk)) {
    return false;
  }
  if (m.templateId === "spirit" && !(mon.base.spd >= 100 && mon.base.spd >= mon.base.spa)) {
    return false;
  }
  if (
    m.alwaysCrit
    && (Number(m.power) > 70
      || mon.base[m.category === "물리" ? "atk" : "spa"] > 110
      || m.hits
      || m.hitCount
      || m.hitRange)
  ) {
    return false;
  }
  if (m.secondaryType && !(mon.types.includes(m.type) && mon.types.includes(m.secondaryType))) {
    return false;
  }
  return true;
}
export function canReplaceMove(mon: Mon, move: Move, slot: number): boolean {
  if (!Number.isInteger(slot) || slot < 0 || slot >= mon.moves.length) {
    return false;
  }
  if (companions(mon, mon.ability).length === 0) {
    return true;
  }
  const context = { types: mon.types, stats: mon.base, classification: Maker.classify(mon.base) };
  return (
    mon.moves.map((m, i) => (i === slot ? move : m)).filter(m => Catalog.enhancedBy(mon.ability, m, context)).length
    >= 2
  );
}
function pool(mon: Mon, allowForeign = false): Move[] {
  return L.moves.filter(
    m =>
      validMove(mon, m)
      && (allowForeign || mon.types.includes(m.type) || m.category === "변화")
      && !mon.moves.some(x => x.id === m.id),
  );
}
function grade(run: Run, level: number): Draft["rarity"] {
  const n = rng(run.mapSeed + ":reward:" + level).int(1, 100);
  return n <= (level < 36 ? 65 : 45) ? "silver" : n <= 90 ? "gold" : "prismatic";
}
const specialAbility = new Set([
  "syncopation",
  "overflow-bank",
  "periodic-orbit",
  "early-comet",
  "persistent",
  "memory-scales",
]);
function abilityGrade(a: Ability): Draft["rarity"] {
  return specialAbility.has(a.id)
    ? "prismatic"
    : ["pendulum", "weak-point", "balanced-gears", "last-drop"].includes(a.id) || a.tags?.includes("skin")
      ? "gold"
      : "silver";
}
function moveGrade(m: Move): Draft["rarity"] {
  return ["mixed-twin", "dual-twin", "rankup"].includes(m.templateId) || m.arsenalFamily === "heavy"
    ? "prismatic"
    : m.arsenalFamily || ["body", "spirit", "gyro", "revenge"].includes(m.templateId) || m.id === "corrode"
      ? "gold"
      : "silver";
}
function ordered<T extends { id: string }>(values: T[], seed: string): T[] {
  return values
    .map(value => ({ value, key: rng(seed + ":" + value.id).real(0, 1) }))
    .sort((a, b) => a.key - b.key || a.value.id.localeCompare(b.value.id))
    .map(x => x.value);
}
function abilityEligible(mon: Mon, a: Ability): boolean {
  const physical = mon.base.atk >= mon.base.spa;
  const mixed = Math.min(mon.base.atk, mon.base.spa) >= 80 && Math.abs(mon.base.atk - mon.base.spa) <= 25;
  if (a.id === "two-rhythms") {
    return mixed && mon.types.length === 2;
  }
  if (["periodic-orbit", "early-comet"].includes(a.id)) {
    return mon.base.spa >= 80 && (!physical || mixed);
  }
  if (a.id === "syncopation") {
    return mixed;
  }
  if (a.id === "muscle-focus") {
    return physical || mixed;
  }
  if (a.id === "mind-focus") {
    return !physical || mixed;
  }
  if (a.id === "first-step") {
    return mon.base.spe >= 80;
  }
  if (["late-force", "patient-growth"].includes(a.id)) {
    return mon.base.spe <= 85;
  }
  return true;
}
function companions(mon: Mon, a: Ability): Move[] {
  const main = mon.base.atk > mon.base.spa ? "physical" : "special";
  const by = (prefix: string, type = mon.types[0]) => moveById(prefix + "-" + type);
  if (a.id === "persistent") {
    return [moveById("original-trick-room"), moveById("original-wonder-room")];
  }
  if (["periodic-orbit", "early-comet"].includes(a.id)) {
    return [moveById("original-future-sight"), moveById("original-doom-desire")];
  }
  if (a.tags?.includes("skin")) {
    const mixed = Math.min(mon.base.atk, mon.base.spa) >= 80 && Math.abs(mon.base.atk - mon.base.spa) <= 25;
    return [
      by(mixed ? "mixed-twin" : main === "physical" ? "crush" : "siphon", "normal"),
      by(main === "physical" ? "finish" : "erode", "normal"),
    ];
  }
  if (a.id === "muscle-focus") {
    return [by("crush"), by("finish")];
  }
  if (a.id === "mind-focus") {
    return [by("erode"), by("siphon")];
  }
  if (a.id === "balanced-gears") {
    return mon.base.atk <= mon.base.spa ? [by("crush"), by("finish")] : [by("erode"), by("siphon")];
  }
  if (a.id === "syncopation") {
    return [by("crush"), by("erode")];
  }
  if (a.id === "weak-point") {
    return [by("crush"), by("erode")];
  }
  if (a.id === "overflow-bank" || a.id === "recovery-pulse") {
    return [by("cocoon-rest", "bug"), by("purify", "water")];
  }
  if (a.id === "recoil-balance") {
    return [by("recoil"), by("recoil-light")];
  }
  if (a.id === "drain-cycle") {
    return [by("drain"), by("siphon")];
  }
  if (a.id === "small-engine") {
    return [by("quick"), by("sure")];
  }
  if (a.id === "last-drop") {
    return [by(main === "physical" ? "crush" : "erode"), by(main === "physical" ? "finish" : "sure")];
  }
  if (
    ["muscle-focus", "mind-focus", "first-step", "late-force", "balanced-gears", "pendulum", "patient-growth"].includes(
      a.id,
    )
  ) {
    return [by(main === "physical" ? "crush" : "erode"), by(main === "physical" ? "finish" : "siphon")];
  }
  return [];
}
export function makeDraft(run: Run, mon: Mon, level: number): Draft {
  const rarity = grade(run, level);
  const seed = mon.seed + ":reward:" + level + ":" + rarity;
  const draft = {
    id: mon.id + ":" + level,
    memberId: mon.id,
    level,
    rarity,
    kind: level === 26 ? "ability" : level === 36 ? "type" : level === 56 ? "ivs" : "move",
    title: "",
    description: "선택한 보상은 이 포켓몬에게 적용됩니다.",
    options: [],
  } as Draft;
  if (draft.kind === "move") {
    draft.title = level === 16 ? "첫 진화, 새로운 기술" : "새로운 기술을 선택하세요";
    const values = pool(mon);
    const exact = values.filter(m => moveGrade(m) === rarity);
    const ranked = ordered([...exact], seed);
    for (const m of ordered(values, seed + ":fallback")) {
      if (!ranked.some(x => x.id === m.id)) {
        ranked.push(m);
      }
    }
    if (
      level === 46
      && mon.types[1]
      && !ranked.slice(0, 3).some(m => m.type === mon.types[1] && m.category !== "변화")
    ) {
      const secondary = ranked.find(m => m.type === mon.types[1] && m.category !== "변화");
      if (secondary) {
        ranked.splice(ranked.indexOf(secondary), 1);
        ranked.splice(2, 0, secondary);
      }
    }
    draft.options = ranked.slice(0, 3).map(m => ({
      id: m.id,
      name: m.name,
      description: m.effect,
      detail:
        typeName(m.type)
        + " · "
        + m.category
        + " · 위력 "
        + m.power
        + " · 명중 "
        + (m.accuracy ?? "필중")
        + " · PP "
        + m.pp,
      type: m.type,
      category: m.category,
      power: m.power,
      move: clone(m),
      actualRarity: moveGrade(m),
    }));
  } else if (draft.kind === "ability") {
    draft.title = "잠재된 특성을 깨우세요";
    const all: Ability[] = L.abilities.filter(
      a => (ABILITIES.has(a.id) || a.tags?.includes("skin")) && abilityEligible(mon, a),
    );
    const ranked = ordered(
      all.filter(a => abilityGrade(a) === rarity),
      seed,
    );
    for (const a of ordered(all, seed + ":fallback")) {
      if (!ranked.some(x => x.id === a.id)) {
        ranked.push(a);
      }
    }
    draft.options = ranked.slice(0, 3).map(a => {
      const linked = companions(mon, a);
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        detail: a.rules?.[0] || "활성 특성 1개",
        ability: clone(a),
        linkedMoves: linked,
        actualRarity: abilityGrade(a),
        changes:
          linked.length > 0
            ? [
                "연계 기술 2개를 배우고, 기존 기술 중 최대 2개를 유지합니다.",
                ...linked.map(m => m.name + " · " + m.effect),
              ]
            : ["기술 구성은 유지됩니다."],
      };
    });
  } else if (draft.kind === "type") {
    draft.title = "최종 진화, 두 번째 타입";
    draft.description = "종족값은 유지됩니다. 각 카드 안에서 타입을 골라 확정하세요.";
    const all = ordered(
      IDS.filter(t => t !== mon.types[0]).map(id => ({ id })),
      seed,
    ).map(x => x.id);
    const groups = [all.slice(0, 6), all.slice(6, 12), all.slice(12)];
    draft.options = groups.map((choices, i) => ({
      id: "type-" + i,
      name: ["새로운 가능성", "다른 빛깔", "마지막 퍼즐"][i],
      description: choices.map(typeName).join(" · "),
      detail: "두 번째 타입의 자속과 상성이 적용됩니다. 기술은 유지하며, Lv.46에 새 타입 기술도 선택할 수 있습니다.",
      choices,
    }));
  } else {
    draft.title = "잠재력을 다듬는 시간";
    draft.description = "종족값은 바뀌지 않습니다. 개체값(IV, 최대 31)만 조정합니다.";
    const dominant = mon.base.atk >= mon.base.spa ? "atk" : "spa";
    draft.options = [
      {
        id: "ivs-all",
        name: "고른 성장",
        description: "여섯 능력치의 개체값을 각각 5 올립니다. 최대 31.",
        detail: STATS.map(k => STAT_LABELS[k] + " " + mon.ivs[k] + " → " + Math.min(31, mon.ivs[k] + 5)).join(" / "),
      },
      {
        id: "ivs-offense",
        name: "주력의 완성",
        description: STAT_LABELS[dominant] + " 개체값 하나를 V(31)로 조정합니다.",
        stat: dominant,
        detail: STAT_LABELS[dominant] + " " + mon.ivs[dominant] + " → 31",
      },
      {
        id: "ivs-focus",
        name: "한 가지에 집중",
        description: "원하는 능력치 하나의 개체값을 V(31)로 조정합니다.",
        detail: STATS.map(k => STAT_LABELS[k] + " " + mon.ivs[k]).join(" / "),
      },
    ];
  }
  if (draft.options.length !== 3) {
    throw new Error("성장 선택지 3개를 만들 수 없습니다.");
  }
  return draft;
}
function say(run: Run, text: string) {
  run.log.push(text);
  if (run.log.length > 120) {
    run.log.shift();
  }
}
function grow(mon: Mon, level: number) {
  const old = mon.maxHp;
  mon.level = level;
  mon.stage = level >= 36 ? 3 : level >= 16 ? 2 : 1;
  mon.maxHp = battleStats(mon).hp;
  if (mon.hp > 0) {
    mon.hp = Math.min(mon.maxHp, mon.hp + mon.maxHp - old);
  }
}
function queueGrowth(run: Run, level: number) {
  if (![16, 26, 36, 46, 56].includes(level)) {
    return;
  }
  for (const mon of run.team) {
    const id = mon.id + ":" + level;
    if (!run.events.some(e => e.id === id)) {
      run.draftQueue.push(makeDraft(run, mon, level));
    }
  }
  nextDraft(run);
}
function nextDraft(run: Run) {
  run.draft = run.draftQueue.shift() || null;
  run.phase = run.draft ? "draft" : "battle";
}
export function chooseOption(run: Run, optionId: string, args: { slot?: number; stat?: string } = {}) {
  if (run.phase !== "draft" || !run.draft) {
    throw new Error("지금은 성장 선택을 할 수 없습니다.");
  }
  const d = run.draft;
  const o = d.options.find(x => x.id === optionId);
  const mon = run.team.find(m => m.id === d.memberId);
  if (!o || !mon) {
    throw new Error("선택지를 확인해 주세요.");
  }
  if (d.kind === "move") {
    if (mon.moves.length === 4 && (!Number.isInteger(args.slot) || args.slot! < 0 || args.slot! > 3)) {
      throw new Error("교체할 기술 칸을 선택하세요.");
    }
    if (mon.moves.length === 4 && !canReplaceMove(mon, o.move, args.slot!)) {
      throw new Error("특성으로 강화받는 기술을 최소 2개 유지해야 합니다. 다른 칸을 선택하세요.");
    }
    const move = { ...clone(o.move), currentPp: o.move.pp };
    if (mon.moves.length < 4) {
      mon.moves.push(move);
    } else {
      mon.moves[args.slot!] = move;
    }
  } else if (d.kind === "ability") {
    mon.ability = clone(o.ability);
    const links = o.linkedMoves || [];
    if (links.length > 0) {
      const kept = mon.moves.filter(m => !links.some(l => l.id === m.id)).slice(0, 2);
      for (const m of pool(mon)) {
        if (kept.length < 2 && !links.some(l => l.id === m.id) && !kept.some(k => k.id === m.id)) {
          kept.push({ ...clone(m), currentPp: m.pp });
        }
      }
      mon.moves = kept.concat(links.map(m => ({ ...clone(m), currentPp: m.pp })));
    }
    resetEntry(mon);
  } else if (d.kind === "type") {
    const type = args.stat || o.choices[0];
    if (!o.choices.includes(type) || mon.types.includes(type)) {
      throw new Error("추가 타입을 선택해 주세요.");
    }
    mon.types.push(type);
  } else {
    if (o.id === "ivs-all") {
      for (const k of STATS) {
        mon.ivs[k] = Math.min(31, mon.ivs[k] + 5);
      }
    } else {
      const stat = o.stat || args.stat || "spe";
      if (!STATS.includes(stat)) {
        throw new Error("개체값을 조정할 능력치를 선택하세요.");
      }
      mon.ivs[stat] = 31;
    }
    const old = mon.maxHp;
    mon.maxHp = battleStats(mon).hp;
    if (mon.hp > 0) {
      mon.hp += mon.maxHp - old;
    }
  }
  run.events.push({
    id: d.id,
    kind: d.kind,
    level: d.level,
    option: optionId,
    stat: args.stat || o.stat || null,
    rarity: d.rarity,
  });
  say(run, mon.name + "의 성장: " + o.name + ".");
  nextDraft(run);
}
function spawnEnemy(run: Run) {
  const kind = matchKind(run.wave);
  const r = rng(run.mapSeed + ":enemy:" + run.wave);
  const count = kind === "normal" ? 1 : kind === "boss" ? 3 : 2;
  const opponents: Mon[] = [];
  for (let i = 0; i < count; i++) {
    const type = r.pick(IDS);
    const mon = creature(run.mapSeed + ":enemy:" + run.wave + ":" + i, type, Math.max(5, run.wave), "enemy-" + i);
    mon.name =
      (kind === "rival" ? "라이벌의 " : kind === "evil" ? "악의 조직 " : kind === "boss" ? "심연의 " : "야생의 ")
      + typeName(type)
      + " 정령";
    mon.ivs = Object.fromEntries(STATS.map(k => [k, kind === "normal" ? 8 : kind === "boss" ? 24 : 16])) as Stats;
    const factor = kind === "normal" ? 0.78 : kind === "boss" ? 1.1 : kind === "rival" ? 0.9 : 1;
    mon.base = Object.fromEntries(STATS.map(k => [k, Math.round(mon.base[k] * factor)])) as Stats;
    mon.maxHp = battleStats(mon).hp;
    mon.hp = mon.maxHp;
    if (run.wave >= 26) {
      mon.ability = clone(
        L.abilities.find(a => a.id === (mon.base.atk >= mon.base.spa ? "muscle-focus" : "mind-focus")),
      );
    }
    const main = mon.base.atk >= mon.base.spa ? "physical" : "special";
    mon.moves = [
      moveById(
        (run.wave < 16 ? (main === "physical" ? "quick" : "sure") : main === "physical" ? "crush" : "erode")
          + "-"
          + type,
      ),
      moveById((main === "physical" ? "quick" : "sure") + "-" + r.pick(IDS)),
    ];
    if (run.wave >= 36) {
      const second = r.pick(IDS.filter(t => t !== type));
      mon.types.push(second);
      mon.moves.push(moveById((main === "physical" ? "drain" : "siphon") + "-" + second));
    }
    opponents.push(mon);
  }
  run.phase = "battle";
  run.enemy = opponents.shift()!;
  run.enemyQueue = opponents;
  run.turn = 0;
  run.rooms = {};
  run.scheduled = [];
  run.pendingSwitch = false;
  run.team.forEach(resetEntry);
  say(
    run,
    run.wave
      + "웨이브 · "
      + (kind === "normal"
        ? "야생 조우"
        : kind === "rival"
          ? "라이벌전"
          : kind === "evil"
            ? "악의 보스전"
            : "최종 보스전")
      + " 시작.",
  );
}
export function createRun(options: { mapSeed: string; pokemonSeed: string; type: string }): Run {
  const mapSeed = options.mapSeed.trim();
  const pokemonSeed = options.pokemonSeed.trim();
  if (!mapSeed || !pokemonSeed || mapSeed.length > 100 || pokemonSeed.length > 100 || !IDS.includes(options.type)) {
    throw new Error("시드와 타입을 확인해 주세요.");
  }
  const r = rng(pokemonSeed + ":companions");
  const others = IDS.filter(t => t !== options.type);
  const second = r.pick(others);
  const third = r.pick(others.filter(t => t !== second));
  const team = [
    creature(pokemonSeed, options.type, 5, "member-0"),
    creature(pokemonSeed + ":companion-1", second, 5, "member-1"),
    creature(pokemonSeed + ":companion-2", third, 5, "member-2"),
  ];
  const usedNames = new Set<string>();
  for (const mon of team) {
    if (usedNames.has(mon.name)) {
      mon.name = names.find(name => !usedNames.has(name))!;
    }
    usedNames.add(mon.name);
  }
  const run = {
    version: VERSION,
    mapSeed,
    pokemonSeed,
    wave: 1,
    cleared: 0,
    turn: 0,
    phase: "battle",
    team,
    active: 0,
    enemy: null,
    enemyQueue: [],
    log: [],
    draft: null,
    draftQueue: [],
    events: [],
    rooms: {},
    scheduled: [],
    battleSerial: 0,
    pendingSwitch: false,
  } as Run;
  spawnEnemy(run);
  return run;
}
export function advance(run: Run) {
  if (run.phase !== "between") {
    throw new Error("현재 전투를 먼저 마쳐 주세요.");
  }
  if (run.wave >= 60) {
    throw new Error("마지막 웨이브를 넘을 수 없습니다.");
  }
  run.wave++;
  const level = Math.max(5, run.wave);
  run.team.forEach(m => grow(m, level));
  spawnEnemy(run);
  queueGrowth(run, level);
}
const STRUGGLE: Move = {
  id: "struggle",
  name: "발버둥",
  type: "normal",
  category: "물리",
  power: 50,
  accuracy: null,
  pp: 1,
  currentPp: 1,
  priority: 0,
  effect: "PP가 모두 소진되었을 때 사용하는 무속성 공격. 최대 HP의 1/4 반동.",
  templateId: "struggle",
  tags: [],
};
export function availableMoves(mon: Mon): Move[] {
  return mon.moves.some(m => m.currentPp > 0) ? mon.moves : [STRUGGLE];
}

// Combat below deliberately handles only the active catalog subset; unsupported effects never enter a draft.
function effective(mon: Mon, stat: Stat, run: Run, critical = false): number {
  const raw = battleStats(mon);
  const swap = run.rooms["room-wonder"] > 0 ? (stat === "def" ? "spd" : stat === "spd" ? "def" : stat) : stat;
  let stage = mon.stages[stat] || 0;
  if (critical && ((["atk", "spa"].includes(stat) && stage < 0) || (["def", "spd"].includes(stat) && stage > 0))) {
    stage = 0;
  }
  return Math.max(1, Math.floor(raw[swap] * stages(stage)));
}
function heal(run: Run, mon: Mon, amount: number) {
  if (mon.hp <= 0) {
    return;
  }
  const value = Math.max(1, Math.floor(amount));
  const missing = mon.maxHp - mon.hp;
  const actual = Math.min(missing, value);
  mon.hp += actual;
  say(run, mon.name + " HP " + actual + " 회복.");
  if (
    mon.ability.id === "overflow-bank"
    && value - actual >= Math.max(1, Math.floor(mon.maxHp / 4))
    && !mon.substitute
  ) {
    mon.substitute = Math.max(1, Math.floor(mon.maxHp / 4));
    say(run, mon.name + "의 여분쿠션: 대타 생성.");
  }
}
function boost(run: Run, mon: Mon, changes: Record<string, number>) {
  for (const [key, value] of Object.entries(changes)) {
    if (!STATS.includes(key as Stat) || key === "hp") {
      continue;
    }
    const before = mon.stages[key] || 0;
    mon.stages[key] = clampStage(before + value);
    if (before !== mon.stages[key]) {
      say(run, mon.name + " " + STAT_LABELS[key] + (value > 0 ? " +" : " ") + value + "단계.");
    }
  }
}
export function typeEffectiveness(move: Move, type: string, target: Mon): number {
  if (move.id === "struggle") {
    return 1;
  }
  return target.types.reduce(
    (n, t) =>
      n * (move.mechanics?.typeEffectivenessOverrides?.[t] ?? getTypeChartMultiplier(typeEnum(type), typeEnum(t))),
    1,
  );
}
function attackMultiplier(
  run: Run,
  user: Mon,
  target: Mon,
  move: Move,
  hit: any,
  power: number,
  first: boolean,
): number {
  const a = user.ability;
  let result = 1;
  const category = hit.category;
  const stat = hit.attackStat;
  if ((a.id === "muscle-focus" && category === "물리") || (a.id === "mind-focus" && category === "특수")) {
    result *= 1.15;
  }
  if (a.id === "first-step" && first && run.samePriority) {
    result *= 1.2;
  }
  if (a.id === "late-force" && target.acted) {
    result *= 1.25;
  }
  if (a.id === "two-rhythms" && move.templateId === "mixed-twin") {
    result *= 1.15;
  }
  if (
    a.id === "syncopation"
    && ["물리", "특수"].includes(user.lastCategory)
    && ["물리", "특수"].includes(move.category)
    && user.lastCategory !== move.category
  ) {
    result *= 1.25;
  }
  if (a.id === "small-engine" && power <= 60) {
    result *= 1.2;
  }
  if (a.id === "weak-point" && (target.stages.def < 0 || target.stages.spd < 0)) {
    result *= 1.2;
  }
  if (
    a.id === "balanced-gears"
    && (stat === "atk" || stat === "spa")
    && user.base[stat] <= user.base[stat === "atk" ? "spa" : "atk"]
  ) {
    result *= 1.2;
  }
  if (a.id === "pendulum") {
    result *= Math.min(1.5, (10 + Math.max(0, user.repeatUses - 1)) / 10);
  }
  return result;
}
function hitList(run: Run, user: Mon, target: Mon, move: Move, r: any): any[] {
  if (move.hits) {
    return move.hits;
  }
  const category = move.category;
  const attackStat = move.attackStat || (category === "물리" ? "atk" : "spa");
  let power = Number(move.power);
  if (move.templateId === "gyro") {
    power = Math.min(150, Math.max(1, Math.floor((25 * effective(target, "spe", run)) / effective(user, "spe", run))));
  }
  if (move.templateId === "vital") {
    power = 60 + Math.floor((60 * user.hp) / user.maxHp);
  }
  if (move.templateId === "finish" && target.hp <= target.maxHp / 2) {
    power = 105;
  }
  if (move.templateId === "revenge" && user.hurt) {
    power = 120;
  }
  if (move.hitPowers) {
    return move.hitPowers.map(p => ({ type: move.type, category, attackStat, power: p }));
  }
  let count = move.hitCount || 1;
  if (move.hitRange) {
    const x = r.real(0, 1);
    let cumulative = 0;
    count = move.hitRange[1];
    for (const [n, chance] of Object.entries(move.hitProbabilities)) {
      cumulative += Number(chance);
      if (x < cumulative) {
        count = Number(n);
        break;
      }
    }
  }
  return Array.from({ length: count }, () => ({
    type: move.type,
    category,
    attackStat,
    power: move.powerPerHit || power,
  }));
}
function damage(
  run: Run,
  user: Mon,
  target: Mon,
  move: Move,
  r: any,
  first: boolean,
  multiplier = 1,
): { hp: number; hit: boolean } {
  let total = 0;
  let hitAny = false;
  let lastType = "";
  let physicalHp = false;
  const parts = hitList(run, user, target, move, r);
  const startHp = target.hp;
  const padActive =
    !target.padUsed
    && ((target.ability.id === "impact-pad" && move.category === "물리")
      || (target.ability.id === "thought-pad" && move.category === "특수")
      || (target.ability.id === "last-shield" && startHp <= target.maxHp / 3));
  for (const hit of parts) {
    if (target.hp <= 0 || user.hp <= 0) {
      break;
    }
    const critical = move.alwaysCrit || r.real(0, 1) < (move.templateId === "critical" ? 1 / 8 : 1 / 16);
    const type = user.ability.tags?.includes("skin") && hit.type === "normal" ? user.ability.type : hit.type;
    const effectiveness = typeEffectiveness(move, type, target);
    if (!effectiveness) {
      say(run, "효과가 없습니다.");
      continue;
    }
    hitAny = true;
    const offense = effective(user, hit.attackStat, run, critical);
    const defense = effective(target, hit.category === "물리" ? "def" : "spd", run, critical);
    let factor =
      (user.types.includes(type) ? 1.5 : 1)
      * effectiveness
      * (critical ? 1.5 : 1)
      * r.real(0.85, 1)
      * multiplier
      * attackMultiplier(run, user, target, move, hit, hit.power, first);
    if (type !== hit.type) {
      factor *= 1.2;
    }
    const ability = target.ability;
    if (ability.id === "twin-shell" && target.hp >= target.maxHp / 2) {
      factor *= 0.9;
    }
    if (ability.id === "memory-scales" && target.lastDamageType === type) {
      factor *= 0.75;
    }
    if (ability.id === "elastic-core" && target.hp === target.maxHp) {
      factor *= 0.6;
    }
    if (padActive && ["impact-pad", "thought-pad"].includes(ability.id)) {
      factor *= 0.7;
    }
    if (padActive && ability.id === "last-shield") {
      factor *= 0.5;
    }
    const value = Math.max(
      1,
      Math.floor(
        (Math.floor(Math.floor((((2 * user.level) / 5 + 2) * hit.power * offense) / defense) / 50) + 2) * factor,
      ),
    );
    if (target.substitute) {
      const taken = Math.min(target.substitute, value);
      target.substitute -= taken;
      say(run, "대타가 " + taken + " 피해를 받았습니다.");
    } else {
      const taken = Math.min(target.hp, value);
      target.hp -= taken;
      total += taken;
      target.hurt = true;
      physicalHp ||= hit.category === "물리";
      say(
        run,
        (critical ? "급소! " : "")
          + target.name
          + " −"
          + taken
          + " HP"
          + (effectiveness > 1 ? " · 효과 굉장" : effectiveness < 1 ? " · 효과 미약" : "")
          + ".",
      );
      lastType = type;
    }
  }
  if (total) {
    if (padActive) {
      target.padUsed = true;
    }
    target.lastDamageType = lastType;
    if (target.ability.id === "thorns" && physicalHp && user.hp > 0) {
      const n = Math.max(1, Math.floor(user.maxHp / 10));
      user.hp = Math.max(0, user.hp - n);
      say(run, "따끔따끔 · " + user.name + " −" + n + " HP.");
    }
    if (target.ability.id === "echo-ward" && parts.some(h => h.category === "특수") && target.hp > 0) {
      boost(run, target, { spd: 1 });
    }
    if (move.targetDebuffs && target.hp > 0) {
      boost(run, target, move.targetDebuffs);
    }
    if (move.templateId === "beam" && r.real(0, 1) < 0.1 && target.hp > 0) {
      boost(run, target, { spd: -1 });
    }
    if (move.mechanics?.lastHitTargetBoosts && target.hp > 0) {
      boost(run, target, move.mechanics.lastHitTargetBoosts);
    }
    if (move.tags?.includes("drain") && user.hp > 0) {
      heal(run, user, total * (move.mechanics?.drainFraction || 0.5) * (user.ability.id === "drain-cycle" ? 1.3 : 1));
    }
  }
  return { hp: total, hit: hitAny };
}
function penalties(run: Run, user: Mon, move: Move, result: { hp: number; hit: boolean }, failed = false) {
  if (move.templateId === "nova") {
    boost(run, user, { spa: -2 });
  }
  if (["recoil", "recoil-light"].includes(move.templateId) && result.hp) {
    const fraction = move.templateId === "recoil" ? 1 / 3 : 1 / 4;
    const n = Math.max(1, Math.floor(result.hp * fraction * (user.ability.id === "recoil-balance" ? 0.5 : 1)));
    user.hp = Math.max(0, user.hp - n);
    say(run, "반동 · " + user.name + " −" + n + " HP.");
  }
  for (const p of move.penalties || []) {
    if ((p.condition === "miss" && !failed) || (p.condition === "hit" && !result.hit)) {
      continue;
    }
    if (p.kind === "stat-stage") {
      boost(run, user, { [p.stat]: p.stages });
    }
    if (p.kind === "healing-lock") {
      user.healLockUntil = run.turn + 1;
    }
    if (p.kind === "self-switch-lock") {
      user.selfSwitchUntil = run.turn + 1;
    }
    if (p.kind === "recoil" && result.hp) {
      const n = Math.max(
        1,
        Math.floor(result.hp * p.damageFraction * (user.ability.id === "recoil-balance" ? 0.5 : 1)),
      );
      user.hp = Math.max(0, user.hp - n);
      say(run, "반동 −" + n + " HP.");
    }
    if (p.kind === "hp-cost" || (p.kind === "crash" && (!result.hit || failed))) {
      const n = Math.max(1, Math.floor(user.maxHp * (p.fraction || p.maxHpFraction)));
      user.hp = Math.max(0, user.hp - n);
      say(run, "페널티 · " + user.name + " −" + n + " HP.");
    }
  }
}
function perform(run: Run, user: Mon, target: Mon, move: Move, r: any, first: boolean, side: string) {
  if (user.hp <= 0 || target.hp <= 0) {
    return;
  }
  if (move.id !== "struggle") {
    if (move.currentPp <= 0) {
      return;
    }
    move.currentPp--;
  }
  if (move.templateId !== "guard") {
    user.protectChain = 0;
  }
  user.acted = true;
  user.repeatUses = user.lastMove === move.id ? (user.repeatUses || 1) + 1 : 1;
  say(run, user.name + " · " + move.name + "!");
  const remember = () => {
    user.lastMove = move.id;
    user.lastCategory = ["물리", "특수"].includes(move.category) ? move.category : "";
    if (user.ability.id === "last-drop" && move.category !== "변화" && !user.ppRestored && move.currentPp === 0) {
      const other = user.moves
        .filter(m => m.id !== move.id && m.category !== "변화" && m.currentPp < m.pp)
        .sort((a, b) => a.currentPp - b.currentPp)[0];
      if (other) {
        other.currentPp = Math.min(other.pp, other.currentPp + 2);
        user.ppRestored = true;
        say(run, other.name + " PP +2.");
      }
    }
  };
  if (move.mechanics?.noConsecutive && user.lastMove === move.id) {
    say(run, "연속 턴 사용 불가.");
    remember();
    return;
  }
  if (move.mechanics?.requiresUserHpAbove && user.hp <= user.maxHp * move.mechanics.requiresUserHpAbove) {
    say(run, "HP 조건을 충족하지 못했습니다.");
    remember();
    return;
  }
  if (user.healLockUntil >= run.turn && (move.tags?.includes("heal") || move.tags?.includes("drain"))) {
    say(run, "회복 기술을 사용할 수 없습니다.");
    remember();
    return;
  }
  if (move.mechanics?.delayedAttack) {
    const targetSide = side === "player" ? "enemy" : "player";
    if (run.scheduled.some(x => x.targetSide === targetSide)) {
      say(run, "이미 같은 자리에 지연 공격이 예약되어 있습니다.");
      remember();
      return;
    }
    if (user.ability.id === "early-comet") {
      if (!target.protect && (move.accuracy == null || r.real(0, 100) < move.accuracy)) {
        damage(run, user, target, move, r, first);
      } else {
        say(run, "공격이 막혔습니다.");
      }
    } else {
      const events = Fan.describe(move, user.ability).activations;
      for (const event of events) {
        run.scheduled.push({
          targetSide,
          turn: run.turn + event.turn,
          caster: clone(user),
          move: clone(move),
          multiplier: event.multiplier,
        });
      }
      say(run, events.map(e => e.turn + "턴 뒤").join(" / ") + " 공격을 예약했습니다.");
    }
    remember();
    return;
  }
  if (move.category === "변화") {
    if (move.templateId === "guard") {
      const chance = Math.pow(1 / 3, user.protectChain || 0);
      if (r.real(0, 1) < chance) {
        user.protect = true;
        user.protectChain = (user.protectChain || 0) + 1;
        say(run, "이번 턴 몸을 지킵니다.");
      } else {
        user.protectChain = 0;
        say(run, "방어에 실패했습니다.");
      }
    } else if (move.setsEnvironment?.some(id => id.startsWith("room-"))) {
      const id = move.setsEnvironment[0];
      if (run.rooms[id]) {
        delete run.rooms[id];
        say(run, move.name + " 해제.");
      } else {
        run.rooms[id] = user.ability.id === "persistent" ? 7 : 5;
        say(run, move.name + " " + run.rooms[id] + "턴.");
      }
    } else if (move.boosts) {
      const cost = move.penalties?.find(p => p.kind === "hp-cost");
      const amount = cost ? Math.max(1, Math.floor(user.maxHp * cost.fraction)) : 0;
      if (user.hp <= amount || Object.keys(move.boosts).every(k => user.stages[k] >= 6)) {
        say(run, "랭업 조건을 충족하지 못했습니다.");
        remember();
        return;
      }
      if (amount) {
        user.hp -= amount;
      }
      boost(run, user, move.boosts);
      for (const p of move.penalties || []) {
        if (p.kind === "stat-stage") {
          boost(run, user, { [p.stat]: p.stages });
        }
      }
    } else if (["heal", "purify", "cocoon-rest"].includes(move.templateId)) {
      const fraction = move.templateId === "heal" ? 0.5 : move.templateId === "purify" ? 0.25 : 1 / 3;
      heal(run, user, user.maxHp * fraction * (user.ability.id === "recovery-pulse" ? 1.2 : 1));
      if (move.templateId === "cocoon-rest") {
        boost(run, user, { def: 1 });
        user.selfSwitchUntil = run.turn + 1;
      }
    }
    user.repeatUses = 0;
    remember();
    return;
  }
  user.protectChain = 0;
  const blocked = target.protect;
  const miss = !blocked && move.accuracy != null && r.real(0, 100) >= move.accuracy;
  if (blocked || miss) {
    say(run, blocked ? "상대가 공격을 막았습니다." : "공격이 빗나갔습니다.");
    penalties(run, user, move, { hp: 0, hit: false }, true);
    remember();
    return;
  }
  const result = damage(run, user, target, move, r, first);
  penalties(run, user, move, result);
  if (move.id === "struggle") {
    const n = Math.max(1, Math.floor(user.maxHp / 4));
    user.hp = Math.max(0, user.hp - n);
    say(run, "발버둥 반동 −" + n + " HP.");
  }
  remember();
}
function enemyMove(run: Run, r: any): Move {
  const enemy = run.enemy!;
  const target = run.team[run.active];
  const choices = availableMoves(enemy).filter(m => m.currentPp > 0);
  return choices.map(move => ({
    value: move,
    weight: Math.max(
      1,
      Math.round(
        (Number(move.power) || 50)
          * typeEffectiveness(move, move.type, target)
          * (enemy.types.includes(move.type) ? 1.5 : 1),
      ),
    ),
  })).length > 0
    ? r.weighted(
        choices.map(move => ({
          value: move,
          weight: Math.max(
            1,
            Math.round(
              (Number(move.power) || 50)
                * typeEffectiveness(move, move.type, target)
                * (enemy.types.includes(move.type) ? 1.5 : 1),
            ),
          ),
        })),
      )
    : STRUGGLE;
}
function endTurn(run: Run, r: any) {
  for (const event of [...run.scheduled]) {
    if (event.turn <= run.turn) {
      run.scheduled.splice(run.scheduled.indexOf(event), 1);
      const target = event.targetSide === "player" ? run.team[run.active] : run.enemy;
      if (target && target.hp > 0) {
        say(run, "지연 공격 · " + event.move.name + (event.multiplier < 1 ? " (50%)" : "") + ".");
        if (event.move.accuracy == null || r.real(0, 100) < event.move.accuracy) {
          damage(
            run,
            { ...event.caster, hp: Math.max(1, event.caster.hp) },
            target,
            event.move,
            r,
            false,
            event.multiplier,
          );
        } else {
          say(run, "지연 공격이 빗나갔습니다.");
        }
      }
    }
  }
  for (const mon of [run.team[run.active], run.enemy]) {
    if (mon && mon.hp > 0) {
      mon.entryTurns++;
      if (mon.ability.id === "patient-growth" && mon.entryTurns === 3) {
        boost(run, mon, { atk: 1, spa: 1 });
      }
    }
  }
  for (const id of Object.keys(run.rooms)) {
    run.rooms[id]--;
    if (run.rooms[id] <= 0) {
      delete run.rooms[id];
      say(run, "공간 변화가 끝났습니다.");
    }
  }
  settle(run);
}
function settle(run: Run) {
  const alive = run.team.some(m => m.hp > 0);
  if (!alive) {
    run.phase = "lost";
    say(run, "탐험대가 더 이상 싸울 수 없습니다.");
    return;
  }
  if (run.enemy && run.enemy.hp <= 0) {
    say(run, run.enemy.name + " 쓰러졌습니다.");
    if (run.enemyQueue.length > 0) {
      run.enemy = run.enemyQueue.shift()!;
      say(run, run.enemy.name + " 등장!");
    } else {
      run.cleared = run.wave;
      run.phase = run.wave === 60 ? "won" : "between";
      run.scheduled = [];
      run.rooms = {};
      const camp = matchKind(run.wave) !== "normal" || run.wave % 5 === 0;
      for (const m of run.team) {
        if (camp) {
          m.hp = m.maxHp;
          m.moves.forEach(x => (x.currentPp = x.pp));
        } else if (m.hp > 0) {
          m.hp = Math.min(m.maxHp, m.hp + Math.max(1, Math.floor(m.maxHp * 0.35)));
          m.moves.forEach(x => (x.currentPp = Math.min(x.pp, x.currentPp + 1)));
        }
        resetEntry(m);
      }
      say(
        run,
        run.phase === "won"
          ? "60웨이브 완주! 탐험대의 모든 종족값을 공개합니다."
          : camp
            ? "전투 승리. 탐험대 전체를 정비했습니다."
            : "전투 승리. 생존한 동료의 HP 35%·기술 PP 1 회복.",
      );
    }
  }
  if (run.phase === "battle" && run.team[run.active].hp <= 0) {
    run.pendingSwitch = true;
    say(run, "출전할 동료를 선택하세요.");
  }
}
function startTurn(run: Run) {
  run.turn++;
  for (const m of [...run.team, run.enemy]) {
    if (m) {
      m.protect = false;
      m.acted = false;
      m.hurt = false;
    }
  }
}
export function attack(run: Run, moveIndex: number) {
  if (run.phase !== "battle" || run.pendingSwitch) {
    throw new Error("출전 상태와 성장 선택을 먼저 확인하세요.");
  }
  const user = run.team[run.active];
  const move = availableMoves(user)[moveIndex];
  if (!Number.isInteger(moveIndex) || !move || move.currentPp <= 0) {
    throw new Error("사용 가능한 기술을 선택하세요.");
  }
  startTurn(run);
  const r = rng(run.mapSeed + ":battle:" + run.wave + ":" + run.turn);
  const target = run.enemy!;
  const other = enemyMove(run, r);
  run.samePriority = move.priority === other.priority;
  let first =
    move.priority === other.priority
      ? effective(user, "spe", run) === effective(target, "spe", run)
        ? r.int(0, 1) === 0
        : effective(user, "spe", run) > effective(target, "spe", run)
      : move.priority > other.priority;
  if (move.priority === other.priority && run.rooms["room-trick"]) {
    first = !first;
  }
  if (first) {
    perform(run, user, target, move, r, true, "player");
    if (target.hp > 0 && user.hp > 0) {
      perform(run, target, user, other, r, false, "enemy");
    }
  } else {
    perform(run, target, user, other, r, true, "enemy");
    if (user.hp > 0 && target.hp > 0) {
      perform(run, user, target, move, r, false, "player");
    }
  }
  endTurn(run, r);
}
export function switchMember(run: Run, index: number) {
  if (
    !["battle", "between"].includes(run.phase)
    || !Number.isInteger(index)
    || !run.team[index]
    || index === run.active
    || run.team[index].hp <= 0
  ) {
    throw new Error("교대할 동료를 확인하세요.");
  }
  const outgoing = run.team[run.active];
  if (outgoing.hp > 0 && outgoing.selfSwitchUntil >= run.turn + 1) {
    throw new Error("이번에는 스스로 교체할 수 없습니다.");
  }
  const free = run.pendingSwitch || run.phase === "between";
  resetEntry(outgoing);
  run.active = index;
  run.pendingSwitch = false;
  resetEntry(run.team[index]);
  say(run, run.team[index].name + " 출전!");
  if (!free) {
    run.samePriority = false;
    startTurn(run);
    const r = rng(run.mapSeed + ":battle:" + run.wave + ":" + run.turn);
    perform(run, run.enemy!, run.team[index], enemyMove(run, r), r, true, "enemy");
    endTurn(run, r);
  }
}
export function restoreRun(serialized: string): Run {
  if (serialized.length > 2_000_000) {
    throw new Error("저장 파일이 너무 큽니다.");
  }
  let s: any;
  try {
    s = JSON.parse(serialized);
  } catch {
    throw new Error("저장 파일을 읽을 수 없습니다.");
  }
  if (
    !s
    || s.version !== VERSION
    || !["battle", "between", "draft", "won", "lost"].includes(s.phase)
    || !Number.isInteger(s.wave)
    || s.wave < 1
    || s.wave > 60
    || !Array.isArray(s.team)
    || s.team.length !== 3
    || !s.team.every(
      m =>
        m
        && IDS.includes(m.types?.[0])
        && STATS.every(
          k =>
            Number.isInteger(m.base?.[k])
            && m.base[k] > 0
            && Number.isInteger(m.ivs?.[k])
            && m.ivs[k] >= 0
            && m.ivs[k] <= 31,
        )
        && Array.isArray(m.moves)
        && m.moves.length > 0
        && m.moves.length <= 4,
    )
    || !Array.isArray(s.log)
    || !Array.isArray(s.events)
    || !Array.isArray(s.draftQueue)
    || !Array.isArray(s.scheduled)
    || !s.rooms
    || typeof s.mapSeed !== "string"
    || typeof s.pokemonSeed !== "string"
    || !Number.isInteger(s.active)
    || s.active < 0
    || s.active > 2
    || !Number.isInteger(s.turn)
    || s.turn < 0
  ) {
    throw new Error("이 버전에서 사용할 수 없는 저장 데이터입니다.");
  }
  const text = (v: any, max = 5000) => typeof v === "string" && v.length <= max;
  const validMon = (m: any) =>
    m
    && text(m.id, 100)
    && text(m.seed, 300)
    && text(m.name, 100)
    && Number.isInteger(m.level)
    && m.level >= 5
    && m.level <= 60
    && m.stage === (m.level >= 36 ? 3 : m.level >= 16 ? 2 : 1)
    && Array.isArray(m.types)
    && m.types.length > 0
    && m.types.length <= 2
    && new Set(m.types).size === m.types.length
    && m.types.every(t => IDS.includes(t))
    && STATS.every(
      k =>
        Number.isInteger(m.base?.[k])
        && m.base[k] > 0
        && m.base[k] <= 255
        && Number.isInteger(m.ivs?.[k])
        && m.ivs[k] >= 0
        && m.ivs[k] <= 31
        && Number.isInteger(m.stages?.[k])
        && Math.abs(m.stages[k]) <= 6,
    )
    && Number.isInteger(m.maxHp)
    && m.maxHp === battleStats(m).hp
    && Number.isInteger(m.hp)
    && m.hp >= 0
    && m.hp <= m.maxHp
    && m.ability
    && text(m.ability.id, 100)
    && text(m.ability.name, 100)
    && text(m.ability.description)
    && Array.isArray(m.moves)
    && m.moves.length > 0
    && m.moves.length <= 4
    && m.moves.every(
      v =>
        v
        && text(v.id, 150)
        && L.moves.some(x => x.id === v.id)
        && text(v.name, 150)
        && text(v.effect)
        && IDS.includes(v.type)
        && ["물리", "특수", "혼합", "변화"].includes(v.category)
        && Number.isInteger(v.currentPp)
        && Number.isInteger(v.pp)
        && v.pp > 0
        && v.currentPp >= 0
        && v.currentPp <= v.pp
        && (v.accuracy === null || (Number.isFinite(v.accuracy) && v.accuracy >= 0 && v.accuracy <= 100)),
    )
    && ["entryTurns", "repeatUses", "substitute", "protectChain", "selfSwitchUntil", "healLockUntil"].every(
      k => Number.isInteger(m[k]) && m[k] >= 0,
    );
  const validDraft = (d: any) =>
    d
    && text(d.id, 200)
    && s.team.some(m => m.id === d.memberId)
    && [16, 26, 36, 46, 56].includes(d.level)
    && ["move", "ability", "type", "ivs"].includes(d.kind)
    && ["silver", "gold", "prismatic"].includes(d.rarity)
    && text(d.title)
    && text(d.description)
    && Array.isArray(d.options)
    && d.options.length === 3
    && d.options.every(
      o =>
        o
        && text(o.id, 200)
        && text(o.name)
        && text(o.description)
        && (!o.choices || (Array.isArray(o.choices) && o.choices.every(t => IDS.includes(t))))
        && (!o.changes || (Array.isArray(o.changes) && o.changes.every(v => text(v)))),
    );
  if (
    !s.team.every(validMon)
    || !validMon(s.enemy)
    || !Array.isArray(s.enemyQueue)
    || !s.enemyQueue.every(validMon)
    || !s.log.every(v => text(v))
    || s.draftQueue.length > 3
    || !s.draftQueue.every(validDraft)
    || s.scheduled.length > 2
    || !s.scheduled.every(
      e =>
        e
        && ["player", "enemy"].includes(e.targetSide)
        && Number.isInteger(e.turn)
        && e.turn >= 0
        && validMon(e.caster)
        && e.move
        && e.move.mechanics?.delayedAttack
        && Number.isFinite(e.multiplier)
        && e.multiplier > 0
        && e.multiplier <= 1,
    )
    || !Object.entries(s.rooms).every(
      ([id, n]) =>
        ["room-trick", "room-wonder", "room-magic"].includes(id)
        && Number.isInteger(n)
        && Number(n) > 0
        && Number(n) <= 7,
    )
  ) {
    throw new Error("저장된 전투 정보가 올바르지 않습니다. 새 탐험을 시작해 주세요.");
  }
  if (s.phase === "draft" && !validDraft(s.draft)) {
    throw new Error("성장 선택 저장을 확인해 주세요.");
  }
  return s as Run;
}
