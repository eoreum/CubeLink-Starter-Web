import {walkProject} from './engine.js?v=1.5.0-studio1';
export function physicalWiringSvg(project){
 const nodes=walkProject(project);
 if(!nodes.some(n=>n.type==='write'&&String(n.pin)==='13')||nodes.some(n=>n.type==='write'&&String(n.pin)!=='13'||['ultrasonic','ldr','button','pot','dhtTemperature','dhtHumidity','temperature','sound','pir','tilt','joystickAxis'].includes(n.type)))return null;
 const text=(x,y,s,size=13)=>'<text x="'+x+'" y="'+y+'" font-family="sans-serif" font-size="'+size+'" fill="#223b4c">'+s+'</text>';
 const x=n=>450+(n-1)*18;
 let body='<rect width="1100" height="550" fill="#f2f6fa"/><rect x="30" y="115" width="320" height="300" rx="20" fill="#087f8c"/>'+text(55,150,'Arduino UNO R3',23);
 body+='<rect x="16" y="205" width="54" height="70" rx="5" fill="#c5cbd1"/>';
 for(let i=0;i<14;i++){let px=48+i*21;body+='<circle cx="'+px+'" cy="185" r="6" fill="#18333b" stroke="white"/>'+text(px-12,170,'D'+(13-i),10);}
 body+='<circle cx="75" cy="370" r="7" fill="#18333b" stroke="white"/>'+text(90,375,'GND',15);
 body+='<rect x="415" y="80" width="650" height="380" rx="15" fill="white" stroke="#b9c5cc" stroke-width="3"/>'+text(455,112,'브레드보드 400홀 · 중앙 홈',20);
 for(let n=1;n<=30;n++){if(n%5===0||n===1)body+=text(x(n)-7,140,String(n),11);for(let j=0;j<5;j++){body+='<circle cx="'+x(n)+'" cy="'+(175+j*17)+'" r="4" fill="#8b969d"/><circle cx="'+x(n)+'" cy="'+(310+j*17)+'" r="4" fill="#8b969d"/>';}}
 body+=text(430,175,'A')+text(430,243,'E')+text(430,310,'F')+text(430,378,'J');
 // D13 -> row 10, resistor across row 10 and 15; LED across center gap at row 15.
 body+='<path d="M48 185 V48 H'+x(10)+' V175" fill="none" stroke="#e4a12c" stroke-width="4"/>';
 body+='<path d="M'+x(10)+' 209 H'+(x(10)+25)+'" stroke="#947d5c" stroke-width="4"/><rect x="'+(x(10)+25)+'" y="198" width="65" height="22" rx="5" fill="#d4b481" stroke="#92764c"/><path d="M'+(x(10)+90)+' 209 H'+x(15)+' V175" fill="none" stroke="#947d5c" stroke-width="4"/>';
 body+='<path d="M'+x(15)+' 209 V242 M'+x(15)+' 310 V350" stroke="#6e7982" stroke-width="4"/><path d="M'+(x(15)-14)+' 271 Q'+(x(15)-14)+' 240 '+x(15)+' 240 Q'+(x(15)+14)+' 240 '+(x(15)+14)+' 271 Z" fill="#ed5959" stroke="#9d3030" stroke-width="3"/>';
 body+='<path d="M'+x(15)+' 350 V495 H75 V370" fill="none" stroke="#41586b" stroke-width="4"/>';
 body+=text(430,510,'D13 → 저항(220~330Ω) → LED 긴 다리(+) → 짧은 다리(-) → GND',15);
 body+=text(430,532,'교육용 배치 예시 · 실제 구멍과 부품 극성을 확인하세요.',13);
 return {body,height:550};
}
