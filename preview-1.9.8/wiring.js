import {validateModuleMap} from './module-pinmap.js';
import {motorChannels,boards,key,errors,walkProject} from './engine.js?v=ds18-1';

const pinName=p=>String(p).startsWith('A')?String(p):'D'+p;
// Attach a registered model name only when its supported electrical profile
// and allocated pin(s) match a connected block. Never infer wiring from a name.
export function connectedPart(project,node,registered=[]){
 const compatible={analogRead:'analog',pot:'pot',ldr:'ldr',sound:'sound',temperature:'temperature',pir:'pir',tilt:'tilt',ds18Temperature:'ds18',dhtTemperature:'dht',dhtHumidity:'dht',servo:'servo',ultrasonic:'ultrasonic',button:'button',write:'led',motor:'motor'};
 const type=compatible[node.type];
 if(!type||node.driver==='TB6612FNG')return '';
 const roles=type==='ultrasonic'?['trig','echo']:type==='motor'?['en','in1','in2']:['pin'];
 const matches=registered.filter(p=>p.type===type&&typeof p.name==='string'&&p.name.trim()&&roles.every(r=>p.fields?.[r]!==undefined&&node[r]!==undefined&&key(project.board,p.fields[r])===key(project.board,node[r])));
 return matches.length===1?matches[0]:null;
}
export function connectedPartName(project,node,registered=[]){return connectedPart(project,node,registered)?.name.slice(0,40)||'';}
export function connectionPlan(project,registered=[]) {
  const all=walkProject(project),components=[],seen=new Set();
  const add=(id,label,nets,note,kind)=>{if(!seen.has(id)){components.push({id,label,nets,note,kind});seen.add(id)}};
  const net=(source,terminal,color='#c28a2d')=>({source,terminal,color});
  const supply=[net('5V','VCC / +','#d55959'),net('GND','GND / −','#405768')];
  const outputs=new Set(all.filter(b=>b.type==='write').map(b=>key(project.board,b.pin)));
  const channels=motorChannels(project);
  for(const b of all) {
    const start=components.length;
    const second=b.type==='motor'&&channels.get([b.en,b.in1,b.in2].join('/'))==='B';
    if(b.type==='write')add('led-'+key(project.board,b.pin),'외부 LED · '+pinName(b.pin),[net(pinName(b.pin),'220~330Ω 직렬 저항 → LED 긴 다리 (+)'),net('GND','LED 짧은 다리 (−)','#405768')],'내장 LED(L)는 D13에서 외부 배선 없이 관찰할 수 있습니다.','led');
    if(b.type==='motor'&&b.driver==='TB6612FNG'){
      const side=b.channel==='B'?'B':'A';
      add('tb-'+[b.en,b.in1,b.in2].join('-'),'TB6612FNG · '+side,[net(pinName(b.en),'PWM'+side),net(pinName(b.in1),side+'IN1','#27959b'),net(pinName(b.in2),side+'IN2','#8962a3')],'STBY와 VCC를 5V에 연결합니다.','tbmotor');
    }else if(b.type==='motor')add('motor-'+[b.en,b.in1,b.in2].join('-'),'L298N · DC 모터 '+(second?'2 (B) · OUT3/OUT4':'1 (A) · OUT1/OUT2')+' · '+pinName(b.en),[
      net(pinName(b.en),second?'ENB':'ENA'),net(pinName(b.in1),second?'IN3':'IN1','#27959b'),net(pinName(b.in2),second?'IN4':'IN2','#8962a3'),net('GND','공통 GND','#405768')
    ],'선택한 채널의 EN 점퍼를 분리합니다. 모터 전원은 외부에서 공급하고 Arduino와 GND를 공유합니다.','motor');
    if(b.type==='servo')add('servo-'+b.pin,'서보모터 · '+pinName(b.pin),[
      net(pinName(b.pin),'신호','#8962a3'),net('GND','공통 접지','#405768'),net('외부 V+','서보 정격 전원','#d55959')
    ],'외부 전원 GND와 Arduino GND를 서보 GND에 함께 연결합니다.','servo');
    if(b.type==='ldr')add('ldr-'+b.pin,'조도 센서 · LDR 분압',[net('5V','10kΩ 고정 저항의 한쪽','#d55959'),net(b.pin,'저항과 LDR의 접점','#27959b'),net('GND','LDR의 다른 쪽','#405768')],'5V — 10kΩ — [접점: '+b.pin+'] — LDR — GND. 이 구성은 어두울수록 ADC가 작아집니다.','ldr');
    if(b.type==='pot')add('pot-'+b.pin,'가변저항',[net('5V','한쪽 끝 단자','#d55959'),net(b.pin,'가운데 단자 (와이퍼)','#27959b'),net('GND','반대쪽 끝 단자','#405768')],'보통 10kΩ 가변저항. 양 끝 방향을 바꾸면 값이 증가하는 방향도 바뀝니다.','pot');
    if(b.type==='analogRead')add('analog-'+b.pin,'아날로그 센서 모듈',[...supply,net(b.pin,'OUT / 신호 (0~5V)','#27959b')],'모듈의 실제 OUT/VCC/GND 표기를 확인하세요. 5V 보드 입력 범위를 넘기지 마세요.','analog');
    if(['button','digitalRead'].includes(b.type)&&!outputs.has(key(project.board,b.pin))){const pullup=all.some(x=>x.type==='mode'&&key(project.board,x.pin)===key(project.board,b.pin)&&x.mode==='INPUT_PULLUP');
      add('button-'+b.pin,'버튼 / 디지털 입력',pullup?[net(pinName(b.pin),'버튼의 접점 1'),net('GND','버튼의 접점 2','#405768')]:[net('5V','버튼 접점 1','#d55959'),net(pinName(b.pin),'버튼 접점 2 + 10kΩ 저항 한쪽'),net('GND','10kΩ 저항 다른 쪽','#405768')],pullup?'INPUT_PULLUP: 누르면 0, 놓으면 1. 4핀 버튼의 서로 다른 접점을 사용하세요.':'INPUT 외부 풀다운 구성: 놓으면 0, 누르면 1. 외부 10kΩ 저항을 생략하면 입력이 불안정할 수 있습니다.','button');}
    if(b.type==='ultrasonic')add('sonar-'+b.trig+'-'+b.echo,'HC-SR04 초음파 센서',[...supply,net(pinName(b.trig),'TRIG (출력)','#c28a2d'),net(pinName(b.echo),'ECHO (입력)','#27959b')],'센서에 인쇄된 VCC / TRIG / ECHO / GND를 기준으로 연결하세요. 무응답은 -1cm입니다.','sonar');
    if(b.type==='temperature')add('temperature-'+b.pin,'TMP36 온도 센서',[...supply,net(b.pin,'VOUT / 온도 신호','#27959b')],'평평한 면을 바라볼 때 핀 순서를 반드시 부품 데이터시트와 대조하세요.','analog');
    if(['dhtTemperature','dhtHumidity'].includes(b.type))add('dht-'+b.pin,'DHT11 온습도 센서',[...supply,net(pinName(b.pin),'DATA','#27959b')],'모듈형이 아닌 센서는 DATA와 VCC 사이에 풀업 저항이 필요할 수 있습니다.','analog');
    if(b.type==='ds18Temperature')add('ds18-'+key(project.board,b.pin),'DS18B20 온도센서',[...supply,net(pinName(b.pin),'DQ 데이터','#27959b')],'외부 전원 3선 방식. DQ와 VCC 사이에 4.7kΩ 풀업 저항을 연결하세요. 실제 단자 순서와 방수형 선 색상은 제품 자료와 대조하세요.','ds18');
    if(b.type==='sound')add('sound-'+b.pin,'소리 센서 모듈',[...supply,net(b.pin,'AO / 소리 크기','#27959b')],'AO 아날로그 출력을 사용합니다. 모듈의 전압 범위를 확인하세요.','analog');
    if(b.type==='pir')add('pir-'+b.pin,'PIR 인체감지 센서',[...supply,net(pinName(b.pin),'OUT','#27959b')],'전원을 넣은 뒤 센서 안정화 시간이 필요합니다.','analog');
    if(b.type==='tilt')add('tilt-'+b.pin,'기울기 스위치',[net(pinName(b.pin),'신호 단자','#27959b'),net('GND','반대 단자','#405768')],'INPUT_PULLUP을 사용하면 기울기 상태에 따라 0/1이 바뀝니다.','button');
    if(b.type==='joystickAxis')add('joystick-'+b.pin,'조이스틱 축 · '+b.axis,[...supply,net(b.pin,b.axis==='X'?'VRx':'VRy','#27959b')],'조이스틱 중심값은 약 512이며 끝으로 움직이면 0 또는 1023에 가까워집니다.','analog');
    const part=connectedPart(project,b,registered);
    if(part)for(const component of components.slice(start)){
     const model=part.name.slice(0,40);component.label=model+' · '+component.label;component.registeredModel=model;
     let mapping;try{mapping=validateModuleMap(part.type,part.terminals,part.pinMap)}catch{}
     if(mapping&&component.kind==='analog'&&component.nets.length===3){
      component.nets=component.nets.map(n=>({...n,terminal:n.source==='5V'?mapping.power:n.source==='GND'?mapping.ground:mapping.signal}));component.kind='mapped-module';component.note='등록 시 확인한 단자 역할 기준 · 실제 위치와 전기적 사양은 원문을 확인하세요. '+component.note;
     }
    }
  }
  return {board:boards[project.board]?.name||project.board,components,issues:errors(project)};
}
const escapeSvg=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

const svgText=(x,y,s,size=17,color='#284653')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Segoe UI,Malgun Gothic,sans-serif" font-size="'+size+'">'+escapeSvg(s)+'</text>';
function resistor(x,y,vertical=false,label='220~330Ω') {
 const shape='<path d="M-42 0 H-23 M23 0 H42" stroke="#6d7782" stroke-width="4"/><rect x="-23" y="-9" width="46" height="18" rx="5" fill="#dcbf8a" stroke="#9b7e55"/><path d="M-12 -9 V9 M-4 -9 V9 M7 -9 V9" stroke="#865139" stroke-width="4"/>';
 return '<g transform="translate('+x+' '+y+')'+(vertical?' rotate(90)':'')+'">'+shape+'</g>'+svgText(x-35,y+(vertical?60:-18),label,14);
}
function boardPicture(y,nets,name) {
 let s='<g data-board-picture="true"><rect x="40" y="'+(y+70)+'" width="290" height="235" rx="18" fill="#087f8c" stroke="#075b65" stroke-width="3"/><rect x="24" y="'+(y+110)+'" width="50" height="64" rx="5" fill="#c6d0d7" stroke="#8397a3"/><rect x="90" y="'+(y+155)+'" width="95" height="72" rx="4" fill="#26343c"/><path d="M100 '+(y+145)+' V'+(y+155)+' M120 '+(y+145)+' V'+(y+155)+' M140 '+(y+145)+' V'+(y+155)+' M160 '+(y+145)+' V'+(y+155)+' M100 '+(y+227)+' V'+(y+237)+' M120 '+(y+227)+' V'+(y+237)+' M140 '+(y+227)+' V'+(y+237)+' M160 '+(y+227)+' V'+(y+237)+'" stroke="#b4bfc3" stroke-width="5"/>';
 s+=svgText(85,y+106,'ARDUINO',23,'white')+svgText(85,y+133,name,15,'#d3eff0')+svgText(85,y+277,'USB / 5V / GND',14,'white');
 const ports=nets.map((n,i)=>({x:330,y:y+105+i*43}));
 ports.forEach((p,i)=>{s+='<rect x="215" y="'+(p.y-15)+'" width="112" height="30" rx="4" fill="#183840"/>'+svgText(227,p.y+6,nets[i].source,16,'white')+'<circle cx="330" cy="'+p.y+'" r="6" fill="'+nets[i].color+'" stroke="white" stroke-width="2"/>';});
 return {body:s+'</g>',ports};
}
function componentPicture(c,y) {
 let s='<g data-component-picture="'+c.kind+'">',targets=[];
 if(c.kind==='sonar') {
  s+='<rect x="660" y="'+(y+100)+'" width="330" height="150" rx="10" fill="#226ab0" stroke="#164e87" stroke-width="3"/>';
  for(const x of [745,905])s+='<circle cx="'+x+'" cy="'+(y+165)+'" r="53" fill="#cad4d9" stroke="#85969e" stroke-width="5"/><circle cx="'+x+'" cy="'+(y+165)+'" r="39" fill="#66747d" stroke="#e4e9ec" stroke-width="5"/><circle cx="'+x+'" cy="'+(y+165)+'" r="28" fill="#3e4b54"/>';
  s+=svgText(790,y+237,'HC-SR04',17,'white');
  const tx=[720,780,840,900];['VCC','TRIG','ECHO','GND'].forEach((n,i)=>{s+='<path d="M'+tx[i]+' '+(y+250)+' V'+(y+293)+'" stroke="#b89a54" stroke-width="6"/>'+svgText(tx[i]-20,y+320,n,14);});
  targets=[{x:720,y:y+293},{x:900,y:y+293},{x:780,y:y+293},{x:840,y:y+293}];
 } else if(c.kind==='ds18') {
  s+='<rect x="700" y="'+(y+110)+'" width="250" height="150" rx="10" fill="#428a6b"/>'+svgText(725,y+145,'DS18B20 · 개념 단자도',18,'white');
  targets=[{x:735,y:y+260},{x:820,y:y+260},{x:905,y:y+260}];
  ['VCC','GND','DQ'].forEach((n,i)=>{s+=svgText(targets[i].x-15,y+245,n,16,'white');s+='<circle cx="'+targets[i].x+'" cy="'+targets[i].y+'" r="6" fill="'+c.nets[i].color+'"/>'});
  s+='<path d="M735 '+(y+260)+' V'+(y+300)+' H778 M862 '+(y+300)+' H905 V'+(y+260)+'" fill="none" stroke="#777" stroke-width="4"/>'+resistor(820,y+300,false,'4.7kΩ');
 } else if(c.kind==='mapped-module') {
  s+='<rect x="690" y="'+(y+110)+'" width="300" height="210" rx="10" fill="#428a6b"/>'+svgText(720,y+140,'등록 모듈 · 개념 단자도',19,'white');
  targets=c.nets.map((n,i)=>{const py=y+180+i*50;s+='<circle cx="690" cy="'+py+'" r="6" fill="'+n.color+'"/>'+svgText(710,py+5,n.terminal,17,'white');return {x:690,y:py}});
 } else if(c.kind==='led') {
  s+='<path data-led-pin="'+escapeSvg(c.nets[0].source.replace(/^D/,''))+'" d="M790 '+(y+190)+' V'+(y+146)+' A32 32 0 0 1 854 '+(y+146)+' V'+(y+190)+' Z" fill="#8c9ba0" stroke="#6d777c" stroke-width="3"/><path d="M803 '+(y+190)+' V'+(y+215)+' H735 V'+(y+243)+' M841 '+(y+190)+' V'+(y+300)+'" fill="none" stroke="#77858c" stroke-width="4"/>';
  s+=resistor(735,y+270,true)+svgText(690,y+346,'LED 긴 다리 (+)',14)+svgText(835,y+324,'짧은 다리 (−)',14);
  targets=[{x:735,y:y+312},{x:841,y:y+300}];
 } else if(c.kind==='pot') {
  s+='<rect x="740" y="'+(y+130)+'" width="160" height="110" rx="15" fill="#4b99b6" stroke="#226984" stroke-width="3"/><circle cx="820" cy="'+(y+180)+'" r="59" fill="#d5dadd" stroke="#7a8c98" stroke-width="5"/><circle cx="820" cy="'+(y+180)+'" r="25" fill="#4c5b68"/><path d="M820 '+(y+180)+' L848 '+(y+150)+'" stroke="white" stroke-width="5"/>';
  [765,820,875].forEach((x,i)=>{s+='<path d="M'+x+' '+(y+240)+' V'+(y+290)+'" stroke="#b8a06b" stroke-width="7"/>'+svgText(x-20,y+320,['끝 1','가운데','끝 3'][i],14);});
  targets=[{x:765,y:y+290},{x:820,y:y+290},{x:875,y:y+290}];
 } else if(c.kind==='motor'){
  s+='<rect x="610" y="'+(y+125)+'" width="245" height="135" rx="12" fill="#92403b"/>'+svgText(675,y+162,'L298N',21,'white')+svgText(630,y+198,'외부 모터 전원 → Vs',16,'white');
  s+='<path d="M855 '+(y+175)+' h65 M855 '+(y+205)+' h65" stroke="#505661" stroke-width="4"/><circle cx="950" cy="'+(y+190)+'" r="40" fill="#dde5e7" stroke="#52676d" stroke-width="4"/>'+svgText(936,y+198,'M',23);
  const en=escapeSvg(c.nets[0].source.replace(/^D/,''));
  s+='<g transform="translate(950 '+(y+190)+')"><g data-rotor="'+en+'"><circle r="31" fill="#d7e9e9"/><path d="M0 -26 Q15 -20 5 -4 L0 0 M23 13 Q10 24 2 6 L0 0 M-23 13 Q-25 -3 -7 -2 L0 0" fill="#167d79" stroke="#165b5b" stroke-width="3"/></g></g>';
  s+='<text data-motor-label="'+en+'" x="856" y="'+(y+260)+'" font-size="17">대기 · 0/255</text>';
  targets=c.nets.map((n,i)=>{const x=630+i*61;s+=svgText(x-14,y+282,i===3?'GND':n.terminal,14);return {x,y:y+260}});
 } else if(c.kind==='servo'){
  const center=840, axis=y+175;
  s+='<rect x="720" y="'+(y+120)+'" width="240" height="135" rx="15" fill="#e1d5ee" stroke="#8356a2" stroke-width="3"/>';
  s+='<circle cx="'+center+'" cy="'+axis+'" r="32" fill="#fff" stroke="#8356a2" stroke-width="4"/>';
  s+='<path data-servo-arm="'+escapeSvg(c.nets[0].source.replace(/^D/,''))+'" data-pivot-y="'+axis+'" d="M'+center+' '+axis+' h54" fill="none" stroke="#71448e" stroke-width="12" stroke-linecap="round"/>';
  s+='<text data-servo-angle="'+escapeSvg(c.nets[0].source.replace(/^D/,''))+'" x="810" y="'+(y+237)+'" font-size="22">—</text>';
  const terminals=['신호','GND','V+'];
  targets=terminals.map((name,i)=>{const x=760+i*80;s+='<path d="M'+x+' '+(y+255)+' v40" stroke="'+c.nets[i].color+'" stroke-width="6"/>'+svgText(x-19,y+318,name,16);return {x,y:y+295};});
 } else if(c.kind==='ldr') {
  // Complete series path: 5V -> fixed resistor -> A0 junction -> LDR -> GND.
  s+='<path d="M665 '+(y+190)+' H728 M812 '+(y+190)+' H845 M913 '+(y+190)+' H965 V'+(y+295)+' M830 '+(y+190)+' V'+(y+295)+'" fill="none" stroke="#77858c" stroke-width="4"/>';
  s+=resistor(770,y+190,false,'10kΩ 고정')+'<circle cx="880" cy="'+(y+190)+'" r="34" fill="#d6b56d" stroke="#8f743b" stroke-width="3"/><path d="M858 '+(y+171)+' h42 v10 h-40 v10 h40 v10 h-40 v10 h40" fill="none" stroke="#8d4e40" stroke-width="4"/>';
  s+='<circle cx="830" cy="'+(y+190)+'" r="6" fill="#27959b"/>'+svgText(845,y+143,'LDR (극성 없음)',16)+svgText(790,y+326,'접점 → '+c.nets[1].source,15);
  targets=[{x:665,y:y+190},{x:830,y:y+295},{x:965,y:y+295}];
 } else if(c.kind==='button') {
  s+='<rect x="735" y="'+(y+128)+'" width="150" height="115" rx="8" fill="#c6cbce" stroke="#7d898f" stroke-width="3"/><circle cx="810" cy="'+(y+183)+'" r="37" fill="#34434b"/><path d="M715 '+(y+148)+' H735 M715 '+(y+228)+' H735 M885 '+(y+148)+' H905 M885 '+(y+228)+' H905" stroke="#849196" stroke-width="7"/>';
  s+=svgText(685,y+117,'접점 A',15)+svgText(875,y+117,'접점 B',15)+svgText(714,y+275,'서로 다른 접점을 연결',16);
  if(c.nets.length===2)targets=[{x:715,y:y+228},{x:905,y:y+228}];
  else{s+='<path d="M905 '+(y+228)+' H965 V'+(y+245)+'" stroke="#77858c" stroke-width="4" fill="none"/>'+resistor(965,y+287,true,'10kΩ');targets=[{x:715,y:y+228},{x:905,y:y+228},{x:965,y:y+329}];}
 } else {
  s+='<rect x="710" y="'+(y+125)+'" width="230" height="125" rx="10" fill="#428a6b"/>'+svgText(745,y+177,'아날로그 센서',21,'white');
  ['VCC','GND','OUT'].forEach((n,i)=>{const x=750+i*75;s+='<path d="M'+x+' '+(y+250)+' V'+(y+295)+'" stroke="#b99d58" stroke-width="6"/>'+svgText(x-20,y+325,n,15);});targets=[{x:750,y:y+295},{x:825,y:y+295},{x:900,y:y+295}];
 }
 return {body:s+'</g>',targets};
}
function sharedDiagram(plan,title){
 const groups=plan.components.filter(c=>!['motor','tbmotor'].includes(c.kind));
 for(const kind of ['motor','tbmotor']){
  const motors=plan.components.filter(c=>c.kind===kind);
  if(!motors.length)continue;
  const tb=kind==='tbmotor',model=tb?'TB6612FNG':'L298N';
  const supply=[{source:'GND',terminal:'GND',color:'#405768'},{source:'모터 전원 +',terminal:tb?'VM':'Vs',color:'#bd4545'}];
  if(tb)supply.push({source:'5V',terminal:'VCC',color:'#bc4242'},{source:'5V',terminal:'STBY',color:'#bc4242'});
  groups.push({kind:'driver',model,motors,label:model+' · 듀얼 모터 드라이버',nets:[...motors.flatMap(m=>m.nets.slice(0,3)),...supply]});
 }
 const unique=[...new Map(groups.flatMap(c=>c.nets.map(n=>[n.source,n]))).values()];
 const external=n=>['외부 V+','모터 전원 +'].includes(n.source);
 const nets=unique.filter(n=>!external(n)),power=unique.filter(external);
 const height=Math.max(500,110+groups.length*305,280+nets.length*43+power.length*30);
 const top=Math.max(0,(height-(240+nets.length*43+power.length*30))/2);
 const board=boardPicture(top,nets,plan.board);
 const ports=new Map(nets.map((n,i)=>[n.source,board.ports[i]]));
 let body='<rect width="1100" height="'+height+'" fill="#f3f8fa"/>'+svgText(20,34,title,22)+svgText(20,60,'보드 1대 · 같은 핀 이름은 같은 전기적 연결입니다.',15)+board.body.replace('height="235"', 'height="'+Math.max(235,75+nets.length*43)+'"');
 let py=top+Math.max(305,145+nets.length*43)+28;
 for(const n of power){body+=svgText(45,py,n.source+' (외부 공급)',16);ports.set(n.source,{x:240,y:py-4});py+=28}
 if(power.length)body+=svgText(45,py,'외부 전원 − → 공통 GND',15);
 let lines='',devices='';
 groups.forEach((c,i)=>{
  const y=90+305*i;
  devices+=svgText(610,y+17,c.label,19);
  let targets=[];
  if(c.kind==='driver'){
   devices+='<rect data-driver="'+c.model+'"  x="644" y="'+(y+32)+'" width="170" height="'+(39+c.nets.length*20)+'" rx="10" fill="#92403b"/>'+svgText(660,y+57,c.model,19,'white');
   if(c.model==='TB6612FNG'){
    devices+='<rect x="745" y="'+(y+86)+'" width="42" height="59" rx="3" fill="#27323a"/>';
    for(let pin=0;pin<8;pin++){const py=y+90+pin*7;devices+='<path d="M738 '+py+' h7 M787 '+py+' h7" stroke="#c4c9cb" stroke-width="3"/>';}
   }
   targets=c.nets.map((n,j)=>{const row=y+76+j*20;devices+='<circle cx="644" cy="'+row+'" r="4" fill="#e4c680"/>'+svgText(655,row+4,n.terminal,14,'white');return {x:644,y:row}});
   c.motors.forEach((m,j)=>{const row=y+83+j*97,en=escapeSvg(m.nets[0].source.slice(1)),b=['ENB','PWMB'].includes(m.nets[0].terminal);
    devices+='<path d="M814 '+row+' h118 M814 '+(row+9)+' h118" stroke="#56666b" stroke-width="3"/>'+svgText(821,row-8,c.model==='TB6612FNG'?(b?'B01 / B02':'A01 / A02'):(b?'OUT3 / OUT4':'OUT1 / OUT2'),14);
    devices+='<g transform="translate(954 '+row+')"><circle r="31" fill="#d9e9e8" stroke="#587472"/><g data-rotor="'+en+'"><path d="M0 -25 Q17 -22 3 -3 L0 0 M22 12 Q9 24 2 5 L0 0 M-22 12 Q-24 -3 -6 -1 L0 0" fill="#167d79"/></g></g>'+svgText(998,row+5,b?'모터 2':'모터 1',15)+'<text data-motor-label="'+en+'" x="891" y="'+(row+48)+'" font-size="15">대기 · 0/255</text>';
   });
  }else{
   const pic=componentPicture(c,0);
   devices+='<g transform="translate(225 '+(y-15)+') scale(.62)">'+pic.body+'</g>';
   targets=pic.targets.map(t=>({x:225+t.x*.62,y:y-15+t.y*.62}));
  }
  c.nets.forEach((n,j)=>{const a=ports.get(n.source),b=targets[j],lane=350+210*unique.findIndex(u=>u.source===n.source)/unique.length,bend=c.kind==='driver'?b.y:y+217+j*5;
   lines+='<path data-wire="'+escapeSvg(n.source)+'" d="M'+a.x+' '+a.y+' H'+lane+' V'+bend+' H'+b.x+' V'+b.y+'" fill="none" stroke="'+n.color+'" stroke-width="3"/>';
  });
 });
 if(plan.issues.length)devices+=svgText(24,height-8,'⚠ '+plan.issues[0],15,'#a04531');
 return {body:body+lines+devices,height,plan};
}
export function wiringSvg(project,title='아두이노 연결 그림',registered=[]) {
 const plan=connectionPlan(project,registered),items=plan.components,total=Math.max(430,90+items.length*470);
 if(items.length>1||items.some(c=>c.kind==='tbmotor'))return sharedDiagram(plan,title);
 let body='<rect width="1100" height="'+total+'" rx="14" fill="#f3f8fa"/>'+svgText(24,32,title,23)+svgText(24,61,'색 선의 양 끝과 핀 이름을 확인하세요. 보드 모델별 실제 핀 위치는 제품 표기를 확인하세요.',15);
 if(!items.length){const b=boardPicture(85,[],plan.board);body+=b.body+'<path d="M24 230 H10 V380 H630" fill="none" stroke="#485d6b" stroke-width="12"/><rect x="630" y="350" width="190" height="80" rx="8" fill="#dbe7ed"/>'+svgText(655,390,'PC · USB',25)+svgText(430,175,'USB 케이블만 연결',28)+svgText(430,220,'외부 부품은 필요 없습니다.',19);}
 for(const [i,c]of items.entries()) {
  const y=85+i*470;
  body+='<rect x="20" y="'+y+'" width="1060" height="450" rx="12" fill="white" stroke="#d4e2e7"/>'+svgText(42,y+35,c.label,23);
  const b=boardPicture(y,c.kind==='servo'?c.nets.slice(0,2):c.nets,plan.board),p=componentPicture(c,y);body+=b.body+p.body;
  if(c.kind==='servo'){
   body+='<rect x="40" y="'+(y+318)+'" width="290" height="72" rx="8" fill="#f7eaea" stroke="#d55959"/>'+svgText(55,y+350,'서보 외부 전원',17)+svgText(225,y+350,'V+',16)+svgText(225,y+378,'GND',16);
   body+='<path d="M330 '+(y+374)+' H350 V'+b.ports[1].y+' H330" fill="none" stroke="#405768" stroke-width="4"/>';
   b.ports.push({x:330,y:y+344});
  }
  c.nets.forEach((n,j)=>{const start=b.ports[j],end=p.targets[j],lane=395+j*44,bend=y+350+j*15;
   body+='<path data-wire="'+escapeSvg(n.source)+'" d="M'+start.x+' '+start.y+' H'+lane+' V'+bend+' H'+end.x+' V'+end.y+'" fill="none" stroke="'+n.color+'" stroke-width="4" stroke-linejoin="round"/><circle cx="'+end.x+'" cy="'+end.y+'" r="5" fill="'+n.color+'"/>';
  });
  for(let start=0,line=0;start<c.note.length;start+=72,line++)body+=svgText(42,y+418+line*18,c.note.slice(start,start+72),13,'#5a727e');
 }
 if(plan.issues.length)body+=svgText(24,total-8,'⚠ 핀/설정 오류를 먼저 수정하세요.',15,'#a04531');
 return {body,height:total,plan};
}
export function renderWiring(svg,project,title,registered=[]) {
 const result=wiringSvg(project,title,registered);svg.setAttribute('viewBox','0 0 1100 '+result.height);svg.innerHTML=result.body;
 svg.setAttribute('aria-label',title+' · '+(result.plan.components.map(c=>c.label).join(', ')||'USB 연결'));
}
