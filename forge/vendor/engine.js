// Starter Forge maker v1.10.0 snapshot. See ../MAKER_SOURCE.json.
import Catalog from './catalog.js';
const root={StarterCatalog:Catalog};
const api=(()=>{
  'use strict';

  const VERSION = '1.10.0';
  const TOTAL = 530;
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const LABELS = { hp: 'HP', atk: '공격', def: '방어', spa: '특공', spd: '특방', spe: '스피드' };
  const STAT_PROFILES = Object.freeze([
    { stat:'hp', midpoint:90, radius:50, c:0.10, cAbove:0.50 },
    { stat:'atk', midpoint:100, radius:50, c:0.50 },
    { stat:'def', midpoint:100, radius:60, c:0.10, cAbove:0.50 },
    { stat:'spa', midpoint:90, radius:60, c:0.50 },
    { stat:'spd', midpoint:80, radius:70, c:0.10, cAbove:0.50 },
    { stat:'spe', midpoint:80, radius:70, c:0.85 }
  ].map(profile => Object.freeze({ ...profile, min:profile.midpoint-profile.radius, max:profile.midpoint+profile.radius })));
  const TYPE_IDS = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  const COMBINATIONS = Object.freeze(TYPE_IDS.flatMap((type, i) => [
    Object.freeze([type]),
    ...TYPE_IDS.slice(i + 1).map(other => Object.freeze([type, other]))
  ]));

  function seedText(seed) {
    if (seed === undefined) return 'starter-530';
    if (typeof seed !== 'string' && (typeof seed !== 'number' || !Number.isFinite(seed))) {
      throw new TypeError('시드는 문자열 또는 유한한 숫자여야 합니다.');
    }
    return String(seed);
  }

  function createRng(seed) {
    const text = seedText(seed);
    let state = 2166136261;
    for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 16777619) >>> 0;
    function uint32() {
      state = (state + 0x6D2B79F5) >>> 0;
      let n = state;
      n = Math.imul(n ^ (n >>> 15), n | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return (n ^ (n >>> 14)) >>> 0;
    }
    function int(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min || max - min >= 4294967296) {
        throw new RangeError('난수 범위는 폭이 2³² 이하인 정수 구간이어야 합니다.');
      }
      const width = max - min + 1;
      const limit = Math.floor(4294967296 / width) * width;
      let value;
      do { value = uint32(); } while (value >= limit);
      return min + value % width;
    }
    function pick(items) {
      if (!Array.isArray(items) || !items.length) throw new RangeError('추첨할 후보가 없습니다.');
      return items[int(0, items.length - 1)];
    }
    function weighted(items) {
      if (!Array.isArray(items) || !items.length || items.some(item => !Number.isSafeInteger(item.weight) || item.weight <= 0)) {
        throw new RangeError('가중치는 양의 정수여야 합니다.');
      }
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let draw = int(1, total);
      for (const item of items) {
        draw -= item.weight;
        if (draw <= 0) return Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : item;
      }
    }
    return { int, pick, weighted, real: () => uint32() / 4294967296 * 10 };
  }

  function validateOptions(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('설정은 객체여야 합니다.');
    const min = options.min === undefined ? 1 : options.min;
    const max = options.max === undefined ? 255 : options.max;
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 255 || min > max) {
      throw new RangeError('종족값의 최소·최대는 1~255의 정수이며 최소 ≤ 최대여야 합니다.');
    }
    const bounds = STAT_PROFILES.map(profile => ({ min:Math.max(profile.min,min), max:Math.min(profile.max,max) }));
    if (bounds.some(bound => bound.min > bound.max) || bounds.reduce((sum,bound)=>sum+bound.min,0) > TOTAL || bounds.reduce((sum,bound)=>sum+bound.max,0) < TOTAL) throw new RangeError('능력치별 범위와 공통 제한으로 총합 530을 만들 수 없습니다.');
    return { min, max };
  }

  function boundedProfiles(options) {
    return STAT_PROFILES.map(profile => ({ ...profile, min:Math.max(profile.min,options.min), max:Math.min(profile.max,options.max) }));
  }

  // One shared kernel serves the app, stats-only samples and the distribution experiment.
  function drawStats(rng, profiles, values, allocation, pending) {
    let remaining = TOTAL, lowerSum = 0, upperSum = 0;
    for (let i=0;i<6;i++) { pending[i]=i; lowerSum+=profiles[i].min; upperSum+=profiles[i].max; }
    for (let count=6;count>0;count--) {
      const slot = rng.int(0,count-1);
      const index = pending[slot];
      pending[slot] = pending[count-1];
      const profile = profiles[index];
      lowerSum -= profile.min;
      upperSum -= profile.max;
      const x = Math.max(profile.min,remaining-upperSum);
      const y = Math.min(profile.max,remaining-lowerSum);
      const midpoint = (x+y)/2;
      let r1=null, r2=null, r3=null, raw=remaining, value=remaining, c=profile.c, side=null;
      if (count > 1) {
        if (profile.cAbove !== undefined) { side=rng.int(0,1); c=side===0?profile.c:profile.cAbove; }
        r1=rng.real(); r2=rng.real(); r3=rng.real();
        let displacement=((1+2*c)*(r1-5)+(1-c)*(r2+r3-10))/15;
        // Reflect the symmetric draw into the selected half, keeping the supplied formula exact.
        if ((side===0&&displacement>0)||(side===1&&displacement<0)) {
          r1=10-r1; r2=10-r2; r3=10-r3;
          displacement=((1+2*c)*(r1-5)+(1-c)*(r2+r3-10))/15;
        }
        raw = midpoint + displacement*(y-midpoint);
        value = Math.min(y,Math.max(x,Math.round(raw)));
      }
      values[index]=value;
      remaining-=value;
      if (allocation) allocation.push({step:7-count,stat:profile.stat,label:LABELS[profile.stat],min:x,max:y,midpoint,baseMidpoint:profile.midpoint,c,side:side===null?null:side===0?'below':'above',rolls:count===1?null:[r1,r2,r3],raw,value,remaining,remainingMin:lowerSum,remainingMax:upperSum,forced:count===1});
    }
    return values;
  }

  function createStatSampler(seed, options = {}) {
    const normalizedOptions=validateOptions(options), rng=createRng(seed);
    const profiles=boundedProfiles(normalizedOptions), pending=new Int8Array(6);
    return { next(values = new Int16Array(6)) { return drawStats(rng,profiles,values,null,pending); } };
  }

  function generateStats(seed, options = {}) {
    const normalizedOptions=validateOptions(options), normalizedSeed=seedText(seed), rng=createRng(normalizedSeed);
    // Consume the same type-combination draw as generate(), without constructing a creature or loadout.
    rng.int(0,COMBINATIONS.length-1);
    const allocation=[], values=drawStats(rng,boundedProfiles(normalizedOptions),new Int16Array(6),allocation,new Int8Array(6));
    return {version:VERSION,seed:normalizedSeed,options:normalizedOptions,total:TOTAL,stats:Object.fromEntries(STATS.map((key,i)=>[key,values[i]])),allocation};
  }

  function validateStats(stats) {
    if (!stats || STATS.some(key => !Number.isInteger(stats[key]) || stats[key] < 1 || stats[key] > 255)) {
      throw new RangeError('여섯 종족값은 모두 1~255 사이 정수여야 합니다.');
    }
  }

  // Distances compare the shape at a common total; thresholds still use actual base stats.
  const ROLE_DATA = [
    ['physical-fast', '고속 물리형', [80,120,75,50,75,140], 'physical-fast'],
    ['physical-mid', '중속 물리형', [90,130,85,50,85,100], 'physical-medium'],
    ['physical-bulky', '내구 물리형', [110,120,105,45,95,65], 'physical-bulky'],
    ['physical-slow', '초저속 물리형', [110,145,110,40,105,30], 'physical-slow'],
    ['special-fast', '고속 특수형', [80,50,75,120,75,140], 'special-fast'],
    ['special-mid', '중속 특수형', [90,50,85,130,85,100], 'special-medium'],
    ['special-bulky', '내구 특수형', [110,45,95,120,105,65], 'special-bulky'],
    ['special-slow', '초저속 특수형', [110,40,105,145,110,30], 'special-slow'],
    ['mixed-fast', '고속 쌍두형', [70,110,65,110,65,120], 'mixed-fast'],
    ['mixed-mid', '중속 쌍두형', [85,115,75,115,75,75], 'mixed-medium'],
    ['mixed-bulky', '내구·저속 쌍두형', [100,105,95,105,95,40], 'mixed-bulky'],
    ['mixed-physical', '물리 중심 쌍두형', [85,125,75,90,75,90], 'mixed-physical'],
    ['mixed-special', '특수 중심 쌍두형', [85,90,75,125,75,90], 'mixed-special'],
    ['physical-wall', '물리막이형', [120,65,145,50,100,60], 'physical-wall'],
    ['special-wall', '특수막이형', [120,50,100,65,145,60], 'special-wall'],
    ['dual-wall', '쌍막이형', [105,60,125,60,125,65], 'dual-wall'],
    ['balloon', '고HP 풍선형', [180,65,70,65,70,90], 'balloon'],
    ['armored', '저HP 철갑형', [60,70,155,70,155,30], 'armored'],
    ['physical-fortress', '물리 공격·물리 방어형', [100,110,140,45,100,45], 'physical-physical-bulk'],
    ['special-fortress', '특수 공격·특수 방어형', [100,45,100,110,140,45], 'special-special-bulk'],
    ['physical-specialtank', '물리 공격·특수 방어형', [100,110,100,45,140,45], 'physical-special-bulk'],
    ['special-physicaltank', '특수 공격·물리 방어형', [100,45,140,110,100,45], 'special-physical-bulk'],
    ['speed-support', '초고속 지원형', [90,65,85,65,85,150], 'support-fast'],
    ['fast-physicalwall', '고속 물리막이형', [90,70,120,60,90,110], 'fast-physical-wall'],
    ['fast-specialwall', '고속 특수막이형', [90,60,90,70,120,110], 'fast-special-wall'],
    ['slow-pivot', '초저속 피벗형', [120,80,120,80,120,20], 'slow-pivot'],
    ['balanced', '균형·지원형', [90,90,90,90,90,90], 'support']
  ];

  const GATE_TEXT = {
    'physical-fast':'물리 성향, 스피드 ≥ 105', 'physical-medium':'물리 성향, 스피드 56~104',
    'physical-bulky':'물리 성향, 양쪽 내구 지수 ≥ 0.95', 'physical-slow':'물리 성향, 스피드 ≤ 55',
    'special-fast':'특수 성향, 스피드 ≥ 105', 'special-medium':'특수 성향, 스피드 56~104',
    'special-bulky':'특수 성향, 양쪽 내구 지수 ≥ 0.95', 'special-slow':'특수 성향, 스피드 ≤ 55',
    'mixed-fast':'쌍두 성향, 스피드 ≥ 105', 'mixed-medium':'쌍두 성향, 스피드 56~104',
    'mixed-bulky':'쌍두 성향, 스피드 ≤ 55 또는 양쪽 내구 지수 ≥ 0.95',
    'mixed-physical':'쌍두 성향, 공격 ≥ 특공 × 1.12', 'mixed-special':'쌍두 성향, 특공 ≥ 공격 × 1.12',
    'physical-wall':'최대 공격 능력치 < 115, 물리 내구 지수 ≥ 1.15, 물리 내구 ≥ 특수 내구 × 1.15',
    'special-wall':'최대 공격 능력치 < 115, 특수 내구 지수 ≥ 1.15, 특수 내구 ≥ 물리 내구 × 1.15',
    'dual-wall':'지원 성향, 양쪽 내구 지수 ≥ 1.10', 'balloon':'HP > 130, 방어·특방 ≤ 90',
    'armored':'HP ≤ 80, 방어·특방 ≥ 110',
    'physical-physical-bulk':'물리 성향, 물리 내구 지수 ≥ 1.10',
    'special-special-bulk':'특수 성향, 특수 내구 지수 ≥ 1.10',
    'physical-special-bulk':'물리 성향, 특수 내구 지수 ≥ 1.10',
    'special-physical-bulk':'특수 성향, 물리 내구 지수 ≥ 1.10',
    'support-fast':'지원 성향, 스피드 ≥ 105',
    'fast-physical-wall':'최대 공격 능력치 < 115, 스피드 ≥ 105, 물리 내구 지수 ≥ 1.15',
    'fast-special-wall':'최대 공격 능력치 < 115, 스피드 ≥ 105, 특수 내구 지수 ≥ 1.15',
    'slow-pivot':'지원 성향, 스피드 ≤ 55, 양쪽 내구 지수 ≥ 1.05', 'support':'지원 성향'
  };

  function gates(stats, offense, speed, p, s) {
    const minBulk = Math.min(p, s);
    const maxAttack = Math.max(stats.atk, stats.spa);
    const result = {
      'physical-wall': maxAttack < 115 && p >= 1.15 && p >= s * 1.15,
      'special-wall': maxAttack < 115 && s >= 1.15 && s >= p * 1.15,
      'dual-wall': offense === 'support' && minBulk >= 1.10,
      balloon: stats.hp > 130 && stats.def <= 90 && stats.spd <= 90,
      armored: stats.hp <= 80 && Math.min(stats.def, stats.spd) >= 110,
      'support-fast': offense === 'support' && speed === 'fast',
      'fast-physical-wall': maxAttack < 115 && speed === 'fast' && p >= 1.15,
      'fast-special-wall': maxAttack < 115 && speed === 'fast' && s >= 1.15,
      'slow-pivot': offense === 'support' && speed === 'slow' && minBulk >= 1.05,
      support: offense === 'support',
      'mixed-physical': offense === 'mixed' && stats.atk >= stats.spa * 1.12,
      'mixed-special': offense === 'mixed' && stats.spa >= stats.atk * 1.12
    };
    for (const kind of ['physical', 'special', 'mixed']) {
      for (const speedKind of ['fast', 'medium', 'slow']) result[kind + '-' + speedKind] = offense === kind && speed === speedKind;
      result[kind + '-bulky'] = offense === kind && (minBulk >= 0.95 || (kind === 'mixed' && speed === 'slow'));
      result[kind + '-physical-bulk'] = offense === kind && p >= 1.10;
      result[kind + '-special-bulk'] = offense === kind && s >= 1.10;
    }
    return result;
  }

  const round = (n, places = 3) => Number(n.toFixed(places));
  function classify(stats) {
    validateStats(stats);
    const total = STATS.reduce((sum, key) => sum + stats[key], 0);
    const maxAttack = Math.max(stats.atk, stats.spa);
    const minAttack = Math.min(stats.atk, stats.spa);
    const attackRatio = minAttack / maxAttack;
    const offense = minAttack >= 90 && maxAttack >= 105 && attackRatio >= 0.72 ? 'mixed'
      : maxAttack < 95 ? 'support' : stats.atk >= stats.spa ? 'physical' : 'special';
    const speed = stats.spe >= 105 ? 'fast' : stats.spe <= 55 ? 'slow' : 'medium';
    const actualHp = stats.hp + 60;
    const physicalBulk = actualHp * (stats.def + 5) / 14250;
    const specialBulk = actualHp * (stats.spd + 5) / 14250;
    const bulk = Math.min(physicalBulk, specialBulk) >= 1.05 ? 'both'
      : physicalBulk >= 1.05 && physicalBulk >= specialBulk * 1.15 ? 'physical'
      : specialBulk >= 1.05 && specialBulk >= physicalBulk * 1.15 ? 'special' : 'frail';
    const eligible = gates(stats, offense, speed, physicalBulk, specialBulk);
    const normalized = STATS.map(key => stats[key] / total * TOTAL);
    const scores = ROLE_DATA.filter(role => eligible[role[3]]).map(role => {
      const baseTotal = role[2].reduce((sum, n) => sum + n, 0);
      const distance = Math.sqrt(normalized.reduce((sum, n, i) => sum + (n - role[2][i] / baseTotal * TOTAL) ** 2, 0) / 6);
      return { id: role[0], label: role[1], score: 100 / (1 + distance / 40), distance, order: ROLE_DATA.indexOf(role) };
    }).sort((a, b) => b.score - a.score || a.order - b.order);
    const winner = scores[0];
    const tags = [offense, speed];
    if (physicalBulk >= 1.05) tags.push('physical-bulk');
    if (specialBulk >= 1.05) tags.push('special-bulk');
    if (Math.min(physicalBulk, specialBulk) >= 1.05) tags.push('bulky');
    if (bulk === 'frail') tags.push('frail');
    if (eligible.balloon) tags.push('balloon');
    if (eligible.armored) tags.push('armored');
    if (Math.max(...STATS.map(key => stats[key])) - Math.min(...STATS.map(key => stats[key])) <= 35) tags.push('balanced');
    const offenseText = { physical: '물리', special: '특수', mixed: '쌍두', support: '지원' };
    const speedText = { fast: '고속', medium: '중속', slow: '저속' };
    return {
      id: winner.id, label: winner.label, offense, speed, bulk, tags,
      scores: scores.map(({ id, label, score, distance }) => ({ id, label, score: round(score, 2), distance: round(distance, 2) })),
      metrics: { total, actualHp, actualDef: stats.def + 5, actualSpd: stats.spd + 5, physicalBulk: round(physicalBulk), specialBulk: round(specialBulk), attackRatio: round(attackRatio), maxAttack, minAttack },
      explanation: [
        `공격 ${stats.atk} · 특공 ${stats.spa}: ${offenseText[offense]} 성향. 쌍두는 둘 다 90 이상, 높은 쪽 105 이상, 낮은 쪽/높은 쪽 ≥ 0.72일 때만 선택합니다.`,
        `스피드 ${stats.spe}: ${speedText[speed]}. 105 이상 고속, 55 이하 저속, 그 사이는 중속입니다.`,
        `내구 지수는 물리 ${physicalBulk.toFixed(2)} · 특수 ${specialBulk.toFixed(2)}. HP·방어·특방이 각각 90인 기준의 내구를 1.00으로 비교합니다.`,
        `조건을 통과한 ${scores.length}개 형태 중 530 정규화 분배와의 거리(RMSE)가 가장 작은 ${winner.label}을 선택했습니다. 동점이면 공개된 형태 목록 순서를 따릅니다.`
      ]
    };
  }

  function getRules() {
    return {
      version: VERSION, total: TOTAL, statKeys: STATS.slice(), labels: { ...LABELS }, typeIds: TYPE_IDS.slice(), combinationCount: COMBINATIONS.length,
      allocation: {
        minimum:1,maximum:255,defaultMin:1,defaultMax:255,
        profiles:STAT_PROFILES.map(profile=>({...profile})),
        formula:'x = max(이 능력치 최솟값, R − 나머지 최댓값 합); y = min(이 능력치 최댓값, R − 나머지 최솟값 합); M = (x + y) / 2',
        samplingFormula:'값 = M + [(1 + 2c)(R₁ − 5) + (1 − c)(R₂ + R₃ − 10)] / 15 × (y − M)',
        asymmetry:'HP·방어·특방은 조정 중간점 M의 아래·위를 먼저 50:50으로 선택합니다. 아래쪽은 c=0.1, 위쪽은 c=0.5입니다. 난수 3개로 대칭 표본을 만든 뒤 방향이 반대면 Rᵢ를 10−Rᵢ로 반사해 선택한 반쪽 분포를 얻습니다. 기록의 Rᵢ는 반사 후 실제 수식 입력이며 [0,10]입니다. 반올림 전 값의 방향을 기준으로 하며 마지막 잔여 배정에는 c를 적용하지 않습니다.',
        steps:'매번 미배정 능력치를 균등 추첨합니다. 그 능력치의 가능 범위 [x,y]와 중간점 M을 다시 계산하고 시드에서 생성한 실수 R₁,R₂,R₃ ∈ [0,10)로 값을 뽑아 가장 가까운 정수로 반올림합니다. 마지막 능력치는 남은 R을 받습니다.',
        distribution:'171개 타입 조합은 동등 확률입니다. c=0은 중앙 집중, c=1은 조정된 범위에서 평탄한 분포입니다. 총합 제약·범위 축소·마지막 잔여 배정 때문에 전체 표본의 분포는 원래 식의 분포와 달라질 수 있습니다.'
      },
      offense: { mixedMinimum: 90, mixedMaximumMinimum: 105, mixedRatio: 0.72, supportBelow: 95, formula: 'min(A,C) ≥ 90 AND max(A,C) ≥ 105 AND min/max ≥ 0.72 → 쌍두; 나머지 중 max < 95 → 지원; 나머지 → 높은 공격 능력치의 분류(동점 물리)' },
      speed: { fastMin: 105, slowMax: 55, formula: 'S ≥ 105 → 고속; S ≤ 55 → 저속; 그 외 중속' },
      bulk: { formula: '물리 = (HP + 60) × (방어 + 5) / 14250; 특수 = (HP + 60) × (특방 + 5) / 14250', baseline: '레벨 50, 개체값·노력값 0, 무보정 성격. 기준 HP·방어·특방 90.', classification: '양쪽 ≥ 1.05 → 양면; 한쪽 ≥ 1.05이면서 반대쪽의 1.15배 이상 → 해당 내구; 나머지 → 내구 비특화. 막이 후보는 별도의 더 높은 조건을 적용합니다.', threshold: 1.05, biasRatio: 1.15 },
      matching: { formula: 'xᵢ = 종족값ᵢ / 총합 × 530; tᵢ = 템플릿값ᵢ / 템플릿총합 × 530; RMSE = √(Σ(xᵢ−tᵢ)² / 6); 점수 = 100 / (1 + RMSE / 40)', filtering: '고정된 진입 조건을 통과한 형태만 비교합니다.', tieBreak: '동점은 아래 템플릿 목록 순서로 결정합니다.' },
      templates: ROLE_DATA.map(([id, label, values, gate]) => ({ id, label, stats: Object.fromEntries(STATS.map((key, i) => [key, round(values[i] / values.reduce((sum, n) => sum + n, 0) * TOTAL, 6)])), condition: GATE_TEXT[gate] }))
    };
  }

  function getCatalog() {
    if (root.StarterCatalog && typeof root.StarterCatalog.createLoadout === 'function') return root.StarterCatalog;
    if (typeof module === 'object' && module.exports && typeof require === 'function') return require('./catalog.js');
    throw new Error('특성·기술 카탈로그를 불러오지 못했습니다. catalog.js를 engine.js보다 먼저 불러오세요.');
  }

  function generate(seed, options = {}) {
    const normalizedOptions = validateOptions(options);
    const normalizedSeed = seedText(seed);
    const rng = createRng(normalizedSeed);
    const types = rng.pick(COMBINATIONS).slice();
    const allocation = [];
    const values=drawStats(rng,boundedProfiles(normalizedOptions),new Int16Array(6),allocation,new Int8Array(6));
    const orderedStats = Object.fromEntries(STATS.map((key,i) => [key, values[i]]));
    const classification = classify(orderedStats);
    const context = { types, stats: orderedStats, classification };
    const loadout = getCatalog().createLoadout(context, rng);
    if (!loadout || !loadout.ability || !Array.isArray(loadout.moves) || !loadout.moves.length) throw new Error('카탈로그가 올바른 특성·기술을 반환하지 않았습니다.');
    return { version: VERSION, seed: normalizedSeed, options: normalizedOptions, total: TOTAL, types, stats: orderedStats, allocation, classification, ability: loadout.ability, moves: loadout.moves, supportMoves:loadout.supportMoves||[], environment: loadout.environment || null, synergy: loadout.synergy || [] };
  }

  return { VERSION, TOTAL, STATS: Object.freeze(STATS), STAT_PROFILES, TYPE_IDS: Object.freeze(TYPE_IDS), COMBINATIONS, createRng, createStatSampler, generateStats, validateOptions, classify, generate, getRules };
})();
export default api;
