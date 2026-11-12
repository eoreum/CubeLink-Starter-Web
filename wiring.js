import {boards,key,errors} from './engine.js';

const pinName=p=>String(p).startsWith('A')?String(p):'D'+p;
export function connectionPlan(project) {
  const all=[...project.setup,...project.loop],components=[],seen=new Set();
  const add=(id,label,nets,note,kind)=>{if(!seen.has(id)){components.push({id,label,nets,note,kind});seen.add(id)}};
  const net=(source,terminal,color='#c28a2d')=>({source,terminal,color});
  const supply=[net('5V','VCC / +','#d55959'),net('GND','GND / −','#405768')];
  const outputs=new Set(all.filter(b=>['write','led','threshold','distanceLed'].includes(b.type)).map(b=>key(project.board,b.pin)));
  for(const b of all) {
    if(['write','led','threshold','distanceLed'].includes(b.type))add('led-'+key(project.board,b.pin),'외부 LED · '+pinName(b.pin),[net(pinName(b.pin),'220~330Ω 직렬 저항 → LED 긴 다리 (+)'),net('GND','LED 짧은 다리 (−)','#405768')],'내장 LED(L)는 D13에서 외부 배선 없이 관찰할 수 있습니다.','led');
    if(b.type==='ldr')add('ldr-'+b.pin,'조도 센서 · LDR 분압',[net('5V','10kΩ 고정 저항의 한쪽','#d55959'),net(b.pin,'저항과 LDR의 접점','#27959b'),net('GND','LDR의 다른 쪽','#405768')],'5V — 10kΩ — [접점: '+b.pin+'] — LDR — GND. 이 구성은 어두울수록 ADC가 작아집니다.','ldr');
    if(b.type==='pot')add('pot-'+b.pin,'가변저항',[net('5V','한쪽 끝 단자','#d55959'),net(b.pin,'가운데 단자 (와이퍼)','#27959b'),net('GND','반대쪽 끝 단자','#405768')],'보통 10kΩ 가변저항. 양 끝 방향을 바꾸면 값이 증가하는 방향도 바뀝니다.','pot');
    if(b.type==='analog')add('analog-'+b.pin,'아날로그 센서 모듈',[...supply,net(b.pin,'OUT / 신호 (0~5V)','#27959b')],'모듈의 실제 OUT/VCC/GND 표기를 확인하세요. 5V 보드 입력 범위를 넘기지 마세요.','analog');
    if(['button','read'].includes(b.type)&&!outputs.has(key(project.board,b.pin))){const pullup=all.some(x=>x.type==='mode'&&key(project.board,x.pin)===key(project.board,b.pin)&&x.mode==='INPUT_PULLUP');
      add('button-'+b.pin,'버튼 / 디지털 입력',pullup?[net(pinName(b.pin),'버튼의 접점 1'),net('GND','버튼의 접점 2','#405768')]:[net('5V','버튼 접점 1','#d55959'),net(pinName(b.pin),'버튼 접점 2 + 10kΩ 저항 한쪽'),net('GND','10kΩ 저항 다른 쪽','#405768')],pullup?'INPUT_PULLUP: 누르면 0, 놓으면 1. 4핀 버튼의 서로 다른 접점을 사용하세요.':'INPUT 외부 풀다운 구성: 놓으면 0, 누르면 1. 외부 10kΩ 저항을 생략하면 입력이 불안정할 수 있습니다.','button');}
    if(b.type==='ultrasonic')add('sonar-'+b.trig+'-'+b.echo,'HC-SR04 초음파 센서',[...supply,net(pinName(b.trig),'TRIG (출력)','#c28a2d'),net(pinName(b.echo),'ECHO (입력)','#27959b')],'센서에 인쇄된 VCC / TRIG / ECHO / GND를 기준으로 연결하세요. 무응답은 -1cm입니다.','sonar');
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
 } else if(c.kind==='led') {
  s+='<path data-led-pin="'+escapeSvg(c.nets[0].source.replace(/^D/,''))+'" d="M790 '+(y+190)+' V'+(y+146)+' A32 32 0 0 1 854 '+(y+146)+' V'+(y+190)+' Z" fill="#8c9ba0" stroke="#6d777c" stroke-width="3"/><path d="M803 '+(y+190)+' V'+(y+215)+' H735 V'+(y+243)+' M841 '+(y+190)+' V'+(y+300)+'" fill="none" stroke="#77858c" stroke-width="4"/>';
  s+=resistor(735,y+270,true)+svgText(690,y+346,'LED 긴 다리 (+)',14)+svgText(835,y+324,'짧은 다리 (−)',14);
  targets=[{x:735,y:y+312},{x:841,y:y+300}];
 } else if(c.kind==='pot') {
  s+='<rect x="740" y="'+(y+130)+'" width="160" height="110" rx="15" fill="#4b99b6" stroke="#226984" stroke-width="3"/><circle cx="820" cy="'+(y+180)+'" r="59" fill="#d5dadd" stroke="#7a8c98" stroke-width="5"/><circle cx="820" cy="'+(y+180)+'" r="25" fill="#4c5b68"/><path d="M820 '+(y+180)+' L848 '+(y+150)+'" stroke="white" stroke-width="5"/>';
  [765,820,875].forEach((x,i)=>{s+='<path d="M'+x+' '+(y+240)+' V'+(y+290)+'" stroke="#b8a06b" stroke-width="7"/>'+svgText(x-20,y+320,['끝 1','가운데','끝 3'][i],14);});
  targets=[{x:765,y:y+290},{x:820,y:y+290},{x:875,y:y+290}];
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
export function wiringSvg(project,title='아두이노 연결 그림') {
 const plan=connectionPlan(project),items=plan.components,total=Math.max(430,90+items.length*470);
 let body='<rect width="1100" height="'+total+'" rx="14" fill="#f3f8fa"/>'+svgText(24,32,title,23)+svgText(24,61,'색 선의 양 끝과 핀 이름을 확인하세요. 보드 모델별 실제 핀 위치는 제품 표기를 확인하세요.',15);
 if(!items.length){const b=boardPicture(85,[],plan.board);body+=b.body+'<path d="M24 230 H10 V380 H630" fill="none" stroke="#485d6b" stroke-width="12"/><rect x="630" y="350" width="190" height="80" rx="8" fill="#dbe7ed"/>'+svgText(655,390,'PC · USB',25)+svgText(430,175,'USB 케이블만 연결',28)+svgText(430,220,'외부 부품은 필요 없습니다.',19);}
 for(const [i,c]of items.entries()) {
  const y=85+i*470;
  body+='<rect x="20" y="'+y+'" width="1060" height="450" rx="12" fill="white" stroke="#d4e2e7"/>'+svgText(42,y+35,c.label,23);
  const b=boardPicture(y,c.nets,plan.board),p=componentPicture(c,y);body+=b.body+p.body;
  c.nets.forEach((n,j)=>{const start=b.ports[j],end=p.targets[j],lane=395+j*44,bend=y+350+j*15;
   body+='<path data-wire="'+escapeSvg(n.source)+'" d="M'+start.x+' '+start.y+' H'+lane+' V'+bend+' H'+end.x+' V'+end.y+'" fill="none" stroke="'+n.color+'" stroke-width="4" stroke-linejoin="round"/><circle cx="'+end.x+'" cy="'+end.y+'" r="5" fill="'+n.color+'"/>';
  });
  for(let start=0,line=0;start<c.note.length;start+=72,line++)body+=svgText(42,y+418+line*18,c.note.slice(start,start+72),13,'#5a727e');
 }
 if(plan.issues.length)body+=svgText(24,total-8,'⚠ 핀/설정 오류를 먼저 수정하세요.',15,'#a04531');
 return {body,height:total,plan};
}
export function renderWiring(svg,project,title) {
 const result=wiringSvg(project,title);svg.setAttribute('viewBox','0 0 1100 '+result.height);svg.innerHTML=result.body;
 svg.setAttribute('aria-label',title+' · '+(result.plan.components.map(c=>c.label).join(', ')||'USB 연결'));
}

