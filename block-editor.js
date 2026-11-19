import {expression,pins,statement} from './engine.js?v=1.9.5-servo';

const compareFromBlockly={EQ:'==',NEQ:'!=',LT:'<',LTE:'<=',GT:'>',GTE:'>='};
const compareToBlockly=Object.fromEntries(Object.entries(compareFromBlockly).map(([key,value])=>[value,key]));

export function registerBlocks(B,getBoard){
 const pinField=(analog=false)=>new B.FieldDropdown(function(){return pins(getBoard(),analog).map(pin=>[pin,pin])});
 B.Blocks.starter_root={init(){this.appendDummyInput().appendField('처음 한 번 setup()');this.appendStatementInput('SETUP');this.appendDummyInput().appendField('계속 반복 loop()');this.appendStatementInput('LOOP');this.setColour('#D4AF37');this.setDeletable(false);this.contextMenu=false;}};
 B.Blocks.starter_serial_begin={init(){this.appendDummyInput().appendField('시리얼 통신 시작').appendField(new B.FieldDropdown([['9600','9600'],['38400','38400'],['115200','115200']]),'baud').appendField('bps');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#27AE60');}};
 B.Blocks.starter_print_text={init(){this.appendDummyInput().appendField('시리얼에').appendField(new B.FieldTextInput('Hello, CubeLink!'),'text').appendField('출력 (새 줄)');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#27AE60');}};
 B.Blocks.starter_print_value={init(){this.appendValueInput('VALUE').appendField('시리얼에 값');this.appendDummyInput().appendField('출력 (센서 / 변수)');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#27AE60');}};
 B.Blocks.starter_mode={init(){this.appendDummyInput().appendField('핀').appendField(pinField(false),'pin').appendField('을').appendField(new B.FieldDropdown([['출력 OUTPUT','OUTPUT'],['입력 INPUT','INPUT'],['내장 풀업 입력','INPUT_PULLUP']]),'mode').appendField('으로 설정');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#E74C3C');}};
 B.Blocks.starter_write={init(){this.appendDummyInput().appendField('디지털 핀').appendField(pinField(false),'pin').appendField('에').appendField(new B.FieldDropdown([['켜기 HIGH','HIGH'],['끄기 LOW','LOW']]),'state');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#E74C3C');}};
 B.Blocks.starter_servo={init(){
  this.appendDummyInput().appendField('서보 신호 핀').appendField(pinField(false),'pin').appendField('각도').appendField(new B.FieldNumber(90,0,180,1),'angle').appendField('°');
  this.setFieldValue('9','pin');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#8356a2');
 }};
 B.Blocks.starter_delay={init(){this.appendDummyInput().appendField(new B.FieldNumber(500,0,60000,1),'ms').appendField('ms 기다리기');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#D4AF37');}};
 B.Blocks.starter_if_else={init(){this.appendValueInput('CONDITION').setCheck('Boolean').appendField('만약');this.appendStatementInput('THEN').appendField('이라면');this.appendStatementInput('ELSE').appendField('아니면');this.setPreviousStatement(true);this.setNextStatement(true);this.setColour('#5C81A6');}};

 const sensorBlock=(type,label,analog=true,colour='#F39C12')=>{B.Blocks['starter_'+type]={init(){this.appendDummyInput().appendField(label).appendField(pinField(analog),'pin');this.setOutput(true,type==='pir'||type==='tilt'?'Boolean':'Number');this.setColour(colour);}}};
 sensorBlock('digitalRead','디지털 핀',false,'#E74C3C');sensorBlock('button','버튼 핀',false);sensorBlock('analogRead','아날로그 핀');sensorBlock('ldr','조도 센서(LDR) 핀');sensorBlock('pot','가변저항 핀');sensorBlock('temperature','TMP36 온도(°C) 핀');sensorBlock('sound','소리 센서 핀');sensorBlock('pir','PIR 움직임 핀',false);sensorBlock('tilt','기울기 센서 핀',false);
 B.Blocks.starter_dhtTemperature={init(){this.appendDummyInput().appendField('DHT11 온도(°C) 핀').appendField(pinField(false),'pin');this.setOutput(true,'Number');this.setColour('#F39C12');}};
 B.Blocks.starter_dhtHumidity={init(){this.appendDummyInput().appendField('DHT11 습도(%) 핀').appendField(pinField(false),'pin');this.setOutput(true,'Number');this.setColour('#F39C12');}};
 B.Blocks.starter_joystickAxis={init(){this.appendDummyInput().appendField('조이스틱').appendField(new B.FieldDropdown([['X축','X'],['Y축','Y']]),'axis').appendField('아날로그 핀').appendField(pinField(true),'pin');this.setOutput(true,'Number');this.setColour('#9B59B6');}};
 B.Blocks.starter_ultrasonic={init(){this.appendDummyInput().appendField('초음파 거리(cm) Trig').appendField(pinField(false),'trig').appendField('Echo').appendField(pinField(false),'echo');this.setOutput(true,'Number');this.setColour('#F39C12');this.setFieldValue('9','trig');this.setFieldValue('10','echo');}};
 B.Blocks.starter_map={init(){this.appendValueInput('VALUE').setCheck('Number').appendField('값');this.appendDummyInput().appendField('범위').appendField(new B.FieldNumber(0,-10000,10000,1),'inMin').appendField('~').appendField(new B.FieldNumber(1023,-10000,10000,1),'inMax').appendField('→').appendField(new B.FieldNumber(0,-10000,10000,1),'outMin').appendField('~').appendField(new B.FieldNumber(180,-10000,10000,1),'outMax');this.setOutput(true,'Number');this.setColour('#F39C12');}};
}

function variableName(block){return block.getField('VAR')?.getText()||'value'}
function readExpression(block){
 if(!block)return expression('number',{value:0});
 if(block.type==='math_number')return expression('number',{value:Number(block.getFieldValue('NUM'))});
 if(block.type==='variables_get')return expression('variable',{name:variableName(block)});
 if(block.type==='logic_compare')return expression('compare',{operator:compareFromBlockly[block.getFieldValue('OP')]||'==',left:readExpression(block.getInputTargetBlock('A')),right:readExpression(block.getInputTargetBlock('B'))});
 if(block.type==='logic_operation')return expression('logic',{operator:block.getFieldValue('OP')||'AND',a:readExpression(block.getInputTargetBlock('A')),b:readExpression(block.getInputTargetBlock('B'))});
 const type=block.type.replace('starter_','');
 if(['digitalRead','button','analogRead','ldr','pot','temperature','dhtTemperature','dhtHumidity','sound','pir','tilt'].includes(type))return expression(type,{pin:block.getFieldValue('pin')});
 if(type==='joystickAxis')return expression(type,{pin:block.getFieldValue('pin'),axis:block.getFieldValue('axis')});
 if(type==='ultrasonic')return expression(type,{trig:block.getFieldValue('trig'),echo:block.getFieldValue('echo')});
 if(type==='map')return expression(type,{value:readExpression(block.getInputTargetBlock('VALUE')),inMin:Number(block.getFieldValue('inMin')),inMax:Number(block.getFieldValue('inMax')),outMin:Number(block.getFieldValue('outMin')),outMax:Number(block.getFieldValue('outMax'))});
 return expression('number',{value:0});
}
function readChain(first){const list=[];let block=first;while(block){if(block.isEnabled())list.push(readStatement(block));block=block.getNextBlock()}return list}
function readStatement(block){
 if(block.type==='variables_set')return statement('setVariable',{name:variableName(block),value:readExpression(block.getInputTargetBlock('VALUE'))});
 if(block.type==='math_change')return statement('changeVariable',{name:variableName(block),delta:Number(block.getFieldValue('DELTA'))});
 const type=block.type.replace('starter_','');
 if(type==='serial_begin')return statement('serialBegin',{baud:Number(block.getFieldValue('baud'))});
 if(type==='print_text')return statement('printText',{text:block.getFieldValue('text')});
 if(type==='print_value')return statement('printValue',{value:readExpression(block.getInputTargetBlock('VALUE'))});
 if(type==='mode')return statement('mode',{pin:block.getFieldValue('pin'),mode:block.getFieldValue('mode')});
 if(type==='write')return statement('write',{pin:block.getFieldValue('pin'),state:block.getFieldValue('state')});
 if(type==='servo')return statement('servo',{pin:block.getFieldValue('pin'),angle:Number(block.getFieldValue('angle'))});
 if(type==='delay')return statement('delay',{ms:Number(block.getFieldValue('ms'))});
 if(type==='if_else')return statement('if',{condition:readExpression(block.getInputTargetBlock('CONDITION')),then:readChain(block.getInputTargetBlock('THEN')),else:readChain(block.getInputTargetBlock('ELSE'))});
 return statement('delay',{ms:0});
}
export function toModel(workspace,board){const root=workspace.getBlocksByType('starter_root',false)[0];return {board,setup:readChain(root?.getInputTargetBlock('SETUP')),loop:readChain(root?.getInputTargetBlock('LOOP'))}}

function ensureVariable(workspace,name){return workspace.getAllVariables().find(item=>item.name===name)||workspace.createVariable(name)}
function init(block){block.initSvg?.();return block}
function setDropdown(block,name,value){const field=block.getField(name);field?.getOptions?.(false);block.setFieldValue(String(value),name)}
function buildExpression(B,workspace,node){
 let block;
 switch(node.type){
  case 'number':block=init(workspace.newBlock('math_number'));block.setFieldValue(String(node.value),'NUM');break;
  case 'variable':block=init(workspace.newBlock('variables_get'));block.setFieldValue(ensureVariable(workspace,node.name).getId(),'VAR');break;
  case 'compare':block=init(workspace.newBlock('logic_compare'));block.setFieldValue(compareToBlockly[node.operator]||'EQ','OP');connectValue(B,block,'A',buildExpression(B,workspace,node.left));connectValue(B,block,'B',buildExpression(B,workspace,node.right));break;
  case 'logic':block=init(workspace.newBlock('logic_operation'));block.setFieldValue(node.operator,'OP');connectValue(B,block,'A',buildExpression(B,workspace,node.a));connectValue(B,block,'B',buildExpression(B,workspace,node.b));break;
  default:block=init(workspace.newBlock('starter_'+node.type));for(const field of ['pin','trig','echo','axis','inMin','inMax','outMin','outMax'])if(node[field]!==undefined)setDropdown(block,field,node[field]);if(node.type==='map')connectValue(B,block,'VALUE',buildExpression(B,workspace,node.value));
 }
 block.render?.();return block;
}
function connectValue(B,parent,input,child){if(parent.getInput(input)?.connection&&child?.outputConnection)parent.getInput(input).connection.connect(child.outputConnection)}
function connectChain(B,workspace,connection,list){for(const node of list){const block=buildStatement(B,workspace,node);connection.connect(block.previousConnection);connection=block.nextConnection}return connection}
function buildStatement(B,workspace,node){
 let block;
 if(node.type==='setVariable'){block=init(workspace.newBlock('variables_set'));block.setFieldValue(ensureVariable(workspace,node.name).getId(),'VAR');connectValue(B,block,'VALUE',buildExpression(B,workspace,node.value));}
 else if(node.type==='changeVariable'){block=init(workspace.newBlock('math_change'));block.setFieldValue(ensureVariable(workspace,node.name).getId(),'VAR');block.setFieldValue(String(node.delta),'DELTA');}
 else if(node.type==='serialBegin'){block=init(workspace.newBlock('starter_serial_begin'));block.setFieldValue(String(node.baud),'baud');}
 else if(node.type==='printText'){block=init(workspace.newBlock('starter_print_text'));block.setFieldValue(node.text,'text');}
 else if(node.type==='printValue'){block=init(workspace.newBlock('starter_print_value'));connectValue(B,block,'VALUE',buildExpression(B,workspace,node.value));}
 else if(node.type==='mode'){block=init(workspace.newBlock('starter_mode'));setDropdown(block,'pin',node.pin);block.setFieldValue(node.mode,'mode');}
 else if(node.type==='write'){block=init(workspace.newBlock('starter_write'));setDropdown(block,'pin',node.pin);block.setFieldValue(node.state,'state');}
 else if(node.type==='servo'){block=init(workspace.newBlock('starter_servo'));setDropdown(block,'pin',node.pin);block.setFieldValue(String(node.angle),'angle');}
 else if(node.type==='delay'){block=init(workspace.newBlock('starter_delay'));block.setFieldValue(String(node.ms),'ms');}
 else if(node.type==='if'){block=init(workspace.newBlock('starter_if_else'));connectValue(B,block,'CONDITION',buildExpression(B,workspace,node.condition));connectChain(B,workspace,block.getInput('THEN').connection,node.then);connectChain(B,workspace,block.getInput('ELSE').connection,node.else);}
 else {block=init(workspace.newBlock('starter_delay'));block.setFieldValue('0','ms');}
 block.render?.();return block;
}
export function fromModel(B,workspace,project){
 workspace.clear();for(const item of [...workspace.getAllVariables()])try{workspace.deleteVariableById(item.getId())}catch{}
 const root=init(workspace.newBlock('starter_root'));root.render?.();root.moveBy(24,24);connectChain(B,workspace,root.getInput('SETUP').connection,project.setup);connectChain(B,workspace,root.getInput('LOOP').connection,project.loop);return root;
}
export function connectedIds(workspace,section){const root=workspace.getBlocksByType('starter_root',false)[0],ids=[];let block=root?.getInputTargetBlock(section.toUpperCase());while(block){if(block.isEnabled())ids.push(block.id);block=block.getNextBlock()}return ids}
export function orphanCount(workspace){return workspace.getTopBlocks(false).filter(block=>block.type!=='starter_root').reduce((count,block)=>count+block.getDescendants(false).length,0)}
export function toolbox(){return {kind:'categoryToolbox',contents:[
 {kind:'category',name:'기본 구조',colour:'#D4AF37',contents:[{kind:'block',type:'starter_delay'}]},
 {kind:'category',name:'흐름 제어',colour:'#5C81A6',contents:[{kind:'block',type:'starter_if_else'},{kind:'block',type:'logic_compare'},{kind:'block',type:'logic_operation'},{kind:'block',type:'math_number'}]},
 {kind:'category',name:'변수',colour:'#A65C81',custom:'VARIABLE'},
 {kind:'category',name:'시리얼 통신',colour:'#27AE60',contents:[{kind:'block',type:'starter_serial_begin'},{kind:'block',type:'starter_print_text'},{kind:'block',type:'starter_print_value'}]},
 {kind:'category',name:'LED · 디지털',colour:'#E74C3C',contents:[{kind:'block',type:'starter_mode'},{kind:'block',type:'starter_write'},{kind:'block',type:'starter_digitalRead'},{kind:'block',type:'starter_button'}]},
 {kind:'category',name:'서보모터',colour:'#8356a2',contents:[{kind:'block',type:'starter_servo'}]},
 {kind:'category',name:'센서 · 아날로그',colour:'#F39C12',contents:['analogRead','pot','ldr','temperature','dhtTemperature','dhtHumidity','sound','pir','tilt','joystickAxis','ultrasonic','map'].map(type=>({kind:'block',type:'starter_'+type}))}
 ]}}
