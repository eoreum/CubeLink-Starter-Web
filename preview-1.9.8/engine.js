export const boards={uno:{name:'Uno R3',digital:14,analog:6,gpioAnalog:6},nano:{name:'Nano (Classic)',digital:14,analog:8,gpioAnalog:6},mega:{name:'Mega 2560',digital:54,analog:16,gpioAnalog:16}};

export const statementTypes=new Set(['serialBegin','printText','printValue','mode','write','servo','motor','delay','setVariable','changeVariable','if']);
export const expressionTypes=new Set(['number','variable','digitalRead','button','analogRead','ldr','pot','temperature','dhtTemperature','dhtHumidity','ds18Temperature','sound','pir','tilt','joystickAxis','ultrasonic','compare','logic','map']);
export const definitions={
 serialBegin:{label:'시리얼 통신 시작',category:'serial',baud:9600},printText:{label:'시리얼에 텍스트 출력',category:'serial',text:'Hello, CubeLink!'},printValue:{label:'시리얼에 값 출력',category:'serial'},mode:{label:'핀 모드 설정',category:'io',pin:'13',mode:'OUTPUT'},write:{label:'디지털 출력',category:'io',pin:'13',state:'HIGH'},servo:{label:'서보 각도 설정',category:'io',pin:'9',angle:90},motor:{label:'DC 모터 (L298N)',category:'io',en:'5',in1:'7',in2:'8',direction:'forward',speed:150},delay:{label:'기다리기',category:'basic',ms:500},setVariable:{label:'변수에 값 저장',category:'variable'},changeVariable:{label:'변수값 바꾸기',category:'variable'},if:{label:'만약 / 아니면',category:'flow'},
 number:{label:'숫자',category:'flow',value:0},variable:{label:'변수값',category:'variable',name:'value'},digitalRead:{label:'디지털 핀 읽기',category:'io',pin:'2'},button:{label:'버튼 읽기',category:'sensor',pin:'2'},analogRead:{label:'아날로그 핀 읽기',category:'sensor',pin:'A0'},ldr:{label:'조도 센서 값',category:'sensor',pin:'A0'},pot:{label:'가변저항 값',category:'sensor',pin:'A1'},temperature:{label:'TMP36 온도',category:'sensor',pin:'A2'},dhtTemperature:{label:'DHT11 온도',category:'sensor',pin:'3'},dhtHumidity:{label:'DHT11 습도',category:'sensor',pin:'3'},ds18Temperature:{label:'DS18B20 온도',category:'sensor',pin:'4'},sound:{label:'소리 센서 값',category:'sensor',pin:'A2'},pir:{label:'PIR 움직임 감지',category:'sensor',pin:'3'},tilt:{label:'기울기 감지',category:'sensor',pin:'4'},joystickAxis:{label:'조이스틱 축 값',category:'sensor',pin:'A0',axis:'X'},ultrasonic:{label:'초음파 거리',category:'sensor',trig:'9',echo:'10'},compare:{label:'값 비교',category:'flow',operator:'<'},logic:{label:'논리 결합',category:'flow',operator:'AND'},map:{label:'값 범위 변환',category:'sensor',inMin:0,inMax:1023,outMin:0,outMax:180}
};

export const statement=(type,fields={})=>({type,...fields});
export const expression=(type,fields={})=>({type,...Object.fromEntries(Object.entries(definitions[type]||{}).filter(([key])=>!['label','category'].includes(key))),...fields});
export function pins(board,analog=false){const b=boards[board];return analog?Array.from({length:b.analog},(_,i)=>'A'+i):[...Array.from({length:b.digital},(_,i)=>String(i)),...Array.from({length:b.gpioAnalog},(_,i)=>'A'+i)]}
export function pwmPins(board){return (board==='mega'?[2,3,4,5,6,7,8,9,10,11,12,13,44,45,46]:[3,5,6,9,10,11]).map(String)}
export function key(board,pin){pin=String(pin);return pin.startsWith('A')?String((board==='mega'?54:14)+Number(pin.slice(1))):pin}

const number=value=>expression('number',{value});
const variable=name=>expression('variable',{name});
const setVariable=(name,value)=>statement('setVariable',{name,value});
const printValue=value=>statement('printValue',{value});
const serial=()=>statement('serialBegin',{baud:9600});
const wait=ms=>statement('delay',{ms});
const pinMode=(pin,mode)=>statement('mode',{pin:String(pin),mode});
const write=(pin,state)=>statement('write',{pin:String(pin),state});
const compare=(left,operator,right)=>expression('compare',{left,operator,right});
const ifElse=(condition,then,otherwise=[])=>statement('if',{condition,then,else:otherwise});

export function walkProject(project){
 const nodes=[];const visit=node=>{if(!node||typeof node!=='object'||typeof node.type!=='string')return;nodes.push(node);if(node.type==='if'){visit(node.condition);(node.then||[]).forEach(visit);(node.else||[]).forEach(visit);return;}for(const field of ['value','left','right','a','b'])if(node[field]&&typeof node[field]==='object')visit(node[field]);};
 for(const section of ['setup','loop'])(project?.[section]||[]).forEach(visit);return nodes;
}
export function blockCount(project){return walkProject(project).length}

function validPin(project,pin,analog=false){return typeof pin==='string'&&pins(project.board,analog).includes(pin)}
const analogTypes=new Set(['analogRead','ldr','pot','temperature','sound','joystickAxis']);
const digitalTypes=new Set(['digitalRead','button','dhtTemperature','dhtHumidity','ds18Temperature','pir','tilt']);
export function motorChannels(project){
 const motors=walkProject(project).filter(n=>n.type==='motor');
 const pins=n=>[n.en,n.in1,n.in2].join('/');
 const channels=new Map(motors.filter(n=>n.channel).map(n=>[pins(n),n.channel]));
 for(const n of motors)if(!channels.has(pins(n))){
   const available=['A','B'].find(ch=>![...channels.values()].includes(ch));
   channels.set(pins(n),available||'?');
 }
 return channels;
}
export function errors(project){
 const out=[];if(!project||!Object.hasOwn(boards,project.board))return ['지원하지 않는 보드'];if(!Array.isArray(project.setup)||!Array.isArray(project.loop))return ['setup/loop 형식이 올바르지 않습니다'];
 const visit=(node,path,depth=0)=>{if(depth>20){out.push(path+': 블록 연결이 너무 깊습니다');return;}if(!node||typeof node!=='object'||typeof node.type!=='string'){out.push(path+': 블록 형식이 올바르지 않습니다');return;}if(!statementTypes.has(node.type)&&!expressionTypes.has(node.type)){out.push(path+': 알 수 없는 블록');return;}
  if(analogTypes.has(node.type)&&!validPin(project,node.pin,true))out.push(`${path}: ${node.pin} 아날로그 핀을 사용할 수 없습니다`);if(digitalTypes.has(node.type)&&!validPin(project,node.pin,false))out.push(`${path}: ${node.pin} 디지털 핀을 사용할 수 없습니다`);if(['mode','write','servo'].includes(node.type)&&!validPin(project,node.pin,false))out.push(`${path}: ${node.pin} 핀을 사용할 수 없습니다`);
  if(node.type==='ds18Temperature'&&['0','1'].includes(node.pin))out.push(path+': DS18B20에는 USB 시리얼 핀 D0/D1을 사용할 수 없습니다');
  if(node.type==='motor'){
   if(!pwmPins(project.board).includes(node.en))out.push(path+': EN 핀은 PWM 핀이어야 합니다');
   if(![node.in1,node.in2].every(pin=>validPin(project,pin)&&!['0','1'].includes(pin)))out.push(path+': IN1/IN2 핀 오류');
   if(new Set([node.en,node.in1,node.in2]).size!==3)out.push(path+': EN/IN1/IN2는 서로 다른 핀이어야 합니다');
   if(!['forward','reverse','stop'].includes(node.direction)||!Number.isInteger(node.speed)||node.speed<0||node.speed>255)out.push(path+': 방향 또는 속도(0~255) 오류');
  }
  if(node.type==='servo'&&(!Number.isInteger(node.angle)||node.angle<0||node.angle>180))out.push(path+': 서보 각도는 0~180 사이의 정수입니다');
  if(node.type==='mode'&&!['INPUT','OUTPUT','INPUT_PULLUP'].includes(node.mode))out.push(path+': 잘못된 핀 모드');if(node.type==='write'&&!['HIGH','LOW'].includes(node.state))out.push(path+': 잘못된 출력 값');if(node.type==='serialBegin'&&(!Number.isInteger(node.baud)||node.baud<300||node.baud>250000))out.push(path+': 잘못된 통신 속도');if(node.type==='delay'&&(!Number.isInteger(node.ms)||node.ms<0||node.ms>60000))out.push(path+': 대기 시간은 0~60000 정수입니다');
  if(['setVariable','changeVariable','variable'].includes(node.type)&&(!node.name||typeof node.name!=='string'||node.name.length>40))out.push(path+': 변수 이름이 올바르지 않습니다');if(node.type==='changeVariable'&&(!Number.isFinite(node.delta)||Math.abs(node.delta)>1000000))out.push(path+': 변수 변경값이 올바르지 않습니다');if(node.type==='number'&&(!Number.isFinite(node.value)||Math.abs(node.value)>1000000))out.push(path+': 숫자 범위를 확인하세요');if(node.type==='compare'&&!['==','!=','<','<=','>','>='].includes(node.operator))out.push(path+': 비교 연산자가 올바르지 않습니다');if(node.type==='logic'&&!['AND','OR'].includes(node.operator))out.push(path+': 논리 연산자가 올바르지 않습니다');if(node.type==='map'&&(![node.inMin,node.inMax,node.outMin,node.outMax].every(Number.isFinite)||node.inMin===node.inMax))out.push(path+': map 범위를 확인하세요');
  if(node.type==='ultrasonic'){if(!validPin(project,node.trig,false)||!validPin(project,node.echo,false))out.push(path+': 초음파 핀을 사용할 수 없습니다');else if(node.trig===node.echo)out.push(path+': Trig와 Echo는 서로 다른 핀이 필요합니다');}if(node.type==='joystickAxis'&&!['X','Y'].includes(node.axis))out.push(path+': 조이스틱 축이 올바르지 않습니다');
  if(node.type==='if'){visit(node.condition,path+' 조건',depth+1);if(!Array.isArray(node.then)||!Array.isArray(node.else)){out.push(path+': 조건 실행 블록 형식이 올바르지 않습니다');return;}node.then.forEach((child,i)=>visit(child,`${path} 참 ${i+1}`,depth+1));node.else.forEach((child,i)=>visit(child,`${path} 거짓 ${i+1}`,depth+1));return;}for(const field of ['value','left','right','a','b'])if(node[field]&&typeof node[field]==='object')visit(node[field],path+' '+field,depth+1);
 };
 for(const section of ['setup','loop'])project[section].forEach((node,i)=>visit(node,`${section} ${i+1}`));const nodes=walkProject(project),motors=nodes.filter(n=>n.type==='motor'),servos=nodes.filter(n=>n.type==='servo');
 for(const sensor of nodes.filter(n=>n.type==='ds18Temperature'))for(const n of nodes){if(n.type!=='ds18Temperature'&&['pin','trig','echo','en','in1','in2'].some(f=>n[f]!==undefined&&key(project.board,n[f])===key(project.board,sensor.pin)))out.push('DS18B20 데이터 핀과 다른 블록의 핀 충돌');}
 const channels=motorChannels(project);
 if(motors.some(m=>m.driver!==undefined&&m.driver!=='TB6612FNG'&&m.driver!=='L298N'))out.push('지원하지 않는 모터 드라이버입니다.');
 const bindings=new Map();
 for(const m of motors){
  const signature=[m.en,m.in1,m.in2].join('/');
  const channel=m.channel??channels.get(signature);
  if(!['A','B'].includes(channel)||channels.get(signature)!==channel||(bindings.has((m.driver||'L298N')+channel)&&bindings.get((m.driver||'L298N')+channel)!==signature))out.push('모터 번호별 핀을 통일하고 A와 B에 서로 다른 핀을 지정하세요.');
  bindings.set((m.driver||'L298N')+channel,signature);
  if(servos.length&&(project.board==='mega'?['44','45','46']:['9','10']).includes(m.en))out.push('Servo 라이브러리와 모터 PWM 타이머가 충돌합니다. 다른 EN 핀을 사용하세요.');
  for(const n of nodes){if(n.type==='motor'){if([n.en,n.in1,n.in2].some(p=>[m.en,m.in1,m.in2].includes(p))&&((n.driver||'L298N')!==(m.driver||'L298N')||!(n.en===m.en&&n.in1===m.in1&&n.in2===m.in2)))out.push('DC 모터 채널 핀 충돌');}else if(['pin','trig','echo'].some(f=>n[f]!==undefined&&[m.en,m.in1,m.in2].includes(n[f])))out.push('DC 모터와 다른 블록의 핀 충돌');}
 }
 return [...new Set(out)];
}

export function warnings(project){
 if(errors(project).length)return [];const nodes=walkProject(project),modes={},out=[];for(const node of nodes)if(node.type==='mode')modes[key(project.board,node.pin)]=node.mode;
 for(const node of nodes){if(node.type==='write'&&modes[key(project.board,node.pin)]!=='OUTPUT')out.push(`${node.pin}: pinMode OUTPUT이 없어 디지털 출력을 차단합니다`);if(['button','digitalRead','pir','tilt'].includes(node.type)&&!['INPUT','INPUT_PULLUP'].includes(modes[key(project.board,node.pin)]))out.push(`${node.pin}: INPUT 또는 INPUT_PULLUP 설정을 권장합니다`);}
 const usedPins=[];for(const node of nodes)for(const field of ['pin','trig','echo'])if(node[field]!==undefined)usedPins.push(String(node[field]));if(usedPins.some(pin=>['0','1'].includes(pin)))out.push('D0/D1은 하드웨어 시리얼과 충돌할 수 있습니다');return [...new Set(out)];
}

const cppString=s=>'"'+String(s).replace(/["\\\x00-\x1f\x7f]/g,c=>c==='"'?'\\"':c==='\\'?'\\\\':'\\'+c.charCodeAt(0).toString(8).padStart(3,'0'))+'"';
const reserved=new Set(['auto','bool','break','case','char','class','const','continue','default','do','double','else','enum','extern','false','float','for','goto','if','int','long','namespace','new','private','protected','public','return','short','signed','sizeof','static','struct','switch','template','this','true','typedef','union','unsigned','using','virtual','void','volatile','while']);
export function safeIdentifier(name){let value=String(name||'variable').normalize('NFKD').replace(/[^a-zA-Z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');if(!value)value='variable';if(!/^[a-zA-Z_]/.test(value))value='variable_'+value;if(reserved.has(value))value='var_'+value;return value}
function expressionType(node){if(['temperature','dhtTemperature','dhtHumidity','ds18Temperature','ultrasonic'].includes(node?.type))return 'float';if(node?.type==='map')return expressionType(node.value);return 'int'}

export function generate(project){
 const issues=errors(project);if(issues.length)return '// 블록 오류\n// '+issues.join('\n// ');const nodes=walkProject(project),variables=new Map(),includes=new Set(),globals=new Set(),helpers=new Set(),autoSetup=[];
 for(const node of nodes){if(node.type==='setVariable'){const name=safeIdentifier(node.name),type=expressionType(node.value);if(!variables.has(name)||type==='float')variables.set(name,type);}if(node.type==='changeVariable')variables.set(safeIdentifier(node.name),'long');if(node.type==='variable'&&!variables.has(safeIdentifier(node.name)))variables.set(safeIdentifier(node.name),'int');}
 for(const [name,type]of variables)globals.add(`${type} ${name} = ${type==='float'?'0.0':'0'};`);const dhtPins=[...new Set(nodes.filter(n=>['dhtTemperature','dhtHumidity'].includes(n.type)).map(n=>n.pin))];if(dhtPins.length){includes.add('#include <DHT.h>');for(const pin of dhtPins){globals.add(`DHT dht${pin}(${pin}, DHT11);`);autoSetup.push(`dht${pin}.begin();`);}}
 const dsPins=[...new Set(nodes.filter(n=>n.type==='ds18Temperature').map(n=>key(project.board,n.pin)))];if(dsPins.length){includes.add('#include <OneWire.h>');includes.add('#include <DallasTemperature.h>');for(const pin of dsPins){globals.add('OneWire clWire_'+pin+'('+pin+');');globals.add('DallasTemperature clDS_'+pin+'(&clWire_'+pin+');');autoSetup.push('clDS_'+pin+'.begin();');globals.add('float clReadDS_'+pin+'() { clDS_'+pin+'.requestTemperatures(); return clDS_'+pin+'.getTempCByIndex(0); }');}}
 for(const pin of new Set(nodes.filter(node=>node.type==='servo').map(node=>key(project.board,node.pin)))){
  includes.add('#include <Servo.h>');
  globals.add('Servo clServo_'+pin+';');
  autoSetup.push('clServo_'+pin+'.attach('+pin+');');
 }
 for(const m of new Map(nodes.filter(n=>n.type==='motor').map(n=>[n.en,n])).values()){
  autoSetup.push(`digitalWrite(${m.en}, LOW);`,`pinMode(${m.en}, OUTPUT);`,`digitalWrite(${m.in1}, LOW);`,`pinMode(${m.in1}, OUTPUT);`,`digitalWrite(${m.in2}, LOW);`,`pinMode(${m.in2}, OUTPUT);`);
 }
 if(nodes.some(n=>n.type==='motor'))helpers.add(`void clMotor(int en, int in1, int in2, int direction, int speed) {
  analogWrite(en, 0);
  digitalWrite(in1, LOW);
  digitalWrite(in2, LOW);
  if (direction == 0 || speed == 0) return;
  delay(20);
  digitalWrite(in1, direction > 0 ? HIGH : LOW);
  digitalWrite(in2, direction < 0 ? HIGH : LOW);
  analogWrite(en, speed);
 }`);
 if(nodes.some(n=>n.type==='ultrasonic'))helpers.add(`float readUltrasonic(int trig, int echo) {
  pinMode(trig, OUTPUT);
  pinMode(echo, INPUT);
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  unsigned long duration = pulseIn(echo, HIGH, 30000UL);
  return duration == 0 ? -1.0f : duration * 0.0343f / 2.0f;
}`);
 const expr=node=>{switch(node.type){case 'number':return String(node.value);case 'variable':return safeIdentifier(node.name);case 'digitalRead':case 'button':case 'pir':case 'tilt':return `digitalRead(${node.pin})`;case 'analogRead':case 'ldr':case 'pot':case 'sound':case 'joystickAxis':return `analogRead(${node.pin})`;case 'temperature':return `((analogRead(${node.pin}) * 5.0 / 1023.0 - 0.5) * 100.0)`;case 'dhtTemperature':return `dht${node.pin}.readTemperature()`;case 'dhtHumidity':return `dht${node.pin}.readHumidity()`;case 'ds18Temperature':return 'clReadDS_'+key(project.board,node.pin)+'()';case 'ultrasonic':return `readUltrasonic(${node.trig}, ${node.echo})`;case 'compare':return `(${expr(node.left)} ${node.operator} ${expr(node.right)})`;case 'logic':return `(${expr(node.a)} ${node.operator==='AND'?'&&':'||'} ${expr(node.b)})`;case 'map':return `map((long)${expr(node.value)}, ${node.inMin}, ${node.inMax}, ${node.outMin}, ${node.outMax})`;default:return '0';}};
 const statements=(list,indent='  ')=>list.map(node=>{switch(node.type){case 'serialBegin':return `${indent}Serial.begin(${node.baud});`;case 'printText':return `${indent}Serial.println(${cppString(node.text)});`;case 'printValue':return `${indent}Serial.println(${expr(node.value)});`;case 'mode':return `${indent}pinMode(${node.pin}, ${node.mode});`;case 'write':return `${indent}digitalWrite(${node.pin}, ${node.state});`;case 'motor':return `${indent}clMotor(${node.en}, ${node.in1}, ${node.in2}, ${{forward:1,reverse:-1,stop:0}[node.direction]}, ${node.speed});`;case 'servo':return indent+'clServo_'+key(project.board,node.pin)+'.write('+node.angle+');';case 'delay':return `${indent}delay(${node.ms});`;case 'setVariable':return `${indent}${safeIdentifier(node.name)} = ${expr(node.value)};`;case 'changeVariable':return `${indent}${safeIdentifier(node.name)} += ${node.delta};`;case 'if':return `${indent}if (${expr(node.condition)}) {\n${statements(node.then,indent+'  ')}\n${indent}} else {\n${statements(node.else,indent+'  ')}\n${indent}}`;default:return `${indent}// 알 수 없는 블록`;}}).join('\n');
 const header=[...includes,...globals].join('\n'),helper=[...helpers].join('\n\n'),setupCode=[...autoSetup.map(code=>'  '+code),statements(project.setup)].filter(Boolean).join('\n');return `// CubeLink Starter · CubeLink Studio 호환 기초 코드 · ${boards[project.board].name}\n\n${header?header+'\n\n':''}${helper?helper+'\n\n':''}void setup() {\n${setupCode}\n}\n\nvoid loop() {\n${statements(project.loop)}\n}\n`;
}

export class Simulation{
 constructor(project,inputs={}){this.project=structuredClone(project);this.inputs=inputs;this.modes={};this.outputs={};this.servos={};this.motors={};this.variables={};this.value=0;this.time=0;this.logs=[];this.faults=[];}
 eval(node){let value=0;switch(node.type){case 'number':value=node.value;break;case 'variable':value=this.variables[node.name]??0;break;case 'digitalRead':case 'button':case 'pir':case 'tilt':value=this.inputs.digital?.[node.pin]??(this.modes[key(this.project.board,node.pin)]==='INPUT_PULLUP'?1:0);break;case 'analogRead':case 'ldr':case 'pot':case 'sound':case 'joystickAxis':value=Number(this.inputs.analog?.[node.pin]??0);break;case 'temperature':case 'dhtTemperature':case 'ds18Temperature':value=Number(this.inputs.temperature??25);break;case 'dhtHumidity':value=Number(this.inputs.humidity??50);break;case 'ultrasonic':value=Number(this.inputs.distance??100);break;case 'compare':{const a=this.eval(node.left),b=this.eval(node.right);value=({"==":a==b,"!=":a!=b,"<":a<b,"<=":a<=b,">":a>b,">=":a>=b})[node.operator]?1:0;break;}case 'logic':value=node.operator==='AND'?(this.eval(node.a)&&this.eval(node.b)?1:0):(this.eval(node.a)||this.eval(node.b)?1:0);break;case 'map':value=Math.trunc((Math.trunc(this.eval(node.value))-node.inMin)*(node.outMax-node.outMin)/(node.inMax-node.inMin))+node.outMin;break;}this.value=Number(value)||0;return value;}
 execute(list){let wait=0;for(const node of list){const result=this.step(node);wait+=result.wait||0;if(result.error)return {wait,error:result.error};}return {wait};}
 step(node){let wait=0,nestedTime=false;switch(node.type){case 'serialBegin':break;case 'mode':this.modes[key(this.project.board,node.pin)]=node.mode;break;case 'write':if(this.modes[key(this.project.board,node.pin)]!=='OUTPUT'){const error=`${node.pin}: OUTPUT 설정 누락 — 출력 차단`;this.faults.push(error);return {wait,error};}this.outputs[key(this.project.board,node.pin)]=node.state==='HIGH'?1:0;break;case 'motor':this.motors[node.en]={direction:node.speed===0?'stop':node.direction,speed:node.direction==='stop'?0:node.speed};break;case 'servo':this.servos[key(this.project.board,node.pin)]=node.angle;break;case 'delay':wait=node.ms;break;case 'setVariable':this.variables[node.name]=this.eval(node.value);break;case 'changeVariable':this.variables[node.name]=(this.variables[node.name]??0)+node.delta;this.value=this.variables[node.name];break;case 'printText':this.logs.push(String(node.text));break;case 'printValue':{const value=this.eval(node.value);this.logs.push(Number.isInteger(value)?String(value):Number(value).toFixed(2));break;}case 'if':{const result=this.execute(this.eval(node.condition)?node.then:node.else);wait+=result.wait||0;nestedTime=true;if(result.error)return result;break;}}if(!nestedTime)this.time+=wait;return {wait};}
}

export const examples={
 free:{board:"uno",setup:[],loop:[]},
 servo:{board:'uno',setup:[],loop:[0,90,180].flatMap(angle=>[statement('servo',{pin:'9',angle}),wait(750)])},
 ledOn:{board:'uno',setup:[pinMode('13','OUTPUT')],loop:[write('13','HIGH'),wait(100)]},blink:{board:'uno',setup:[pinMode('13','OUTPUT')],loop:[write('13','HIGH'),wait(500),write('13','LOW'),wait(500)]},serial3:{board:'uno',setup:[serial(),...['Hello CubeLink 1','Hello CubeLink 2','Hello CubeLink 3'].map(text=>statement('printText',{text}))],loop:[wait(1000)]},counter:{board:'uno',setup:[serial()],loop:[statement('changeVariable',{name:'counter',delta:1}),printValue(variable('counter')),wait(500)]},
 button:{board:'uno',setup:[serial(),pinMode('2','INPUT_PULLUP')],loop:[setVariable('buttonState',expression('button',{pin:'2'})),printValue(variable('buttonState')),wait(200)]},buttonLed:{board:'uno',setup:[pinMode('2','INPUT_PULLUP'),pinMode('13','OUTPUT')],loop:[setVariable('buttonState',expression('button',{pin:'2'})),ifElse(compare(variable('buttonState'),'==',number(0)),[write('13','HIGH')],[write('13','LOW')]),wait(50)]},pot:{board:'uno',setup:[serial()],loop:[setVariable('potentiometerValue',expression('pot',{pin:'A1'})),printValue(variable('potentiometerValue')),wait(200)]},ldr:{board:'uno',setup:[serial()],loop:[setVariable('lightValue',expression('ldr',{pin:'A0'})),printValue(variable('lightValue')),wait(200)]},sensors:{board:'uno',setup:[serial()],loop:[setVariable('lightValue',expression('ldr',{pin:'A0'})),printValue(variable('lightValue')),setVariable('potentiometerValue',expression('pot',{pin:'A1'})),printValue(variable('potentiometerValue')),wait(400)]},
 distance:{board:'uno',setup:[serial()],loop:[setVariable('distanceCm',expression('ultrasonic',{trig:'9',echo:'10'})),printValue(variable('distanceCm')),wait(300)]},distanceLed:{board:'uno',setup:[serial(),pinMode('13','OUTPUT')],loop:[setVariable('distanceCm',expression('ultrasonic',{trig:'9',echo:'10'})),ifElse(expression('logic',{operator:'AND',a:compare(variable('distanceCm'),'>=',number(0)),b:compare(variable('distanceCm'),'<',number(20))}),[write('13','HIGH')],[write('13','LOW')]),printValue(variable('distanceCm')),wait(100)]},streetlight:{board:'uno',setup:[serial(),pinMode('13','OUTPUT')],loop:[setVariable('lightValue',expression('ldr',{pin:'A0'})),ifElse(compare(variable('lightValue'),'<',number(500)),[write('13','HIGH')],[write('13','LOW')]),printValue(variable('lightValue')),wait(150)]},
 temperature:{board:'uno',setup:[serial()],loop:[setVariable('temperatureC',expression('temperature',{pin:'A2'})),printValue(variable('temperatureC')),wait(500)]},dht:{board:'uno',setup:[serial()],loop:[setVariable('temperatureC',expression('dhtTemperature',{pin:'3'})),setVariable('humidity',expression('dhtHumidity',{pin:'3'})),printValue(variable('temperatureC')),printValue(variable('humidity')),wait(1000)]},sound:{board:'uno',setup:[serial()],loop:[setVariable('soundLevel',expression('sound',{pin:'A2'})),printValue(variable('soundLevel')),wait(100)]},pir:{board:'uno',setup:[serial(),pinMode('3','INPUT')],loop:[setVariable('motionDetected',expression('pir',{pin:'3'})),printValue(variable('motionDetected')),wait(200)]},tilt:{board:'uno',setup:[serial(),pinMode('4','INPUT_PULLUP')],loop:[setVariable('tiltState',expression('tilt',{pin:'4'})),printValue(variable('tiltState')),wait(200)]},joystick:{board:'uno',setup:[serial(),pinMode('2','INPUT_PULLUP')],loop:[setVariable('joystickX',expression('joystickAxis',{pin:'A0',axis:'X'})),setVariable('joystickY',expression('joystickAxis',{pin:'A1',axis:'Y'})),setVariable('joystickButton',expression('button',{pin:'2'})),printValue(variable('joystickX')),printValue(variable('joystickY')),printValue(variable('joystickButton')),wait(200)]}
};

export function migrateLegacyProject(project){
 const next={board:project.board,setup:[],loop:[],mission:project.mission};let current='value';const convert=list=>{const out=[];for(const node of list){switch(node.type){case 'mode':case 'write':case 'delay':out.push(structuredClone(node));break;case 'led':out.push(write(node.pin,node.state));break;case 'print':out.push(node.source==='text'?statement('printText',{text:node.text}):printValue(variable(current)));break;case 'increment':current='counter';out.push(statement('changeVariable',{name:'counter',delta:node.step}));break;case 'read':current='digitalValue';out.push(setVariable(current,expression('digitalRead',{pin:node.pin})));break;case 'button':current='buttonState';out.push(setVariable(current,expression('button',{pin:node.pin})));break;case 'analog':current='analogValue';out.push(setVariable(current,expression('analogRead',{pin:node.pin})));break;case 'ldr':current='lightValue';out.push(setVariable(current,expression('ldr',{pin:node.pin})));break;case 'pot':current='potentiometerValue';out.push(setVariable(current,expression('pot',{pin:node.pin})));break;case 'ultrasonic':current='distanceCm';out.push(setVariable(current,expression('ultrasonic',{trig:node.trig,echo:node.echo})));break;case 'threshold':out.push(ifElse(compare(variable(current),node.operator,number(node.threshold)),[write(node.pin,'HIGH')],[write(node.pin,'LOW')]));break;case 'distanceLed':out.push(ifElse(expression('logic',{operator:'AND',a:compare(variable(current),'>=',number(0)),b:compare(variable(current),'<',number(node.threshold))}),[write(node.pin,'HIGH')],[write(node.pin,'LOW')]));break;case 'mapValue':out.push(setVariable(current,expression('map',{value:variable(current),inMin:node.inMin,inMax:node.inMax,outMin:node.outMin,outMax:node.outMax})));break;}}return out;};next.setup=convert(project.setup||[]);next.loop=convert(project.loop||[]);if(walkProject(next).some(n=>['printText','printValue'].includes(n.type))&&!next.setup.some(n=>n.type==='serialBegin'))next.setup.unshift(serial());return next;
}
