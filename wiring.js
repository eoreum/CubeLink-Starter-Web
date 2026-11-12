import {boards,key,errors} from './engine.js';

const pinName=p=>String(p).startsWith('A')?String(p):'D'+p;
export function connectionPlan(project) {
  const all=[...project.setup,...project.loop],components=[],seen=new Set();
  const add=(id,label,nets,note,kind)=>{if(!seen.has(id)){components.push({id,label,nets,note,kind});seen.add(id)}};
  const net=(source,terminal,color='#c28a2d')=>({source,terminal,color});
  const supply=[net('5V','VCC / +','#d55959'),net('GND','GND / −','#405768')];
  const outputs=new Set(all.filter(b=>['write','led','threshold'].includes(b.type)).map(b=>key(project.board,b.pin)));
  for(const b of all) {
    if(['write','led','threshold'].includes(b.type))add('led-'+key(project.board,b.pin),'외부 LED · '+pinName(b.pin),[net(pinName(b.pin),'220~330Ω 직렬 저항 → LED 긴 다리 (+)'),net('GND','LED 짧은 다리 (−)','#405768')],'내장 LED(L)는 D13에서 외부 배선 없이 관찰할 수 있습니다.','led');
    if(b.type==='ldr')add('ldr-'+b.pin,'조도 센서 · LDR 분압',[net('5V','10kΩ 고정 저항의 한쪽','#d55959'),net(b.pin,'저항과 LDR의 접점','#27959b'),net('GND','LDR의 다른 쪽','#405768')],'5V — 10kΩ — [접점: '+b.pin+'] — LDR — GND. 이 구성은 어두울수록 ADC가 작아집니다.','ldr');
    if(b.type==='pot')add('pot-'+b.pin,'가변저항',[net('5V','한쪽 끝 단자','#d55959'),net(b.pin,'가운데 단자 (와이퍼)','#27959b'),net('GND','반대쪽 끝 단자','#405768')],'보통 10kΩ 가변저항. 양 끝 방향을 바꾸면 값이 증가하는 방향도 바뀝니다.','pot');
    if(b.type==='analog')add('analog-'+b.pin,project.mission==='joystick'?'조이스틱 X축':'아날로그 입력 센서',[...supply,net(b.pin,project.mission==='joystick'?'VRx (X축)':'OUT / 신호 (0~5V)','#27959b')],project.mission==='joystick'?'VRy와 SW는 이 미션에서 연결하지 않습니다. X축만 연결합니다.':'표시된 OUT/VCC/GND는 사용하는 모듈의 표기를 확인하세요. 5V 보드 입력 범위를 넘기지 마세요.','analog');
    if(['button','read'].includes(b.type)&&!outputs.has(key(project.board,b.pin))){const pullup=all.some(x=>x.type==='mode'&&key(project.board,x.pin)===key(project.board,b.pin)&&x.mode==='INPUT_PULLUP');
      add('button-'+b.pin,'버튼 / 디지털 입력',pullup?[net(pinName(b.pin),'버튼의 접점 1'),net('GND','버튼의 접점 2','#405768')]:[net('5V','버튼 접점 1','#d55959'),net(pinName(b.pin),'버튼 접점 2 + 10kΩ 저항 한쪽'),net('GND','10kΩ 저항 다른 쪽','#405768')],pullup?'INPUT_PULLUP: 누르면 0, 놓으면 1. 4핀 버튼의 서로 다른 접점을 사용하세요.':'INPUT 외부 풀다운 구성: 놓으면 0, 누르면 1. 외부 10kΩ 저항을 생략하면 입력이 불안정할 수 있습니다.','button');}
    if(b.type==='ultrasonic')add('sonar-'+b.trig+'-'+b.echo,'HC-SR04 초음파 센서',[...supply,net(pinName(b.trig),'TRIG (출력)','#c28a2d'),net(pinName(b.echo),'ECHO (입력)','#27959b')],'센서에 인쇄된 VCC / TRIG / ECHO / GND를 기준으로 연결하세요. 무응답은 -1cm입니다.','sonar');
    if(['servoAttach','servo','servoCondition'].includes(b.type))add('servo-'+key(project.board,b.pin),'서보 모터 · '+pinName(b.pin),[net('외부 안정화 5V (+)','전원 + (보통 빨강)','#d55959'),net('외부 전원 GND + 보드 GND','전원 − (보통 갈색/검정)','#405768'),net(pinName(b.pin),'신호 (보통 주황/노랑)','#8a62b3')],'서보는 보드 5V 핀 대신 적절한 외부 5V 전원을 사용하고 GND를 공통으로 연결합니다. 모델별 선색·전압·기구 범위를 확인하세요.','servo');
  }
  return {board:boards[project.board]?.name||project.board,components,issues:errors(project)};
}
const escapeSvg=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function wiringSvg(project,title='현재 블록의 연결도') {
  const plan=connectionPlan(project),items=plan.components;
  const heights=items.map(c=>82+c.nets.length*38+Math.ceil(c.note.length/64)*19);
  const total=Math.max(260,94+heights.reduce((s,h)=>s+h+18,0));
  const text=(x,y,s,size=17,color='#284653')=>`<text x="${x}" y="${y}" fill="${color}" font-family="Segoe UI,Malgun Gothic,sans-serif" font-size="${size}">${escapeSvg(s)}</text>`;
  let body=`<rect width="1100" height="${total}" rx="14" fill="#f5f9fa"/>`+text(24,32,title,22)+text(24,60,plan.board+' · 핀 이름을 따라 연결하세요 (물리적 핀 위치/브레드보드 배치도 아님)',15);
  let y=88;
  if(!items.length)body+=text(35,135,'이 미션은 USB 케이블만 연결합니다. 외부 부품 배선은 필요 없습니다.',20)+text(35,175,'시리얼 모니터의 텍스트·카운터 출력을 관찰하세요.',18);
  for(const [i,c]of items.entries()) {
    const h=heights[i];
    body+=`<rect x="20" y="${y}" width="1060" height="${h}" rx="10" fill="white" stroke="#cbdde0"/>`+text(38,y+30,plan.board+' / 전원',16)+text(520,y+30,c.label,21);
    if(c.kind==='led')body+=`<circle data-led-pin="${escapeSvg(c.nets[0].source.replace(/^D/,''))}" cx="1035" cy="${y+24}" r="12" fill="#8c9ba0"/>`;
    if(c.kind==='servo')body+=`<text data-servo-pin="${escapeSvg(c.nets[2].source.replace(/^D/,''))}" x="950" y="${y+31}" fill="#765098" font-size="19">대기</text>`;
    c.nets.forEach((n,j)=>{const row=y+62+j*38;body+=text(38,row+6,n.source,16)+`<circle cx="390" cy="${row}" r="5" fill="${n.color}"/><path d="M390 ${row} H500" stroke="${n.color}" stroke-width="4"/><circle cx="500" cy="${row}" r="5" fill="${n.color}"/>`+text(520,row+6,n.terminal,17);});
    for(let start=0,line=0;start<c.note.length;start+=64,line++)body+=text(38,y+66+c.nets.length*38+line*19,c.note.slice(start,start+64),13,'#5b7580');
    y+=h+18;
  }
  if(plan.issues.length)body+=text(24,total-12,'⚠ 블록의 핀/설정 오류를 먼저 수정하세요. 연결도는 참고용입니다.',16,'#a04531');
  return {body,height:total,plan};
}
export function renderWiring(svg,project,title) {
  const result=wiringSvg(project,title);svg.setAttribute('viewBox','0 0 1100 '+result.height);svg.innerHTML=result.body;
  svg.setAttribute('aria-label',title+' · '+result.plan.components.map(c=>c.label).join(', '));
}
