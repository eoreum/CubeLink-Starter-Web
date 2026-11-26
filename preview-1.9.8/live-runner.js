import {errors,key,walkProject} from './engine.js?v=dual1';
export const LIVE_VERSION='1.2.0';
export function liveIssues(project){
 const issues=errors(project);
 if(!project.setup.length&&!project.loop.length)issues.push('실행할 블록이 없습니다.');
 for(const node of walkProject(project))for(const field of ['pin','trig','echo'])if(['0','1'].includes(String(node[field])))issues.push('D0/D1은 USB 통신용입니다. 다른 핀을 사용하세요.');
 return [...new Set(issues)];
}
// One outstanding command; timed-out channels must be reconnected before reuse.
export class LiveChannel{
 constructor(write){this.write=write;this.pending=null;this.failed=false;}
 request(command){
  if(this.pending||this.failed)return Promise.reject(Error('라이브 통신을 다시 연결하세요.'));
  return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);this.pending=null;if(error){this.failed=true;reject(error)}else resolve(value)};
   const timer=setTimeout(()=>finish(Error('보드 응답 시간 초과')),4000);
   this.pending={finish};Promise.resolve().then(()=>this.write(command+'\n')).catch(error=>finish(error));
  });
 }
 accept(line){
  if(!this.pending||!line.startsWith('CL:'))return false;
  if(line.startsWith('CL:ERR:'))this.pending.finish(Error(line.slice(7)));
  else if(line==='CL:OK'||line.startsWith('CL:VAL:')||line.startsWith('CL:LIVE:'))this.pending.finish(null,line);
  else return false;return true;
 }
 close(){this.failed=true;this.pending?.finish(Error('USB 연결 해제'));}
}
export class LiveRunner{
 constructor({request,log=()=>{},onState=()=>{}}){Object.assign(this,{request,log,onState,active:false,task:null});}
 stop(){this.active=false;return this.task||Promise.resolve();}
 start(project){
  if(this.task)throw Error('이전 실행이 정지할 때까지 기다리세요.');
  const issues=liveIssues(project);if(issues.length)throw Error(issues.join(' · '));
  this.project=structuredClone(project);this.variables=Object.create(null);this.active=true;
  this.task=this.run().finally(()=>{this.active=false;this.task=null;this.onState(false)});return this.task;
 }
 async pause(ms){const end=Date.now()+ms;while(this.active&&Date.now()<end)await new Promise(r=>setTimeout(r,Math.min(25,end-Date.now())));}
 async sensor(command){const response=await this.request(command),value=Number(response.split(':').at(-1));if(!response.startsWith('CL:VAL:')||!Number.isFinite(value))throw Error('센서 응답 오류');return value;}
 async eval(node){
  const pin=key(this.project.board,node.pin);
  switch(node.type){
   case 'number':return node.value;
   case 'variable':return this.variables[node.name]??0;
   case 'digitalRead':case 'button':case 'pir':case 'tilt':return this.sensor('DR,'+pin);
   case 'analogRead':case 'ldr':case 'pot':case 'sound':case 'joystickAxis':return this.sensor('AR,'+pin);
   case 'temperature':return ((await this.sensor('AR,'+pin))*5/1023-.5)*100;
   case 'dhtTemperature':case 'dhtHumidity':return this.sensor(`${node.type==='dhtTemperature'?'DT':'DH'},${pin}`);
   case 'ultrasonic':return this.sensor(`US,${key(this.project.board,node.trig)},${key(this.project.board,node.echo)}`);
   case 'compare':{const a=await this.eval(node.left),b=await this.eval(node.right);return Number({'==':a===b,'!=':a!==b,'<':a<b,'<=':a<=b,'>':a>b,'>=':a>=b}[node.operator]);}
   case 'logic':{const a=await this.eval(node.a);return Number(Boolean(node.operator==='AND'?(a&&await this.eval(node.b)):(a||await this.eval(node.b))));}
   case 'map':return Math.trunc((Math.trunc(await this.eval(node.value))-node.inMin)*(node.outMax-node.outMin)/(node.inMax-node.inMin))+node.outMin;
   default:throw Error('지원하지 않는 라이브 블록: '+node.type);
  }
 }
 async execute(list){for(const node of list){if(!this.active)return;const pin=key(this.project.board,node.pin);switch(node.type){
  case 'serialBegin':break; // Transport stays at 9600 regardless of sketch baud.
  case 'mode':await this.request(`PM,${pin},${{INPUT:'IN',OUTPUT:'OUT',INPUT_PULLUP:'PULLUP'}[node.mode]}`);break;
  case 'write':await this.request(`DW,${pin},${node.state==='HIGH'?1:0}`);break;
  case 'motor':await this.request(`MT,${node.en},${key(this.project.board,node.in1)},${key(this.project.board,node.in2)},${{stop:0,forward:1,reverse:2}[node.direction]},${node.speed}`);break;
  case 'servo':await this.request(`SV,${pin},${node.angle}`);break;
  case 'delay':await this.pause(node.ms);break;
  case 'setVariable':this.variables[node.name]=await this.eval(node.value);break;
  case 'changeVariable':this.variables[node.name]=(this.variables[node.name]??0)+node.delta;break;
  case 'printText':this.log(String(node.text));break;
  case 'printValue':this.log(String(await this.eval(node.value)));break;
  case 'if':await this.execute(await this.eval(node.condition)?node.then:node.else);break;
  default:throw Error('지원하지 않는 라이브 블록: '+node.type);
 }} }
 async run(){
  this.onState(true);
  try{const version=await this.request('CL:HELLO');if(version!==`CL:LIVE:${LIVE_VERSION}`)throw Error('라이브 펌웨어를 먼저 검사·설치하세요.');await this.request('CL:RESET');await this.execute(this.project.setup);while(this.active){await this.execute(this.project.loop);await this.pause(10);}}
  finally{await this.request('CL:RESET');}
 }
}
