import {boards,errors,generate} from './engine.js?v=1.9.4';

// Small, transparent custom-project composer. It never selects a saved lesson.
export function composeIdea(text,board='uno'){
 const idea=String(text||'').trim();
 if(!Object.hasOwn(boards,board))throw Error('지원하지 않는 보드입니다.');
 const button=/버튼|스위치|button/i.test(idea);
 const distance=/초음파|거리|hc-sr04|가까|접근|근접/i.test(idea);
 const light=/조도|빛\\s*센서|ldr|어두|밝기/i.test(idea);
 const led=/led|엘이디|불빛|램프|불을/i.test(idea);
 const unsupported=/서보|모터|릴레이|부저|lcd|oled|블루투스|와이파이|wifi|컨베이어|로봇팔/i.test(idea);
 const sources=[button,distance,light].filter(Boolean).length;
 if(unsupported||!led||sources!==1)return null;
 const mode=(pin,value)=>({type:'mode',pin,mode:value});
 const write=state=>({type:'write',pin:'13',state});
 const num=value=>({type:'number',value});
 let condition,parts=['Arduino 보드','LED (D13 내장 LED 사용 가능)'];
 const setup=[mode('13','OUTPUT')];
 if(button){setup.unshift(mode('2','INPUT_PULLUP'));condition={type:'compare',operator:'==',left:{type:'button',pin:'2'},right:num(0)};parts.push('버튼 (D2와 GND 연결)');}
 if(distance){condition={type:'logic',operator:'AND',a:{type:'compare',operator:'>=',left:{type:'ultrasonic',trig:'9',echo:'10'},right:num(0)},b:{type:'compare',operator:'<',left:{type:'ultrasonic',trig:'9',echo:'10'},right:num(20)}};parts.push('HC-SR04 (TRIG D9, ECHO D10)');}
 if(light){condition={type:'compare',operator:'<',left:{type:'ldr',pin:'A0'},right:num(500)};parts.push('조도 센서 분압 회로 (A0)');}
 const project={board,setup,loop:[{type:'if',condition,then:[write('HIGH')],else:[write('LOW')]},{type:'delay',ms:100}],mission:null};
 const issues=errors(project);if(issues.length)throw Error(issues.join(' · '));
 const code=generate(project);
 return {project,code,parts,title:button?'버튼 LED 제어':distance?'거리 감지 LED 제어':'조도 감지 LED 제어',note:'새 블록 구성입니다. 기본 핀과 임계값은 적용 후 수정할 수 있습니다.'};
}
