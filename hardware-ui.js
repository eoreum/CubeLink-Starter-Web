import {BRIDGE_URL,compileSketch,connectBridge,ensureLiveFirmware,profilesForBoard,uploadSketch} from './hardware-bridge.js?v=1.7.0-live1';

const $=id=>document.getElementById(id);
export function initHardwareUpload({getBoard,getCode,getErrors,isSerialConnected,releaseSerial,resumeSerial,selectHardwareMonitor,appendHardwareLog,toast}){
 const dialog=$('hardwareDialog'),profile=$('hardwareProfile'),port=$('hardwarePort'),status=$('hardwareStatus'),log=$('hardwareLog');
 const buttons=[$('hardwareRefresh'),$('hardwareCompile'),$('hardwareUpload'),$('hardwareRealtime')];let busy=false;
 function setBusy(value){busy=value;buttons.forEach(button=>button.disabled=value);$('hardwareClose').disabled=value}
 function write(message,replace=false){if(replace)log.textContent='';log.textContent+=(log.textContent?'\n':'')+message;log.scrollTop=log.scrollHeight}
 function state(kind,message){status.dataset.state=kind;status.textContent=message}
 function setProfiles(){const items=profilesForBoard(getBoard());profile.replaceChildren(...items.map(item=>{const option=document.createElement('option');option.value=item.value;option.textContent=item.label;return option}))}
 function setPorts(ports){const previous=port.value;port.replaceChildren();for(const item of ports){const option=document.createElement('option');option.value=item.address;const board=item.boards?.map(value=>value.name||value.fqbn).filter(Boolean).join(', ');option.textContent=item.address+(board?' · '+board:'');port.append(option)}if(previous&&ports.some(item=>item.address===previous))port.value=previous;if(!ports.length){const option=document.createElement('option');option.value='';option.textContent='연결된 보드를 찾지 못했습니다';port.append(option)}}
 async function detect(){setBusy(true);state('working','브리지와 Arduino 보드를 확인하는 중…');try{const result=await connectBridge();setPorts(result.ports);state('ready',`브리지 연결됨 · Arduino CLI ${result.health.cliVersion||'확인됨'}`);write('✓ CubeLink Starter Bridge 연결\n✓ 보드 목록을 새로 읽었습니다.',true)}catch(error){state('error','브리지를 실행해야 합니다');write('브리지 연결 실패: '+error.message+'\n\n받은 ZIP의 압축을 풀고 start-bridge.cmd를 실행하세요.\n주소: '+BRIDGE_URL,true)}finally{setBusy(false)}}
 async function run(mode){const issues=getErrors();if(issues.length){toast('블록 오류를 먼저 수정하세요');return}if(mode!=='compile'&&!port.value){toast('업로드할 COM 포트를 선택하세요');return}setBusy(true);write('',true);let savedPort=null;try{
   if(mode==='compile'){state('working','Arduino C++를 컴파일하는 중…');write('1/1 컴파일 검사 시작');const result=await compileSketch({source:getCode(),profile:profile.value});write(result.output||'컴파일 성공');state('success','컴파일 성공');toast('Arduino 코드 컴파일을 통과했습니다');return}
   if(isSerialConnected()){state('working','업로드를 위해 시리얼 포트를 잠시 닫는 중…');savedPort=await releaseSerial()}
   state('working','컴파일 후 보드에 업로드하는 중…');write('1/2 컴파일\n2/2 '+port.value+' 업로드');const result=await uploadSketch({source:getCode(),profile:profile.value,port:port.value});write(result.output||'업로드 성공');state('success','업로드 및 검증 성공');appendHardwareLog('── 새 코드 업로드 완료 · '+port.value+' ──');
   if(savedPort){state('working','시리얼 모니터를 다시 연결하는 중…');await resumeSerial(savedPort);selectHardwareMonitor();state('success','업로드 완료 · USB 모니터 다시 연결됨')}
   toast('아두이노 업로드가 완료됐습니다.');
  }catch(error){state('error',mode==='compile'?'컴파일 실패':'업로드 실패');write('오류: '+error.message);appendHardwareLog('⚠ '+error.message);if(savedPort)try{await resumeSerial(savedPort)}catch{}}
  finally{setBusy(false)}
 }
 async function startLive(){if(!port.value){toast('라이브 모드로 연결할 COM 포트를 선택하세요');return}setBusy(true);write('',true);let savedPort=null;try{
   if(isSerialConnected()){state('working','펌웨어 검사를 위해 USB 시리얼을 잠시 닫는 중…');savedPort=await releaseSerial()}
   state('working','CubeLink Live 펌웨어를 검사하는 중…');write('1/3 펌웨어 응답과 버전 확인');
   const result=await ensureLiveFirmware({profile:profile.value,port:port.value});
   if(result.installed)write(`2/3 펌웨어 ${result.version} 자동 설치 완료${result.previousVersion?' · 이전 '+result.previousVersion:''}`);
   else write(`2/3 최신 펌웨어 ${result.version} 확인 · 설치 생략`);
   appendHardwareLog(`── CubeLink Live ${result.version} · ${result.installed?'자동 설치':'기존 펌웨어 사용'} ──`);
   if(savedPort){state('working','3/3 실제 USB 라이브 연결을 복원하는 중…');await resumeSerial(savedPort);selectHardwareMonitor();state('success',`라이브 모드 준비 완료 · 펌웨어 ${result.version}`);write('3/3 실제 USB 연결 완료');}
   else{selectHardwareMonitor();state('success',`라이브 펌웨어 ${result.version} 준비 완료 · USB 연결 필요`);write('3/3 위쪽의 USB 시리얼 연결을 눌러 같은 보드를 선택하세요.');}
   toast(result.installed?'라이브 펌웨어를 자동 설치했습니다.':'최신 라이브 펌웨어가 있어 설치를 생략했습니다.');
  }catch(error){state('error','라이브 모드 준비 실패');write('오류: '+error.message);appendHardwareLog('⚠ '+error.message);if(savedPort)try{await resumeSerial(savedPort)}catch{}}
  finally{setBusy(false)}
 }
 const oldHelp=[...document.querySelectorAll('#helpDialog p')].find(item=>item.textContent.includes('이 앱에는 직접 업로드 기능이 없습니다'));
 if(oldHelp)oldHelp.textContent='업로드 모드는 완성 코드를 보드에 기록해 PC 연결 없이 실행합니다. 라이브 모드는 CubeLink Live 펌웨어를 먼저 검사하고, 없거나 버전이 다를 때만 자동 설치합니다. 최신 펌웨어가 있으면 설치하지 않고 바로 연결 준비를 합니다.';
 const help=document.querySelector('.hardware-help'),download=document.createElement('a');download.className='bridge-download';download.href='downloads/CubeLink-Starter-Bridge-Windows.zip';download.download='CubeLink-Starter-Bridge-Windows.zip';download.textContent='Windows 브리지 받기 ↓';help.prepend(download);
 const steps=help.querySelectorAll('li');if(steps[0])steps[0].textContent='Windows 브리지 ZIP을 받아 압축을 풀고 setup-bridge.cmd를 한 번 실행합니다.';if(steps[1])steps[1].textContent='설치가 끝나면 같은 폴더의 start-bridge.cmd를 실행하고 창을 열어 둡니다.';
 $('hardwareOpen').onclick=()=>{setProfiles();dialog.showModal();detect()};$('hardwareClose').onclick=()=>dialog.close();$('hardwareRefresh').onclick=detect;$('hardwareCompile').onclick=()=>run('compile');$('hardwareUpload').onclick=()=>run('upload');$('hardwareRealtime').onclick=startLive;
}
