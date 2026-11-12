export function initCircuitView() {
  const source=document.getElementById('circuit');
  const dialog=document.getElementById('circuitDialog');
  const viewport=document.getElementById('circuitViewport');
  const zoomLabel=document.getElementById('circuitZoomLabel');
  const hint=document.getElementById('circuitViewHint');
  let zoom=1,opener=null;
  function sync() {
    if (!dialog.open) return;
    const svg=source.cloneNode(true);
    svg.removeAttribute('id');svg.removeAttribute('tabindex');
    svg.setAttribute('role','img');svg.setAttribute('aria-label','확대된 LED 개념 회로');
    const ids=new Map();
    for(const node of svg.querySelectorAll('[id]')){const old=node.id;ids.set(old,'expanded-'+old);node.id='expanded-'+old;}
    for(const node of [svg,...svg.querySelectorAll('*')])for(const attr of [...node.attributes]){
      let value=attr.value;
      for(const [old,next]of ids)value=value.replaceAll('url(#'+old+')','url(#'+next+')');
      if(value!==attr.value)node.setAttribute(attr.name,value);
    }
    svg.style.width=(zoom*100)+'%';svg.style.maxWidth='none';
    viewport.replaceChildren(svg);
  }
  function setZoom(value){zoom=Math.max(1,Math.min(3,value));zoomLabel.textContent=Math.round(zoom*100)+'%';sync();}
  function open(event){opener=event?.currentTarget||document.activeElement;setZoom(1);hint.textContent='';dialog.showModal();sync();document.getElementById('closeCircuit').focus();}
  source.setAttribute('role','button');source.setAttribute('tabindex','0');source.setAttribute('aria-label','회로 그림 크게 보기');
  source.addEventListener('click',open);
  source.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}});
  document.getElementById('expandCircuit').addEventListener('click',open);
  document.getElementById('closeCircuit').addEventListener('click',()=>dialog.close());
  document.getElementById('circuitZoomIn').addEventListener('click',()=>setZoom(zoom+.25));
  document.getElementById('circuitZoomOut').addEventListener('click',()=>setZoom(zoom-.25));
  document.getElementById('circuitZoomFit').addEventListener('click',()=>{setZoom(1);viewport.scrollTo(0,0);});
  document.getElementById('circuitFullscreen').addEventListener('click',async()=>{
    try{if(document.fullscreenElement===dialog)await document.exitFullscreen();else await dialog.requestFullscreen();}
    catch{hint.textContent='전체 화면이 제한되어 큰 창으로 표시합니다. Chrome/Edge에서는 F11도 사용할 수 있습니다.';}
  });
  document.addEventListener('fullscreenchange',()=>{document.getElementById('circuitFullscreen').textContent=document.fullscreenElement===dialog?'전체 화면 해제':'⛶ 전체 화면';});
  dialog.addEventListener('close',()=>{if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});viewport.replaceChildren();opener?.focus();});
  new MutationObserver(sync).observe(source,{attributes:true,subtree:true,childList:true,characterData:true});
}
