// Starter Forge maker v1.10.0 snapshot. See ../MAKER_SOURCE.json.
import ORIGINALS from './original-environments.js';
const api=(()=>{
  'use strict';

  const dimLight={solarBeamPower:0.5,recoveryFraction:0.25,recoveryMoves:['아침햇살','달빛','광합성']};
  const list=[
    {id:'weather-dark-aura',kind:'날씨',type:'dark',name:'어두운 오라',affinity:['dark','ghost'],duration:5,
      effect:'악 공격 ×1.2, 페어리 공격 ×0.5. 솔라빔 위력 절반, 아침햇살·달빛·광합성 회복 1/4. 웨더볼은 악 타입.',
      mechanics:{damage:{dark:1.2,fairy:0.5},...dimLight,weatherBallType:'dark'}},
    {id:'weather-strong-wind',kind:'날씨',type:'flying',name:'강풍',affinity:['flying','dragon','normal'],duration:5,
      effect:'매 턴 무작위 한 진영의 기술 우선도 +3. 웨더볼은 비행 타입.',
      mechanics:{randomSidePriority:{bonus:3,selection:'uniform-one-side',timing:'before-action-order',perTurn:true},weatherBallType:'flying'}},
    {id:'weather-quiet-fog',kind:'날씨',type:'ghost',name:'조용한 안개',affinity:['ghost','psychic','ice'],duration:5,
      effect:'명중률 ×0.7, 풀죽음 확률 ×2(최대 100%). 솔라빔 위력 절반, 아침햇살·달빛·광합성 회복 1/4. 웨더볼은 고스트 타입.',
      mechanics:{accuracyMultiplier:0.7,flinchMultiplier:2,...dimLight,weatherBallType:'ghost'}},
    {id:'weather-poison-gas',kind:'날씨',type:'poison',name:'독가스',affinity:['poison','steel'],duration:5,
      effect:'턴 종료: 독 타입 HP 1/16 회복, 독·강철 외 HP 1/16 피해. 소리·음파·기충전·용의숨결은 실패하고 사용자 HP 1/8 피해. 바람 기술 성공 시 해제. 웨더볼은 독 타입.',
      mechanics:{endTurnHeal:{types:['poison'],fraction:1/16},endTurnDamage:{immuneTypes:['poison','steel'],fraction:1/16},blockedMoveTags:['sound','sonic'],blockedMoveNames:['기충전','용의숨결'],failureDamage:1/8,clearOnSuccessfulMoveTag:'wind',weatherBallType:'poison'}},
    {id:'weather-thunderstorm',kind:'날씨',type:'electric',name:'뇌우',affinity:['electric','water'],duration:5,
      effect:'비 효과: 물 공격 ×1.5, 불꽃 ×0.5, 번개·폭풍 필중. 턴 종료 시 포켓몬마다 1/3 확률로 전기 상성을 적용한 HP 1/8 번개 피해. 웨더볼은 전기 타입.',
      mechanics:{inherits:'rain',damage:{water:1.5,fire:0.5},...dimLight,alwaysHitMoves:['번개','폭풍'],lightning:{chance:1/3,fraction:1/8,type:'electric',independentPerPokemon:true,timing:'end-of-turn',usesTypeEffectiveness:true,stab:false},weatherBallType:'electric'}},
    {id:'terrain-ant-colony',kind:'필드',type:'bug',name:'개미굴 필드',affinity:['bug','ground'],duration:5,
      effect:'모두 스킬링크: 가변 연타는 최대 횟수. 벌레 공격 ×1.2. 땅·벌레 타입은 회피 +1단계. 대지의파동은 벌레 타입·위력 2배.',
      mechanics:{appliesToAirborne:true,terrainPulseType:'bug',skillLink:true,damage:{bug:1.2},temporaryEvasion:{types:['ground','bug'],stages:1,stacking:false}}},
    {id:'terrain-octagon',kind:'필드',type:'fighting',name:'옥타곤 필드',affinity:['fighting','steel'],duration:5,
      effect:'격투 공격 ×1.2. 교체 불가. 모든 공격은 회피 단계를 무시하며 명중률은 적용. 대지의파동은 격투 타입·위력 2배.',
      mechanics:{appliesToAirborne:true,terrainPulseType:'fighting',damage:{fighting:1.2},blockSwitching:true,ignoreEvasion:true,applyAccuracy:true}},
    {id:'terrain-white-paint',kind:'필드',type:'normal',name:'화이트 페인트 필드',affinity:['normal','fairy'],duration:5,
      effect:'모든 포켓몬·기술을 노말 타입으로 고정. 스킨·타입 변경 특성·도구 무효. 웨더볼·대지의파동은 위력 증가를 유지하고 타입은 노말.',
      mechanics:{appliesToAirborne:true,forcePokemonType:'normal',forceMoveType:'normal',suppressSkins:true,suppressTypeChangingAbilities:true,suppressTypeChangingItems:true,preserveWeatherBallPower:true,preserveTerrainPulsePower:true}},
    {id:'terrain-swamp',kind:'필드',type:'ground',name:'스왐프 필드',affinity:['water','ground','poison'],duration:5,
      effect:'물·땅 외 스피드 ×0.5. 모든 포켓몬은 5카운트에서 턴마다 1 감소, 비·뇌우에서는 2 감소. 0이면 기절. 필드 영향을 벗어나면 초기화. 대지의파동은 땅 타입·위력 2배.',
      mechanics:{appliesToAirborne:true,terrainPulseType:'ground',speedMultiplier:0.5,speedExemptTypes:['water','ground'],countdown:{initial:5,step:1,rainStep:2,min:0,zeroEffect:'faint',allTypes:true,resetWhenUnaffected:true,timing:'end-of-turn-before-field-expiry'}}},
    {id:'room-inverse',kind:'공간 변화',type:'psychic',name:'거꾸로룸',affinity:['psychic','dark'],duration:5,
      effect:'타입별 상성 반전: 2배→1/2배, 1/2배·무효→2배. 복합 타입은 각각 반전 후 곱함.',
      mechanics:{inverseTypeChart:true,slot:'room',changesSpeedOrder:false}}
  ].concat(ORIGINALS.environments).map(item=>({...item,source:item.source||'창작',rules:[
    item.kind==='설치물'?'상대 진영별로 유지. 다른 종류와 공존하며 제거 전까지 지속.':item.kind==='공간 변화'?'룸별 독립 효과 · 5턴. 서로 다른 룸 및 날씨·필드와 공존.':`${item.kind} 슬롯 1개 · 5턴. 같은 효과는 기간 갱신, 다른 효과는 교체.`,
    item.kind==='공간 변화'?(item.mechanics.changesSpeedOrder?'우선도는 유지하고 같은 우선도의 스피드 순서를 반전합니다.':'스피드 순서를 바꾸지 않습니다.'):item.kind==='설치물'?'겹 수와 접지 조건은 각 설치물의 설명을 따릅니다.':item.mechanics.appliesToAirborne===false?'원작 필드의 강화·보호·회복은 각 접지 조건을 따릅니다.':'양 진영에 적용하며 비접지 포켓몬도 포함합니다.'
  ]}));
  list.find(e=>e.id==='weather-strong-wind').rules.push('행동 순서 결정 전에 진영을 50:50으로 한 번 뽑습니다. 그 진영의 모든 기술에 기존 우선도와 합산합니다.');
  list.find(e=>e.id==='weather-quiet-fog').rules.push('필중 기술은 명중률 감소를 무시합니다. 원래 풀죽음 확률이 0이면 그대로 0입니다.');
  list.find(e=>e.id==='weather-poison-gas').rules.push('금지 기술 실패 피해는 독·강철 타입도 받습니다. 바람 기술이 실패하면 해제하지 않습니다. 독·강철 복합 타입은 회복합니다. 기충전은 지정한 기술명 그대로 판정합니다.');
  list.find(e=>e.id==='weather-thunderstorm').rules.push('번개 피해는 기술이 아닌 날씨 피해입니다. 자속·명중·방어 계산 없이 전기 상성만 적용합니다. 땅 타입 무효도 거꾸로룸에서는 반전합니다.');
  list.find(e=>e.id==='weather-thunderstorm').rules.push('솔라빔 위력은 절반, 아침햇살·달빛·광합성 회복량은 최대 HP의 1/4입니다. 그 밖의 비 연동 특성·도구 상호작용도 비로 취급하되 웨더볼은 전기 타입입니다.');
  list.find(e=>e.id==='terrain-ant-colony').rules.push('투웨이·이원 등 고정 2타는 그대로 2타입니다. 회피 +1은 필드가 있는 동안만 적용하고 반복 생성으로 쌓이지 않습니다.');
  list.find(e=>e.id==='terrain-octagon').rules.push('자발·강제 교체와 공격 후 교체도 막습니다. 공격 후 교체 기술은 공격만 수행합니다. 기절 후 교대는 허용합니다.');
  list.find(e=>e.id==='terrain-white-paint').rules.push('화이트 페인트의 타입 고정이 최우선입니다. 실버디·아르세우스의 특성·도구도 타입을 바꾸지 못합니다. 필드가 끝나면 기존 타입을 복원합니다.');
  list.find(e=>e.id==='terrain-swamp').rules.push('물·땅도 기절 카운트는 적용합니다. 각 포켓몬이 영향을 받기 시작할 때 5로 시작합니다. 교체·필드 종료·면역 등으로 영향을 벗어나면 카운트를 없앱니다. 같은 필드 갱신은 진행 중인 카운트를 초기화하지 않습니다. 카운트 처리를 필드 잔여 턴 감소보다 먼저 합니다.');
  const byId=Object.fromEntries(list.map(e=>[e.id,e]));
  const resolve=id=>typeof id==='string'?byId[id]:id;
  function inverseEffectiveness(factors,inverse=false){return factors.reduce((value,n)=>value*(inverse?(n===0||n===0.5?2:n===2?0.5:n):n),1);}
  function describeMove(move,{weather,terrain,userTypes=[],skinType,grounded=!userTypes.includes('flying'),targetGrounded=true,suppressWeather=false}={}) {
    if(suppressWeather)weather=null;
    const w=resolve(weather)?.mechanics||{},t=resolve(terrain)?.mechanics||{};
    const ground= t.forcePokemonType ? true : grounded;
    const terrainApplies=t.appliesToAirborne!==false||ground;
    const isWeatherBall=move.templateId==='weather-ball'||move.name==='웨더볼';
    const isTerrainPulse=move.templateId==='terrain-pulse'||move.name==='대지의파동';
    const locked=Boolean(t.forceMoveType);
    let type=isWeatherBall&&w.weatherBallType?w.weatherBallType:isTerrainPulse&&terrain&&terrainApplies?(t.terrainPulseType||resolve(terrain).type):move.type;
    const skinActive=!t.suppressSkins&&Boolean(skinType)&&type==='normal'&&move.category!=='변화';
    if(skinActive)type=skinType;
    if(locked)type=t.forceMoveType;
    const powerMultiplier=(isWeatherBall&&weather||isTerrainPulse&&terrain&&terrainApplies?2:1)*(['솔라빔','솔라블레이드'].includes(move.name)?(w.solarBeamPower||1):1)
      *(move.referenceId===797&&resolve(terrain)?.id==='terrain-psychic'&&ground?1.5:1)
      *(move.referenceId===804&&resolve(terrain)?.id==='terrain-electric'&&targetGrounded?2:1)
      *(move.referenceId===802&&resolve(terrain)?.id==='terrain-misty'&&ground?1.5:1);
    const tags=move.tags||[];
    const fails=Boolean(w.blockedMoveTags?.some(tag=>tags.includes(tag))||w.blockedMoveNames?.includes(move.name));
    return {type,pokemonTypes:t.forcePokemonType?[t.forcePokemonType]:userTypes.slice(),skinActive,powerMultiplier,
      damageMultiplier:(w.damage?.[type]||1)*(terrainApplies?(t.damage?.[type]||1):1)*(targetGrounded?(t.targetDamage?.[type]||1):1)*(targetGrounded&&t.halfDamageMoves?.includes(move.name)?0.5:1)*(skinActive?1.2:1),
      accuracyMultiplier:move.accuracy==null||w.alwaysHitMoves?.includes(move.name)?1:w.reducedAccuracyMoves?.includes(move.name)?50/move.accuracy:(w.accuracyMultiplier||1),
      alwaysHit:move.accuracy==null||Boolean(w.alwaysHitMoves?.includes(move.name)),ignoreEvasion:Boolean(t.ignoreEvasion),
      flinchChance:Math.min(1,(move.flinchChance||0)*(w.flinchMultiplier||1)),
      hitCount:t.skillLink&&move.hitRange?move.hitRange[1]:(move.hits?.length||move.hitCount||move.hitPowers?.length),
      recoveryFraction:w.recoveryMoves?.includes(move.name)?w.recoveryFraction:undefined,
      priorityBonus:move.referenceId===803&&resolve(terrain)?.id==='terrain-grassy'&&ground?1:0,
      fails,failureDamageFraction:fails?(w.failureDamage||0):0,clearsWeather:!fails&&Boolean(w.clearOnSuccessfulMoveTag&&tags.includes(w.clearOnSuccessfulMoveTag))};
  }
  function fieldPokemonEffects(types,terrain) {
    const t=resolve(terrain)?.mechanics||{};
    return {types:t.forcePokemonType?[t.forcePokemonType]:types.slice(),speedMultiplier:t.speedMultiplier&&!types.some(type=>t.speedExemptTypes.includes(type))?t.speedMultiplier:1,evasionStages:t.temporaryEvasion&&types.some(type=>t.temporaryEvasion.types.includes(type))?t.temporaryEvasion.stages:0};
  }
  function tickSwamp(count,{affected=true,weather}={}) {
    if(!affected)return {count:null,faints:false};
    const next=Math.max(0,(count??5)-(resolve(weather)?.mechanics.inherits==='rain'?2:1));
    return {count:next,faints:next===0};
  }
  return {list,describeMove,inverseEffectiveness,fieldPokemonEffects,tickSwamp};
})();
export default api;
