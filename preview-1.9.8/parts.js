import {moduleTypes,validateModuleMap} from './module-pinmap.js?v=expansion1';
import {matchDocumented} from './part-catalog.js?v=1';
import {initResearch} from './part-research.js?v=expansion1';
import {terminalNames,drawRegistered} from './part-schema.js';
import {pins,pwmPins,key,walkProject} from './engine.js?v=tb-driver1';
export const types={
 tb6612:{label:'TB6612FNG 듀얼 모터 드라이버',roles:[]},
 custom:{label:'신규 모델 · 단자도 등록 (드라이버 검증 대기)',roles:[]},
 led:{label:'LED / 디지털 출력',roles:[['pin','digital']],block:'starter_write',setup:true},
 button:{label:'버튼 / 디지털 입력',roles:[['pin','digital']],block:'starter_button',input:true},
 digitalModule:{label:'디지털 신호 출력 센서 모듈',roles:[['pin','digital']],block:'starter_digitalRead',inputMode:'INPUT'},
 analog:{label:'아날로그 센서 / 가변저항',roles:[['pin','analog']],block:'starter_analogRead'},
 dht:{label:'DHT11 온습도 센서',roles:[['pin','digital']],block:'starter_dhtTemperature',library:'DHT sensor library'},
 servo:{library:'Servo',label:'서보모터',roles:[['pin','digital']],block:'starter_servo'},
 motor:{label:'L298N DC 모터 채널',roles:[['en','pwm'],['in1','digital'],['in2','digital']],block:'starter_motor'},
 pir:{label:'PIR 인체감지 센서',roles:[['pin','digital']],block:'starter_pir',inputMode:'INPUT'},
 tilt:{label:'기울기 스위치',roles:[['pin','digital']],block:'starter_tilt',input:true},
 sound:{label:'아날로그 소리 센서',roles:[['pin','analog']],block:'starter_sound'},
 temperature:{label:'TMP36 온도 센서',roles:[['pin','analog']],block:'starter_temperature'},
 pot:{label:'가변저항 (3단자)',roles:[['pin','analog']],block:'starter_pot'},
 ldr:{label:'LDR 조도센서 (분압)',roles:[['pin','analog']],block:'starter_ldr'},
 ultrasonic:{label:'HC-SR04 초음파',roles:[['trig','digital'],['echo','digital']],block:'starter_ultrasonic'}
};
const available=(board,kind)=>kind==='analog'?pins(board,true):kind==='pwm'?pwmPins(board):pins(board).filter(p=>!p.startsWith('A')&&!['0','1'].includes(p));
export function allocate(board,type,parts,project){
 if(type==='motor'&&parts.filter(p=>p.type==='motor').length>=2)throw Error('L298N 모터 1·2가 모두 등록되었습니다.');
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
export function partToolbox(parts){return parts.filter(p=>types[p.type]?.block).map(p=>{const t=types[p.type],contents=[{kind:'block',type:t.block,fields:p.type==='motor'?{channel:parts.filter(x=>x.type==='motor').indexOf(p)===0?'A':'B',...p.fields}:p.fields}];if(p.type==='dht')contents.push({kind:'block',type:'starter_dhtHumidity',fields:p.fields});if(t.setup||t.input||t.inputMode)contents.unshift({kind:'block',type:'starter_mode',fields:{pin:p.fields.pin,mode:t.inputMode||(t.input?'INPUT_PULLUP':'OUTPUT')}});return {kind:'category',name:p.name,colour:'#087e80',contents};});}
export function parsePartLibrary(text){
 if(typeof text!=='string'||text.length>200000)throw Error('부품 자료 파일은 200KB 이하만 지원합니다.');
 const data=JSON.parse(text);
 if(data?.version!==1||!Array.isArray(data.parts)||data.parts.length>100)throw Error('지원하지 않는 부품 자료 형식입니다.');
 return data.parts.map(p=>{
  if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>40||!Object.hasOwn(types,p.type)||typeof p.spec!=='string'||p.spec.length>4000||typeof p.source!=='string'||p.source.length>2000)throw Error('부품 이름 또는 사양을 확인하세요.');
  if(p.source){const u=new URL(p.source);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('제품 자료 주소를 확인하세요.')}
  const terminals=terminalNames(p.terminals||[]),pinMap=validateModuleMap(p.type,terminals,p.pinMap);return {name:p.name.trim(),type:p.type,source:p.source,spec:p.spec,terminals,...(pinMap?{pinMap}:{})};
 });
}
export function serializePartLibrary(parts){return JSON.stringify({version:1,parts:parts.map(({name,type,source='',spec='',terminals=[],pinMap})=>({name,type,source,spec,terminals,...(pinMap?{pinMap}:{})}))},null,2)}
export function initParts({getProject,getWorkspace,baseToolbox,onPartsChanged=()=>{}}){
 const $=id=>document.getElementById(id),storage='cubelink-part-registry-v1';
 let all={};try{all=JSON.parse(localStorage.getItem(storage)||'{}')||{}}catch{}
 const isTB=p=>p.type==='tb6612'||(p.type==='custom'&&/\bTB6612FNG\b/i.test(p.name));
 const list=()=>Array.isArray(all[getProject().board])?all[getProject().board]:[];
 const refresh=()=>{const parts=list();const host=$('registeredParts');

 drawRegistered(host,getProject().mission==='free'?parts.filter(p=>!isTB(p)):[]);const box=baseToolbox();box.contents.push(...partToolbox(parts));getWorkspace().updateToolbox(box);$('partList').replaceChildren();for(const p of parts){const row=document.createElement('div');row.className='part-row';const label=document.createElement('strong');label.textContent=p.name+' · '+(isTB(p)?types.tb6612.label:types[p.type].label)+(types[p.type].library?' · 컴파일 시 '+types[p.type].library+' 자동 준비':'');row.append(label);for(const [role,kind] of types[p.type].roles){const sel=document.createElement('select');sel.setAttribute('aria-label',p.name+' '+role);for(const pin of available(getProject().board,kind)){const opt=document.createElement('option');opt.value=pin;opt.textContent=role+': '+pin;sel.append(opt)}sel.value=p.fields[role];sel.onchange=()=>{const old=p.fields[role];p.fields[role]=sel.value;try{validateParts(getProject().board,parts);save();refresh()}catch(e){p.fields[role]=old;sel.value=old;$('partStatus').textContent=e.message}};row.append(sel)}$('partList').append(row)}onPartsChanged(parts)};
 const save=()=>localStorage.setItem(storage,JSON.stringify(all));
 const libraryKey='cubelink-shared-part-library-v1';
 let shared=[];try{shared=parsePartLibrary(localStorage.getItem(libraryKey)||'{"version":1,"parts":[]}')}catch{}
 $('partExport').onclick=()=>{
  const unique=new Map([...shared,...Object.values(all).filter(Array.isArray).flat()].map(p=>[p.name+'|'+p.type,p]));
  const url=URL.createObjectURL(new Blob([serializePartLibrary([...unique.values()])],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='CubeLink-Part-Library.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 $('partImport').onclick=()=>$('partImportFile').click();
 $('partImportFile').onchange=async e=>{try{
  const file=e.target.files[0];if(!file)return;if(file.size>200000)throw Error('파일이 너무 큽니다.');
  const incoming=parsePartLibrary(await file.text()),merged=new Map(shared.map(p=>[p.name+'|'+p.type,p]));
  for(const p of incoming){const k=p.name+'|'+p.type;if(!merged.has(k))merged.set(k,p)}
  if(merged.size>100)throw Error('공유 부품 목록은 최대 100개입니다.');
  const next=[...merged.values()];localStorage.setItem(libraryKey,serializePartLibrary(next));shared=next;
  $('partStatus').textContent='부품 자료 '+incoming.length+'개 불러오기 완료 · AI와 함께하기에서 제품명을 검색하고 사양을 확인하세요.';showMatches();
 }catch(err){$('partStatus').textContent=err.message}finally{e.target.value=''}};

 for(const [id,t] of Object.entries(types)){const o=document.createElement('option');o.value=id;o.textContent=t.label;$('partType').append(o)}
 let draftUrl='', draftSpec='', draftPins=[],manual=false;
 const mapFields=['mapPower','mapGround','mapSignal'];
 function clearMap(){for(const id of mapFields)$(id).value='';$('mapEnabled').checked=false;}
 function showMap(){const enabled=moduleTypes.includes($('partType').value);$('moduleMap').hidden=!enabled;if(!enabled)clearMap()}
 $('partType').addEventListener('change',showMap);
 function resetDraft(){clearMap();$('moduleMap').hidden=true;draftUrl='';draftSpec='';draftPins=[];manual=false;$('sourceNote').textContent='';$('manualSource').value='';$('manualSpec').value='';$('manualPins').value='';$('manualConfirmed').checked=false;$('manualPartDetails').open=false;$('partStatus').textContent='';$('partName').value='';$('partType').value='custom'}
 $('manualPartOpen').onclick=()=>{const name=$('catalogQuery').value.trim();$('aiMakerDialog').close();if(getProject().mission!=='free')$('freeMode').click();resetDraft();manual=true;refresh();$('partName').value=name.slice(0,40);$('manualPartDetails').open=true;$('partDialog').showModal()};
 function sourceUrl(){
  const u=new URL($('sourceUrl').value.trim());
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('공개 제품 페이지 URL을 입력하세요.');
  return u.href;
 }
 let productInfo='';
 $('sourceUrl').oninput=()=>{productInfo='';$('partDraft').value='';$('draftStatus').textContent=''};
 $('fetchPart').onclick=async()=>{const button=$('fetchPart');button.disabled=true;
  try{
   const url=sourceUrl();
   const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});
   if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error();
   const reader=response.body.getReader(),decoder=new TextDecoder();let html='',bytes=0;
   while(bytes<350000){const {value,done}=await reader.read();if(done)break;bytes+=value.length;html+=decoder.decode(value,{stream:true});}
   await reader.cancel();if(sourceUrl()!==url)return;
   const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/\s+/g,' ').trim().slice(0,200);
   if(!title)throw Error();
   const body=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
   const evidence=Array.from(body.matchAll(/.{0,50}(?:GPIO|VCC|GND|SDA|SCL|MISO|MOSI|UART|PWM|동작 전압|정격 전압|\d(?:\.\d)?\s*V\b).{0,85}/gi)).slice(0,12).map(m=>m[0]).join(' / ');
   productInfo=title+' '+evidence;
   const terms=Array.from(new Set((body.match(/\b(?:VCC|GND|SDA|SCL|MISO|MOSI|SCK|CS|RX|TX|TRIG|ECHO|ENA|ENB|IN[1-4])\b/gi)||[]).map(x=>x.toUpperCase())));
   if(evidence){$('partDraft').value=JSON.stringify({source:url,name:title.slice(0,40),type:'custom',spec:evidence,terminals:terms},null,2);}
   $('draftStatus').textContent='제품 페이지 제목: '+title+(evidence?' · 본문에서 추출한 사양과 단자 후보를 아래에서 검토하세요.':' · 단자와 전원 사양을 추가 확인하세요.');
  }catch{$('draftStatus').textContent='이 페이지는 브라우저에서 정보를 읽을 수 없습니다. 분석 요청을 복사해 사용하는 AI에서 링크를 여세요.'}finally{button.disabled=false}
 };
 $('copyPartPrompt').onclick=async()=>{try{
  const url=sourceUrl();
  await navigator.clipboard.writeText('다음 판매 페이지 또는 데이터시트를 직접 열어 모델명, 핀, 전원, 통신 방식을 확인하세요. 확인되지 않은 사양은 추정하지 마세요. '+url+' 페이지 제목 '+productInfo+' 지원 유형 '+JSON.stringify(Object.fromEntries(Object.entries(types).map(([k,v])=>[k,v.label])))+' 중 전기적 인터페이스와 코드가 호환될 때만 type을 지정하세요. 이외에는 unsupported로 답하세요. 결과는 코드 펜스 없이 JSON {"name":"모델명","type":"유형","source":"위 URL","spec":"핀·전원·통신 및 검증 근거","terminals":["데이터시트에 명시된 단자명"]} 형태로 주세요.');
  $('draftStatus').textContent='분석 요청을 복사했습니다.';
 }catch(e){$('draftStatus').textContent=e.message}};
 $('reviewPart').onclick=()=>{try{
  const url=sourceUrl(), d=JSON.parse($('partDraft').value.trim().replace(/^```(?:json)?\s*|\s*```$/gi,''));
  if(d.source!==url||typeof d.name!=='string'||!d.name.trim()||d.name.length>40||typeof d.spec!=='string'||!d.spec.trim())throw Error('원본 링크와 모델명, 핀·전원 사양을 확인하세요.');
  if(!Object.hasOwn(types,d.type))d.type='custom';resetDraft();draftPins=terminalNames(d.terminals??[]);draftSpec=d.spec.slice(0,4000);
  $('aiMakerDialog').close();$('freeMode').click();refresh();draftUrl=url;$('sourceNote').textContent=d.spec+' · '+url;$('partName').value=d.name;$('partType').value=d.type;$('partDialog').showModal();
 }catch(e){$('draftStatus').textContent=e.message}};
 $('partOpen').onclick=()=>{resetDraft();refresh();$('partDialog').showModal()};$('partClose').onclick=()=>$('partDialog').close();

 function register(name,type,source,spec,terminals,pinMap){
  const board=getProject().board,parts=list();
  if(!name||name.length>40)throw Error('부품 이름을 1~40자로 입력하세요.');if(parts.some(p=>p.name===name))throw Error('같은 이름이 이미 등록되어 있습니다.');const mapping=validateModuleMap(type,terminals,pinMap);const item={id:crypto.randomUUID(),source,spec,terminals,name,type,...(mapping?{pinMap:mapping}:{}),fields:allocate(board,type,parts,getProject())};validateParts(board,[...parts,item]);all[board]=[...parts,item];save();refresh();return (type==='tb6612'?'등록 완료 · DC 모터 (TB6612FNG) 블록을 사용하세요.':type==='custom'?'단자도 등록 완료 · 전용 실행 드라이버 검증 대기':'등록 완료 · '+name+' 블록과 단자도를 준비했습니다.')
 }
 $('partAdd').onclick=()=>{try{
  const type=$('partType').value;
  if(manual||$('manualPartDetails').open){
   const raw=$('manualSource').value.trim();if(raw){const u=new URL(raw);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('공개 제품 자료 URL을 입력하세요.');draftUrl=u.href;}else draftUrl='';
   draftSpec=$('manualSpec').value.trim();draftPins=terminalNames($('manualPins').value.split(',').map(s=>s.trim()).filter(Boolean));
   if(type!=='custom'&&(!draftUrl||!draftSpec||!draftPins.length||!$('manualConfirmed').checked))throw Error('구동 블록 등록에는 출처, 사양, 단자명 및 호환 확인이 필요합니다.');
  }
  const mapping=$('mapEnabled').checked?validateModuleMap(type,draftPins,{power:$('mapPower').value.trim(),ground:$('mapGround').value.trim(),signal:$('mapSignal').value.trim(),supply:'5V'}):undefined;
  if(mapping&&(!$('manualConfirmed').checked||!draftUrl||!draftSpec))throw Error('실제 5V 호환 및 단자 역할을 먼저 확인하세요.');
  $('partStatus').textContent=register($('partName').value.trim(),type,draftUrl,draftSpec,draftPins,mapping);clearMap();
  $('partName').value='';draftUrl='';draftSpec='';draftPins=[];$('manualConfirmed').checked=false;
 }catch(e){$('partStatus').textContent=e.message}};
 const catalog=[
  {name:'TB6612FNG',type:'tb6612',aliases:'도시바 듀얼 DC 모터 드라이버',source:'https://learn.sparkfun.com/tutorials/tb6612fng-hookup-guide/board-overview',spec:'SparkFun 모듈 기준. VM 모터 전원, VCC 로직 전원, 공통 GND. STBY가 HIGH일 때 두 채널을 구동합니다.',terminals:['VM','VCC','GND','STBY','PWMA','AIN1','AIN2','A01','A02','PWMB','BIN1','BIN2','B01','B02']},
  ...Object.entries(types).filter(([type])=>!['custom','tb6612'].includes(type)).map(([type,t])=>({name:t.label,type,aliases:({led:'발광 다이오드 light emitting diode',button:'스위치 택트 푸시버튼 push button',analog:'아날로그 센서 출력 AO',pot:'B10K 10K potentiometer 포텐셔미터 가변 저항',ldr:'LDR CDS 조도 광저항',pir:'HC-SR501 HCSR501 인체 감지 PIR',tilt:'기울기 경사 스위치 tilt',sound:'KY-038 KY-037 소리 음향 센서',temperature:'TMP36 온도 temperature',dht:'DHT11 온습도 temperature humidity',servo:'SG90 MG90S 서보 servo',motor:'L298N L298 DC모터 모터드라이버 motor driver',ultrasonic:'HC-SR04 HCSR04 초음파 거리센서 ultrasonic'})[type]||''}))
 ];
 const normalize=value=>value.toLowerCase().replace(/[\s-]/g,'');
 function showMatches(){
  const query=normalize($('catalogQuery').value);
  const imported=query?shared.filter(p=>normalize(p.name).includes(query)||query.includes(normalize(p.name))).map(p=>({...p,model:p.name})):[];const documented=[...imported,...matchDocumented($('catalogQuery').value).filter(p=>!imported.some(i=>i.name===p.name))];const matches=[...documented,...catalog.filter(p=>normalize(p.name+' '+(p.aliases||'')).includes(query)&&!documented.some(d=>d.type===p.type))];
  const box=$('catalogResults');
  box.replaceChildren();
  $('catalogStatus').textContent=matches.length?'':'기본 목록에 없는 부품입니다. ‘목록에 없는 부품 직접 추가’에서 제품 사양을 입력하고 호환 구동 방식을 선택하세요.';
  for(const p of matches){
   const button=document.createElement('button');
   button.type='button';
   button.textContent=p.name+(p.model?' · 사양 불러오기':' 추가')+' · '+(p.type==='custom'?'단자도만 지원':'블록 지원');
   button.onclick=()=>{
    if(p.model){
     $('manualPartOpen').click();$('partName').value=p.name;$('partType').value=p.type;$('manualSource').value=p.source;$('manualSpec').value=p.spec;$('manualPins').value=p.terminals.join(', ');showMap();if(p.pinMap){$('mapPower').value=p.pinMap.power;$('mapGround').value=p.pinMap.ground;$('mapSignal').value=p.pinMap.signal;$('mapEnabled').checked=true;}$('manualConfirmed').checked=false;return;
    }
    if(getProject().mission!=='free')$('freeMode').click();
    try{
     $('catalogStatus').textContent=register(p.name,p.type,p.source||'',p.spec||'',p.terminals||[]);
    }catch(e){$('catalogStatus').textContent=e.message}
   };
   box.append(button);
  }
 }
 initResearch(p=>{
  $('manualPartOpen').click();$('partName').value=p.name;$('manualSource').value=p.source;$('manualSpec').value=p.spec;$('partType').value='custom';
  if(p.profile){const q=p.profile;$('partType').value=q.type;$('manualPins').value=q.terminals.join(', ');$('manualSpec').value=(p.spec+'\n'+q.evidence).slice(0,4000);showMap();$('mapPower').value=q.pinMap.power;$('mapGround').value=q.pinMap.ground;$('mapSignal').value=q.pinMap.signal;$('mapEnabled').checked=true;$('sourceNote').textContent='공개 자료에 명시된 공통 구동 방식과 단자 역할을 자동으로 채웠습니다. 실제 제품과 일치하면 확인 후 등록하세요.';}else $('sourceNote').textContent='자동 분류에 필요한 명시적 사양이 부족합니다. 임의 구동 블록을 생성하지 않습니다.';
 });
 $('catalogQuery').oninput=showMatches;
 showMatches();
 refresh.getRegistered=()=>list();
 return refresh;
}
