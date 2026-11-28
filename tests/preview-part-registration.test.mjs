import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {allocate,partToolbox,validateParts} from '../preview-1.9.8/parts.js';
import {connectionPlan} from '../preview-1.9.8/wiring.js';
test('new supported sensor profiles have valid pins and matching circuit components',()=>{
 for(const type of ['pir','tilt','sound','temperature','pot','ldr']){
  const project={board:'uno',setup:[],loop:[]};
  const part={name:'test '+type,type,fields:allocate('uno',type,[],project)};
  validateParts('uno',[part]);
  const blocks=partToolbox([part])[0].contents;
  assert.equal(blocks.at(-1).type,'starter_'+type);
  if(type==='pir')assert.equal(blocks[0].fields.mode,'INPUT');
  if(type==='tilt')assert.equal(blocks[0].fields.mode,'INPUT_PULLUP');
  assert.equal(connectionPlan(project).components.length,0);
  project.loop.push({type:'printValue',value:{type,...part.fields}});
  assert.equal(connectionPlan(project).components.length,1);
 }
});
test('unknown parts do not expose executable blocks',()=>assert.deepEqual(partToolbox([{name:'unknown',type:'custom',fields:{}}]),[]));
test('manual registration controls exist in preview',async()=>{
 const html=await readFile(new URL('../preview-1.9.8/index.html',import.meta.url),'utf8');
 for(const id of ['manualPartOpen','manualSource','manualSpec','manualPins','manualConfirmed'])assert.ok(html.includes('id="'+id+'"'));
});
