// Starter Forge maker v1.10.0 snapshot. See ../MAKER_SOURCE.json.
const api=(()=>{
  'use strict';
  const persistentMoves=['중력','회복봉인','신비의부적','순풍','매직룸','트릭룸','원더룸'];
  const abilities=[
    {id:'persistent',name:'끈질긴손길',description:'자신이 기술로 만든 순풍·룸 등 지정 보조 효과의 지속시간 +2턴.',tags:['support','slow'],mechanics:{durationBonus:2,moves:persistentMoves},referenceUrl:'https://www.smogon.com/dex/sv/abilities/persistent/',rules:['중력·회복봉인·신비의부적·순풍·매직룸·트릭룸·원더룸에 적용합니다. 날씨·필드·설치물·거꾸로룸에는 적용하지 않습니다.','생성·갱신 시 기본 지속시간에 한 번 더합니다. 종료·해제에는 적용하지 않으며 중첩해서 연장하지 않습니다. 특성이 사라져도 이미 정한 만료 시점은 유지합니다.']},
    {id:'pendulum',name:'탄력붙이기',description:'같은 공격기를 연속 사용하면 10%씩 강화. 최대 1.5배. 다른 기술·교체 시 초기화.',tags:['physical','special','bulky'],mechanics:{repeatIncrement:0.1,repeatCap:1.5,metronomeStacking:false},referenceUrl:'https://wiki.p-insurgence.com/Pendulum_(Ability)',rules:['첫 사용은 1배, 두 번째 1.1배, 여섯 번째부터 1.5배입니다. 연타는 기술 사용 한 번으로 셉니다.','행동 불능으로 기술을 사용하지 못한 턴은 연속 기록을 끊습니다. 빗나가거나 보호·무효로 막힌 사용도 사용 횟수에 포함합니다. 변화기 사용·다른 기술 사용·교체 시 초기화합니다.','메트로놈 도구와 중첩하지 않고 더 높은 배율 하나만 적용합니다.']},
    {id:'periodic-orbit',name:'다시도는별',description:'지연 공격이 정상 발동한 뒤 3턴 후 한 번 더 발동. 두 번째 피해 ×0.5.',tags:['special','slow'],mechanics:{delayedRepeat:{afterFirstTurns:3,multiplier:0.5},requiresDelayedAttack:true},referenceUrl:'https://wiki.p-insurgence.com/Periodic_Orbit_(Ability)',rules:['미래예지·파멸의소원처럼 공격 자체를 예약하는 기술에만 적용합니다. 충전기·시간차꽃불의 표식·희망사항 같은 회복은 제외합니다.','사용 시 두 발동을 예약합니다. 두 번째 발동까지 같은 상대 자리의 지연 공격 슬롯을 점유합니다. 사용자가 교체·기절해도 예약은 유지되며, 대상 자리의 현재 포켓몬을 공격합니다.','추가 발동은 PP를 쓰지 않으며 급소 확률과 각 공격의 타격 수를 바꾸지 않습니다. 각 발동은 일반 지연 공격의 명중·상성·피해 판정을 따릅니다.']},
    {id:'early-comet',name:'이른혜성',description:'지연 공격이 사용한 턴에 즉시 발동. 추가 공격은 생성하지 않음.',tags:['special','fast'],mechanics:{immediateDelayedAttack:true,requiresDelayedAttack:true},rules:['미래예지·파멸의소원처럼 공격 자체를 예약하는 기술만 대상입니다. 충전기·턴 종료 표식·희망사항 같은 회복은 제외합니다.','원래 기술의 우선도로 행동할 때 즉시 한 번 공격합니다. 우선도 상승이나 추가 행동이 아니며, 미래의 공격 예약은 남기지 않습니다.','기존 지연 공격 슬롯의 점유 제한은 적용합니다. 이미 설치된 예약을 앞당기지는 않습니다.']}
  ].map(a=>({source:'창작',original:false,collection:'fan-selection-1.10',setsEnvironment:[],requiresEnvironment:[],...a}));
  const moves=[{id:'corrode',templateId:'fan-selected',name:'녹물세례',type:'poison',category:'특수',power:70,accuracy:100,pp:10,priority:0,effect:'강철 부분의 상성을 2배로 취급. 다른 타입의 상성은 유지.',tags:['special','type-override'],mechanics:{typeEffectivenessOverrides:{steel:2}},referenceUrl:'https://wiki.p-insurgence.com/Corrode_(move)',source:'창작',original:false,collection:'fan-selection-1.10',setsEnvironment:[],requiresEnvironment:[],rules:['강철/풀은 4배, 강철/독은 1배입니다. 기술 타입 변경·거꾸로룸에서도 강철 부분만 2배로 고정합니다.','다른 타입의 상성은 변경된 기술 타입·거꾸로룸을 정상 적용합니다. 타입 외 특성·보호·도구에 의한 무효는 무시하지 않습니다.']}];
  const originals=[
    {id:'original-future-sight',name:'미래예지',type:'psychic',power:120,accuracy:100,pp:10,referenceId:248},
    {id:'original-doom-desire',name:'파멸의소원',type:'steel',power:140,accuracy:100,pp:5,referenceId:353}
  ].map(m=>({templateId:'original-delayed',category:'특수',priority:0,effect:'사용 2턴 뒤 대상 자리에 지연 공격.',tags:['special','delayed-attack'],mechanics:{delayedAttack:{turns:2}},source:'원작 기반',original:true,setsEnvironment:[],requiresEnvironment:[],...m,referenceName:m.name,rules:['대상 자리별 지연 공격 슬롯을 사용하며, 이미 예약된 자리에는 중복 예약할 수 없습니다. 사용자가 교체·기절해도 예약은 유지됩니다.']}));
  function eligible(ability,context) {
    if(ability.id==='persistent')return context.classification.offense==='support'||context.classification.tags.some(t=>['slow','bulky'].includes(t));
    if(ability.mechanics.requiresDelayedAttack)return ['special','mixed'].includes(context.classification.offense);
    return context.classification.offense!=='support';
  }
  function enhancedBy(ability,move) {
    if(ability.id==='persistent')return persistentMoves.includes(move.name);
    if(ability.id==='pendulum')return move.category!=='변화';
    if(ability.mechanics?.requiresDelayedAttack)return Boolean(move.mechanics?.delayedAttack);
    return false;
  }
  function describe(move,ability,repeatUses=1) {
    const delayed=move.mechanics?.delayedAttack;
    return {
      effect:delayed?(ability.id==='early-comet'?'이른혜성: 사용한 턴에 즉시 공격.':ability.id==='periodic-orbit'?'2턴 뒤 공격. 5턴 뒤 피해 50%로 한 번 더 공격.':move.effect):undefined,
      duration:ability.id==='persistent'&&persistentMoves.includes(move.name)?(move.name==='순풍'?6:7):undefined,
      repeatMultiplier:ability.id==='pendulum'&&move.category!=='변화'?Math.min(15,10+Math.max(0,repeatUses-1))/10:1,
      activations:delayed?(ability.id==='early-comet'?[{turn:0,multiplier:1}]:ability.id==='periodic-orbit'?[{turn:delayed.turns,multiplier:1},{turn:delayed.turns+3,multiplier:0.5}]:[{turn:delayed.turns,multiplier:1}]):[]
    };
  }
  function effectiveness(move,targetTypes,chart,{inverse=false}={}) {
    return targetTypes.reduce((n,type)=>{
      const override=move.mechanics?.typeEffectivenessOverrides?.[type];
      const factor=chart[type]??1;
      return n*(override??(inverse?(factor===0||factor===0.5?2:factor===2?0.5:factor):factor));
    },1);
  }
  return {abilities,moves,originals,eligible,enhancedBy,describe,effectiveness};
})();
export default api;
