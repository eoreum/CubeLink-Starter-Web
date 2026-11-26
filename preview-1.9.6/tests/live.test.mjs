import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveRunner,LiveChannel,LIVE_VERSION,liveIssues} from '../live-runner.js';
import {examples} from '../engine.js';

test('live channel handles replies, firmware errors, and disconnection',async()=>{
 const sent=[],channel=new LiveChannel(text=>sent.push(text));
 const first=channel.request('CL:HELLO');await Promise.resolve();
 assert.equal(sent[0],'CL:HELLO\n');assert.equal(channel.accept('some sketch output'),false);
 channel.accept(`CL:LIVE:${LIVE_VERSION}`);assert.equal(await first,`CL:LIVE:${LIVE_VERSION}`);
 const second=channel.request('DW,13,1');channel.accept('CL:ERR:COMMAND_OR_MODE');await assert.rejects(second,/COMMAND_OR_MODE/);
 await assert.rejects(channel.request('DR,2'),/다시 연결/);
});
test('live-compatible reference lessons execute against hardware commands, not virtual sensor inputs',async()=>{
 for(const [name,project] of Object.entries(examples)){
  if(name==='servo')assert.deepEqual(liveIssues(project),[]);
  const commands=[],logs=[];let runner;
  runner=new LiveRunner({request:async command=>{commands.push(command);if(command==='CL:HELLO')return `CL:LIVE:${LIVE_VERSION}`;if(/^(AR|DR|DT|DH|US),/.test(command))return 'CL:VAL:2:1';return 'CL:OK';},log:line=>logs.push(line)});
  // Execute one setup and loop to avoid waiting for classroom delays.
  runner.project=structuredClone(project);runner.active=true;runner.variables=Object.create(null);runner.pause=async()=>{};
  await runner.execute(project.setup);await runner.execute(project.loop);
  if(name==='servo')assert.ok(commands.some(c=>c.startsWith('SV,9,')));
  if(name==='blink')assert.deepEqual(commands.filter(c=>c.startsWith('DW')),['DW,13,1','DW,13,0']);
  if(name==='pot')assert.ok(commands.includes('AR,15'));
  if(name==='distance')assert.ok(commands.includes('US,9,10'));
  if(name==='dht')assert.ok(commands.includes('DT,3')&&commands.includes('DH,3'));
 }
});
test('live runner rejects wrong firmware and always resets outputs',async()=>{
 const commands=[],runner=new LiveRunner({request:async command=>{commands.push(command);return command==='CL:HELLO'?'CL:LIVE:old':'CL:OK';}});
 await assert.rejects(runner.start(examples.blink),/펌웨어/);
 assert.equal(commands.at(-1),'CL:RESET');assert.equal(runner.active,false);
});
test('stop interrupts long delays and waits for final reset before allowing reuse',async()=>{
 const commands=[];let started;const waiting=new Promise(r=>started=r);
 const runner=new LiveRunner({request:async command=>{commands.push(command);if(command==='DW,13,1')started();return command==='CL:HELLO'?`CL:LIVE:${LIVE_VERSION}`:'CL:OK';}});
 const task=runner.start({...examples.blink,loop:[{type:'write',pin:'13',state:'HIGH'},{type:'delay',ms:60000},{type:'write',pin:'13',state:'LOW'}]});
 await waiting;await runner.stop();await task;
 assert.equal(commands.at(-1),'CL:RESET');assert.equal(commands.includes('DW,13,0'),false);
});
test('live reserves serial pins including nested sensor expressions on every board',()=>{
 for(const board of ['uno','nano','mega'])assert.ok(liveIssues({board,setup:[],loop:[{type:'printValue',value:{type:'digitalRead',pin:'1'}}]}).some(s=>s.includes('D0/D1')));
});

test('L298N direction and speed send real motor commands',async()=>{
 const commands=[],runner=new LiveRunner({request:async command=>{commands.push(command);return 'CL:OK';}});
 const base={type:'motor',en:'5',in1:'7',in2:'8',speed:150};
 runner.project={board:'uno',setup:[],loop:[{...base,direction:'forward'},{...base,direction:'reverse'},{...base,direction:'stop'}]};
 runner.active=true;assert.deepEqual(liveIssues(runner.project),[]);await runner.execute(runner.project.loop);
 assert.deepEqual(commands,['MT,5,7,8,1,150','MT,5,7,8,2,150','MT,5,7,8,0,150']);
});
