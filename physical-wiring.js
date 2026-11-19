import {walkProject} from './engine.js?v=1.9.4';
// Coordinates are defined once in the SVG viewBox. Wires and component leads
// reference the same hole centers, so responsive scaling cannot cause drift.
export function physicalWiringSvg(project){
 const nodes=walkProject(project);
 if(!nodes.some(n=>n.type==='write'&&String(n.pin)==='13')||nodes.some(n=>n.type==='write'&&String(n.pin)!=='13'||['ultrasonic','ldr','button','pot','dhtTemperature','dhtHumidity','temperature','sound','pir','tilt','joystickAxis'].includes(n.type)))return null;
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
 const label=(x,y,s,size=13)=>'<text x="'+x+'" y="'+y+'" font-family="sans-serif" font-size="'+size+'" fill="#223b4c">'+esc(s)+'</text>';
 const hole=(col,row)=>({x:458+(col-1)*19,y:177+(row<5?row*19:135+(row-5)*19)});
 const point=p=>p.x+' '+p.y;
 const line=(a,b,color,width=4)=>'<path d="M'+point(a)+' L'+point(b)+'" stroke="'+color+'" stroke-width="'+width+'" fill="none" stroke-linecap="round"/>';
 let body='<rect width="1100" height="550" fill="#f2f6fa"/><rect x="30" y="115" width="320" height="300" rx="20" fill="#087f8c"/>'+label(55,150,'Arduino UNO R3',23);
 body+='<rect x="16" y="205" width="54" height="70" rx="5" fill="#c5cbd1"/>';
 for(let i=0;i<14;i++){const px=48+i*21;body+='<circle cx="'+px+'" cy="185" r="6" fill="#18333b" stroke="white"/>'+label(px-12,170,'D'+(13-i),10);}
 body+='<circle cx="75" cy="370" r="7" fill="#18333b" stroke="white"/>'+label(90,375,'GND',15);
 body+='<rect x="415" y="80" width="650" height="380" rx="15" fill="white" stroke="#b9c5cc" stroke-width="3"/>'+label(455,112,'브레드보드 · 중앙 홈',20);
 for(let col=1;col<=30;col++){if(col%5===0||col===1)body+=label(hole(col,0).x-7,152,col,11);for(let row=0;row<10;row++){const p=hole(col,row);body+='<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="#8b969d"/>';}}
 for(let row=0;row<10;row++)body+=label(431,hole(1,row).y+4,'ABCDE' [row]||'FGHIJ'[row-5],12);
 // Two separate terminal strips: each 5-hole column is electrically common.
 // D13 -> column 8 -> resistor -> column 13 -> LED anode at column 13.
 // LED cathode at column 15 -> GND. Never bridge LED legs to one common strip.
 const input=hole(8,0),ra=hole(8,2),rb=hole(13,2),anode=hole(13,4),cathode=hole(15,4),ground=hole(15,6);
 body+='<path d="M48 185 V47 H'+input.x+' V'+input.y+'" fill="none" stroke="#e4a12c" stroke-width="4" stroke-linecap="round"/>';
 const mid=(ra.x+rb.x)/2;
 body+=line(ra,{x:mid-27,y:ra.y},'#947d5c')+'<rect x="'+(mid-27)+'" y="'+(ra.y-10)+'" width="54" height="20" rx="7" fill="#d4b481" stroke="#92764c"/>';
 for(const [dx,color] of [[-15,'#d21e26'],[-6,'#d21e26'],[3,'#8a4e22'],[17,'#c9a336']])body+='<rect x="'+(mid+dx)+'" y="'+(ra.y-9)+'" width="5" height="18" fill="'+color+'"/>';
 body+=line({x:mid+27,y:ra.y},rb,'#947d5c');
 body+=line(anode,{x:anode.x,y:anode.y+23},'#a5a9ad',3)+line(cathode,{x:cathode.x,y:cathode.y+23},'#a5a9ad',3);
 body+='<path d="M'+(anode.x-8)+' '+(anode.y+24)+' Q'+(anode.x-8)+' '+(anode.y-8)+' '+(anode.x+10)+' '+(anode.y-8)+' Q'+(cathode.x+8)+' '+(anode.y-8)+' '+(cathode.x+8)+' '+(cathode.y+24)+' Z" fill="#ed5959" stroke="#9d3030" stroke-width="2"/>';
 body+='<path d="M'+ground.x+' '+ground.y+' V495 H75 V370" fill="none" stroke="#41586b" stroke-width="4" stroke-linecap="round"/>';
 body+=label(430,515,'D13 → 220Ω 저항 → LED 긴 다리(+) → 짧은 다리(-) → GND',15);
 body+=label(430,538,'연결 열: D13=8열, 저항=8~13열, LED=13열(+)/15열(-), GND=15열',12);
 return {body,height:550};
}
