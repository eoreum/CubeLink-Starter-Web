import {composeIdea} from './ai-compose.js?v=1.8.1';
import {AI_MAKER_STORAGE_KEY,buildProject,emptyDesign,getPlan,initialMessages,parseSession,replyToIdea,serializeSession} from './ai-maker.js?v=1.9.4';
const quickIdeas=['LED를 깜빡이게 하고 싶어요','버튼을 누르면 LED가 켜지게 해 줘','어두워지면 켜지는 가로등','가까이 오면 LED가 켜지게 해 줘','온도와 습도를 확인하고 싶어요','움직임을 감지하고 싶어요'];
export function initAiMaker({getBoard,applyProject,toast}){
 const dialog=document.getElementById('aiMakerDialog'),messagesHost=document.getElementById('aiMessages'),designHost=document.getElementById('aiDesign'),form=document.getElementById('aiForm'),input=document.getElementById('aiInput'),apply=document.getElementById('aiApply');
 let session=load();
 let customDraft=null;
 let mode='learn', step=0;
 const modeBar=document.createElement('div');
 modeBar.className='ai-mode-switch';
 modeBar.setAttribute('role','group');
 modeBar.setAttribute('aria-label','AI 사용 방식');
 const learnBtn=document.createElement('button'), buildBtn=document.createElement('button');
 learnBtn.type=buildBtn.type='button';
 learnBtn.textContent='📖 학습하기'; buildBtn.textContent='🛠 개발하기';
 modeBar.append(learnBtn,buildBtn);
 const guide=document.createElement('section');
 guide.className='ai-step-guide';
 guide.setAttribute('aria-live','polite');
 dialog.querySelector('.ai-maker-body').prepend(modeBar,guide);
 function chooseMode(next){mode=next;step=0;render()}
 learnBtn.onclick=()=>chooseMode('learn');
 buildBtn.onclick=()=>chooseMode('build');
 function renderGuide(plan){
  learnBtn.setAttribute('aria-pressed',String(mode==='learn'));
  buildBtn.setAttribute('aria-pressed',String(mode==='build'));
  guide.replaceChildren();
  if(mode==='build'){const p=document.createElement('p');p.textContent='개발하기: 아이디어를 입력하고 설계를 확정한 뒤 블록과 Arduino 코드를 적용하세요. 현재 지원하는 기초 설계 범위에서 동작합니다.';guide.append(p);return}
  const steps=plan?[
   '1. 필요한 부품을 확인하세요: '+plan.parts.join(', '),
   '2. 아두이노 전원을 분리한 뒤 부품의 핀과 배선을 확인하세요.',
   '3. 왼쪽 블록 메뉴에서 입력과 출력에 필요한 블록을 찾아보세요.',
   '4. setup에 핀 모드를 설정하고 loop에 동작 블록을 연결하세요.',
   '5. 시뮬레이션으로 동작을 확인하고 코드와 배선을 점검하세요.'
  ]:['먼저 만들고 싶은 동작을 입력하세요. 설계가 정해지면 단계별 학습 안내가 시작됩니다.'];
  step=Math.min(step,steps.length-1);
  const p=document.createElement('p');p.textContent=steps[step];guide.append(p);
  if(plan){const controls=document.createElement('div');const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.textContent='이전';next.textContent=step===steps.length-1?'처음부터':'다음 단계';prev.disabled=step===0;prev.onclick=()=>{step--;renderGuide(plan)};next.onclick=()=>{step=(step+1)%steps.length;renderGuide(plan)};controls.append(prev,next);guide.append(controls)}
 }
 function load(){try{return parseSession(localStorage.getItem(AI_MAKER_STORAGE_KEY))}catch{return {messages:initialMessages(),design:emptyDesign()}}}
 function save(){try{localStorage.setItem(AI_MAKER_STORAGE_KEY,serializeSession(session))}catch{}}
 function render(){renderGuide(getPlan(session.design.planId));messagesHost.replaceChildren(...session.messages.map(message=>{const row=document.createElement('div');row.className='ai-message '+message.role;row.textContent=message.text;return row}));messagesHost.scrollTop=messagesHost.scrollHeight;const plan=getPlan(session.design.planId);designHost.replaceChildren();if(customDraft){const title=document.createElement('h3');title.textContent=customDraft.title+' · 새 프로젝트';const note=document.createElement('p');note.textContent=customDraft.note+' 필요한 부품: '+customDraft.parts.join(', ');designHost.append(title,note);apply.disabled=mode==='learn';apply.textContent='새 프로젝트 적용 · 블록 + C++';}else if(plan){const title=document.createElement('h3');title.textContent=plan.title;const summary=document.createElement('p');summary.textContent=plan.summary;const heading=document.createElement('strong');heading.textContent='기초 부품';const list=document.createElement('ul');plan.parts.forEach(part=>{const li=document.createElement('li');li.textContent=part;list.append(li)});const note=document.createElement('p');note.className='ai-safety';note.textContent='전원을 분리한 상태에서 배선하세요. 적용하면 해당 기초 미션의 저장된 풀이가 이 설계로 바뀝니다. 보드 직접 업로드는 아직 지원하지 않습니다.';designHost.append(title,summary,heading,list,note);apply.disabled=mode==='learn';apply.textContent=mode==='learn'?'학습하기에서는 직접 블록을 조립하세요':'이 설계 적용 · 블록 + C++';}else{const p=document.createElement('p');p.textContent='대화를 시작하면 여기에 추천 부품과 설계 상태가 표시됩니다.';designHost.append(p);apply.disabled=true;apply.textContent='설계를 먼저 정해 주세요';}}
 function send(text){const clean=text.trim();if(!clean)return;session.messages.push({role:'user',text:clean});const reply=replyToIdea(clean,session.design,getBoard());const composed=/LED|엘이디/i.test(clean)&&/\d+\s*개/.test(clean)?null:composeIdea(clean,getBoard());customDraft=reply.draft||composed;const result=composed?{design:{stage:'discover',idea:clean,planId:null},text:'새 프로젝트 블록과 Arduino 코드를 구성했습니다. '+customDraft.note+' 개발하기에서 설계 적용을 누르세요.'}:reply;session.design=result.design;session.messages.push({role:'assistant',text:result.text});save();render();}
 document.getElementById('aiMakerButton').onclick=()=>{render();dialog.showModal();requestAnimationFrame(()=>input.focus())};document.getElementById('aiClose').onclick=()=>dialog.close();document.getElementById('aiReset').onclick=()=>{session={messages:initialMessages(),design:emptyDesign()};customDraft=null;save();render();input.focus()};form.onsubmit=event=>{event.preventDefault();send(input.value);input.value='';input.focus()};document.getElementById('aiQuickIdeas').replaceChildren(...quickIdeas.map(idea=>{const button=document.createElement('button');button.type='button';button.textContent=idea;button.onclick=()=>send(idea);return button}));apply.onclick=()=>{if(mode!=='build')return;try{const plan=getPlan(session.design.planId),project=customDraft?customDraft.project:buildProject(session.design.planId,getBoard());applyProject(project,customDraft?null:plan.mission);session.messages.push({role:'assistant',text:'설계를 작업 공간에 적용했어요. 블록 연결과 Arduino 코드를 확인한 뒤 시뮬레이션으로 시험해 보세요.'});save();render();dialog.close();toast('새 설계를 블록과 Arduino 코드에 적용했습니다.')}catch(error){toast('설계 적용 실패: '+error.message)}};render();
}
