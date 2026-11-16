import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,mkdtemp,rm,writeFile,readFile,access} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const BOARD_PROFILES=Object.freeze({
 uno:'arduino:avr:uno',
 nano:'arduino:avr:nano:cpu=atmega328',
 'nano-old':'arduino:avr:nano:cpu=atmega328old',
 mega:'arduino:avr:mega:cpu=atmega2560'
});
export const LIVE_FIRMWARE_VERSION='1.0.0';
export function isAllowedOrigin(origin=''){return origin==='https://eoreum.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)}
export function validPort(value=''){return /^COM[1-9]\d{0,2}$/i.test(value)||/^\/dev\/[a-zA-Z0-9._-]+$/.test(value)}
export function validateJob(body,needsPort=false){
 if(!body||typeof body!=='object')throw Error('요청 형식이 올바르지 않습니다.');
 if(typeof body.source!=='string'||!body.source.trim()||body.source.length>200000||body.source.includes('\0'))throw Error('Arduino 코드는 1~200KB 텍스트만 사용할 수 있습니다.');
 if(!Object.hasOwn(BOARD_PROFILES,body.profile))throw Error('지원하지 않는 보드 프로필입니다.');
 if(needsPort&&!validPort(body.port))throw Error('업로드 포트 형식이 올바르지 않습니다.');
 return {source:body.source,profile:body.profile,port:body.port,fqbn:BOARD_PROFILES[body.profile]};
}
export function validateTarget(body){
 if(!body||typeof body!=='object')throw Error('요청 형식이 올바르지 않습니다.');
 if(!Object.hasOwn(BOARD_PROFILES,body.profile))throw Error('지원하지 않는 보드 프로필입니다.');
 if(!validPort(body.port))throw Error('업로드 포트 형식이 올바르지 않습니다.');
 return {profile:body.profile,port:body.port,fqbn:BOARD_PROFILES[body.profile]};
}
export function normalizePorts(data){
 const items=Array.isArray(data)?data:(data?.detected_ports||data?.ports||[]);
 return items.map(item=>{const raw=item.port||item,address=raw.address||item.address||'',matches=item.matching_boards||item.boards||raw.matching_boards||[];return {address,protocol:raw.protocol||item.protocol||'serial',label:raw.label||item.label||address,boards:matches.map(board=>({name:board.name||'',fqbn:board.fqbn||''}))}}).filter(item=>validPort(item.address));
}

const here=path.dirname(fileURLToPath(import.meta.url)),localCli=path.join(here,'tools',process.platform==='win32'?'arduino-cli.exe':'arduino-cli'),probeScript=path.join(here,'probe-firmware.ps1'),liveFirmwareFile=path.join(here,'firmware','CubeLinkStarterLive','CubeLinkStarterLive.ino');
async function exists(file){try{await access(file);return true}catch{return false}}
async function findCli(){if(process.env.ARDUINO_CLI)return process.env.ARDUINO_CLI;if(await exists(localCli))return localCli;return 'arduino-cli'}
function run(command,args,timeout=180000){return new Promise((resolve,reject)=>{const child=spawn(command,args,{windowsHide:true,shell:false}),stdout=[],stderr=[];let size=0,settled=false;const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result)};const collect=target=>chunk=>{size+=chunk.length;if(size<=2_000_000)target.push(chunk)};child.stdout.on('data',collect(stdout));child.stderr.on('data',collect(stderr));child.on('error',error=>finish(error));child.on('close',code=>{const out=Buffer.concat(stdout).toString('utf8'),err=Buffer.concat(stderr).toString('utf8');if(code===0)finish(null,{stdout:out,stderr:err});else finish(Error((err||out||`Arduino CLI 종료 코드 ${code}`).slice(-60000)))});const timer=setTimeout(()=>{child.kill();finish(Error('Arduino CLI 작업 시간이 초과되었습니다.'))},timeout)})}
async function cli(args,timeout){return run(await findCli(),args,timeout)}
async function probeFirmware(port){
 if(process.platform!=='win32')throw Error('현재 자동 펌웨어 확인은 Windows 브리지에서 지원합니다.');
 const result=await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',probeScript,'-Port',port],12000);
 try{return JSON.parse(result.stdout.trim())}catch{throw Error('라이브 펌웨어 확인 응답을 해석하지 못했습니다.')}
}
async function compileJob(job,upload=false,cliRunner=cli){
 const root=await mkdtemp(path.join(os.tmpdir(),'cubelink-starter-')),sketch=path.join(root,'CubeLinkStarter'),build=path.join(root,'build');
 try{await mkdir(sketch);await mkdir(build);await writeFile(path.join(sketch,'CubeLinkStarter.ino'),job.source,'utf8');const compiled=await cliRunner(['compile','--fqbn',job.fqbn,'--warnings','default','--build-path',build,sketch],240000);let output=(compiled.stdout+compiled.stderr).trim();if(upload){const uploaded=await cliRunner(['upload','--fqbn',job.fqbn,'--port',job.port,'--verify','--build-path',build,sketch],120000);output+='\n'+(uploaded.stdout+uploaded.stderr).trim()}return output.slice(-60000)}finally{await rm(root,{recursive:true,force:true})}
}
export async function ensureLiveFirmware(target,cliRunner=cli,probeRunner=probeFirmware){
 const before=await probeRunner(target.port);
 if(before.present&&before.version===LIVE_FIRMWARE_VERSION)return {installed:false,version:before.version,previousVersion:before.version,output:'CubeLink Live 펌웨어가 이미 최신 버전입니다.'};
 const source=await readFile(liveFirmwareFile,'utf8'),output=await compileJob({...target,source},true,cliRunner),after=await probeRunner(target.port);
 if(!after.present||after.version!==LIVE_FIRMWARE_VERSION)throw Error('펌웨어 업로드 후 CubeLink Live 응답을 확인하지 못했습니다. USB 연결을 확인한 뒤 다시 시도하세요.');
 return {installed:true,version:after.version,previousVersion:before.version||'',output};
}
function send(res,status,data,origin=''){const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(isAllowedOrigin(origin)){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin'}res.writeHead(status,headers);res.end(JSON.stringify(data))}
function sendPreflight(req,res,origin){const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-CubeLink-Token','Access-Control-Max-Age':'600','Vary':'Origin'};if(req.headers['access-control-request-private-network']==='true')headers['Access-Control-Allow-Private-Network']='true';res.writeHead(204,headers);res.end()}
function readBody(req){return new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>220000){reject(Error('요청이 너무 큽니다.'));req.destroy();return}chunks.push(chunk)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(Error('JSON 요청 형식이 올바르지 않습니다.'))}});req.on('error',reject)})}
export function createBridgeServer({sessionToken=randomBytes(24).toString('hex'),cliRunner=cli,probeRunner=probeFirmware}={}){let busy=false;return http.createServer(async(req,res)=>{const origin=req.headers.origin||'';if(!isAllowedOrigin(origin)){send(res,403,{error:'허용되지 않은 웹사이트입니다.'});return}if(req.method==='OPTIONS'){sendPreflight(req,res,origin);return}try{
   if(req.method==='GET'&&req.url==='/health'){let cliVersion='설치되지 않음',available=false;try{const result=await cliRunner(['version'],10000);cliVersion=(result.stdout||result.stderr).trim().split(/\r?\n/)[0];available=true}catch{}send(res,200,{ok:true,bridgeVersion:'1.1.0',cliAvailable:available,cliVersion,busy},origin);return}
   if(req.method==='GET'&&req.url==='/session'){send(res,200,{token:sessionToken},origin);return}
   if(req.headers['x-cubelink-token']!==sessionToken){send(res,401,{error:'브리지 세션을 다시 연결하세요.'},origin);return}
   if(req.method==='GET'&&req.url==='/ports'){const result=await cliRunner(['board','list','--format','json'],30000),data=JSON.parse(result.stdout||'{}');send(res,200,{ports:normalizePorts(data)},origin);return}
   if(req.method==='POST'&&req.url==='/firmware/check'){if(busy){send(res,409,{error:'다른 컴파일 또는 업로드가 진행 중입니다.'},origin);return}const target=validateTarget(await readBody(req));busy=true;try{const firmware=await probeRunner(target.port);send(res,200,{ok:true,present:Boolean(firmware.present),version:firmware.version||'',expectedVersion:LIVE_FIRMWARE_VERSION},origin)}finally{busy=false}return}
   if(req.method==='POST'&&req.url==='/firmware/ensure'){if(busy){send(res,409,{error:'다른 컴파일 또는 업로드가 진행 중입니다.'},origin);return}const target=validateTarget(await readBody(req));busy=true;try{const firmware=await ensureLiveFirmware(target,cliRunner,probeRunner);send(res,200,{ok:true,...firmware,expectedVersion:LIVE_FIRMWARE_VERSION},origin)}finally{busy=false}return}
   if(req.method==='POST'&&(req.url==='/compile'||req.url==='/upload')){if(busy){send(res,409,{error:'다른 컴파일 또는 업로드가 진행 중입니다.'},origin);return}const job=validateJob(await readBody(req),req.url==='/upload');busy=true;try{const output=await compileJob(job,req.url==='/upload',cliRunner);send(res,200,{ok:true,output},origin)}finally{busy=false}return}
   send(res,404,{error:'지원하지 않는 브리지 주소입니다.'},origin);
  }catch(error){send(res,500,{error:String(error.message||error).slice(-60000)},origin)}})}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const port=32145,server=createBridgeServer();server.listen(port,'127.0.0.1',()=>{console.log(`CubeLink Starter Bridge 1.1.0`);console.log(`http://127.0.0.1:${port}`);console.log('이 창을 사이트 사용 중에는 닫지 마세요.')});}
