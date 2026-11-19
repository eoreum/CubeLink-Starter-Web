module.exports=async function verifyClassroom(){
 const $=id=>document.getElementById(id);
 const check=(value,message)=>{if(!value)throw Error(message);};
 async function until(test,message){
  const deadline=performance.now()+6000;
  while(!test()&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,35));
  check(test(),message);
 }
 const ledState=(root,fill)=>[11,12,13].every(pin=>root.querySelector('[data-led-pin="'+pin+'"]')?.getAttribute('fill')===fill);
 const select=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));};
 await until(()=>$('missionProgress').textContent.includes('/18'),'Mission UI did not initialize');
 for(const selector of ['#blocklyEditor .blocklySvg','.simulation','#circuit','.code','.monitor']){
  const rect=document.querySelector(selector)?.getBoundingClientRect();
  check(rect?.width>100&&rect.height>40&&rect.bottom<=innerHeight+1,'Panel is missing, collapsed or clipped: '+selector);
 }
 select('example','streetlight');
 $('run').click();
 check($('simStatus').textContent.includes('setup 또는 loop'),'Blank workspace should show an explanation');
 $('viewAnswer').click();$('loadStreetlightAnswer').click();
 check($('code').textContent.includes('pinMode(11, OUTPUT)'),'Streetlight blocks were not loaded');
 $('run').click();
 check($('run').textContent==='■ 정지','Run button did not become Stop');
 await until(()=>parseFloat($('simClock').textContent)>0.1,'Simulation clock did not advance');
 const sensor=$('inputs').querySelector('input[type=range]');
 function setLight(value){sensor.value=value;sensor.dispatchEvent(new Event('input',{bubbles:true}));}
 setLight(499);
 await until(()=>ledState($('circuit'),'#ffbb45')&&$('serialLog').textContent.includes('499'),'Dark input did not light all three LEDs and reach serial');
 $('expandCircuit').click();$('circuitZoomIn').click();
 check($('circuitDialog').open&&$('circuitZoomLabel').textContent==='125%'&&ledState($('circuitViewport'),'#ffbb45'),'Expanded diagram or zoom failed');
 setLight(500);
 await until(()=>ledState($('circuitViewport'),'#8c9ba0'),'Expanded diagram did not update at bright input');
 $('closeCircuit').click();
 $('run').click();
 check($('run').textContent==='▶ 시뮬레이션','Stop did not restore Run');
 $('run').click();await until(()=>parseFloat($('simClock').textContent)>0.1,'Simulation did not restart');$('run').click();
 $('aiMakerButton').click();
 $('aiInput').value='LED 3개를 번갈아 켜지게 만들어줘.';
 $('aiForm').requestSubmit();
 const reply=$('aiMessages').lastElementChild.textContent;
 check(reply.includes('D2')&&reply.includes('D4')&&reply.includes('delay(500)'),'Basic AI did not return wiring and code');
 const build=$('aiMakerDialog').querySelectorAll('.ai-mode-switch')[window.cubelinkDesktop?1:0].children[1];
 build.click();$('aiApply').click();
 check(!$('aiMakerDialog').open&&$('code').textContent.includes('digitalWrite(4, HIGH)'),'Basic AI project did not reach Blockly workspace');
 $('run').click();await until(()=>$('circuit').querySelector('[data-led-pin="2"]')?.getAttribute('fill')==='#ffbb45','AI project did not simulate');$('run').click();
 return {passed:true,checks:['layout','streetlight','run/stop/restart','clock','A0 and LEDs','serial','zoom','basic AI wiring, code and Blockly']};
};
