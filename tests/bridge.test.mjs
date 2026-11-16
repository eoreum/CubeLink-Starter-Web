import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_PROFILES,createBridgeServer,isAllowedOrigin,normalizePorts,validPort,validateJob} from '../bridge/server.mjs';

test('bridge restricts website origins and upload targets',()=>{
 assert.equal(isAllowedOrigin('https://eoreum.github.io'),true);assert.equal(isAllowedOrigin('http://localhost:8765'),true);assert.equal(isAllowedOrigin('https://example.com'),false);
 assert.equal(validPort('COM3'),true);assert.equal(validPort('COM0'),false);assert.equal(validPort('COM3 & calc'),false);assert.equal(BOARD_PROFILES['nano-old'],'arduino:avr:nano:cpu=atmega328old');
});
test('bridge validates source, board profile, and port without accepting arbitrary CLI input',()=>{
 assert.deepEqual(validateJob({source:'void setup(){}\nvoid loop(){}',profile:'uno',port:'COM7'},true),{source:'void setup(){}\nvoid loop(){}',profile:'uno',port:'COM7',fqbn:'arduino:avr:uno'});
 assert.throws(()=>validateJob({source:'x',profile:'anything',port:'COM7'},true),/보드 프로필/);assert.throws(()=>validateJob({source:'x',profile:'uno',port:'COM7 --evil'},true),/포트 형식/);
});
test('bridge normalizes current Arduino CLI board-list JSON',()=>{
 const ports=normalizePorts({detected_ports:[{port:{address:'COM5',protocol:'serial',label:'USB Serial'},matching_boards:[{name:'Arduino Uno',fqbn:'arduino:avr:uno'}]},{port:{address:'network.local',protocol:'network'},matching_boards:[]}]});
 assert.deepEqual(ports,[{address:'COM5',protocol:'serial',label:'USB Serial',boards:[{name:'Arduino Uno',fqbn:'arduino:avr:uno'}]}]);
});
test('bridge serves an authenticated compile and upload flow on loopback',{skip:process.env.CUBELINK_BRIDGE_E2E!=='1'},async()=>{
 const calls=[],cliRunner=async args=>{calls.push(args);if(args[0]==='version')return {stdout:'arduino-cli Version: 1.5.1\n',stderr:''};if(args[0]==='board')return {stdout:JSON.stringify({detected_ports:[{port:{address:'COM8',protocol:'serial'},matching_boards:[{name:'Uno',fqbn:'arduino:avr:uno'}]}]}),stderr:''};return {stdout:args[0]+' ok',stderr:''}};
 const server=createBridgeServer({sessionToken:'test-token',cliRunner});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address(),base=`http://127.0.0.1:${address.port}`,headers={Origin:'http://localhost:8765'};
 try{const preflight=await fetch(base+'/health',{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Private-Network':'true'}});assert.equal(preflight.headers.get('access-control-allow-private-network'),'true');const health=await fetch(base+'/health',{headers}).then(response=>response.json());assert.equal(health.cliAvailable,true);const session=await fetch(base+'/session',{headers}).then(response=>response.json());assert.equal(session.token,'test-token');const auth={...headers,'X-CubeLink-Token':session.token};const ports=await fetch(base+'/ports',{headers:auth}).then(response=>response.json());assert.equal(ports.ports[0].address,'COM8');const body=JSON.stringify({source:'void setup(){}\nvoid loop(){}',profile:'uno',port:'COM8'}),compiled=await fetch(base+'/compile',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body}).then(response=>response.json()),uploaded=await fetch(base+'/upload',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body}).then(response=>response.json());assert.match(compiled.output,/compile ok/);assert.match(uploaded.output,/upload ok/);assert.ok(calls.some(args=>args[0]==='upload'&&args.includes('COM8')))}finally{await new Promise(resolve=>server.close(resolve))}
});
