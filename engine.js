export const boards={uno:{name:'Uno R3',digital:14,analog:6,gpioAnalog:6},nano:{name:'Nano (Classic)',digital:14,analog:8,gpioAnalog:6},mega:{name:'Mega 2560',digital:54,analog:16,gpioAnalog:16}};
export const definitions={
 distanceLed:{label:'거리 조건 LED',category:'io',pin:'13',threshold:20},
 mapValue:{label:'읽은 값 범위 변환',category:'time',inMin:0,inMax:1023,outMin:0,outMax:180},
 increment:{label:'카운터 증가',category:'time',step:1},
 mode:{label:'핀 모드 설정',category:'io',pin:'13',mode:'OUTPUT'},
 write:{label:'디지털 출력',category:'io',pin:'13',state:'HIGH'},
 read:{label:'디지털 읽기',category:'io',pin:'2'},
 analog:{label:'아날로그 읽기',category:'sensor',pin:'A0'},
 delay:{label:'기다리기',category:'time',ms:500},
 print:{label:'시리얼 출력',category:'time',source:'value',text:'Hello, CubeLink!'},
 ultrasonic:{label:'초음파 거리',category:'sensor',trig:'9',echo:'10'},
 ldr:{label:'조도 센서 (LDR)',category:'sensor',pin:'A0'},
 pot:{label:'가변저항',category:'sensor',pin:'A1'},
 button:{label:'버튼 읽기',category:'sensor',pin:'2'},
 threshold:{label:'조건에 따라 LED 출력',category:'io',pin:'13',operator:'<',threshold:500},
 led:{label:'LED 출력',category:'io',pin:'13',state:'HIGH'}
};
export function block(type){const {label,category,...fields}=definitions[type];return {type,...fields}}
export function pins(board,analog=false){const b=boards[board];return analog?Array.from({length:b.analog},(_,i)=>'A'+i):[...Array.from({length:b.digital},(_,i)=>String(i)),...Array.from({length:b.gpioAnalog},(_,i)=>'A'+i)]}
export function key(board,pin){return pin.startsWith('A')?String((board==='mega'?54:14)+Number(pin.slice(1))):pin}
export function errors(project){const result=[];if(!boards[project.board])return ['지원하지 않는 보드'];for(const section of ['setup','loop'])project[section].forEach((b,i)=>{const prefix=`${section} ${i+1}`;if(!definitions[b.type]){result.push(prefix+': 알 수 없는 블록');return}for(const field of ['pin','trig','echo'])if(field in b&&!pins(project.board,['analog','ldr','pot'].includes(b.type)).includes(b[field]))result.push(`${prefix}: ${b[field]} 핀은 이 보드에서 사용할 수 없습니다`);if(b.type==='delay'&&(!Number.isInteger(Number(b.ms))||Number(b.ms)<0||Number(b.ms)>60000))result.push(prefix+': 대기 시간은 0~60000 정수입니다');if(b.type==='mode'&&!['INPUT','OUTPUT','INPUT_PULLUP'].includes(b.mode))result.push(prefix+': 잘못된 핀 모드');if(b.type==='threshold'&&(!['<','>='].includes(b.operator)||typeof b.threshold!=='number'||!Number.isFinite(b.threshold)||Math.abs(b.threshold)>1000000))result.push(prefix+': 잘못된 비교 조건');if(['write','led'].includes(b.type)&&!['HIGH','LOW'].includes(b.state))result.push(prefix+': 잘못된 출력 값');if(b.type==='print'&&!['text','value'].includes(b.source))result.push(prefix+': 잘못된 출력 종류');if(b.type==='distanceLed'&&(!Number.isFinite(b.threshold)||b.threshold<0||b.threshold>400))result.push(prefix+': 거리 기준은 0~400cm입니다');if(b.type==='mapValue'&&(![b.inMin,b.inMax,b.outMin,b.outMax].every(n=>Number.isInteger(n)&&Math.abs(n)<=10000)||b.inMin===b.inMax))result.push(prefix+': map 범위는 서로 다른 입력 경계와 ±10000 이내 정수여야 합니다');if(b.type==='increment'&&(!Number.isInteger(b.step)||Math.abs(b.step)>1000))result.push(prefix+': 증가량은 ±1000 이내 정수입니다');if(b.type==='ultrasonic'&&b.trig===b.echo)result.push(prefix+': Trig와 Echo는 서로 다른 핀이 필요합니다')});return result}
export function warnings(project){if(errors(project).length)return [];const modes={},out=[];for(const b of [...project.setup,...project.loop]){const k=p=>key(project.board,p);if(b.type==='mode')modes[k(b.pin)]=b.mode;if(['write','led','threshold','distanceLed'].includes(b.type)&&modes[k(b.pin)]!=='OUTPUT')out.push(`${b.pin}: pinMode OUTPUT이 없어 디지털 출력을 차단합니다`);if(b.type==='ultrasonic'&&(modes[k(b.trig)]!=='OUTPUT'||!['INPUT','INPUT_PULLUP'].includes(modes[k(b.echo)])))out.push('초음파: Trig OUTPUT / Echo INPUT 설정이 필요합니다');}if([...project.setup,...project.loop].some(b=>[b.pin,b.trig,b.echo].some(p=>['0','1'].includes(p))))out.push('D0/D1은 하드웨어 시리얼과 충돌할 수 있습니다');return [...new Set(out)]}
const cppString=s=>'"'+String(s).replace(/["\\\x00-\x1f\x7f]/g,c=>c==='"'?'\\"':c==='\\'?'\\\\':'\\'+c.charCodeAt(0).toString(8).padStart(3,'0'))+'"';
export function generate(project){const all=[...project.setup,...project.loop];const sonar=all.some(b=>b.type==='ultrasonic');const statement=b=>({
 distanceLed:()=>`digitalWrite(${b.pin}, (value >= 0 && value < ${b.threshold}) ? HIGH : LOW);`,
 mapValue:()=>'value = map((long)value, '+[b.inMin,b.inMax,b.outMin,b.outMax].join(', ')+');',
 increment:()=>'counter += '+b.step+'; value = counter;',
 threshold:()=>`digitalWrite(${b.pin}, value ${b.operator} ${Number(b.threshold)} ? HIGH : LOW);`,mode:()=>`pinMode(${b.pin}, ${b.mode});`,write:()=>`digitalWrite(${b.pin}, ${b.state});`,led:()=>`digitalWrite(${b.pin}, ${b.state});`,read:()=>`value = digitalRead(${b.pin});`,button:()=>`value = digitalRead(${b.pin});`,analog:()=>`value = analogRead(${b.pin});`,ldr:()=>`value = analogRead(${b.pin});`,pot:()=>`value = analogRead(${b.pin});`,delay:()=>`delay(${Number(b.ms)});`,print:()=>`Serial.println(${b.source==='text'?cppString(b.text):'value'});`,ultrasonic:()=>`value = readDistanceCm(${b.trig}, ${b.echo});`
 }[b.type]?.()||'// 알 수 없는 블록');
 return `// CubeLink Starter v1.5.0 · ${boards[project.board]?.name || project.board}\n#include <Arduino.h>\n\nfloat value = 0;\n${all.some(b=>b.type==='increment')?"long counter = 0;\n":""}${sonar?`\n// HC-SR04: timeout returns -1 cm\nfloat readDistanceCm(uint8_t trig, uint8_t echo) {\n  digitalWrite(trig, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trig, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trig, LOW);\n  unsigned long duration = pulseIn(echo, HIGH, 30000UL);\n  return duration == 0 ? -1.0f : duration * 0.0343f / 2.0f;\n}\n`:''}\nvoid setup() {\n  Serial.begin(9600);\n${project.setup.map(b=>'  '+statement(b)).join('\n')}\n}\n\nvoid loop() {\n${project.loop.map(b=>'  '+statement(b)).join('\n')}\n}\n`;
}
export class Simulation {
 constructor(project,inputs={}){this.project=structuredClone(project);this.inputs=inputs;this.modes={};this.outputs={};this.value=0;this.time=0;this.logs=[];this.faults=[];this.counter=0}
 step(b){const p=this.project.board,k=p1=>key(p,p1);const mode=p1=>this.modes[k(p1)];const fail=s=>{this.faults.push(s);return {error:s,wait:0}};let wait=0;
 if(errors({...this.project,setup:[b],loop:[]}).length)return fail('잘못된 블록 또는 핀');
 switch(b.type){
 case 'distanceLed':if(mode(b.pin)!=='OUTPUT')return fail(b.pin+': OUTPUT 설정 누락 — 출력 차단');this.outputs[k(b.pin)]=(this.value>=0&&this.value<b.threshold)?1:0;break;
 case 'mapValue':this.value=Math.trunc((Math.trunc(this.value)-b.inMin)*(b.outMax-b.outMin)/(b.inMax-b.inMin))+b.outMin;break;
 case 'increment':this.counter+=b.step;this.value=this.counter;break;
 case 'mode':this.modes[k(b.pin)]=b.mode;if(b.mode!=='OUTPUT')delete this.outputs[k(b.pin)];break;
 case 'write':case 'led':if(mode(b.pin)!=='OUTPUT')return fail(`${b.pin}: OUTPUT 설정 누락 — 출력 차단`);this.outputs[k(b.pin)]=b.state==='HIGH'?1:0;break;
 case 'threshold':if(mode(b.pin)!=='OUTPUT')return fail(`${b.pin}: OUTPUT 설정 누락 — 출력 차단`);this.outputs[k(b.pin)]=(b.operator==='<'?this.value<Number(b.threshold):this.value>=Number(b.threshold))?1:0;break;
 case 'read':case 'button':{const external=this.inputs.digital?.[b.pin];this.value=mode(b.pin)==='OUTPUT'?(this.outputs[k(b.pin)]||0):external??(mode(b.pin)==='INPUT_PULLUP'?1:0);break;}
 case 'analog':case 'ldr':case 'pot':this.value=Number(this.inputs.analog?.[b.pin]??0);break;
 case 'ultrasonic':if(mode(b.trig)!=='OUTPUT'||!['INPUT','INPUT_PULLUP'].includes(mode(b.echo)))return fail('초음파 핀 모드 누락 — 트리거 출력 차단');this.outputs[k(b.trig)]=0;{const d=Number(this.inputs.distance??100);const duration=Math.round(d*2/0.0343);this.value=d<0||duration>30000?-1:Math.fround(Math.fround(duration*0.0343)/2);wait=(this.value<0?30:duration/1000)+0.012;}break;
 case 'delay':wait=Number(b.ms);break;
 case 'print':this.logs.push(b.source==='text'?String(b.text):this.value.toFixed(2));break;
 }this.time+=wait;return {wait};
 }
}
export const examples={streetlight:{board:'uno',setup:[block('mode')],loop:[block('ldr'),block('threshold'),block('print'),{...block('delay'),ms:150}]},blink:{board:'uno',setup:[block('mode')],loop:[block('led'),block('delay'),{...block('led'),state:'LOW'},block('delay')]},sensors:{board:'uno',setup:[],loop:[block('ldr'),block('print'),block('pot'),block('print'),{...block('delay'),ms:400}]},distance:{board:'uno',setup:[{...block('mode'),pin:'9'},{...block('mode'),pin:'10',mode:'INPUT'}],loop:[block('ultrasonic'),block('print'),{...block('delay'),ms:300}]},button:{board:'uno',setup:[{...block('mode'),pin:'2',mode:'INPUT_PULLUP'}],loop:[block('button'),block('print'),{...block('delay'),ms:200}]}};

Object.assign(examples,{
 ledOn:{board:'uno',setup:[block('mode')],loop:[block('led'),{...block('delay'),ms:100}]},
 serial3:{board:'uno',setup:[1,2,3].map(n=>({...block('print'),source:'text',text:'Hello CubeLink '+n})),loop:[{...block('delay'),ms:1000}]},
 counter:{board:'uno',setup:[],loop:[block('increment'),block('print'),{...block('delay'),ms:500}]},
});

Object.assign(examples,{
 buttonLed:{board:'uno',setup:[{...block('mode'),pin:'2',mode:'INPUT_PULLUP'},block('mode')],loop:[block('button'),{...block('threshold'),threshold:1},{...block('delay'),ms:50}]},
 pot:{board:'uno',setup:[],loop:[block('pot'),block('print'),{...block('delay'),ms:200}]},
 ldr:{board:'uno',setup:[],loop:[block('ldr'),block('print'),{...block('delay'),ms:200}]},
 distanceLed:{board:'uno',setup:[{...block('mode'),pin:'9'},{...block('mode'),pin:'10',mode:'INPUT'},block('mode')],loop:[block('ultrasonic'),block('distanceLed'),block('print'),{...block('delay'),ms:100}]}
});
