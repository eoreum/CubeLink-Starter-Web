const {app,BrowserWindow,dialog,ipcMain,protocol,net,session,Menu,shell}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const {randomBytes}=require('node:crypto');
const {APP_ORIGIN,trusted,resourcePath,ROUTES}=require('./security.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'cubelink',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
if(process.env.CUBELINK_TEST_PROFILE)app.setPath('userData',path.resolve(process.env.CUBELINK_TEST_PROFILE));
let window,bridge,splash,localAI,quitting=false;
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus()}});
 app.whenReady().then(start).catch(error=>{dialog.showErrorBox('CubeLink Starter 시작 실패',String(error.stack||error));app.quit()});
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{quitting=true;bridge?.close();localAI?.stop();});
async function prepareTools(resources){
 const target=path.join(app.getPath('userData'),'arduino-tools-1.8.0');
 const marker=path.join(target,'.ready');
 try{await fs.access(marker)}catch{
  await fs.mkdir(target,{recursive:true});
  await fs.cp(app.isPackaged?path.join(resources,'arduino'):path.join(__dirname,'payload'),target,{recursive:true,force:true});
  await fs.writeFile(marker,'1.8.0');
 }
 process.env.ARDUINO_CLI=path.join(target,'arduino-cli.exe');
 process.env.ARDUINO_DIRECTORIES_DATA=path.join(target,'data');
 process.env.ARDUINO_DIRECTORIES_USER=path.join(target,'user');
 process.env.ARDUINO_DIRECTORIES_DOWNLOADS=path.join(target,'downloads');
 await fs.mkdir(process.env.ARDUINO_DIRECTORIES_DOWNLOADS,{recursive:true});
}
async function start(){
 Menu.setApplicationMenu(null);
 splash=new BrowserWindow({width:460,height:200,resizable:false,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});
 await splash.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<html lang="ko"><body style="font:16px Segoe UI,Malgun Gothic;padding:30px;background:#eef7f7;color:#164e56"><h2>CubeLink Starter</h2>아두이노 도구를 준비하고 있습니다.<p>처음 실행할 때는 잠시 기다려 주세요.</p></body></html>'));
 const resources=app.isPackaged?process.resourcesPath:__dirname;
 const {LocalAI}=require('./local-ai.cjs');
 localAI=new LocalAI({storageDir:path.join(app.getPath('userData'),'local-ai'),runtimeDir:path.join(resources,'local-runtime')});
 for(const action of ['status','prepare','chat','cancel'])ipcMain.handle('local-ai:'+action,(event,arg)=>{if(!trusted(event.senderFrame?.url)||event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame)throw Error('허용되지 않은 AI 요청');return localAI[action](arg)});
 await prepareTools(resources);
 const token=randomBytes(32).toString('hex');
 const {createBridgeServer}=await import(pathToFileURL(path.join(resources,'bridge','server.mjs')).href);
 bridge=createBridgeServer({sessionToken:token});
 // Internal service accepts only the main-process token, even for health/session.
 const original=bridge.listeners('request')[0];bridge.removeAllListeners('request');
 bridge.on('request',(req,res)=>{if(req.headers['x-cubelink-token']!==token){res.writeHead(403);res.end();return}original(req,res)});
 await new Promise((resolve,reject)=>{bridge.once('error',reject);bridge.listen(0,'127.0.0.1',resolve)});
 const base='http://127.0.0.1:'+bridge.address().port;
 ipcMain.handle('arduino:request',async(event,route,body)=>{
  if(!trusted(event.senderFrame?.url)||event.sender!==window?.webContents||!Object.hasOwn(ROUTES,route))throw Error('허용되지 않은 연결 요청');
  if(route==='/session')return {token:'desktop-ipc'};
  const method=ROUTES[route];if(body!==undefined&&JSON.stringify(body).length>220000)throw Error('요청이 너무 큽니다.');
  const response=await fetch(base+route,{method,headers:{Origin:'http://127.0.0.1','Content-Type':'application/json','X-CubeLink-Token':token},...(method==='POST'?{body:JSON.stringify(body)}:{})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'연결 도구 오류');return result;
 });
 protocol.handle('cubelink',async request=>{
  try{const file=resourcePath(path.join(__dirname,'ui'),request.url);return net.fetch(pathToFileURL(file).href)}catch{return new Response('Not found',{status:404})}
 });
 const ses=session.defaultSession;
 ses.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window?.webContents&&trusted(contents.getURL())&&['serial','clipboard-sanitized-write','fullscreen'].includes(permission)));
 ses.setPermissionCheckHandler((contents,permission,origin,details)=>contents===window?.webContents&&trusted(details?.requestingUrl||contents.getURL())&&['serial','clipboard-sanitized-write','fullscreen'].includes(permission));
 ses.setDevicePermissionHandler(details=>details.deviceType==='serial'&&trusted(details.origin));
 ses.on('select-serial-port',async(event,ports,contents,callback)=>{
  event.preventDefault();if(contents!==window?.webContents||!ports.length){callback('');if(!ports.length)dialog.showMessageBox(window,{type:'info',message:'USB 보드를 찾지 못했습니다.',detail:'케이블과 USB 드라이버를 확인한 뒤 다시 연결하세요.'});return}
  const result=await dialog.showMessageBox(window,{type:'question',title:'아두이노 USB 연결',message:'연결할 보드를 선택하세요.',buttons:[...ports.map(p=>`${p.portName||p.displayName||p.portId}`),'취소'],cancelId:ports.length,noLink:true});
  callback(result.response<ports.length?ports[result.response].portId:'');
 });
 window=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:650,title:'CubeLink Starter',show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault()});
 window.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(github\.com|eoreum\.github\.io)\//.test(url))shell.openExternal(url);return {action:'deny'}});
 window.on('closed',()=>{window=null;if(!quitting)app.quit()});
 await window.loadURL(APP_ORIGIN+'/index.html');
 window.show();splash.destroy();splash=null;
 if(process.env.CUBELINK_SMOKE_FILE){
  const state=await window.webContents.executeJavaScript(`new Promise(resolve=>{const start=Date.now();const check=()=>{if(document.getElementById('missionProgress')?.textContent.includes('/18')||Date.now()-start>45000)resolve({title:document.title,missions:document.getElementById('example').options.length,version:document.querySelector('footer').textContent,desktop:Boolean(window.cubelinkDesktop),serial:!!navigator.serial});else setTimeout(check,100)};check()})`);
  const health=await fetch(base+'/health',{headers:{Origin:'http://127.0.0.1','X-CubeLink-Token':token}}).then(r=>r.json());
  let ai;
  if(process.env.CUBELINK_AI_SMOKE==='1'){await localAI.prepare();const result=await localAI.chat([{role:'user',content:'한국어로 LED가 무엇인지 한 문장으로 설명해 줘.'}]);ai={...(await localAI.status()),text:result.text};}
  await fs.writeFile(process.env.CUBELINK_SMOKE_FILE,JSON.stringify({state,health,ai},null,2));app.quit();
 }
}
