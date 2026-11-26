import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD_PROFILES,LIVE_FIRMWARE_VERSION,createBridgeServer,ensureLiveFirmware,isAllowedOrigin,normalizePorts,requiredLibraries,validPort,validateJob,validateTarget} from '../bridge/server.mjs';

test('bridge restricts website origins and upload targets',()=>{
 assert.equal(isAllowedOrigin('https://eoreum.github.io'),true);assert.equal(isAllowedOrigin('http://localhost:8765'),true);assert.equal(isAllowedOrigin('https://example.com'),false);
 assert.equal(validPort('COM3'),true);assert.equal(validPort('COM0'),false);assert.equal(validPort('COM3 & calc'),false);assert.equal(BOARD_PROFILES['nano-old'],'arduino:avr:nano:cpu=atmega328old');
});
test('bridge validates source, board profile, and port without accepting arbitrary CLI input',()=>{
 assert.deepEqual(validateJob({source:'void setup(){}\nvoid loop(){}',profile:'uno',port:'COM7'},true),{source:'void setup(){}\nvoid loop(){}',profile:'uno',port:'COM7',fqbn:'arduino:avr:uno'});
 assert.throws(()=>validateJob({source:'x',profile:'anything',port:'COM7'},true),/보드 프로필/);assert.throws(()=>validateJob({source:'x',profile:'uno',port:'COM7 --evil'},true),/포트 형식/);
});
test('firmware target validation accepts only allowlisted boards and serial ports',()=>{
 assert.deepEqual(validateTarget({profile:'nano-old',port:'COM12'}),{profile:'nano-old',port:'COM12',fqbn:'arduino:avr:nano:cpu=atmega328old'});
 assert.throws(()=>validateTarget({profile:'uno',port:'COM12 --upload'}),/포트 형식/);
});
test('matching Live firmware is reused without compiling or writing flash',async()=>{
 const result=await ensureLiveFirmware({profile:'uno',port:'COM4',fqbn:'arduino:avr:uno'},async()=>{throw Error('CLI must not run')},async()=>({present:true,version:LIVE_FIRMWARE_VERSION}));
 assert.equal(result.installed,false);assert.equal(result.version,LIVE_FIRMWARE_VERSION);
});
test('missing Live firmware is uploaded and verified automatically',async()=>{
 const calls=[];let probes=0,cliRunner=async args=>{calls.push(args);return {stdout:args[0]+' ok',stderr:''}},probeRunner=async()=>++probes===1?{present:false,version:''}:{present:true,version:LIVE_FIRMWARE_VERSION};
 const result=await ensureLiveFirmware({profile:'uno',port:'COM6',fqbn:'arduino:avr:uno'},cliRunner,probeRunner);
 assert.equal(result.installed,true);assert.equal(probes,2);assert.ok(calls.some(args=>args[0]==='compile'));assert.ok(calls.some(args=>args[0]==='upload'&&args.includes('COM6')));
});
test('bridge normalizes current Arduino CLI board-list JSON',()=>{
 const ports=normalizePorts({detected_ports:[{port:{address:'COM5',protocol:'serial',label:'USB Serial'},matching_boards:[{name:'Arduino Uno',fqbn:'arduino:avr:uno'}]},{port:{address:'network.local',protocol:'network'},matching_boards:[]}]});
 assert.deepEqual(ports,[{address:'COM5',protocol:'serial',label:'USB Serial',boards:[{name:'Arduino Uno',fqbn:'arduino:avr:uno'}]}]);
});
test('bridge serves an authenticated compile and upload flow on loopback',{skip:process.env.CUBELINK_BRIDGE_E2E!=='1'},async()=>{
 const calls=[],cliRunner=async args=>{calls.push(args);if(args[0]==='version')return {stdout:'arduino-cli Version: 1.5.1\n',stderr:''};if(args[0]==='board')return {stdout:JSON.stringify({detected_ports:[{port:{address:'COM8',protocol:'serial'},matching_boards:[{name:'Uno',fqbn:'arduino:avr:uno'}]}]}),stderr:''};return {stdout:args[0]+' ok',stderr:''}};
 const probeRunner=async()=>({present:true,version:LIVE_FIRMWARE_VERSION}),server=createBridgeServer({sessionToken:'test-token',cliRunner,probeRunner});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address(),base=`http://127.0.0.1:${address.port}`,headers={Origin:'http://localhost:8765'};
 try{const preflight=await fetch(base+'/health',{method:'OPTIONS',headers:{...headers,'Access-Control-Request-Private-Network':'true'}});assert.equal(preflight.headers.get('access-control-allow-private-network'),'true');const health=await fetch(base+'/health',{headers}).then(response=>response.json());assert.equal(health.cliAvailable,true);const session=await fetch(base+'/session',{headers}).then(response=>response.json());assert.equal(session.token,'test-token');const auth={...headers,'X-CubeLink-Token':session.token};const ports=await fetch(base+'/ports',{headers:auth}).then(response=>response.json());assert.equal(ports.ports[0].address,'COM8');const targetBody=JSON.stringify({profile:'uno',port:'COM8'}),firmware=await fetch(base+'/firmware/ensure',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:targetBody}).then(response=>response.json());assert.equal(firmware.installed,false);assert.equal(firmware.version,LIVE_FIRMWARE_VERSION);const body=JSON.stringify({source:'void setup(){}\nvoid loop(){}',profile:'uno',port:'COM8'}),compiled=await fetch(base+'/compile',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body}).then(response=>response.json()),uploaded=await fetch(base+'/upload',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body}).then(response=>response.json());assert.match(compiled.output,/compile ok/);assert.match(uploaded.output,/upload ok/);assert.ok(calls.some(args=>args[0]==='upload'&&args.includes('COM8')))}finally{await new Promise(resolve=>server.close(resolve))}
});

test('library resolution deduplicates approved Arduino libraries',()=>{assert.deepEqual(requiredLibraries('#include <Servo.h>\n#include <DHT.h>\n#include <Servo.h>\n#include <unknown.h>'),['Servo','DHT sensor library']);});
