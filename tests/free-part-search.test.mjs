import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../preview-1.9.8/part-research.js',import.meta.url),'utf8');
const {initResearch}=await import('../preview-1.9.8/part-research.js');
test('name search automatically requests public sources but never authentication',async()=>{
 const node=()=>({value:'',children:[],textContent:'',disabled:false,addEventListener(){},replaceChildren(){this.children=[]},append(...v){this.children.push(...v)},focus(){}});
 const ids=Object.fromEntries(['catalogQuery','researchModel','researchFind','researchStatus','researchResults','researchDisconnect'].map(k=>[k,node()]));
 const restore=[];
 for(const [k,v] of Object.entries({document:{getElementById:id=>ids[id],createElement:node},location:{href:'https://example.com/preview-1.9.8/',assign(){assert.fail('unexpected login')}},fetch(url,opts){assert.equal(new URL(url).hostname,'api.github.com');assert.equal(opts.credentials,'omit');return Promise.resolve({ok:true,json:async()=>({items:[]})})}})){
  const old=Object.getOwnPropertyDescriptor(globalThis,k);restore.push(()=>old?Object.defineProperty(globalThis,k,old):delete globalThis[k]);Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
 }
 try{
  ids.researchModel.value='openai/gpt-5-mini';
  initResearch(()=>assert.fail('unexpected registration'),()=>null);
  assert.equal(ids.researchModel.value,'free');
  ids.researchModel.value='openai/gpt-5-mini'; // stale UI value must never trigger login
  ids.catalogQuery.value='A4988 & test';
  await ids.researchFind.onclick();
  assert.equal(ids.researchResults.children.length,3);
  assert.equal(new URL(ids.researchResults.children[0].children[0].href).searchParams.get('q'),'A4988 & test datasheet pinout');
  assert.equal(ids.researchFind.disabled,false);
  ids.catalogQuery.value='';await ids.researchFind.onclick();
  assert.match(ids.researchStatus.textContent,/제품명을 입력/);
 }finally{restore.reverse().forEach(f=>f())}
});
