import {definitions,block,pins} from './engine.js?v=1.5.0';

// Uses the same vendored Blockly renderer and C-shaped setup/loop structure as CubeLink Studio.
export function registerBlocks(B,getBoard){
 B.Blocks.starter_root={init(){this.appendDummyInput().appendField('처음 한 번 setup()');this.appendStatementInput('SETUP');this.appendDummyInput().appendField('계속 반복 loop()');this.appendStatementInput('LOOP');this.setColour('#D4AF37');this.setDeletable(false);this.contextMenu=false;}};
 for(const [type,d]of Object.entries(definitions))B.Blocks['starter_'+type]={init(){
   const row=this.appendDummyInput();
   const dropdown=(field,options)=>new B.FieldDropdown(options);
   const pin=(name,analog=false)=>{const f=new B.FieldDropdown(function(){const values=pins(getBoard(),analog);for(const value of [this.getValue(),this.getSourceBlock()?.starterPinOverrides?.[name]])if(value&&!values.includes(String(value)))values.push(String(value));return values.map(p=>[p,p])});row.appendField(f,name)};
   switch(type){
   case 'distanceLed':row.appendField('유효 거리 <').appendField(new B.FieldNumber(20,0,400),'threshold').appendField('cm이면 LED');pin('pin');row.appendField('켜기, 아니면 끄기');break;
   case 'mapValue':row.appendField('value 범위').appendField(new B.FieldNumber(0,-10000,10000,1),'inMin').appendField('~').appendField(new B.FieldNumber(1023,-10000,10000,1),'inMax').appendField('→').appendField(new B.FieldNumber(0,-10000,10000,1),'outMin').appendField('~').appendField(new B.FieldNumber(180,-10000,10000,1),'outMax');break;
   case 'increment':row.appendField('counter를').appendField(new B.FieldNumber(1,-1000,1000,1),'step').appendField('증가 → value');break;
   case 'mode':row.appendField('핀');pin('pin');row.appendField('을').appendField(dropdown('mode',[['출력 OUTPUT','OUTPUT'],['입력 INPUT','INPUT'],['내장 풀업 입력','INPUT_PULLUP']]),'mode').appendField('으로 설정');break;
   case 'write':case 'led':row.appendField(type==='led'?'LED 핀':'디지털 핀');pin('pin');row.appendField('을').appendField(dropdown('state',[['켜기 HIGH','HIGH'],['끄기 LOW','LOW']]),'state').appendField('출력');break;
   case 'threshold':row.appendField('읽은 값이').appendField(dropdown('operator',[['미만 <','<'],['이상 ≥','>=']]),'operator').appendField(new B.FieldNumber(500,-1000000,1000000),'threshold').appendField('이면 LED');pin('pin');row.appendField('켜고 아니면 끄기');break;
   case 'delay':row.appendField(new B.FieldNumber(500,0,60000,1),'ms').appendField('ms 기다리기');break;
   case 'print':row.appendField('시리얼에').appendField(dropdown('source',[['읽은 값 value','value'],['텍스트','text']]),'source').appendField(new B.FieldTextInput('Hello, CubeLink!'),'text').appendField('출력 (새 줄)');break;
   case 'ultrasonic':row.appendField('초음파 Trig');pin('trig');row.appendField('Echo');pin('echo');row.appendField('거리(cm) → value');break;
   default:row.appendField(d.label+' 핀');pin('pin',['analog','ldr','pot'].includes(type));row.appendField('→ value');
   }
   this.setPreviousStatement(true);this.setNextStatement(true);this.setInputsInline(true);
   this.setColour(type==='mode'||type==='write'||type==='led'||type==='threshold'?'#E74C3C':type==='print'?'#27AE60':type==='delay'?'#D4AF37':'#16A085');
   this.setTooltip(d.label+' · setup 또는 loop 안에 연결해야 실행됩니다.');
   for(const [name,value]of Object.entries(block(type)))if(name!=='type')this.setFieldValue(String(value),name);
   if(type==='print'){this.getField('text').setVisible(false);this.setOnChange(e=>{if(e.type==='change'&&e.blockId===this.id&&e.name==='source'){this.getField('text').setVisible(this.getFieldValue('source')==='text');if(this.rendered)this.render()}})}
 }};
}
export function toModel(workspace,board){
 const root=workspace.getBlocksByType('starter_root',false)[0];
 const read=name=>{const blocks=[];let b=root?.getInputTargetBlock(name);while(b){if(b.isEnabled()){const type=b.type.replace('starter_','');const result=block(type);for(const field of Object.keys(result).filter(k=>k!=='type'))result[field]=['ms','threshold','angle','min','max','near','far','inMin','inMax','outMin','outMax','step'].includes(field)?Number(b.getFieldValue(field)):b.getFieldValue(field);blocks.push(result)}b=b.getNextBlock()}return blocks};
 return {board,setup:read('SETUP'),loop:read('LOOP')};
}
export function fromModel(B,workspace,project){
 workspace.clear();const root=workspace.newBlock('starter_root');root.initSvg?.();root.render?.();root.moveBy(24,24);
 for(const section of ['setup','loop']){let connection=root.getInput(section.toUpperCase()).connection;for(const data of project[section]){const b=workspace.newBlock('starter_'+data.type);b.starterPinOverrides=data;for(const [name,value]of Object.entries(data))if(name!=='type'){
   const field=b.getField(name);
   // Preserve invalid pins after board changes so validation can explain them instead of silently remapping.
   if(field instanceof B.FieldDropdown)field.getOptions(false);
   b.setFieldValue(String(value),name);
  }delete b.starterPinOverrides;if(data.type==='print')b.getField('text').setVisible(data.source==='text');b.initSvg?.();b.render?.();connection.connect(b.previousConnection);connection=b.nextConnection;}}
 return root;
}
export function connectedIds(workspace,section){const root=workspace.getBlocksByType('starter_root',false)[0],ids=[];let b=root?.getInputTargetBlock(section.toUpperCase());while(b){if(b.isEnabled())ids.push(b.id);b=b.getNextBlock()}return ids}
export function orphanCount(workspace){return workspace.getTopBlocks(false).filter(b=>b.type!=='starter_root').reduce((n,b)=>n+b.getDescendants(false).length,0)}
export function toolbox(){return {kind:'categoryToolbox',contents:[
 {kind:'category',name:'입출력',colour:'#E74C3C',contents:['mode','write','led','threshold','distanceLed','read','button'].map(type=>({kind:'block',type:'starter_'+type}))},
 {kind:'category',name:'센서',colour:'#16A085',contents:['analog','ldr','pot','ultrasonic'].map(type=>({kind:'block',type:'starter_'+type}))},
 {kind:'category',name:'시간 · 시리얼',colour:'#D4AF37',contents:['delay','print','increment','mapValue'].map(type=>({kind:'block',type:'starter_'+type}))}
 ]}}
