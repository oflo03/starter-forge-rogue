// Starter Forge maker v1.10.0 snapshot. See ../MAKER_SOURCE.json.
const api=(()=>{
  'use strict';
  const stage=(stat,stages)=>({kind:'stat-stage',stat,stages,target:'self',timing:'after-use'});
  const moves=[
    {id:'decisive-fist',name:'승부주먹',type:'fighting',category:'물리',power:70,pp:5,arsenalFamily:'sure-crit',alwaysCrit:true,effect:'반드시 급소. 사용 후 자신의 방어 −1.',penalties:[stage('def',-1)]},
    {id:'frost-petal-breath',name:'서리꽃숨',type:'ice',category:'특수',power:70,accuracy:95,pp:10,arsenalFamily:'sure-crit',alwaysCrit:true,effect:'반드시 급소. 사용 후 자신의 스피드 −1.',penalties:[stage('spe',-1)]},
    {id:'shadow-awl',name:'그림자송곳',type:'ghost',category:'특수',power:65,pp:10,arsenalFamily:'sure-crit',alwaysCrit:true,effect:'반드시 급소. 다음 턴 종료까지 자신의 회복 기술 사용 불가.',penalties:[{kind:'healing-lock',target:'self',until:'next-turn-end'}],rules:['회복 기술과 흡수 공격을 사용할 수 없습니다. 도구·특성의 회복은 막지 않습니다.']},
    {id:'gold-dust-awl',name:'사금송곳',type:'rock',category:'물리',power:65,accuracy:85,pp:10,arsenalFamily:'sure-crit',alwaysCrit:true,effect:'반드시 급소. 빗나가면 자신의 방어 −1.',penalties:[{...stage('def',-1),condition:'miss'}]},
    {id:'mind-awl',name:'마음송곳',type:'psychic',category:'특수',power:60,pp:10,arsenalFamily:'sure-crit',alwaysCrit:true,effect:'반드시 급소.',source:'타입 확장',referenceName:'확정 급소 공격 계열'},
    {id:'silver-flash',name:'은빛일섬',type:'steel',category:'물리',power:70,accuracy:90,pp:5,arsenalFamily:'sure-crit',alwaysCrit:true,effect:'반드시 급소. 연속 턴 사용 불가.',mechanics:{noConsecutive:true},penalties:[{kind:'reuse-lock',turns:1}]},

    {id:'surge-drumming',name:'너울두드림',type:'water',category:'물리',power:'35 × 3',powerPerHit:35,hitCount:3,accuracy:95,pp:10,arsenalFamily:'multi-hit',effect:'35 위력으로 3타.',source:'타입 확장',referenceName:'고정 연타 공격 계열'},
    {id:'vine-stitching',name:'덩굴재봉',type:'grass',category:'물리',power:'20 × 4',powerPerHit:20,hitCount:4,pp:10,arsenalFamily:'multi-hit',effect:'20 위력으로 4타. 준 총 HP 피해의 1/4 회복.',tags:['physical','drain'],mechanics:{drainFraction:1/4}},
    {id:'tiny-stampede',name:'작은발폭주',type:'bug',category:'물리',power:'18 × 5',powerPerHit:18,hitCount:5,accuracy:90,pp:10,arsenalFamily:'multi-hit',effect:'18 위력으로 5타.',source:'타입 확장',referenceName:'고정 연타 공격 계열'},
    {id:'scale-volley',name:'비늘갈래탄',type:'dragon',category:'특수',power:'30 × 3',powerPerHit:30,hitCount:3,pp:10,arsenalFamily:'multi-hit',effect:'30 위력으로 3타.',source:'타입 확장',referenceName:'고정 연타 공격 계열'},
    {id:'slime-shower',name:'점액세례',type:'poison',category:'특수',power:'25 × 3',powerPerHit:25,hitCount:3,accuracy:95,pp:10,arsenalFamily:'multi-hit',effect:'25 위력으로 3타. 3타까지 명중하면 대상 스피드 −1.',mechanics:{lastHitTargetBoosts:{spe:-1}}},
    {id:'feather-wave',name:'깃털파동',type:'flying',category:'특수',power:'20 + 30 + 40',hitPowers:[20,30,40],hitCount:3,pp:10,arsenalFamily:'multi-hit',effect:'20 → 30 → 40 위력으로 3타.'},

    {id:'spark-opener',name:'찌릿선수',type:'electric',category:'특수',power:55,priority:1,pp:10,arsenalFamily:'priority',effect:'우선도 +1. 사용 후 자신의 특공 −1.',penalties:[stage('spa',-1)]},
    {id:'sprout-dash',name:'새싹돋움',type:'grass',category:'물리',power:50,priority:1,pp:15,arsenalFamily:'priority',effect:'우선도 +1. 자신의 HP가 절반 이하이면 실패.',mechanics:{requiresUserHpAbove:0.5}},
    {id:'shade-overtake',name:'그늘앞지르기',type:'ghost',category:'특수',power:55,priority:1,pp:10,arsenalFamily:'priority',effect:'우선도 +1. 준 총 HP 피해의 1/3 반동.',tags:['special','priority','recoil'],penalties:[{kind:'recoil',damageFraction:1/3}]},
    {id:'frost-spur',name:'서리박차',type:'ice',category:'물리',power:60,priority:1,pp:10,arsenalFamily:'priority',effect:'우선도 +1. 사용 후 자신의 방어・특방 −1.',penalties:[stage('def',-1),stage('spd',-1)]},
    {id:'jump-the-line',name:'한발새치기',type:'normal',category:'물리',power:35,priority:2,pp:15,arsenalFamily:'priority',effect:'우선도 +2. 연속 턴 사용 불가.',mechanics:{noConsecutive:true},penalties:[{kind:'reuse-lock',turns:1}]},
    {id:'underfoot-strike',name:'발밑치기',type:'ground',category:'물리',power:40,accuracy:95,priority:1,pp:15,arsenalFamily:'priority',effect:'우선도 +1. HP 피해를 주면 대상 방어 −1.',targetDebuffs:{def:-1},debuffChance:1},

    {id:'ash-breakthrough',name:'잿빛돌파',type:'fire',category:'물리',power:140,accuracy:90,pp:5,arsenalFamily:'heavy',effect:'사용 후 자신의 방어 −2・특방 −1.',penalties:[stage('def',-2),stage('spd',-1)]},
    {id:'surge-collapse',name:'너울붕괴',type:'water',category:'특수',power:150,accuracy:90,pp:5,arsenalFamily:'heavy',effect:'사용 후 자신의 특공 −3.',penalties:[stage('spa',-3)]},
    {id:'scale-plunge',name:'비늘떨굼',type:'dragon',category:'물리',power:160,accuracy:85,pp:5,arsenalFamily:'heavy',effect:'사용 후 자신의 스피드 −2. 다음 턴 종료까지 자발 교체 불가.',penalties:[stage('spe',-2),{kind:'self-switch-lock',until:'next-turn-end'}]},
    {id:'all-in-thrust',name:'끝장내지르기',type:'fighting',category:'물리',power:150,accuracy:95,pp:5,arsenalFamily:'heavy',effect:'빗나가거나 막히면 최대 HP 1/2 피해. 명중 후 자신의 방어・특방 −1.',penalties:[{kind:'crash',maxHpFraction:1/2,conditions:['miss','protect','type-immunity']},{...stage('def',-1),condition:'hit'},{...stage('spd',-1),condition:'hit'}],rules:['실패 피해는 일반 반동과 구분하며 반동쿠션으로 줄이지 않습니다. 실패 피해로 기절할 수 있습니다.']},
    {id:'ridge-collapse',name:'산허리붕괴',type:'rock',category:'특수',power:160,accuracy:75,priority:-3,pp:5,arsenalFamily:'heavy',effect:'우선도 −3. 연속 턴 사용 불가.',mechanics:{noConsecutive:true},penalties:[{kind:'negative-priority',priority:-3},{kind:'reuse-lock',turns:1}]},
    {id:'wish-overload',name:'반짝과부하',type:'fairy',category:'특수',power:150,accuracy:90,pp:5,arsenalFamily:'heavy',effect:'명중 여부와 관계없이 사용 후 최대 HP의 1/2 소모. 이 소모로 기절할 수 있음.',penalties:[{kind:'hp-cost',fraction:1/2,timing:'after-use',onFailure:true,canFaint:true}]}
  ].map(move=>({templateId:'arsenal',collection:'arsenal-1.9',accuracy:100,priority:0,source:'창작',original:false,setsEnvironment:[],requiresEnvironment:[],penalties:[],mechanics:{},...move,tags:move.tags||[move.category==='물리'?'physical':'special',...(move.priority>0?['priority']:[]),...(move.alwaysCrit?['critical']:[])]}));
  for(const move of moves) {
    if(move.hitCount)move.rules=[...(move.rules||[]),'명중 판정은 한 번입니다. 대상이 쓰러지면 남은 타격은 중단합니다. 개미굴 필드는 고정 타격 수를 늘리지 않습니다.'];
    if(move.alwaysCrit)move.rules=[...(move.rules||[]),'단타·위력 70 이하이며, 사용하는 공격/특공 종족값 110 이하에만 배정합니다. 급소를 막는 효과가 없으면 확정 급소입니다. 이 도구의 급소 피해 배율은 1.5배입니다.'];
    if(move.mechanics.noConsecutive)move.rules=[...(move.rules||[]),'직전 턴에 이 기술을 사용했다면 이번 사용은 실패합니다. 빗나가거나 막힌 사용도 포함하며 교체 시 기록을 초기화합니다.'];
    if(move.type==='rock')move.typeAdjustment='바위 기술의 낮은 명중률은 표기 수치에 반영된 고정 설계입니다.';
  }
  return {moves,rules:['추가 공격기 24종은 확정 급소·연타·선공·고위력 각 6종이며, 각 항목은 고정 타입 하나만 갖습니다.','확정 급소기는 단타·위력 70 이하이며 사용하는 공격/특공 종족값 110 이하에만 배정합니다. 확정 급소만 결정력에 1.5배를 반영합니다. 일반 급소 확률·상대 능력치 단계·장막은 결정력 지표에 포함하지 않습니다.','고정 연타와 타격별 증가 위력은 타격 수와 개별 위력을 각각 계산합니다.']};
})();
export default api;
