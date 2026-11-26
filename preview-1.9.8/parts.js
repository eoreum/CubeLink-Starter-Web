import {pins,pwmPins,key,walkProject} from './engine.js?v=1.9.6-motor';
export const types={
 led:{label:'LED / 디지털 출력',roles:[['pin','digital']],block:'starter_write',setup:true},
 button:{label:'버튼 / 디지털 입력',roles:[['pin','digital']],block:'starter_button',input:true},
 analog:{label:'아날로그 센서 / 가변저항',roles:[['pin','analog']],block:'starter_analogRead'},
 dht:{label:'DHT11 온습도 센서',roles:[['pin','digital']],block:'starter_dhtTemperature',library:'DHT sensor library'},
 servo:{library:'Servo',label:'서보모터',roles:[['pin','digital']],block:'starter_servo'},
 motor:{label:'L298N DC 모터 채널',roles:[['en','pwm'],['in1','digital'],['in2','digital']],block:'starter_motor'},
 ultrasonic:{label:'HC-SR04 초음파',roles:[['trig','digital'],['echo','digital']],block:'starter_ultrasonic'}
};
const available=(board,kind)=>kind==='analog'?pins(board,true):kind==='pwm'?pwmPins(board):pins(board).filter(p=>!p.startsWith('A')&&!['0','1'].includes(p));
export function allocate(board,type,parts,project){
 const used=new Set();
 for(const p of parts)for(const v of Object.values(p.fields))used.add(key(board,v));
 for(const n of walkProject(project))for(const role of ['pin','en','in1','in2','trig','echo'])if(n[role]!==undefined)used.add(key(board,n[role]));
 const fields={};
 for(const [role,kind] of types[type].roles){const pin=available(board,kind).find(p=>!used.has(key(board,p)));if(pin===undefined)throw Error('사용 가능한 '+kind+' 핀이 부족합니다.');fields[role]=pin;used.add(key(board,pin));}
 return fields;
}
export function validateParts(board,parts){
 const used=new Set(),servo=parts.some(p=>p.type==='servo');
 for(const p of parts){if(!Object.hasOwn(types,p.type))throw Error('지원하지 않는 부품');for(const [r,k] of types[p.type].roles){const v=p.fields[r],canonical=key(board,v);if(!available(board,k).includes(v)||used.has(canonical))throw Error('핀 충돌 또는 지원하지 않는 핀: '+v);if(servo&&k==='pwm'&&(board==='mega'?['44','45','46']:['9','10']).includes(v))throw Error('Servo 타이머와 PWM 충돌: '+v);used.add(canonical);}}
}
export function partToolbox(parts){return parts.map(p=>{const t=types[p.type],contents=[{kind:'block',type:t.block,fields:p.fields}];if(p.type==='dht')contents.push({kind:'block',type:'starter_dhtHumidity',fields:p.fields});if(t.setup||t.input)contents.unshift({kind:'block',type:'starter_mode',fields:{pin:p.fields.pin,mode:t.input?'INPUT_PULLUP':'OUTPUT'}});return {kind:'category',name:p.name,colour:'#087e80',contents};});}
export function initParts({getProject,getWorkspace,baseToolbox}){
 const $=id=>document.getElementById(id),storage='cubelink-part-registry-v1';
 let all={};try{all=JSON.parse(localStorage.getItem(storage)||'{}')||{}}catch{}
 const list=()=>Array.isArray(all[getProject().board])?all[getProject().board]:[];
 const refresh=()=>{const parts=list();const box=baseToolbox();box.contents.push(...partToolbox(parts));getWorkspace().updateToolbox(box);$('partList').replaceChildren();for(const p of parts){const row=document.createElement('div');row.className='part-row';const label=document.createElement('strong');label.textContent=p.name+' · '+types[p.type].label+(types[p.type].library?' · 컴파일 시 '+types[p.type].library+' 자동 준비':'');row.append(label);for(const [role,kind] of types[p.type].roles){const sel=document.createElement('select');sel.setAttribute('aria-label',p.name+' '+role);for(const pin of available(getProject().board,kind)){const opt=document.createElement('option');opt.value=pin;opt.textContent=role+': '+pin;sel.append(opt)}sel.value=p.fields[role];sel.onchange=()=>{const old=p.fields[role];p.fields[role]=sel.value;try{validateParts(getProject().board,parts);save();refresh()}catch(e){p.fields[role]=old;sel.value=old;$('partStatus').textContent=e.message}};row.append(sel)}$('partList').append(row)}};
 const save=()=>localStorage.setItem(storage,JSON.stringify(all));
 for(const [id,t] of Object.entries(types)){const o=document.createElement('option');o.value=id;o.textContent=t.label;$('partType').append(o)}
 let draftUrl='';
 function sourceUrl(){
  const u=new URL($('sourceUrl').value.trim());
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('공개 제품 페이지 URL을 입력하세요.');
  return u.href;
 }
 $('copyPartPrompt').onclick=async()=>{try{
  const url=sourceUrl();
  await navigator.clipboard.writeText('다음 판매 페이지 또는 데이터시트를 직접 열어 모델명, 핀, 전원, 통신 방식을 확인하세요. 확인되지 않은 사양은 추정하지 마세요. '+url+' 지원 유형 '+JSON.stringify(Object.fromEntries(Object.entries(types).map(([k,v])=>[k,v.label])))+' 중 전기적 인터페이스와 코드가 호환될 때만 type을 지정하세요. 이외에는 unsupported로 답하세요. 결과는 코드 펜스 없이 JSON {"name":"모델명","type":"유형","source":"위 URL","spec":"핀·전원·통신 및 검증 근거"} 형태로 주세요.');
  $('draftStatus').textContent='분석 요청을 복사했습니다.';
 }catch(e){$('draftStatus').textContent=e.message}};
 $('reviewPart').onclick=()=>{try{
  const url=sourceUrl(), d=JSON.parse($('partDraft').value.trim().replace(/^```(?:json)?\s*|\s*```$/gi,''));
  if(d.source!==url||typeof d.name!=='string'||!d.name.trim()||d.name.length>40||typeof d.spec!=='string'||!d.spec.trim())throw Error('원본 링크와 모델명, 핀·전원 사양을 확인하세요.');
  if(!Object.hasOwn(types,d.type))throw Error('이 부품은 전용 드라이버 개발이 필요합니다. '+d.spec);
  $('aiMakerDialog').close();$('freeMode').click();refresh();draftUrl=url;$('sourceNote').textContent=d.spec+' · '+url;$('partName').value=d.name;$('partType').value=d.type;$('partDialog').showModal();
 }catch(e){$('draftStatus').textContent=e.message}};
 $('partOpen').onclick=()=>{refresh();$('partDialog').showModal()};$('partClose').onclick=()=>$('partDialog').close();
 $('partAdd').onclick=()=>{try{const board=getProject().board,parts=list(),type=$('partType').value,name=$('partName').value.trim();if(!name||name.length>40)throw Error('부품 이름을 1~40자로 입력하세요.');if(parts.some(p=>p.name===name))throw Error('같은 이름이 이미 등록되어 있습니다.');const item={id:crypto.randomUUID(),source:draftUrl,name,type,fields:allocate(board,type,parts,getProject())};validateParts(board,[...parts,item]);all[board]=[...parts,item];save();refresh();$('partStatus').textContent='등록 완료 · 왼쪽 도구함에서 '+name+' 블록을 사용하세요.';$('partName').value=''}catch(e){$('partStatus').textContent=e.message}};
 return refresh;
}
