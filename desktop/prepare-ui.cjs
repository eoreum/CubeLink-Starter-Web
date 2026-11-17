const fs=require('node:fs');
fs.copyFileSync(__dirname+'/local-ai-ui.js',__dirname+'/ui/local-ai-ui.js');
function edit(name,fn){const file=__dirname+'/ui/'+name;fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
edit('hardware-bridge.js',s=>s.replace("const BRIDGE_URL='http://127.0.0.1:32145';","const BRIDGE_URL='앱 내장 연결 도구';").replace('async function json(path,options={}){',"async function json(path,options={}){\n if(window.cubelinkDesktop)return window.cubelinkDesktop.request(path,options.body?JSON.parse(options.body):undefined);").replace('브리지는 실행 중이지만 Arduino CLI 준비가 필요합니다. setup-bridge.cmd를 실행하세요.','내장 Arduino 도구를 찾지 못했습니다. 앱을 다시 설치해 주세요.'));
edit('hardware-ui.js',s=>{
 const start=s.indexOf(" const help=document.querySelector('.hardware-help')");
 const end=s.indexOf(" $('hardwareOpen').onclick",start);
 if(start<0||end<0)throw Error('Hardware UI source changed');
 s=s.slice(0,start)+` const help=document.querySelector('.hardware-help');help.replaceChildren();
 const note=document.createElement('p');note.textContent='설치형 앱에는 연결 도구와 Arduino 컴파일러가 포함되어 있습니다. 별도 Bridge 설치 없이 USB 보드를 연결하고 보드 다시 확인을 누르세요. Nano는 맞는 부트로더를 선택하세요. 라이브 모드는 펌웨어 확인 후 위쪽 USB 연결로 같은 보드를 선택하고 실시간 실행을 누릅니다. 업로드 모드는 보드에 저장되어 USB를 분리해도 실행됩니다.';help.append(note);
`+s.slice(end);
 return s.replaceAll('브리지와 Arduino 보드','내장 도구와 Arduino 보드').replaceAll('브리지 연결됨','내장 도구 준비됨').replaceAll('브리지를 실행해야 합니다','내장 도구를 확인해 주세요').replaceAll('브리지 연결 실패: ','연결 도구 오류: ').replaceAll('CubeLink Starter Bridge 연결','내장 연결 도구 준비').replace('최초 사용은 ZIP 압축을 풀고 setup-bridge.cmd를 실행하세요. 설치 후에는 start-bridge.cmd로 다시 시작할 수 있습니다.','앱을 다시 시작해 주세요. 문제가 계속되면 재설치해 주세요.');
});
edit('index.html',s=>s.replace('<title>CubeLink Starter · 아두이노 첫걸음</title>','<title>CubeLink Starter · Windows 설치형</title>')
 .replace('<meta name="viewport"', '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; connect-src \'self\'; object-src \'none\'; base-uri \'none\';"><meta name="viewport"')
 .replace('실습용 v1.8.0 · 실시간 실행 / 업로드','Windows 설치형 v1.8.0')
 .replace(/실제 보드: 데스크톱 Chrome · HTTPS · CubeLink Starter Bridge 필요\./g,'실제 보드: 연결 도구 내장 · 별도 Bridge 설치 불필요.')
 .replace(/데스크톱 Chrome의 localhost 또는 HTTPS에서/g,'이 설치형 앱에서'));
edit('style.css',s=>s+'\n/* Keep all classroom actions reachable at smaller desktop widths. */\nnav{overflow-x:auto}nav>div{flex-shrink:0}\n');
edit('app.js',s=>"import {initLocalAI} from './local-ai-ui.js?v=1.9.0';\n"+s.replace('});initHardwareUpload(', '});initLocalAI();initHardwareUpload('));
edit('index.html',s=>s.replace('Windows 설치형 v1.8.0','Windows 설치형 v1.9.0 · 무료 로컬 AI').replace('이 브라우저에만 유지됩니다.','이 앱에만 유지됩니다.'));
edit('style.css',s=>s+'\n.local-ai-shell{display:flex;flex-direction:column;gap:12px;padding:16px;flex:1;min-height:0;overflow:auto}.local-ai-panel{display:flex;flex-direction:column;gap:8px;min-height:0;flex:1}.local-ai-panel p{font-size:12px;margin:0}.local-ai-actions{display:flex;gap:8px;flex-wrap:wrap}#localMessages{min-height:150px;flex:1;overflow:auto;max-height:40vh}#localForm>div{display:flex;gap:8px}#localQuestion{flex:1;min-width:0;font:inherit;padding:10px}.local-ai-shell [hidden]{display:none!important}.local-ai-shell>.ai-maker-body{padding:0;min-height:400px}#localStatus{font-size:12px;color:#18746c}\n');
