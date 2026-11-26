import test from 'node:test';
import assert from 'node:assert/strict';
import {allocate,partToolbox} from '../parts.js';
import {generate} from '../engine.js';
import {requiredLibraries} from '../bridge/server.mjs';
for(const type of ['dht','servo']) test(type+' registered blocks select bridge dependency',()=>{
 const project={board:'uno',setup:[],loop:[]};
 const part={name:type,type,fields:allocate('uno',type,[],project)};
 const blocks=partToolbox([part])[0].contents;
 for(const block of blocks){
  const node={type:block.type.replace('starter_',''),...block.fields};
  project.loop.push(type==='servo'?{...node,angle:90}:{type:'printValue',value:node});
 }
 assert.deepEqual(requiredLibraries(generate(project)),[type==='servo'?'Servo':'DHT sensor library']);
});
