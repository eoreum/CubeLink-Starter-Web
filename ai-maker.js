import {boards,examples,errors,generate} from './engine.js?v=1.5.0-ai5';

export const AI_MAKER_STORAGE_KEY='cubelink-starter-ai-maker-v1';
const plans={
 blink:{mission:'blink',title:'LED 깜빡이',summary:'D13 LED를 0.5초 간격으로 켰다 끄는 첫 프로젝트',parts:['Arduino 보드 1개','USB 케이블 1개','LED 1개 (내장 LED 사용 가능)','220~330Ω 저항 1개 (외부 LED 사용 시)','점퍼선']},
 buttonLed:{mission:'buttonLed',title:'버튼으로 LED 켜기',summary:'버튼을 누르면 D13 LED가 켜지는 입력·출력 프로젝트',parts:['Arduino 보드 1개','택트 스위치 1개','LED 1개 (내장 LED 사용 가능)','220~330Ω 저항 1개','점퍼선','브레드보드']},
 pot:{mission:'pot',title:'가변저항 값 읽기',summary:'가변저항을 돌려 A1의 0~1023 값을 시리얼로 확인하는 프로젝트',parts:['Arduino 보드 1개','10kΩ 가변저항 1개','점퍼선','브레드보드']},
 ldr:{mission:'ldr',title:'빛 센서 값 읽기',summary:'LDR 분압 회로의 A0 값을 읽어 밝기 변화를 관찰하는 프로젝트',parts:['Arduino 보드 1개','LDR 1개','10kΩ 저항 1개','점퍼선','브레드보드']},
 streetlight:{mission:'streetlight',title:'스마트 가로등',summary:'어두워지면 D13 LED가 켜지는 빛 센서 프로젝트',parts:['Arduino 보드 1개','LDR 1개','10kΩ 저항 1개','LED 1개','220~330Ω 저항 1개','점퍼선','브레드보드']},
 distance:{mission:'distance',title:'초음파 거리 측정',summary:'HC-SR04로 거리를 재고 시리얼 모니터에 cm 값을 표시하는 프로젝트',parts:['Arduino 보드 1개','HC-SR04 초음파 센서 1개','점퍼선','브레드보드']},
 distanceLed:{mission:'distanceLed',title:'가까워지면 LED 켜기',summary:'물체가 20cm보다 가까우면 D13 LED가 켜지는 프로젝트',parts:['Arduino 보드 1개','HC-SR04 초음파 센서 1개','LED 1개','220~330Ω 저항 1개','점퍼선','브레드보드']}
};

export function emptyDesign(){return {stage:'discover',idea:'',planId:null};}
export function getPlan(planId){return plans[planId]?structuredClone(plans[planId]):null;}
export function detectPlan(text){
 const t=String(text).toLowerCase().replace(/\s+/g,' '),has=(...words)=>words.some(word=>t.includes(word)),led=has('led','엘이디','불빛','불을','램프'),near=has('가까','접근','다가오','근접');
 if((has('초음파','거리','hc-sr04')||near)&&led)return 'distanceLed';
 if(has('가로등')||(has('어두','밝기','조도','ldr')&&led))return 'streetlight';
 if(has('버튼','스위치','button')&&led)return 'buttonLed';
 if(has('초음파','거리','hc-sr04')||near)return 'distance';
 if(has('가변저항','볼륨','potentiometer'))return 'pot';
 if(has('조도','빛 센서','빛센서','ldr'))return 'ldr';
 if(has('깜빡','점멸','blink'))return 'blink';
 if(led)return 'blink';
 return null;
}
export function replyToIdea(text,current=emptyDesign()){
 const idea=String(text).trim().slice(0,500);
 if(!idea)return {design:current,text:'만들고 싶은 것을 한 문장으로 적어 주세요. 예: “어두워지면 LED가 켜지는 가로등”'};
 const detected=detectPlan(idea);
 if(!detected)return {design:{...current,stage:'discover',idea},text:'좋은 출발이에요. Starter 기초 단계에서는 LED, 버튼, 가변저항, 빛 센서, 초음파 센서 중 무엇을 쓰고 싶은지와 어떤 동작을 원하는지 알려 주세요.'};
 const plan=getPlan(detected);
 return {design:{stage:'proposed',idea,planId:detected},text:`기초 설계로 “${plan.title}” 설계가 잘 맞아요. ${plan.summary}입니다. 아래 부품과 설계를 확인한 뒤 ‘이 설계 적용’을 누르면 블록과 Arduino C++가 함께 만들어집니다.`};
}
export function buildProject(planId,board='uno'){
 const plan=getPlan(planId);
 if(!plan)throw Error('지원하지 않는 기초 설계입니다.');
 if(!Object.hasOwn(boards,board))throw Error('지원하지 않는 보드입니다.');
 const project={...structuredClone(examples[plan.mission]),board,mission:plan.mission},issues=errors(project);
 if(issues.length)throw Error(issues.join(' · '));
 generate(project);
 return project;
}
export function initialMessages(){return [{role:'assistant',text:'안녕하세요! 만들고 싶은 장치를 말해 주세요. Starter 기초 범위에서 아이디어를 정리하고, 필요한 부품과 블록 설계를 함께 준비할게요.'}];}
export function parseSession(text){
 try{const data=JSON.parse(text);if(data?.version!==1||!Array.isArray(data.messages)||data.messages.length>60)throw Error();const messages=data.messages.filter(m=>['assistant','user'].includes(m?.role)&&typeof m.text==='string').map(m=>({role:m.role,text:m.text.slice(0,1000)}));const design=data.design&&['discover','proposed'].includes(data.design.stage)?{stage:data.design.stage,idea:String(data.design.idea||'').slice(0,500),planId:plans[data.design.planId]?data.design.planId:null}:emptyDesign();return {messages:messages.length?messages:initialMessages(),design};}catch{return {messages:initialMessages(),design:emptyDesign()};}
}
export function serializeSession(session){return JSON.stringify({version:1,messages:session.messages.slice(-60),design:session.design});}
