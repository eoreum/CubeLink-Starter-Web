const fs=require('node:fs/promises'),path=require('node:path'),net=require('node:net'),os=require('node:os');
const {createHash,randomBytes}=require('node:crypto');
const {spawn}=require('node:child_process');
const MODEL=Object.freeze({name:'Qwen2.5-Coder-1.5B Q4',bytes:1117320768,sha256:'cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046',url:'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/f86cb2c1fa58255f8052cc32aeede1b7482d4361/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function validateMessages(messages){if(!Array.isArray(messages)||!messages.length||messages.length>16)throw Error('대화는 최근 16개 메시지만 사용할 수 있습니다.');return messages.map(m=>{if(!['user','assistant'].includes(m?.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>2000)throw Error('대화 형식 또는 길이를 확인하세요.');return {role:m.role,content:m.content}})}
class LocalAI{
 constructor({storageDir,runtimeDir,fetcher=fetch,spawnProcess=spawn}){Object.assign(this,{storageDir,runtimeDir,fetcher,spawnProcess,child:null,ready:false,progress:0,phase:'idle',job:null,controller:null});this.file=path.join(storageDir,'qwen2.5-coder-1.5b-q4.gguf');}
 async status(){let available=false;try{available=(await fs.stat(this.file)).size===MODEL.bytes}catch{}return {model:MODEL.name,bytes:MODEL.bytes,available,ready:this.ready,phase:this.phase,progress:this.progress};}
 async download(signal){
  if((await this.status()).available)return;
  this.phase='downloading';this.progress=0;await fs.mkdir(this.storageDir,{recursive:true});const partial=this.file+'.partial';
  let handle;try{const response=await this.fetcher(MODEL.url,{signal});if(!response.ok||!response.body)throw Error('모델 다운로드에 실패했습니다. 인터넷 연결을 확인하세요.');
   handle=await fs.open(partial,'w');const hash=createHash('sha256');let size=0;
   for await(const chunk of response.body){if(signal.aborted)throw Error('준비를 취소했습니다.');size+=chunk.length;if(size>MODEL.bytes)throw Error('모델 크기가 올바르지 않습니다.');hash.update(chunk);await handle.write(chunk);this.progress=Math.floor(size/MODEL.bytes*100);}
   await handle.close();handle=null;if(size!==MODEL.bytes||hash.digest('hex')!==MODEL.sha256)throw Error('모델 파일 검증 실패. 다시 준비해 주세요.');await fs.rename(partial,this.file);
  }catch(error){await handle?.close().catch(()=>{});await fs.rm(partial,{force:true}).catch(()=>{});throw error;}
 }
 async start(signal){
  if(this.ready)return;this.phase='loading';const listener=net.createServer();await new Promise((r,j)=>{listener.once('error',j);listener.listen(0,'127.0.0.1',r)});const port=listener.address().port;await new Promise(r=>listener.close(r));
  this.token=randomBytes(24).toString('hex');this.base='http://127.0.0.1:'+port;let exited=false;
  const child=this.spawnProcess(path.join(this.runtimeDir,'llama-server.exe'),['-m',this.file,'--host','127.0.0.1','--port',String(port),'-c','2048','-t',String(Math.max(1,Math.min(4,os.availableParallelism()))),'-np','1','--no-webui','--jinja','--chat-template-kwargs','{"enable_thinking":false}'],{cwd:this.runtimeDir,windowsHide:true,shell:false,env:{...process.env,LLAMA_API_KEY:this.token},stdio:['ignore','ignore','pipe']});
  this.child=child;child.stderr?.on('data',()=>{});child.on('error',()=>{exited=true});child.on('exit',()=>{exited=true;this.ready=false;if(this.child===child)this.child=null});
  try{for(let i=0;i<180;i++){if(signal.aborted)throw Error('준비를 취소했습니다.');if(exited)throw Error('로컬 AI 실행기가 종료됐습니다. CPU 호환성과 메모리를 확인하세요.');try{const response=await this.fetcher(this.base+'/health',{headers:{Authorization:'Bearer '+this.token},signal:AbortSignal.timeout(1000)});if(response.ok){this.ready=true;this.phase='ready';return}}catch{}await pause(500)}throw Error('AI 준비 시간이 초과됐습니다. 다른 프로그램을 닫고 다시 시도하세요.');}catch(error){child.kill();throw error;}
 }
 prepare(){if(this.job)return this.job;this.controller=new AbortController();this.job=(async()=>{try{await this.download(this.controller.signal);await this.start(this.controller.signal);return this.status()}finally{this.job=null;if(!this.ready)this.phase='idle'}})();return this.job;}
 async chat(messages){if(this.job)throw Error('AI가 다른 작업 중입니다. 잠시 기다려 주세요.');if(!this.ready)throw Error('먼저 무료 AI 준비를 눌러 주세요.');const clean=validateMessages(messages);while(clean.length>1&&clean.reduce((n,m)=>n+m.content.length,0)>2500)clean.shift();this.controller=new AbortController();this.phase='answering';
  const job=(async()=>{const timeout=setTimeout(()=>this.controller.abort(),180000);try{const response=await this.fetcher(this.base+'/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},signal:this.controller.signal,body:JSON.stringify({messages:[{role:'system',content:'너는 큐브링크 스타터의 로컬 아두이노 수업 도우미다. 짧고 정확한 한국어로 대답한다. ChatGPT가 아니다. 아래 수업 기준 지식을 참고하고 모르면 모른다고 말한다. 사용자의 블록을 바꾸거나 보드에 업로드했다고 말하지 않는다. 배선은 전원을 분리하고 확인하도록 안내한다. [수업 기준 지식] LED는 전류가 흐르면 빛을 내는 반도체 소자이며 발광 다이오드라고 한다. 외부 LED에는 보통 220~330옴 전류 제한 저항을 직렬로 연결한다. UNO의 내장 LED 핀은 D13이다. 출력 핀은 setup에서 pinMode(13, OUTPUT)으로 설정하고 digitalWrite(13, HIGH)로 켜고 LOW로 끈다. delay(500)은 0.5초 기다리는 명령이다. INPUT_PULLUP 버튼은 핀과 GND 사이에 연결하며 누르면 LOW(0), 놓으면 HIGH(1)이다. analogRead 값은 AVR 보드에서 보통 0~1023이다. 조도센서 LDR은 분압 저항과 연결하고 밝을 때 값이 증가하는지 감소하는지는 배선에 따라 다르다. 초음파 HC-SR04는 Trig와 Echo 핀이 서로 달라야 한다. DHT11은 온습도를 읽는다. 모터를 아두이노 GPIO에 직접 연결하지 않고 드라이버와 적절한 전원을 사용한다. 실제 배선과 부품 사양을 확인한다.'},...clean],max_tokens:384,temperature:0.6,stream:false,chat_template_kwargs:{enable_thinking:false}})});if(!response.ok)throw Error('로컬 AI 응답 실패. 대화를 지우고 다시 시도하세요.');const data=await response.json();const text=String(data.choices?.[0]?.message?.content||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();if(!text)throw Error('답변이 비어 있습니다. 질문을 짧게 바꿔 주세요.');return {text};}finally{clearTimeout(timeout);this.job=null;this.phase=this.ready?'ready':'idle'}})();this.job=job;return job;
 }
 cancel(){this.controller?.abort();if(!this.ready)this.child?.kill();}
 stop(){this.cancel();this.child?.kill();this.child=null;this.ready=false;}
}
module.exports={LocalAI,MODEL,validateMessages};
