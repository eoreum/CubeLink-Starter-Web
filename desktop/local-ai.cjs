const fs=require('node:fs/promises'),path=require('node:path'),net=require('node:net'),os=require('node:os');
const {createHash,randomBytes}=require('node:crypto');
const {spawn}=require('node:child_process');
const MODEL=Object.freeze({name:'Qwen3-0.6B Q8',bytes:639446688,sha256:'9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031',url:'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function validateMessages(messages){if(!Array.isArray(messages)||!messages.length||messages.length>16)throw Error('대화는 최근 16개 메시지만 사용할 수 있습니다.');return messages.map(m=>{if(!['user','assistant'].includes(m?.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>2000)throw Error('대화 형식 또는 길이를 확인하세요.');return {role:m.role,content:m.content}})}
class LocalAI{
 constructor({storageDir,runtimeDir,fetcher=fetch,spawnProcess=spawn}){Object.assign(this,{storageDir,runtimeDir,fetcher,spawnProcess,child:null,ready:false,progress:0,phase:'idle',job:null,controller:null});this.file=path.join(storageDir,'qwen3-0.6b-q8.gguf');}
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
 async chat(messages){if(this.job)throw Error('AI가 다른 작업 중입니다. 잠시 기다려 주세요.');if(!this.ready)throw Error('먼저 무료 AI 준비를 눌러 주세요.');const clean=validateMessages(messages);this.controller=new AbortController();this.phase='answering';
  const job=(async()=>{const timeout=setTimeout(()=>this.controller.abort(),180000);try{const response=await this.fetcher(this.base+'/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},signal:this.controller.signal,body:JSON.stringify({messages:[{role:'system',content:'You are CubeLink Starter local AI, a small offline Arduino classroom assistant, not ChatGPT. Answer in simple Korean, briefly. Explain steps and wiring carefully. Never claim to have changed blocks or uploaded hardware. Ask the learner to verify pin modes and disconnect power before wiring. /no_think'},...clean],max_tokens:384,temperature:0.6,stream:false,chat_template_kwargs:{enable_thinking:false}})});if(!response.ok)throw Error('로컬 AI 응답 실패. 대화를 지우고 다시 시도하세요.');const data=await response.json();const text=String(data.choices?.[0]?.message?.content||'').replace(/<think>[\s\S]*?<\/think>/g,'').trim();if(!text)throw Error('답변이 비어 있습니다. 질문을 짧게 바꿔 주세요.');return {text};}finally{clearTimeout(timeout);this.job=null;this.phase=this.ready?'ready':'idle'}})();this.job=job;return job;
 }
 cancel(){this.controller?.abort();if(!this.ready)this.child?.kill();}
 stop(){this.cancel();this.child?.kill();this.child=null;this.ready=false;}
}
module.exports={LocalAI,MODEL,validateMessages};
