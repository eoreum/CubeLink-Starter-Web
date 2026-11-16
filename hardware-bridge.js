const BRIDGE_URL='http://127.0.0.1:32145';
let token='';

function request(path,options={}){
 const headers={Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(token?{'X-CubeLink-Token':token}:{}),...options.headers};
 const init={...options,headers,mode:'cors',cache:'no-store',targetAddressSpace:'loopback'};
 return fetch(new Request(BRIDGE_URL+path,init));
}
async function json(path,options={}){
 const response=await request(path,options),data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||`브리지 응답 오류 (${response.status})`);
 return data;
}
export function profilesForBoard(board){
 if(board==='nano')return [{value:'nano-old',label:'Nano Classic · Old Bootloader (CH340 권장)'},{value:'nano',label:'Nano Classic · New Bootloader'}];
 if(board==='mega')return [{value:'mega',label:'Mega 2560'}];
 return [{value:'uno',label:'Uno R3'}];
}
export async function connectBridge(){
 const health=await json('/health');if(!health.cliAvailable)throw Error('브리지는 실행 중이지만 Arduino CLI 준비가 필요합니다. setup-bridge.cmd를 실행하세요.');const session=await json('/session');token=session.token;
 const ports=await json('/ports');return {health,ports:ports.ports||[]};
}
export async function compileSketch({source,profile}){return json('/compile',{method:'POST',body:JSON.stringify({source,profile})})}
export async function uploadSketch({source,profile,port}){return json('/upload',{method:'POST',body:JSON.stringify({source,profile,port})})}
export {BRIDGE_URL};
