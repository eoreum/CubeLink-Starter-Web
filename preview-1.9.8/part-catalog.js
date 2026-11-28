// Documented module profiles; not arbitrary internet research or physical validation.
export const documentedParts=[
 {name:'KY-018 조도 모듈',model:'KY-018',type:'analog',source:'https://www.sensorkit.joy-it.net/en/sensors/ky-018',spec:'Joy-IT 기준 조도에 따라 아날로그 출력이 변합니다. 실제 모듈의 전원 및 단자 표기를 대조하세요.',terminals:['S','+','-']},
 {name:'KY-037 소리 센서',model:'KY-037',type:'sound',source:'https://www.sensorkit.joy-it.net/en/sensors/ky-037',spec:'Joy-IT 기준 마이크 아날로그 신호 측정. 실제 모듈의 전원 및 AO 단자를 대조하세요.',terminals:['AO','DO','+','GND']},
 {name:'B10K 가변저항',model:'B10K',type:'pot',source:'https://docs.arduino.cc/built-in-examples/analog/Smoothing/',spec:'3단자 가변저항의 가운데 와이퍼를 아날로그 입력으로 사용합니다. 실제 부품의 저항값을 확인하세요.',terminals:['끝 단자 1','와이퍼','끝 단자 2']}
];
export function matchDocumented(query){
 const normalize=s=>String(s).toLowerCase().replace(/[\s-]/g,'');
 const q=normalize(query);
 if(!q)return [];
 return documentedParts.filter(p=>q.includes(normalize(p.model))||normalize(p.name).includes(q));
}
