export const moduleTypes=['analog','sound','pir','dht'];
export function validateModuleMap(type,terminals,map){
 if(map==null)return undefined;
 if(!moduleTypes.includes(type)||!map||typeof map!=='object'||!Array.isArray(terminals))throw Error('이 부품 유형은 3단자 모듈 매핑을 지원하지 않습니다.');
 const values=['power','ground','signal'].map(k=>map[k]);
 if(values.some(v=>typeof v!=='string'||!terminals.includes(v))||new Set(values).size!==3)throw Error('전원·접지·신호는 서로 다른 실제 단자명을 선택하세요.');
 if(map.supply!=='5V')throw Error('현재 5V 호환 모듈만 지원합니다.');
 return {power:values[0],ground:values[1],signal:values[2],supply:'5V'};
}
