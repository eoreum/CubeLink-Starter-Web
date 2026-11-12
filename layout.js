export function initLayout(workspace){
 const $=id=>document.getElementById(id);
 const main=$('appPanels');
 const read=()=>{try{return JSON.parse(localStorage.getItem('cubelink-layout-v2'))||{}}catch{return {}}};
 let settings=read();
 const save=()=>{try{localStorage.setItem('cubelink-layout-v2',JSON.stringify(settings))}catch{}};
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function apply(){
  const rect=main.getBoundingClientRect();
  const code=clamp(settings.code??rect.width*.32,220,Math.max(220,rect.width-360));
  const bottom=clamp(settings.bottom??rect.height*.34,120,Math.max(120,rect.height-170));
  main.style.setProperty('--code-w',code+'px');main.style.setProperty('--bottom-size',bottom+'px');
  $('codeSplitter').setAttribute('aria-valuenow',Math.round(code));$('codeSplitter').setAttribute('aria-valuemin',220);$('codeSplitter').setAttribute('aria-valuemax',Math.max(220,Math.round(rect.width-360)));
  $('bottomSplitter').setAttribute('aria-valuenow',Math.round(bottom));$('bottomSplitter').setAttribute('aria-valuemin',120);$('bottomSplitter').setAttribute('aria-valuemax',Math.max(120,Math.round(rect.height-170)));
  $('resolution').textContent=`화면 ${screen.width}×${screen.height} · 앱 ${innerWidth}×${innerHeight}`;
  $('resolution').title=`화면은 CSS px 기준, 장치 픽셀 비율 ${devicePixelRatio}. 브라우저 확대/축소와 OS 배율에 따라 물리 해상도와 다릅니다.`;
  Blockly.svgResize(workspace);
 }
 function syncZoom(){const select=$('blockZoom'),value=String(Number(workspace.scale.toFixed(3)));let option=[...select.options].find(o=>Number(o.value)===Number(value));for(const old of [...select.options])if(old.dataset.custom&&old!==option)old.remove();if(!option){option=document.createElement('option');option.value=value;option.textContent=Math.round(workspace.scale*100)+'%';option.dataset.custom='true';select.append(option)}select.value=option.value;}
 function fit(){Blockly.svgResize(workspace);workspace.zoomToFit();syncZoom();}
 for(const [id,kind]of [['codeSplitter','code'],['bottomSplitter','bottom']]){
  const handle=$(id);
  handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);handle.classList.add('dragging')});
  handle.addEventListener('pointermove',e=>{if(!handle.hasPointerCapture(e.pointerId))return;const r=main.getBoundingClientRect();settings[kind]=kind==='code'?r.right-e.clientX:r.bottom-e.clientY;apply()});
  handle.addEventListener('pointerup',e=>{if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);handle.classList.remove('dragging');save()});
  handle.addEventListener('lostpointercapture',()=>{handle.classList.remove('dragging');save()});
  handle.addEventListener('keydown',e=>{const sign=kind==='code'?({ArrowLeft:1,ArrowRight:-1}[e.key]):({ArrowUp:1,ArrowDown:-1}[e.key]);if(sign){e.preventDefault();settings[kind]=(kind==='code'?main.querySelector('.code').offsetWidth:main.querySelector('.simulation').offsetHeight)+sign*20;apply();save()}});
 }
 $('resetLayout').onclick=()=>{settings={};save();apply();workspace.setScale(.8);syncZoom();workspace.scrollCenter()};
 $('blockZoom').onchange=()=>{workspace.setScale(Number($('blockZoom').value));syncZoom();workspace.scrollCenter()};$('fitBlocks').onclick=fit;
 workspace.addChangeListener(e=>{if(e.type===Blockly.Events.VIEWPORT_CHANGE)syncZoom()});syncZoom();
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{const panel=Boolean(window.top!==window);$('resolution').textContent=panel?'내장 브라우저에서 전체 화면을 허용하지 않습니다. Chrome에서 열고 F11을 사용하세요.':'전체 화면이 제한되었습니다. Chrome의 F11을 사용하세요.'}};
 document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ 전체 화면 해제':'⛶ 전체 화면';apply()});
 new ResizeObserver(apply).observe(main);window.addEventListener('resize',apply);apply();
}
