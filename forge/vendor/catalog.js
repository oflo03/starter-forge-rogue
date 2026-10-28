// Starter Forge maker v1.10.0 snapshot. See ../MAKER_SOURCE.json.
import RANKUPS from './rankups.js';
import ENVIRONMENT_RULES from './environments.js';
import ORIGINAL_ENVIRONMENTS from './original-environments.js';
import ARSENAL from './arsenal.js';
import FAN from './fan-content.js';
const api=(()=>{
  'use strict';

  const BOOST_MAP={rally:'swords-dance',focus:'nasty-plot',duality:'work-up',fortify:'cosmic-power',accelerate:'agility'};
  const FIXED_SUPPORT_TYPES={heal:'normal',purify:'water','cocoon-rest':'bug',guard:'normal',reset:'ice','weather-ball':'normal','terrain-pulse':'normal','wind-gust':'flying'};

  // Original names are retained for recognizable bases; this game's parameters remain explicit.
  const TYPES = [
    ['normal','노말','#77766b','기운'],['fire','불꽃','#b95b36','잿불'],
    ['water','물','#377f9c','너울'],['electric','전기','#a98725','번개'],
    ['grass','풀','#558255','잎새'],['ice','얼음','#5b919a','서리'],
    ['fighting','격투','#a96049','파워'],['poison','독','#926c74','베놈'],
    ['ground','땅','#a17d55','모래'],['flying','비행','#7795a5','바람'],
    ['psychic','에스퍼','#b1787f','꿈결'],['bug','벌레','#7d8a45','날개'],
    ['rock','바위','#95816a','돌결'],['ghost','고스트','#727b88','그림자'],
    ['dragon','드래곤','#5f7b83','별빛'],['dark','악','#676466','그늘'],
    ['steel','강철','#7d898e','메탈'],['fairy','페어리','#b1898b','반짝']
  ].map(([id,name,color,stem])=>({id,name,color,stem}));
  const SURGE_NAMES={normal:'막판힘',fire:'꺼지지않는불꽃',water:'차오르는물결',electric:'짜릿한힘',grass:'싱싱한풀잎',ice:'차가운숨',fighting:'끝까지간다',poison:'끈질긴독',ground:'꿈틀대는땅',flying:'드센바람',psychic:'깨어나는꿈',bug:'작은거인',rock:'단단한마음',ghost:'으스스파워',dragon:'비늘하트',dark:'막판장난',steel:'메탈하트',fairy:'반짝이는마음'};
  const TYPE_MAP = Object.fromEntries(TYPES.map(type => [type.id, type]));
  const TYPE_LETTERS = Object.freeze({normal:'무',fire:'염',water:'수',electric:'뇌',grass:'초',ice:'빙',fighting:'투',poison:'독',ground:'지',flying:'풍',psychic:'심',bug:'충',rock:'석',ghost:'영',dragon:'룡',dark:'흑',steel:'철',fairy:'요'});
  const DUAL_TYPE_ORDER=Object.freeze(['normal','fairy','psychic','fire','water','electric','grass','ice','poison','ground','flying','bug','rock','ghost','dark','steel','fighting','dragon']);
  const DUAL_TYPE_RANK=Object.fromEntries(DUAL_TYPE_ORDER.map((id,index)=>[id,index]));
  const TWO_WAY_NAMES = Object.freeze({normal:'무형',fire:'화염',water:'수류',electric:'전광',grass:'초목',ice:'빙결',fighting:'투혼',poison:'맹독',ground:'대지',flying:'질풍',psychic:'염동',bug:'갑충',rock:'암석',ghost:'영혼',dragon:'용린',dark:'암흑',steel:'철갑',fairy:'요정'});
  const clone = value => JSON.parse(JSON.stringify(value));
  const tag = (context, value) => context.classification.tags.includes(value);
  const physical = context => context.classification.offense === 'physical';
  const special = context => context.classification.offense === 'special';
  const mixed = context => context.classification.offense === 'mixed';
  const support = context => context.classification.offense === 'support';
  const mainCategory = context => context.stats.atk >= context.stats.spa ? '물리' : '특수';
  const defensiveAttack = (context,stat) => context.stats[stat]>=100 && context.stats[stat]>=context.stats[stat==='def'?'atk':'spa'];
  const signature = move => move.source!=='원작 기반';
  const usable = (move,context) => signature(move) && (!move.alwaysCrit||(move.power<=70&&!move.hits&&!move.hitRange&&!move.hitPowers&&(move.hitCount||1)===1&&context.stats[move.category==='물리'?'atk':'spa']<=110)) && (move.templateId!=='body'||defensiveAttack(context,'def')) && (move.templateId!=='spirit'||defensiveAttack(context,'spd'));
  const armorMoveCount = c => c.types.reduce((n,type)=>n+(type!=='fighting'&&defensiveAttack(c,'def')?1:0)+(defensiveAttack(c,'spd')?1:0),0);

  const RULES = [
    '기존 기술·특성에 대응하는 기본형은 원래 이름을 쓰고 원작 기반으로 표시합니다. 타입·위력·PP·배율 등은 이 도구의 설명을 따르는 창작 조정치이며 전투 시뮬레이터는 포함하지 않습니다.',
    '전용기 4칸은 창작·타입 확장 기술만 배정합니다. 원작 환경 기술은 별도 환경용 기술 추천으로 연결합니다. 변화기는 특색 있는 소수만 유지합니다.',
    '특성은 1개, 전용기는 중복 없이 4개를 배정합니다. 타입·수식으로 구한 형태·시드 난수가 후보와 가중치를 결정합니다.',
    '피해 계산에서 자속 보정은 각 타격의 타입이 자신의 타입이면 1.5배입니다. 타입 상성과 자속, 공격·방어 능력치는 타격별로 계산합니다.',
    '2연타는 명중 판정 1회 후 1타·2타 순서로 처리합니다. 1타가 타입 무효여도 2타는 진행하며, 대상이 쓰러지면 남은 타격은 중단합니다. 보호로 기술 전체가 막히면 두 타격 모두 발생하지 않습니다.',
    '물리 타격은 공격/방어, 특수 타격은 특공/특방을 사용합니다. 별도 설명이 있는 방어·특방 기반 기술은 공격 측 능력치만 대체합니다.',
    '방어 기반 공격은 방어 종족값 ≥100 및 공격 이상, 특방 기반 공격은 특방 종족값 ≥100 및 특공 이상일 때만 배정합니다. 딱딱파워는 이 조건을 만족하는 신규 기술이 2개 이상일 때만 후보에 포함합니다.',
    '능력치 단계는 −6~+6입니다. 공격·방어·특공·특방·스피드의 배율은 단계가 n≥0이면 (2+n)/2, n<0이면 2/(2−n)입니다.',
    '급소 확률은 기본 1/16, 급소 단계 +1이면 1/8, +2이면 1/2, +3 이상이면 1입니다. 급소 피해는 1.5배입니다.',
    '환경을 만드는 기술의 타입은 소속 표기입니다. 변화 기술은 타입 상성으로 무효화되지 않으며, 환경 생성 자체에는 명중 판정이 없습니다.',
    '날씨와 필드는 각각 슬롯 하나로 공존하며 5턴입니다. 서로 다른 룸은 공존하며 각각 5턴입니다. 설치물은 진영별·종류별로 유지하며 제거 전까지 지속합니다.',
    '화이트 페인트의 노말 타입 고정은 날씨·특성·도구에 의한 타입 변경보다 우선합니다. 거꾸로룸은 타입별 상성을 뒤집은 후 복합 상성을 곱합니다.',
    '대지의파동은 개미굴 필드에서 벌레, 옥타곤 필드에서 격투, 스왐프 필드에서 땅 타입이며 위력이 2배가 됩니다. 화이트 페인트에서는 노말 타입입니다.',
    '스킨은 노말 공격 기술의 각 노말 타격을 해당 타입으로 바꾸고 그 타격 피해를 1.2배로 합니다. 노말스킨은 타입을 유지합니다. 변화 기술에는 적용하지 않습니다.',
    '회복·반동·날씨 피해의 소수점은 내림하며, 실제 효과가 발생할 때 최소 1입니다. 회복은 최대 HP를 넘지 않습니다. 배율 효과는 서로 곱하며, 같은 특성은 중첩하지 않습니다.',
    '환경 수혜 특성·기술을 받으면 정확히 같은 환경의 생성 특성이나 생성 기술도 배정합니다. 생성 수단이 있다는 뜻이며, 교체·날씨 덮어쓰기 등으로 환경 유지가 보장되지는 않습니다.',
    '투웨이 공격은 같은 타입으로 물리 1타·특수 1타입니다. 이원 공격은 서로 다른 타입으로 물리 2타 또는 특수 2타입니다.',
    `이원 이름과 타격 순서: ${DUAL_TYPE_ORDER.map(id=>TYPE_MAP[id].name).join(' → ')}. 앞 타입이 1타, 뒤 타입이 2타입니다.`,
    '쌍두 성향은 투웨이 공격을 받습니다. 투웨이 특성은 복합 타입 쌍두에만 배정하며, 자신의 두 타입 투웨이 공격을 하나씩 받습니다.',
    '기술 강화 특성에는 적용 가능한 기술을 최소 2개 배정합니다. 조건부 강화는 조건을 만족했을 때 적용되는 기술을 셉니다.',
    '스킨은 자신의 타입과 무관하게 배정됩니다. 스킨에는 노말 공격을 최소 2개, 쌍두 스킨에는 노말 투웨이 공격을 포함합니다.',
    '동일 효과의 변화기는 고정 타입 한 항목으로 통합합니다. 공격기·특성의 타입 파생은 타입 확장으로 구분합니다.'
  ];
  const ORIGINAL_ABILITY_NAMES = {'turnaround':'재생력','clean-circuit':'탈피','priority-plan':'짓궂은마음','small-engine':'테크니션','stable-heart':'클리어바디'};

  const ENVIRONMENTS = ENVIRONMENT_RULES.list;
  const ENV_MAP = Object.fromEntries(ENVIRONMENTS.map(environment => [environment.id, environment]));
  const environmentForType=(kind,typeId)=>ENVIRONMENTS.find(e=>e.id.startsWith(kind+'-')&&e.affinity?.includes(typeId))||ENVIRONMENTS.find(e=>e.id.startsWith(kind+'-'));

  const ABILITY_SPECS = [
    ['muscle-focus','힘자랑','물리 기술의 피해가 1.15배가 됩니다.',['physical'],c=>physical(c)||mixed(c)],
    ['mind-focus','브레인파워','특수 기술의 피해가 1.15배가 됩니다.',['special'],c=>special(c)||mixed(c)],
    ['two-rhythms','투웨이','경정권의 피해가 1.15배가 됩니다.',['mixed'],c=>mixed(c)&&c.types.length===2],
    ['first-step','날쌘손','같은 우선도에서 상대보다 먼저 행동한 공격 기술의 피해가 1.2배가 됩니다. 동속 순서 추첨도 포함합니다.',['fast'],c=>tag(c,'fast')],
    ['late-force','늦깎이파워','해당 턴에 대상이 이미 행동했다면 그 대상에게 주는 공격 피해가 1.25배가 됩니다.',['slow'],c=>tag(c,'slow')],
    ['impact-pad','폭신몸','매번 교체 진입 후 처음 받는 물리 공격 기술의 모든 타격 피해를 0.7배로 줄입니다.',['physical-bulk'],c=>tag(c,'physical-bulk')],
    ['thought-pad','마음쿠션','매번 교체 진입 후 처음 받는 특수 공격 기술의 모든 타격 피해를 0.7배로 줄입니다.',['special-bulk'],c=>tag(c,'special-bulk')],
    ['twin-shell','겹겹코트','HP가 최대치의 절반 이상일 때 받는 공격 피해가 0.9배가 됩니다. 다단 공격은 각 타격 직전에 판정합니다.',['bulky'],c=>tag(c,'bulky')],
    ['elastic-core','탱탱바디','HP가 가득 찼을 때 받는 공격 기술의 첫 타격 피해를 0.6배로 줄입니다.',['balloon'],c=>tag(c,'balloon')],
    ['fitted-armor','딱딱파워','방어・특방 기반 기술의 피해 ×1.2.',['armored'],c=>armorMoveCount(c)>=2],
    ['turnaround','돌아오면쌩쌩','자신이 교체되어 전장에서 나갈 때 최대 HP의 1/4을 회복합니다. 기절한 경우에는 발동하지 않습니다.',['pivot'],c=>tag(c,'slow')||tag(c,'bulky')],
    ['thorns','따끔따끔','물리 공격 기술로 HP 피해를 받으면 그 기술 종료 후 공격자에게 공격자 최대 HP의 1/10 피해를 줍니다. 다단 공격에도 기술당 한 번입니다.',['physical-bulk'],c=>tag(c,'physical-bulk')],
    ['echo-ward','마음다지기','특수 공격 기술로 HP 피해를 받으면 그 기술 종료 후 자신의 특방이 1단계 오릅니다. 기술당 한 번입니다.',['special-bulk'],c=>tag(c,'special-bulk')],
    ['clean-circuit','몸씻기','턴 종료 시 독·맹독·화상·마비 중 하나가 있으면 먼저 걸린 하나를 30% 확률로 회복합니다.',['support'],support],
    ['quiet-repair','쉬면쌩쌩','그 턴에 공격 기술을 사용하지 않았다면 턴 종료 시 최대 HP의 1/16을 회복합니다. 행동하지 못한 턴도 포함합니다.',['support','bulky'],c=>support(c)||tag(c,'bulky')],
    ['priority-plan','한발먼저','HP를 회복하지 않고 자신·전장·진영을 대상으로 하는 변화 기술의 우선도를 1 높입니다. 방어 태세에는 적용하지 않습니다.',['support','fast'],c=>support(c)||tag(c,'fast')],
    ['residual-filter','튼튼살갗','공격 기술 이외의 피해를 절반으로 줄입니다. 자신의 기술 반동과 HP 지불은 줄이지 않습니다.',['bulky'],()=>true],
    ['recoil-balance','반동쿠션','자신의 공격 기술로 받는 반동 피해를 절반으로 줄입니다.',['physical'],c=>physical(c)&&c.types.reduce((n,t)=>n+(!['normal','fire','electric','grass','flying'].includes(t)?1:0)+(t!=='normal'?1:0),0)>=2],
    ['drain-cycle','쭉쭉흡수','공격 기술의 흡수 회복량이 1.3배가 됩니다. 최대 HP를 초과해 회복하지 않습니다.',['physical','special'],c=>!support(c)&&c.types.reduce((n,t)=>n+(t!=='fighting'?1:0)+(t!=='grass'?1:0),0)>=2],
    ['weak-point','빈틈노리기','대상의 방어・특방 중 하나라도 내려가 있으면 공격 피해 ×1.2.',['physical','special'],c=>!support(c)],
    ['small-engine','스몰파워','개별 타격의 기본 위력이 60 이하인 공격 기술의 해당 타격 피해가 1.2배가 됩니다. 가변 위력은 실제 위력으로 판단합니다.',['mixed','fast'],c=>mixed(c)||tag(c,'fast')],
    ['stable-heart','꿋꿋한마음','상대의 기술 부가효과로 능력치 단계가 내려가지 않습니다. 기술의 주효과인 능력치 저하와 자신의 능력치 저하는 막지 않습니다.',['support'],()=>true],
    ['recovery-pulse','쌩쌩에너지','자신이 쓰는 변화 기술의 HP 회복량이 1.2배가 됩니다.',['support','balloon'],c=>support(c)||tag(c,'balloon')],
    ['last-shield','마지막버팀','교체 진입 후 한 번, HP가 최대치의 1/3 이하일 때 받는 공격 기술의 모든 타격 피해를 0.5배로 줄입니다. 기술 시작 전에 HP를 판정합니다.',['frail'],c=>tag(c,'frail')],
    ['balanced-gears','밸런스기어','공격과 특공 중 낮은 능력치로 공격하는 타격의 피해가 1.2배가 됩니다. 두 능력치가 같으면 모든 공격 타격에 적용합니다.',['mixed','balanced'],c=>mixed(c)||tag(c,'balanced')],
    ['syncopation','엇박자','직전 기술과 물리・특수가 바뀌면 공격 피해 ×1.25. 변화기・혼합기는 기록 초기화.',['mixed'],mixed],
    ['thrifty-pocket','알뜰주머니','스스로 소모한 도구를 다음 턴 종료에 한 번 복원. 한 전투에 1회. 빼앗긴 도구는 제외.',['resource','bulky'],c=>support(c)||tag(c,'bulky')||tag(c,'frail')],
    ['memory-scales','기억비늘','직전에 HP 피해를 준 기술과 같은 타입의 공격을 받으면 피해 ×0.75. 기술 단위로 타입 기록, 교체 시 초기화.',['bulky'],c=>tag(c,'bulky')||tag(c,'armored')],
    ['overflow-bank','여분쿠션','한 번의 즉시 회복에서 최대 HP 1/4 이상이 초과하면 HP 소모 없이 대타 생성. 초과분 누적 없음.',['heal','bulky'],c=>support(c)||tag(c,'bulky')||tag(c,'balloon')],
    ['mood-rider','분위기타기','상대가 기술・특성으로 날씨나 필드를 새로 만들거나 갱신하면 스피드 +1. 턴당 1회, 아군 효과는 제외.',['fast','support'],c=>support(c)||tag(c,'fast')],
    ['last-drop','마지막한방울','공격기의 마지막 PP를 쓰면 PP가 소모된 다른 공격기 중 PP가 가장 적은 기술을 2 회복. 교체 진입당 1회.',['resource','physical','special'],c=>!support(c)],
    ['patient-growth','느긋한시동','전장에 연속으로 머문 3번째 턴의 종료에 공격·특공이 1단계 오릅니다. 교체되기 전에는 다시 발동하지 않습니다.',['slow','bulky'],c=>tag(c,'slow')||tag(c,'bulky')]
  ];
  function baseAbility(spec) {
    const referenceName=ORIGINAL_ABILITY_NAMES[spec[0]];
    return { id:spec[0],name:referenceName||spec[1],description:spec[2],tags:spec[3].slice(),source:referenceName?'원작 기반':'창작',referenceName:referenceName||null,original:false,setsEnvironment:[],requiresEnvironment:[],...(CREATIVE_ABILITY_RULES[spec[0]]||{}) };
  }
  const CREATIVE_ABILITY_RULES={
    'syncopation':{collection:'creative-1.8',mechanics:{trigger:'previous-move-category-changed',categories:['물리','특수'],damageMultiplier:1.25,resetOn:['변화','혼합']},rules:['기술의 물리·특수 분류와 종족값·실능치는 바꾸지 않습니다. 물리 다음 특수, 특수 다음 물리 기술의 피해만 1.25배로 합니다.','직전 사용 기술을 기준으로 판정합니다. 빗나가거나 막힌 기술도 분류를 기록하며, 행동 자체를 하지 못하면 기록을 유지합니다.','연타 전체에 한 번 판정합니다. 경정권은 혼합 기술이므로 강화되지 않고 기록을 지웁니다. 교체 시 기록을 지웁니다.']},
    'thrifty-pocket':{collection:'creative-1.8',mechanics:{trigger:'own-item-consumed',restore:'same-item',timing:'next-turn-end',limit:'once-per-battle'},rules:['처음 스스로 소모한 도구만 예약합니다. 지닌 도구가 없는 경우에만 다음 턴 종료에 복원하며, 이미 다른 도구를 지녔다면 예약을 소멸시킵니다.','도구를 빼앗기거나 파괴당한 경우에는 발동하지 않습니다. 예약은 교체해도 유지됩니다.']},
    'memory-scales':{collection:'creative-1.8',mechanics:{trigger:'same-type-as-last-damaging-move',receivedDamageMultiplier:0.75,recordUnit:'move',resetOnSwitch:true},rules:['공격 기술 시작 전의 기록으로 전체 타격을 판정하고, 기술 종료 후 실제 HP 피해를 받았다면 마지막으로 피해를 준 타격의 타입을 기록합니다.','타입 무효·보호·대타출동만으로 끝난 기술은 기록을 바꾸지 않습니다.']},
    'overflow-bank':{collection:'creative-1.8',mechanics:{trigger:'immediate-self-move-overheal',thresholdOverhealFraction:1/4,thresholdRounding:'floor-min-1',eventUnit:'single-heal-event',fullHpHealingCondition:'no-substitute',substitute:true,substituteHpFraction:1/4,substituteHpRounding:'floor-min-1',usesStandardSubstituteRules:true,accumulates:false,replaceExisting:false,hpCost:0,allowHealingAtFullHp:true},rules:['초과 회복량은 본래 회복량에서 실제로 회복한 HP를 뺀 값입니다. 한 번의 회복마다 별도로 판정합니다.','한 번의 초과분이 최대 HP의 1/4 이상이면 대타출동과 같은 대타를 만듭니다. 발동 기준과 대타 HP는 max(1, floor(최대 HP / 4))입니다. HP를 추가로 지불하지 않습니다.','자신을 즉시 회복하는 기술과 흡수 공격만 대상입니다. 소모 도구·턴 종료 회복·아군을 회복하는 기술은 제외합니다.','대타가 없으면 HP가 가득 차도 회복 효과를 사용할 수 있습니다. 이미 대타가 있으면 새 대타를 만들거나 기존 대타를 회복하지 않습니다.','기준 미만의 초과분은 버리며 여러 회복을 합산하지 않습니다. 피해·상태이상·관통 효과는 일반 대타 판정을 따릅니다.']},
    'mood-rider':{collection:'creative-1.8',mechanics:{trigger:'foe-weather-or-terrain-set',boosts:{spe:1},limit:'once-per-turn'},rules:['상대가 같은 전장을 갱신한 경우도 포함합니다. 전장 만료·해제·룸·설치물·아군의 생성에는 발동하지 않습니다.']},
    'last-drop':{collection:'creative-1.8',mechanics:{trigger:'last-attack-pp-spent',restorePp:2,limit:'once-per-entry',restoreTarget:'other-attack-with-missing-pp'},rules:['사용한 기술과 PP가 가득 찬 기술을 제외하고 다른 공격기의 현재 PP를 비교합니다. 동률이면 앞 기술 칸을 고릅니다. PP 최대치를 넘지 않습니다.','PP 0인 기술도 회복할 수 있습니다. 회복할 다른 공격기가 없으면 발동하지 않습니다.']}
  };
  const CREATIVE_MOVES=[
    {id:'fork-claw',name:'갈림발톱',type:'dark',category:'물리',power:70,pp:15,effect:'대상의 실효 방어・특방 중 낮은 쪽으로 피해 계산. 분류와 사용 능력치는 물리・공격 유지.',tags:['physical','adaptive-defense'],mechanics:{targetDefense:'lower-of-def-spd',tie:'def'},rules:['방어·특방이 같으면 방어를 사용합니다. 리플렉터 등 물리 기술에 대한 판정은 그대로 적용합니다. 자신의 능력치나 기술 분류를 바꾸지 않습니다.']},
    {id:'mirror-mail',name:'거울우편',type:'psychic',category:'특수',power:65,pp:10,effect:'이번 턴 대상에게 공격 피해를 받았다면 위력 95. 명중 후 자신의 주요 상태이상을 대상에게 옮김.',tags:['special','reactive'],mechanics:{powerWhenTookHit:95,statusTransfer:true},rules:['상태이상 전이는 이번 턴 대상에게 HP 피해를 받은 경우에만 시도합니다. 대상이 면역이면 자신의 상태도 유지합니다.','대타출동에 막히거나 대상이 기절했다면 상태를 옮기지 않습니다. 혼란 등 휘발성 상태는 제외합니다.']},
    {id:'root-pin',name:'뿌리바늘',type:'grass',category:'물리',power:50,pp:15,effect:'피해를 준 상대가 다음 턴 종료 전 자발적으로 교체하면 그 상대에게 최대 HP 1/8 피해. 한 번만 발동.',tags:['physical','mark'],mechanics:{mark:{expires:'next-turn-end',trigger:'voluntary-switch',damageFraction:1/8}},rules:['공격 후 교체 기술도 포함합니다. 강제 교체·기절 후 교대에는 피해 없이 표식을 지웁니다. 표식은 중첩하지 않습니다.','추가 피해는 공격 기술의 직접 피해가 아닙니다. 표식이 붙은 포켓몬이 나가기 직전에 받습니다. 대타출동에만 피해를 주었다면 표식을 붙이지 않습니다.']},
    {id:'seam-thrust',name:'봉합찌르기',type:'steel',category:'물리',power:60,pp:10,effect:'방어・특방이 내려간 상대에게 위력 110. HP 피해를 준 후 그 대상의 방어・특방 하락을 0으로 복원.',tags:['physical','debuff-consumer'],mechanics:{powerWhenTargetDebuffed:110,restoreTargetNegativeStages:['def','spd']},rules:['피해 계산과 빈틈노리기 판정 후 하락을 복원합니다. 상승한 단계는 건드리지 않습니다. 대타출동에만 피해를 주었다면 하락을 복원하지 않습니다.']},
    {id:'relay-stride',name:'이어달리기',type:'normal',category:'물리',power:60,pp:15,effect:'피해를 주고 교체. 자신의 공격・특공 상승 중 더 큰 쪽을 1단계만 다음 아군에게 전달.',tags:['physical','pivot'],mechanics:{pivot:true,passPositiveStage:{stats:['atk','spa'],max:1,tie:'atk'}},rules:['공격·특공이 모두 0 이하라면 교체만 합니다. 교체할 아군이 없거나 옥타곤 등으로 교체가 막히면 단계도 전달하지 않습니다.']},
    {id:'delayed-spark',name:'시간차꽃불',type:'fire',category:'특수',power:50,pp:15,effect:'피해를 준 상대에게 다음 턴 종료 시 최대 HP 1/8 추가 피해. 상대가 교체하면 소멸.',tags:['special','delayed'],mechanics:{mark:{trigger:'next-turn-end',damageFraction:1/8,clearsOnSwitch:true}},rules:['한 대상에 예약 하나만 유지합니다. 다시 명중해도 피해를 쌓거나 기한을 미루지 않습니다. 추가 피해는 직접 공격 피해가 아닙니다.']},
    {id:'fold-sky',name:'하늘접기',type:'flying',category:'특수',power:60,pp:10,effect:'피해를 준 뒤 날씨가 있으면 해제하고 자신의 특공 +1. 날씨가 없으면 공격만 함.',tags:['special','weather-clear'],mechanics:{clearWeatherOnDamage:true,boostIfCleared:{spa:1}},rules:['강한 햇살·뇌우 등 이 메이커의 모든 날씨에 적용합니다. 필드·룸은 해제하지 않습니다.']},
    {id:'footprint-heist',name:'발자국훔치기',type:'ground',category:'물리',power:60,pp:10,effect:'피해를 주면 자기 진영 설치물 하나를 상대 진영으로 이동. 겹 수도 옮기며 상대 최대 겹 수는 넘지 않음.',tags:['physical','hazard-transfer'],mechanics:{transferOwnHazard:true,priority:['hazard-toxic-spikes','hazard-stealth-rock','hazard-spikes','hazard-sticky-web']},rules:['독압정 → 스텔스록 → 압정뿌리기 → 끈적끈적네트 순으로 하나를 고릅니다. 자기 진영에서는 해당 종류를 전부 제거합니다. 상대 최대 겹 수를 넘는 분량은 사라집니다.']},
    {id:'held-breath',name:'참은숨',type:'normal',category:'변화',power:0,pp:10,priority:-3,accuracy:null,effect:'이번 턴 공격으로 잃은 HP의 절반 회복. 회복 상한은 최대 HP 1/3. 해당 피해가 없으면 실패.',tags:['support','heal','reactive'],noOverflow:true,mechanics:{healFromTurnAttackDamage:0.5,healCapFraction:1/3},rules:['반동·날씨·상태이상·설치물·HP 지불은 잃은 HP에 포함하지 않습니다. 회복량 강화 후에도 최대 HP의 1/3 상한을 적용합니다.']},
    {id:'safe-knot',name:'안전매듭',type:'fairy',category:'변화',power:0,pp:5,accuracy:null,effect:'자기 진영 설치물 하나를 제거. 다음에 교체로 등장한 아군의 HP 1/4 회복. 설치물이 없으면 실패.',tags:['support','heal','hazard-clear'],healingTarget:'next-ally',mechanics:{clearOwnHazard:true,nextAllyHealFraction:1/4,priority:['hazard-toxic-spikes','hazard-stealth-rock','hazard-spikes','hazard-sticky-web']},rules:['제거 순서는 독압정 → 스텔스록 → 압정뿌리기 → 끈적끈적네트입니다. 해당 종류의 모든 겹을 제거합니다.','회복 예약은 진영당 하나입니다. 예약이 이미 있으면 사용에 실패합니다. 다음 교체 진입의 설치물 처리 후 살아 있다면 회복하고 예약을 소모합니다.']}
  ].map(move=>({templateId:'creative',accuracy:100,priority:0,source:'창작',original:false,setsEnvironment:[],requiresEnvironment:[],collection:'creative-1.8',...move}));
  function typedAbilities(typeId) {
    const type = TYPE_MAP[typeId];
    const ability = (id,name,description,tags,extra={}) => ({ id:`${id}-${typeId}`,name,description,type:typeId,tags,source:'창작',original:false,setsEnvironment:[],requiresEnvironment:[],...extra });
    const result = [
      ability('skin',`${type.name}스킨`,typeId === 'normal' ? '노말 공격 타격의 타입을 유지하고 해당 타격의 피해를 1.2배로 합니다.' : `노말 공격 타격을 ${type.name} 타입으로 바꾸고 해당 타격의 피해를 1.2배로 합니다.`,['skin']),
      ability('surge',SURGE_NAMES[typeId],`HP가 최대치의 1/3 이하이면 ${type.name} 타입 공격 피해가 1.5배가 됩니다. 타격마다 현재 HP를 판정합니다.`,['low-hp']),
    ];
    const originalSkin={normal:'노말스킨',ice:'프리즈스킨',electric:'일렉트릭스킨',flying:'스카이스킨',fairy:'페어리스킨'}[typeId];
    const surge={grass:'심록',fire:'맹화',water:'급류',bug:'벌레의알림'}[typeId];
    if (originalSkin) Object.assign(result[0],{name:originalSkin,source:'원작 기반',referenceName:originalSkin});
    else Object.assign(result[0],{name:({fire:'블레이즈',water:'아쿠아',grass:'리프',fighting:'파워',poison:'베놈',ground:'샌드',psychic:'마인드',bug:'인섹트',rock:'스톤',ghost:'팬텀',dragon:'와이번',dark:'나이트',steel:'메탈'})[typeId]+'스킨',source:'타입 확장',referenceName:'스킨 계열'});
    if (surge) Object.assign(result[1],{name:surge,source:'원작 기반',referenceName:surge});
    else Object.assign(result[1],{source:'타입 확장',referenceName:'심록·맹화·급류 계열'});
    return result;
  }
  const ENV_SETTER_NAMES={
    'weather-dark-aura':'어스름','weather-strong-wind':'바람몰이','weather-quiet-fog':'안개장이','weather-poison-gas':'매캐한숨','weather-thunderstorm':'우레소리',
    'terrain-ant-colony':'개미굴메이커','terrain-octagon':'옥타곤메이커','terrain-white-paint':'페인트메이커','terrain-swamp':'스왐프메이커'
  };
  const ENV_ABILITIES=ENVIRONMENT_RULES.list.flatMap(environment=>{
    if(environment.source==='원작 기반')return [];
    const kind=environment.id.split('-')[0],base={type:environment.type,source:'창작',original:false,affinity:environment.affinity};
    const setter={...base,id:kind+'-call-'+environment.id,name:ENV_SETTER_NAMES[environment.id]||environment.name.replace(/ 필드$/,'')+'부르기',description:`등장 시 ${environment.name} 5턴 생성.`,tags:[kind,'setter'],setsEnvironment:[environment.id],requiresEnvironment:[]};
    if(kind==='weather')setter.balanceReference='가뭄·잔비: 등장 시 날씨 5턴';
    if(kind==='room')return [setter];
    const receiver={...base,id:kind+'-receiver-'+environment.id,name:environment.name.replace(/ 필드$/,'')+(kind==='weather'?'걸음':'코트'),description:kind==='weather'?`${environment.name} 동안 스피드 ×2.`:`${environment.name} 동안 받는 공격 피해 ×0.8.`,tags:[kind,'beneficiary',kind==='weather'?'fast':'bulky'],setsEnvironment:[],requiresEnvironment:[environment.id]};
    if(kind==='weather') {
      const residual=Boolean(environment.mechanics.endTurnDamage||environment.mechanics.lightning);
      Object.assign(receiver,{description:`${environment.name} 동안 스피드 ×2.${residual?' 해당 날씨의 턴 종료 피해 면역.':''}`,activeEnvironments:[environment.id],statModifier:{stat:'spe',multiplier:2},weatherResidualImmunity:residual?[environment.id]:[],balanceReference:residual?'모래헤치기: 스피드 ×2 + 해당 날씨 피해 면역':'쓱쓱·엽록소·눈치우기: 해당 날씨에서 스피드 ×2',rules:[
        '해당 날씨가 없거나 날씨 효과가 무효면 스피드 보정도 없습니다. 추가 공격 강화·회복·피해 감소는 붙이지 않습니다.',
        ...(residual?['면역은 해당 날씨의 턴 종료 피해에만 적용합니다. 독가스의 금지 기술 실패 피해와 상대의 공격 기술은 막지 않습니다.']:[])
      ]});
    }
    return [setter,receiver];
  }).concat(ORIGINAL_ENVIRONMENTS.abilities);

  // Attack templates have a distinct battle role and a fixed category.
  const MOVE_SPECS = [
    ['strike','펀치','물리',85,100,15,0,'추가 효과 없이 공격합니다.',['physical']],
    ['beam','빔','특수',90,100,10,0,'명중하면 10% 확률로 대상의 특방을 1단계 내립니다.',['special']],
    ['recoil','태클','물리',120,100,10,0,'모든 타격 종료 후 자신도 실제로 준 총 HP 피해의 1/3만큼 반동 피해를 받습니다.',['physical','recoil']],
    ['recoil-light','돌진','물리',90,85,15,0,'준 피해의 1/4만큼 반동 피해를 받습니다.',['physical','recoil']],
    ['nova','오버버스트','특수',130,90,5,0,'명중 여부와 관계없이 사용 후 자신의 특공이 2단계 내려갑니다.',['special']],
    ['sure','스마트샷','특수',60,null,20,0,'명중·회피 수치와 관계없이 명중합니다. 보호와 타입 무효는 무시하지 못합니다.',['special']],
    ['quick','잽','물리',40,100,20,1,'우선도 +1로 공격합니다.',['physical','priority']],
    ['drain','드레인펀치','물리',75,100,10,0,'실제로 준 HP 피해의 절반만큼 자신의 HP를 회복합니다.',['physical','drain']],
    ['siphon','드레인빔','특수',75,100,10,0,'실제로 준 HP 피해의 절반만큼 자신의 HP를 회복합니다.',['special','drain']],
    ['pivot','턴어택','물리',60,100,15,0,'대상에게 HP 피해를 주면 공격 종료 후 대기 중인 아군과 교체합니다. 교체 가능한 아군이 없으면 공격만 합니다.',['physical','pivot']],
    ['relay','턴빔','특수',60,100,15,0,'대상에게 HP 피해를 주면 공격 종료 후 대기 중인 아군과 교체합니다. 교체 가능한 아군이 없으면 공격만 합니다.',['special','pivot']],
    ['break','브레이크','물리',80,100,15,0,'대상에게 HP 피해를 주면 대상 진영의 피해 경감 장막을 제거합니다. 보호 기술은 뚫지 못합니다.',['physical','dispel']],
    ['erode','틈새빔','특수',70,100,15,0,'대상에게 HP 피해를 주면 대상의 특방을 1단계 내립니다.',['special','debuff']],
    ['crush','크래시','물리',70,100,15,0,'대상에게 HP 피해를 주면 대상의 방어를 1단계 내립니다.',['physical','debuff']],
    ['critical','커터','물리',70,100,15,0,'이 기술은 급소 단계가 1 높습니다.',['physical','critical']],
    ['mixed-twin','경정권','혼합','45 + 45',100,10,0,'1타는 공격으로 물리 공격, 2타는 특공으로 특수 공격합니다. 두 타격의 타입은 같습니다.',['mixed','two-hit']],
    ['dual-twin','더블타입어택','혼합','45 + 45',100,10,0,'1타는 첫 번째 타입, 2타는 두 번째 타입으로 공격합니다. 각 타격의 분류는 아래 타격표를 따릅니다.',['dual-type','two-hit']],
    ['body','몸통밀기','물리',80,100,10,0,'자신의 공격 대신 방어를 공격 측 능력치로 사용합니다. 대상의 방어로 피해를 계산합니다.',['physical-bulk','body']],
    ['spirit','마음누르기','특수',80,100,10,0,'자신의 특공 대신 특방을 공격 측 능력치로 사용합니다. 대상의 특방으로 피해를 계산합니다.',['special-bulk','spirit']],
    ['gyro','느림보스핀','물리','1~150',100,10,0,'위력 = min(150, max(1, floor(25 × 대상 실효 스피드 / 자신의 실효 스피드))). 우선도는 스피드 비율에 영향을 주지 않습니다.',['physical','slow']],
    ['revenge','되받아치기','물리',60,100,10,-4,'이 턴에 대상의 공격 기술로 HP 피해를 받았다면 위력이 120이 됩니다.',['physical','slow']],
    ['vital','풀파워빔','특수','60~120',100,10,0,'위력 = 60 + floor(60 × 현재 HP / 최대 HP). 공격 직전에 위력을 정합니다.',['special','balloon']],
    ['finish','마무리치기','물리',70,100,15,0,'공격 직전 대상 HP가 최대치의 절반 이하이면 위력이 105가 됩니다.',['physical']],
    ['heal','숨고르기','변화',0,null,5,0,'자신의 최대 HP의 절반을 회복합니다.',['support','heal']],
    ['purify','씻어내기','변화',0,null,10,0,'자신의 최대 HP의 1/4을 회복하고 자신의 독·맹독·화상·마비·수면·얼음 상태를 모두 회복합니다.',['support','heal']],
    ['cocoon-rest','쉼표고치','변화',0,null,5,0,'최대 HP의 1/3 회복, 방어 +1단계. 다음 턴 종료까지 스스로 교체할 수 없음.',['support','heal']],
    ['guard','몸지키기','변화',0,null,10,4,'이번 턴 자신을 대상으로 한 공격·변화 기술을 막습니다. 연속 사용 시 성공률은 처음 100%, 이후 직전 성공률의 1/3입니다. 다른 기술을 쓰면 초기화합니다.',['support','protect']],
    ['rally','힘모으기','변화',0,null,15,0,'자신의 공격을 2단계 올립니다.',['physical','boost']],
    ['focus','생각모으기','변화',0,null,15,0,'자신의 특공을 2단계 올립니다.',['special','boost']],
    ['duality','더블차지','변화',0,null,15,0,'자신의 공격과 특공을 각각 1단계 올립니다.',['mixed','boost']],
    ['fortify','단단해지기','변화',0,null,10,0,'자신의 방어와 특방을 각각 1단계 올립니다.',['bulky','boost']],
    ['accelerate','발놀림','변화',0,null,15,0,'자신의 스피드를 2단계 올립니다.',['fast','boost']],
    ['reset','리셋웨이브','변화',0,null,10,0,'전장에 있는 모든 포켓몬의 능력치 단계를 0으로 되돌립니다.',['support','reset']],
    ['flurry','연속치기','물리','25 × 2~5',95,15,0,'2~5타. 개미굴 필드에서는 5타.',['physical','variable-hit']],
    ['volley','연발탄','특수','20 × 2~5',100,15,0,'2~5타. 개미굴 필드에서는 5타.',['special','variable-hit']],
    ['flinch','움찔치기','물리',60,100,15,0,'30% 확률로 풀죽게 함.',['physical','flinch']],
    ['special-flinch','움찔빔','특수',60,100,15,0,'20% 확률로 풀죽게 함.',['special','flinch']],
    ['wind-gust','바람일으키기','특수',40,100,35,0,'독가스 날씨를 해제합니다.',['special','wind']],
    ['sound-wave','울림','특수',80,100,10,0,'소리 기술. 독가스에서는 실패하고 HP 1/8 피해.',['special','sound']],
    ['weather-set','웨더콜','변화',0,null,10,0,'전용 날씨를 5턴 동안 만듭니다.',['weather','setter']],
    ['terrain-set','필드메이커','변화',0,null,10,0,'전용 필드를 5턴 동안 만듭니다.',['terrain','setter']],
    ['room-set','거꾸로룸','변화',0,null,5,0,'거꾸로룸을 5턴 동안 만듭니다.',['room','setter']],
    ['weather-ball','웨더볼','특수',50,100,10,0,'날씨가 있으면 위력 2배·날씨 타입. 화이트 페인트에서는 노말 타입.',['special','beneficiary','weather-reactive']],
    ['terrain-pulse','대지의파동','특수',50,100,10,0,'필드가 있으면 위력 2배·필드 타입. 화이트 페인트에서는 노말 타입.',['special','beneficiary','terrain-reactive']],
    ['weather-hit','웨더어택','가변',70,100,10,0,'전용 날씨에서 위력이 105가 됩니다.',['weather','beneficiary']],
    ['terrain-hit','필드어택','가변',70,100,10,0,'자신이 접지했고 전용 필드가 있으면 위력이 105가 됩니다.',['terrain','beneficiary']],
    ['weather-blow','하늘깨우기','가변',55,100,10,0,'대상에게 HP 피해를 주면 전용 날씨를 5턴 동안 만듭니다.',['weather','setter']],
    ['terrain-blow','필드러시','가변',55,100,10,0,'대상에게 HP 피해를 주면 전용 필드를 5턴 동안 만듭니다.',['terrain','setter']],
  ];
  const SPEC_MAP = Object.fromEntries(MOVE_SPECS.map(spec => [spec[0], spec]));
  const BASE_MOVE_NAMES = {heal:'HP회복',guard:'방어',reset:'흑안개','weather-ball':'웨더볼','terrain-pulse':'대지의파동','wind-gust':'바람일으키기'};
  const TYPE_EXPANSIONS={strike:'기본 단타 공격',beam:'특방 하락 공격',recoil:'이판사판태클 계열','recoil-light':'돌진',nova:'오버히트 계열',sure:'필중 공격',quick:'전광석화 계열',drain:'드레인펀치',siphon:'기가드레인',pivot:'유턴',relay:'볼트체인지',break:'깨뜨리다',erode:'특방 하락 공격',crush:'방어 하락 공격',critical:'베어가르기 계열',body:'바디프레스',gyro:'자이로볼',revenge:'리벤지',finish:'소금물 계열'};
  const TYPED_MOVE_NAMES = {
    strike:{fire:'불꽃펀치',electric:'번개펀치',ice:'냉동펀치',ghost:'섀도펀치'},
    beam:{grass:'에너지볼',psychic:'사이코키네시스',bug:'벌레의야단법석',steel:'러스터캐논'},
    'recoil-light':{normal:'돌진'},
    drain:{fighting:'드레인펀치'},break:{fighting:'깨뜨리다'},body:{fighting:'바디프레스'},gyro:{steel:'자이로볼'},revenge:{fighting:'리벤지'},
    recoil:{normal:'이판사판태클',fire:'플레어드라이브',electric:'볼트태클',grass:'우드해머',flying:'브레이브버드'},
    nova:{fire:'오버히트',grass:'리프스톰',dragon:'용성군',psychic:'사이코부스트'},
    sure:{normal:'스피드스타',fighting:'파동탄'},
    quick:{normal:'전광석화',fighting:'마하펀치',steel:'불릿펀치',water:'아쿠아제트',ghost:'야습',ice:'얼음뭉치'},
    siphon:{grass:'기가드레인'},pivot:{bug:'유턴',water:'퀵턴'},relay:{electric:'볼트체인지'},
    critical:{normal:'베어가르기',ghost:'섀도클로',dark:'깜짝베기',grass:'리프블레이드'}
  };
  const DRAIN_NAMES={normal:'기운빼앗기',fire:'잿불주먹',water:'물살훔치기',electric:'찌릿빼앗기',grass:'덩굴채찍질',ice:'서리훔치기',poison:'독니빼앗기',ground:'흙기운훔치기',flying:'산들빼앗기',psychic:'꿈결훔치기',bug:'턱힘빼앗기',rock:'돌기운빼앗기',ghost:'그림자빼앗기',dragon:'비늘빼앗기',dark:'기운가로채기',steel:'쇳빛빼앗기',fairy:'소원빼앗기'};
  const HIT_RULE = '명중은 1회, 자속·상성은 타격별 계산. 무효여도 다음 타격 진행. 기절 시 중단, 방어로 모두 차단.';

  function makeMove(templateId, typeId, context, secondaryType, environmentId) {
    if(environmentId&&templateId.endsWith('-set')&&ENV_MAP[environmentId]?.setterMoveId) return clone(ORIGINAL_ENVIRONMENTS.moves.find(m=>m.id===ENV_MAP[environmentId].setterMoveId));
    if(templateId==='dual-twin'&&DUAL_TYPE_RANK[typeId]>DUAL_TYPE_RANK[secondaryType]) [typeId,secondaryType]=[secondaryType,typeId];
    if (BOOST_MAP[templateId]) return clone(RANKUPS.originals.find(m=>m.id==='original-boost-'+BOOST_MAP[templateId]));
    if(typeId==='normal'&&['strike','beam'].includes(templateId))templateId=templateId==='strike'?'critical':'siphon';
    typeId=FIXED_SUPPORT_TYPES[templateId]||typeId;
    const envKind = ['weather','terrain','room'].find(kind => [kind+'-set',kind+'-hit',kind+'-blow'].includes(templateId));
    const environment=environmentId?ENV_MAP[environmentId]:envKind?environmentForType(envKind,typeId):null;
    if(environment?.setterMoveId&&templateId.endsWith('-set'))return clone(ORIGINAL_ENVIRONMENTS.moves.find(m=>m.id===environment.setterMoveId));
    if(environment&&envKind)typeId=environment.type;
    const spec = SPEC_MAP[templateId], type = TYPE_MAP[typeId];
    const category = spec[2] === '가변' ? mainCategory(context) : spec[2];
    const sharedName=['heal','purify','cocoon-rest','guard','rally','focus','duality','fortify','accelerate','reset'].includes(templateId);
    const move = { id:`${templateId}-${typeId}`,templateId,name:sharedName?spec[1]:`${type.stem}${spec[1]}`,type:typeId,category,power:spec[3],accuracy:spec[4],pp:spec[5],priority:spec[6],effect:spec[7],tags:spec[8].slice(),source:'창작',original:false,setsEnvironment:[],requiresEnvironment:[] };
    const referenceName=TYPED_MOVE_NAMES[templateId]?.[typeId]||BASE_MOVE_NAMES[templateId];
    if (referenceName) Object.assign(move,{name:referenceName,source:'원작 기반',referenceName});
    else if(TYPE_EXPANSIONS[templateId]) Object.assign(move,{source:'타입 확장',referenceName:TYPE_EXPANSIONS[templateId]});
    if(templateId==='drain'&&DRAIN_NAMES[typeId])move.name=DRAIN_NAMES[typeId];
    if(['crush','erode','beam'].includes(templateId)) {
      move.targetDebuffs={ [templateId==='crush'?'def':'spd']:-1 };
      move.debuffChance=templateId==='beam'?0.1:1;
    }
    if(['flurry','volley'].includes(templateId))Object.assign(move,{hitRange:[2,5],hitProbabilities:{2:0.35,3:0.35,4:0.15,5:0.15},powerPerHit:templateId==='flurry'?25:20,source:'타입 확장',referenceName:'가변 연타 계열'});
    if(['flinch','special-flinch'].includes(templateId))Object.assign(move,{flinchChance:templateId==='flinch'?0.3:0.2,source:'타입 확장',referenceName:'풀죽음 공격 계열'});
    if(templateId==='sound-wave')Object.assign(move,{source:'타입 확장',referenceName:'소리 공격 계열'});
    if(move.name==='벌레의야단법석')move.tags.push('sound');
    if (templateId === 'body') { move.attackStat = 'def'; move.defenseStat = 'def'; }
    if (templateId === 'spirit') { move.attackStat = 'spd'; move.defenseStat = 'spd'; }
    if (templateId === 'mixed-twin' || templateId === 'dual-twin') {
      const isMixed = templateId === 'mixed-twin';
      const firstCategory = isMixed ? '물리' : mainCategory(context);
      const secondCategory = isMixed ? '특수' : firstCategory;
      const hit = (id, cat) => ({ type:id,category:cat,power:45,attackStat:cat === '물리' ? 'atk' : 'spa',defenseStat:cat === '물리' ? 'def' : 'spd' });
      move.hits = [hit(typeId, firstCategory), hit(templateId === 'dual-twin' ? secondaryType : typeId, secondCategory)];
      move.category = isMixed ? '혼합' : firstCategory;
      move.hitRule = HIT_RULE;
      if (templateId === 'dual-twin') {
        if (!secondaryType || secondaryType === typeId) throw new Error('이원 기술에는 서로 다른 두 타입이 필요합니다.');
        move.id += `-${secondaryType}-${isMixed?'mixed':firstCategory==='특수'?'special':'physical'}`;
        const ending=firstCategory==='특수'?'연발탄':'연격';
        move.name = `이원 ${typeId==='dragon'?'용':TYPE_LETTERS[typeId]}${TYPE_LETTERS[secondaryType]} ${ending}`;
        move.secondaryType = secondaryType;
        move.effect = `${type.name} → ${TYPE_MAP[secondaryType].name}, ${firstCategory} 2타.`;
      } else {
        move.name = `${TWO_WAY_NAMES[typeId]}경정권`;
        move.effect = `${type.name} 타입으로 물리 1타 + 특수 1타.`;
      }
    }
    if (envKind) {
      move.id=templateId+'-'+environment.id+(move.category==='변화'?'':'-'+(move.category==='물리'?'physical':'special'));
      move.environmentId = environment.id;
      if (templateId==='weather-set') move.name=`${environment.name}부르기`;
      if (templateId==='terrain-set') move.name=`${environment.name}만들기`;
      if (templateId==='room-set') move.name=environment.name;
      if (templateId.endsWith('-hit')) move.name=environment.name.replace(/ 필드$/,'')+(move.category==='물리'?'어택':'빔');
      if (templateId.endsWith('-blow')) move.name=environment.name.replace(/ 필드$/,'')+(move.category==='물리'?'깨우기':'펼치기');
      if(environment.source==='원작 기반'&&['-hit','-blow'].some(s=>templateId.endsWith(s))) {
        const theme={'weather-sun':'햇살','weather-rain':'장대비','weather-sandstorm':'사금','weather-snow':'눈꽃','weather-hail':'우박','terrain-electric':'전하','terrain-grassy':'새싹','terrain-misty':'달무리','terrain-psychic':'마음결'}[environment.id];
        move.name=theme+(templateId.endsWith('-hit')?(move.category==='물리'?'러시':'버스트'):(move.category==='물리'?'깨우기':'펼치기'));
      }
      if(envKind==='terrain')move.effect=move.effect.replace('자신이 접지했고 전용 필드가 있으면','전용 필드가 있으면');
      move.effect = move.effect.replace(/전용 날씨/g, `${environment.name} 날씨`).replace(/전용 필드/g, `${environment.name} 필드`);
      if (move.tags.includes('setter')) move.setsEnvironment = [environment.id];
      if (move.tags.includes('beneficiary')) move.requiresEnvironment = [environment.id];
    }
    if(['weather-ball','terrain-pulse'].includes(templateId)) {
      move.type='normal';move.id=templateId;
      if(environment) {move.environmentId=environment.id;move.requiresEnvironment=[environment.id];}
    }
    if (typeId==='rock' || secondaryType==='rock') {
      if (move.category!=='변화' && move.accuracy!=null) {
        move.accuracy=Math.max(60,move.accuracy-10);
        if(move.hits) {for(const hit of move.hits) if(hit.type==='rock') hit.power=Math.round(hit.power*1.1/5)*5; move.power=move.hits.map(h=>h.power).join(' + ');}
        else if(typeof move.power==='number') move.power=Math.round(move.power*1.1/5)*5;
        move.typeAdjustment='바위 공격은 명중 −10, 고정 위력 약 1.1배(5 단위 반올림). 가변 위력은 보정하지 않습니다.';
        // Numerical adjustments are already shown in the power and accuracy fields.
      }
    }
    return move;
  }

  function chooseAbility(context, rng) {
    const candidates = ABILITY_SPECS.filter(spec => spec[4](context)).map(spec => ({ value:baseAbility(spec),weight:spec[3].some(value => tag(context,value)) ? 5 : 2 }));
    for(const ability of FAN.abilities)if(FAN.eligible(ability,context))candidates.push({value:ability,weight:ability.tags.some(t=>tag(context,t))?5:2});
    for (const typeId of context.types) {
      for (const ability of typedAbilities(typeId)) {
        if(ability.tags.includes('skin')) continue;
        let weight = ability.tags.includes('skin') ? 4 : ability.tags.includes('beneficiary') ? 2 : 3;
        if (ability.tags.some(value => tag(context,value))) weight += 2;
        candidates.push({ value:ability,weight });
      }
    }
    for(const type of TYPES) candidates.push({value:typedAbilities(type.id)[0],weight:1});
    for(const ability of ENV_ABILITIES) if(ability.affinity.some(type=>context.types.includes(type))&&!(ability.id==='solar-power'&&!special(context)&&!mixed(context))&&!(ability.id==='grass-pelt'&&!tag(context,'bulky')&&!support(context))) candidates.push({value:ability,weight:ability.tags.includes('setter')?3:2});
    // Keep integer weights: foreign skins have one tenth of their previous relative weight.
    for(const candidate of candidates) if(!candidate.value.tags.includes('skin')||context.types.includes(candidate.value.type)) candidate.weight*=10;
    const ability = clone(rng.weighted(candidates));
    ability.reason = `${context.classification.label} 후보에서 시드 추첨${ability.tags.includes('skin')?' · 자기 타입 밖의 스킨은 낮은 가중치':''}.`;
    return ability;
  }

  const TYPE_STYLES={
    normal:['support','heal','protect','boost'],grass:['support','heal','drain','boost'],
    water:['heal','drain','pivot'],fire:['physical','special','recoil'],electric:['fast','priority','pivot'],
    ice:['debuff','critical'],fighting:['physical','drain','body'],poison:['debuff','support'],
    ground:['slow','body'],flying:['pivot','priority'],psychic:['special','boost'],bug:['pivot','drain'],
    rock:['physical','critical'],ghost:['debuff','reset','protect'],dragon:['mixed','special'],
    dark:['critical','priority'],steel:['physical-bulk','body','protect'],fairy:['heal','protect','boost']
  };
  function chooseRankup(context,rng) {
    const eligible=move=> {
      const b=move.boosts;
      if(tag(context,'slow') && b.spe) return false;
      if(support(context) || tag(context,'armored')) return Boolean(b.def||b.spd) && !b.atk && !b.spa;
      if(mixed(context)) return Boolean(b.atk && b.spa);
      if(physical(context)) return Boolean(b.atk);
      return Boolean(b.spa);
    };
    const pool=RANKUPS.custom.filter(eligible);
    return clone(rng.weighted(pool.map(move=>({value:move,weight:(context.types.includes(move.type)?3:1)*(move.gainTotal>=5?3:10)}))));
  }
  function enhancedBy(ability,move,context) {
    if(ability.collection==='fan-selection-1.10')return FAN.enhancedBy(ability,move);
    const attack=move.category!=='변화';
    const hits=move.hits||(move.hitPowers?move.hitPowers.map(power=>({type:move.type,category:move.category,power,attackStat:move.category==='물리'?'atk':'spa'})):[{type:move.type,category:move.category,power:move.power,attackStat:move.attackStat||(move.category==='물리'?'atk':'spa')}]);
    if(ability.tags.includes('skin')) return attack&&hits.some(h=>h.type==='normal');
    if(ability.tags.includes('low-hp')) return attack&&hits.some(h=>h.type===ability.type);
    if(ability.attackModifier) return attack&&hits.some(h=>ability.attackModifier.types.includes(h.type));
    if(ability.statModifier?.stat==='spa')return attack&&hits.some(h=>h.attackStat==='spa');
    if(ability.setsEnvironment.length) return attack&&ability.setsEnvironment.some(id=>hits.some(h=>(ENV_MAP[id].mechanics?.damage?.[h.type]||1)>1)||(ENV_MAP[id].mechanics?.flinchMultiplier>1&&move.flinchChance>0));
    switch(ability.id) {
      case 'two-rhythms':return move.templateId==='mixed-twin';
      case 'muscle-focus':return attack&&hits.some(h=>h.category==='물리');
      case 'mind-focus':return attack&&hits.some(h=>h.category==='특수');
      case 'first-step':case 'late-force':case 'patient-growth':return attack;
      case 'syncopation':return attack&&['물리','특수'].includes(move.category);
      case 'last-drop':return attack;
      case 'overflow-bank':return !move.noOverflow&&move.healingTarget!=='next-ally'&&(move.tags.includes('heal')||move.tags.includes('drain'));
      case 'weak-point':return attack&&Boolean(move.targetDebuffs?.def||move.targetDebuffs?.spd);
      case 'fitted-armor':return attack&&hits.some(h=>h.attackStat==='def'||h.attackStat==='spd');
      case 'recoil-balance':return move.tags.includes('recoil');
      case 'drain-cycle':return move.tags.includes('drain');
      case 'small-engine':return attack&&(typeof move.powerPerHit==='number'&&move.powerPerHit<=60||hits.some(h=>typeof h.power==='number'&&h.power<=60));
      case 'recovery-pulse':return move.category==='변화'&&move.tags.includes('heal');
      case 'priority-plan':return move.category==='변화'&&!move.tags.includes('heal')&&!move.tags.includes('protect')&&!move.bonusEffects?.some(e=>e.kind==='heal');
      case 'balanced-gears':return attack&&hits.some(h=>context.stats.atk===context.stats.spa||h.attackStat===(context.stats.atk<context.stats.spa?'atk':'spa'));
      default:return false;
    }
  }
  function enhancementMoves(ability,context,rng) {
    if(ability.id==='persistent'||ability.mechanics?.requiresDelayedAttack)return [];
    const main=mainCategory(context),own=context.types[0];
    if(ability.id==='two-rhythms') return context.types.map(type=>makeMove('mixed-twin',type,context));
    if(ability.tags.includes('skin')) return [
      makeMove(mixed(context)?'mixed-twin':main==='물리'?'crush':'siphon','normal',context),
      makeMove(main==='물리'?'finish':'erode','normal',context)
    ];
    if(ability.id==='priority-plan') return [chooseRankup(context,rng),makeMove('room-set',own,context,undefined,'room-inverse')];
    if(ability.id==='recovery-pulse') return ['cocoon-rest','purify'].map(id=>makeMove(id,own,context));
    if(ability.id==='overflow-bank') return ['cocoon-rest','purify'].map(id=>makeMove(id,own,context));
    if(ability.id==='syncopation')return ['crush','erode'].map(id=>makeMove(id,own,context));
    const candidates=[];
    const boostedTypes=[...(ability.attackModifier?.types||[]),...ability.setsEnvironment.flatMap(id=>Object.entries(ENV_MAP[id].mechanics?.damage||{}).filter(([,multiplier])=>multiplier>1).map(([type])=>type))];
    // A mixed form keeps its single-type two-way attack before optional dual-type attacks.
    if(mixed(context)) candidates.push(makeMove('mixed-twin',own,context));
    const preferred=ability.setsEnvironment.includes('weather-quiet-fog')?['flinch','special-flinch']:ability.setsEnvironment.includes('terrain-ant-colony')?['flurry','volley']:{
      'recoil-balance':['recoil','recoil-light'],'drain-cycle':['drain','siphon'],
      'fitted-armor':['body','spirit'],'small-engine':main==='물리'?['quick','pivot']:['sure','relay'],
      'weak-point':main==='물리'?['crush','erode']:['erode','crush'],
      'muscle-focus':['critical','recoil','quick'],'mind-focus':['siphon','sure','nova']
    }[ability.id] || (main==='물리'?['critical','recoil','quick']:['siphon','sure','nova']);
    for(const id of preferred) for(const type of [...new Set([...context.types,...boostedTypes])]) candidates.push(makeMove(id,type,context));
    if(!['fitted-armor','recoil-balance','drain-cycle','weak-point'].includes(ability.id)) for(const id of ['crush','erode','finish','relay','pivot','flurry','volley']) for(const type of [...new Set([...context.types,...boostedTypes])]) candidates.push(makeMove(id,type,context));
    // Balanced gears can prefer the weaker attacking stat even outside a mixed form.
    if(ability.id==='balanced-gears') for(const id of context.stats.atk<=context.stats.spa?['critical','quick']:['siphon','sure']) candidates.push(makeMove(id,own,context));
    const result=[];
    for(const move of candidates) if(usable(move,context)&&enhancedBy(ability,move,context)&&!result.some(m=>m.id===move.id)) {result.push(move);if(result.length===2)break;}
    if(result.length===1) throw new Error('강화 기술 후보 부족: '+ability.id);
    return result;
  }
  function fixedMoveCandidates(context,moves) {
    const defensive=support(context)||tag(context,'bulky')||tag(context,'balloon')||tag(context,'armored');
    return [...CREATIVE_MOVES,...ARSENAL.moves,...FAN.moves].filter(move=>{
      if(!usable(move,context)||moves.some(m=>m.id===move.id))return false;
      if(move.category==='물리'&&(special(context)||support(context)&&context.stats.atk<80))return false;
      if(move.category==='특수'&&(physical(context)||support(context)&&context.stats.spa<80))return false;
      if(move.category==='변화'&&!defensive)return false;
      if(move.priority<0&&tag(context,'fast')&&!defensive)return false;
      if(move.id==='seam-thrust'&&!moves.some(m=>m.targetDebuffs?.def||m.targetDebuffs?.spd))return false;
      return true;
    });
  }
  function chooseCreativeMove(context,moves,rng) {
    const candidates=fixedMoveCandidates(context,moves);
    if(!candidates.length)return null;
    return clone(rng.weighted(candidates.map(move=>({value:move,weight:(context.types.includes(move.type)?6:1)*(move.tags.some(t=>tag(context,t))?3:1)}))));
  }
  function createLoadout(context, rng) {
    if (!context || !Array.isArray(context.types) || context.types.length < 1 || context.types.length > 2 || new Set(context.types).size !== context.types.length || context.types.some(id => !TYPE_MAP[id])) throw new Error('유효한 단일 또는 복합 타입이 필요합니다.');
    const ability = chooseAbility(context, rng), moves = [], supportMoves=[],synergy = [];
    const primary=context.types[0],second=context.types[1],preferredType=()=>rng.pick(context.types);
    const add=move=>{if(usable(move,context)&&moves.length<4 && !moves.some(m=>m.id===move.id)) moves.push(move);};
    const addSupport=move=>{if(move&&supportMoves.length<2&&!supportMoves.some(m=>m.id===move.id)) supportMoves.push(clone(move));};
    if(ability.id==='persistent') {
      for(const id of [tag(context,'slow')?'original-trick-room':'original-magic-room','original-wonder-room']) {
        const move=clone(ORIGINAL_ENVIRONMENTS.moves.find(m=>m.id===id));
        move.effectiveDuration=FAN.describe(move,ability).duration;move.effect=move.effect.replace('5턴',move.effectiveDuration+'턴');addSupport(move);
      }
      synergy.push('끈질긴손길 연계 룸 2개: 기본 5턴 → 7턴.');
    }
    if(ability.mechanics?.requiresDelayedAttack){FAN.originals.forEach(addSupport);synergy.push(ability.name+' 연계: 미래예지 / 파멸의소원. 원작 연계기는 전용기 4칸과 별도로 제공됩니다.');}
    const tool=(id,type=preferredType())=>BOOST_MAP[id]?chooseRankup(context,rng):makeMove(id==='heal'?'cocoon-rest':id,type,context);
    const enhanced=enhancementMoves(ability,context,rng);
    for(const move of enhanced) add(move);
    if(enhanced.length) synergy.push(`${ability.name} 적용 기술: ${enhanced.map(m=>m.name).join(' / ')}.`);
    const wantsDual=Boolean(second)&&rng.int(1,100)<=65;
    if(mixed(context)&&!moves.some(m=>m.templateId==='mixed-twin')) add(makeMove('mixed-twin',preferredType(),context));
    if(moves.length<4&&(ability.collection==='creative-1.8'||rng.int(1,100)<=55)) {
      const creative=chooseCreativeMove(context,moves,rng);
      if(creative)add(creative);
    }
    if(wantsDual) add(makeMove('dual-twin',primary,context,second));
    const companion={
      'recoil-balance':'recoil','drain-cycle':mainCategory(context)==='물리'?'drain':'siphon',
      'weak-point':mainCategory(context)==='물리'?'crush':'erode',
      'fitted-armor':context.stats.def>=context.stats.spd?'body':'spirit',
      'recovery-pulse':'heal','quiet-repair':'heal','priority-plan':'fortify',
      'small-engine':mainCategory(context)==='물리'?'quick':'sure',
      'balanced-gears':context.stats.atk<=context.stats.spa?'critical':'siphon',
      'turnaround':mainCategory(context)==='물리'?'pivot':'relay'
    }[ability.id];
    if(companion && !enhanced.length) {const move=tool(companion);add(move);}
    for(const id of ability.requiresEnvironment) {
      const move=makeMove(id.split('-')[0]+'-set',ENV_MAP[id].type,context,undefined,id);
      if(move.source==='원작 기반')addSupport(move);else add(move);
    }
    if(!moves.some(m=>m.category!=='변화')) add(makeMove(support(context)&&defensiveAttack(context,'def')&&primary!=='fighting'?'body':support(context)&&defensiveAttack(context,'spd')?'spirit':mainCategory(context)==='물리'?'crush':'erode',preferredType(),context));
    const defensive=support(context)||['bulky','physical-bulk','special-bulk','balloon','armored'].some(t=>tag(context,t));
    if(defensive) {
      if(!moves.some(m=>m.tags.includes('heal'))) add(tool('heal'));
      if(support(context)&&moves.length<4) add(rng.int(0,1)?tool('guard'):chooseRankup(context,rng));
    } else if(moves.length<4) add(chooseRankup(context,rng));
    if(context.types.some(t=>t==='normal'||t==='grass') && moves.length<4) add(tool(rng.pick(['purify','guard','reset'])));
    let environmentId=[...ability.setsEnvironment,...ability.requiresEnvironment][0];
    if(!environmentId && moves.length<=2 && rng.int(1,100)<=35) {
      const candidates=ENVIRONMENTS.filter(e=>(e.affinity?e.affinity.some(type=>context.types.includes(type)):context.types.includes(e.type))&&!(ability.tags.includes('skin')&&e.mechanics?.suppressSkins));
      if(candidates.length)environmentId=rng.pick(candidates).id;
    }
    if(environmentId) {
      const kind=environmentId.split('-')[0],type=ENV_MAP[environmentId].type;
      if(ENV_MAP[environmentId].setterMoveId&&!ability.setsEnvironment.includes(environmentId)) addSupport(ORIGINAL_ENVIRONMENTS.moves.find(m=>m.id===ENV_MAP[environmentId].setterMoveId));
      const hasSetter=ability.setsEnvironment.includes(environmentId)||[...moves,...supportMoves].some(m=>m.setsEnvironment.includes(environmentId));
      if(!hasSetter && moves.length<=2 && kind!=='hazard') add(makeMove(kind==='room'?'room-set':kind+'-blow',type,context,undefined,environmentId));
      if(['weather','terrain'].includes(kind)&&moves.length<4 && (hasSetter||moves.some(m=>m.setsEnvironment.includes(environmentId)))) {
        add(makeMove(kind+'-hit',type,context,undefined,environmentId));
      }
    }
    while(moves.length<4) {
      const used=new Set(moves.map(m=>m.templateId)),fillType=preferredType();
      const candidates=MOVE_SPECS.filter(spec=>{
        if(fillType==='normal'&&['strike','beam'].includes(spec[0]))return false;
        if(used.has(spec[0])||spec[8].some(t=>['two-hit','setter','beneficiary'].includes(t)))return false;
        if(!BOOST_MAP[spec[0]]&&!usable(makeMove(spec[0],fillType,context),context))return false;
        if(BOOST_MAP[spec[0]])return !used.has('rankup');
        if(spec[8].includes('physical')&&special(context))return false;
        if(spec[8].includes('special')&&physical(context))return false;
        if(spec[8].includes('mixed')&&!mixed(context))return false;
        if(spec[8].includes('slow')&&!tag(context,'slow'))return false;
        if(spec[8].includes('balloon')&&!tag(context,'balloon'))return false;
        if(spec[8].includes('body')&&!tag(context,'physical-bulk'))return false;
        if(spec[8].includes('spirit')&&!tag(context,'special-bulk'))return false;
        return true;
      }).map(spec=>({value:spec[0],weight:(spec[8].some(t=>tag(context,t))?5:1)*(context.types.some(type=>TYPE_STYLES[type].some(t=>spec[8].includes(t)))?3:1)}));
      const fixed=fixedMoveCandidates(context,moves).filter(m=>['arsenal-1.9','fan-selection-1.10'].includes(m.collection)).map(move=>({value:clone(move),weight:context.types.includes(move.type)?6:1}));
      const chosen=rng.weighted([...candidates,...fixed]);
      add(typeof chosen==='string'?tool(chosen,fillType):chosen);
    }
    // Original support techniques stay outside the four signature slots.
    const candidates=ORIGINAL_ENVIRONMENTS.moves.filter(m=>!supportMoves.some(x=>x.id===m.id)&&(
      m.worksWith?.some(id=>[...ability.setsEnvironment,...ability.requiresEnvironment,...moves.flatMap(x=>[...x.setsEnvironment,...x.requiresEnvironment])].includes(id))
      ||m.setsEnvironment.some(id=>ENV_MAP[id].kind==='설치물'&&ENV_MAP[id].affinity.some(t=>context.types.includes(t)))
      ||m.clearsEnvironment&&context.types.includes(m.type)));
    if(candidates.length)addSupport(rng.pick(candidates));
    for(const move of supportMoves)if(move.mechanics?.delayedAttack){const timing=FAN.describe(move,ability);move.effect=timing.effect;move.activationSchedule=timing.activations;}
    const allItems=[ability,...moves,...supportMoves];
    const envIds = [...new Set(allItems.flatMap(item => [...item.setsEnvironment,...item.requiresEnvironment]))];
    if(enhanced.length && allItems.filter(m=>m!==ability&&enhancedBy(ability,m,context)).length<2) throw new Error('강화 기술 2개 배정 누락: '+ability.id);
    if(ability.collection==='fan-selection-1.10'&&allItems.filter(m=>m!==ability&&enhancedBy(ability,m,context)).length<2)throw new Error('선택 특성의 연계 기술 부족: '+ability.id);
    for (const id of envIds) {
      const setters = allItems.filter(item => item.setsEnvironment.includes(id));
      const receivers = allItems.filter(item => item.requiresEnvironment.includes(id));
      if (receivers.length && !setters.length) throw new Error(`환경 생성 수단 누락: ${id}`);
      if (receivers.length) synergy.push(`${setters.map(item => item.name).join(' / ')} → ${ENV_MAP[id].name} → ${receivers.map(item => item.name).join(' / ')}.`);
      else if(ENV_MAP[id].kind==='설치물')synergy.push(`${setters.map(item=>item.name).join(' / ')} → 상대 진영에 ${ENV_MAP[id].name} 설치.`);
      else synergy.push(`${setters.map(item => item.name).join(' / ')}으로 ${ENV_MAP[id].name}을 만듭니다. 환경 자체의 효과는 상대에게도 적용될 수 있습니다.`);
    }
    return { ability,moves,supportMoves,environment:envIds.map(id => {const e=clone(ENV_MAP[id]);if(ability.id==='persistent'&&supportMoves.some(m=>m.effectiveDuration&&m.setsEnvironment.includes(id))){e.baseDuration=e.duration;e.duration+=2;e.effect=e.effect.replace('5턴','7턴');e.rules=e.rules.map(r=>r.replace('5턴','7턴'));e.rules.push('끈질긴손길로 기본 지속시간 +2턴.');}return e;}),synergy };
  }

  let library;
  function getLibrary() {
    if (!library) {
      const sample = { types:['normal'],stats:{hp:90,atk:110,def:65,spa:110,spd:65,spe:90},classification:{offense:'mixed',tags:['mixed'],label:'쌍두형'} };
      const environmentTemplates=['weather-set','weather-hit','weather-blow','terrain-set','terrain-hit','terrain-blow','room-set'];
      const moves = TYPES.flatMap(type => MOVE_SPECS.filter(spec => spec[0] !== 'dual-twin' && !(type.id==='normal'&&['strike','beam'].includes(spec[0])) && !environmentTemplates.includes(spec[0]) && !BOOST_MAP[spec[0]] && (!FIXED_SUPPORT_TYPES[spec[0]] || FIXED_SUPPORT_TYPES[spec[0]]===type.id)).map(spec => makeMove(spec[0],type.id,sample)));
      for(const environment of ENVIRONMENT_RULES.list) {
        if(environment.kind==='설치물')continue;
        const kind=environment.id.split('-')[0];
        if(environment.source!=='원작 기반')moves.push(makeMove(kind+'-set',environment.type,sample,undefined,environment.id));
        if(kind!=='room') for(const category of ['physical','special']) for(const suffix of ['hit','blow']) {
          const context={...sample,stats:{...sample.stats,atk:category==='physical'?110:65,spa:category==='special'?110:65}};
          moves.push(makeMove(kind+'-'+suffix,environment.type,context,undefined,environment.id));
        }
      }
      moves.push(...clone(RANKUPS.originals),...clone(RANKUPS.custom),...clone(ORIGINAL_ENVIRONMENTS.moves),...clone(CREATIVE_MOVES),...clone(ARSENAL.moves),...clone(FAN.moves),...clone(FAN.originals));
      for (let i=0;i<DUAL_TYPE_ORDER.length;i++) for (let j=i+1;j<DUAL_TYPE_ORDER.length;j++) for(const offense of ['physical','special']) {
        const context={...sample,stats:{...sample.stats,atk:offense==='special'?65:110,spa:offense==='physical'?65:110},classification:{...sample.classification,offense}};
        moves.push(makeMove('dual-twin',DUAL_TYPE_ORDER[i],context,DUAL_TYPE_ORDER[j]));
      }
      library = { types:TYPES,abilities:[...ABILITY_SPECS.map(baseAbility),...TYPES.flatMap(type=>typedAbilities(type.id)),...ENV_ABILITIES,...clone(FAN.abilities)],moves,environments:ENVIRONMENTS,rules:[...RULES,...RANKUPS.rules,...ARSENAL.rules,'타입 성향은 기술 추첨 가중치에 적용합니다. 풀·노말은 빈 슬롯에 변화기를 우선 배정합니다. 타입 파생의 바위 공격은 명중 −10과 고정 위력 약 1.1배를 함께 적용합니다. 고정 설계 전용기는 표기 수치를 사용합니다.'],typeStyles:TYPE_STYLES,templateCount:MOVE_SPECS.length };
    }
    return clone(library);
  }
  return { TYPES:TYPES,createLoadout,getLibrary,enhancedBy };
})();
export default api;
