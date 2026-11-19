import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,errors,examples,generate,walkProject,warnings} from '../engine.js';
import {buildProject,detectPlan,emptyDesign,parseSession,replyToIdea,serializeSession} from '../ai-maker.js';
import {missionOrder} from '../lessons.js';
import {parseProject,serializeProject} from '../project-store.js';

test('all 18 Studio-style reference answers remain valid and generate Arduino C++',()=>{
 assert.equal(missionOrder.length,18);
 for(const mission of missionOrder){const project={...structuredClone(examples[mission]),mission};assert.deepEqual(errors(project),[],mission);assert.deepEqual(warnings(project),[],mission);const code=generate(project);assert.doesNotMatch(code,/#include\s*<Arduino\.h>/,mission);assert.match(code,/void setup\(\)/,mission);assert.match(code,/void loop\(\)/,mission);}
});

test('generated code follows CubeLink Studio composition rules',()=>{
 assert.doesNotMatch(generate(examples.blink),/Serial\.begin|float value/);
 assert.match(generate(examples.serial3),/Serial\.begin\(9600\);[\s\S]*Serial\.println\("Hello CubeLink 1"\);/);
 assert.match(generate(examples.pot),/int potentiometerValue = 0;[\s\S]*potentiometerValue = analogRead\(A1\);[\s\S]*Serial\.println\(potentiometerValue\);/);
 assert.match(generate(examples.sensors),/int lightValue = 0;[\s\S]*int potentiometerValue = 0;[\s\S]*Serial\.println\(lightValue\);[\s\S]*Serial\.println\(potentiometerValue\);/);
 assert.match(generate(examples.buttonLed),/buttonState = digitalRead\(2\);[\s\S]*if \(\(buttonState == 0\)\)[\s\S]*digitalWrite\(13, HIGH\);[\s\S]*else[\s\S]*digitalWrite\(13, LOW\);/);
 assert.match(generate(examples.distance),/float readUltrasonic\(int trig, int echo\)[\s\S]*pulseIn\(echo, HIGH, 30000UL\)[\s\S]*distanceCm = readUltrasonic\(9, 10\);/);
 assert.match(generate(examples.streetlight),/if \(\(lightValue < 500\)\)/);
});

test('the common beginner sensor set has blocks and verified examples',()=>{
 const used=new Set(Object.values(examples).flatMap(project=>walkProject(project).map(node=>node.type)));
 for(const type of ['button','pot','ldr','ultrasonic','temperature','dhtTemperature','dhtHumidity','sound','pir','tilt','joystickAxis'])assert.ok(used.has(type),type);
 assert.match(generate(examples.temperature),/analogRead\(A2\)[\s\S]*5\.0 \/ 1023\.0/);
 assert.match(generate(examples.dht),/#include <DHT\.h>[\s\S]*DHT dht3\(3, DHT11\);[\s\S]*dht3\.begin\(\);/);
 assert.match(generate(examples.sound),/soundLevel = analogRead\(A2\);/);
 assert.match(generate(examples.pir),/motionDetected = digitalRead\(3\);/);
 assert.match(generate(examples.tilt),/tiltState = digitalRead\(4\);/);
 assert.match(generate(examples.joystick),/joystickX = analogRead\(A0\);[\s\S]*joystickY = analogRead\(A1\);[\s\S]*joystickButton = digitalRead\(2\);/);
});

test('legacy v1 student projects migrate to the Studio-style v2 model',()=>{
 const legacy={version:1,project:{board:'uno',mission:'pot',setup:[],loop:[{type:'pot',pin:'A1'},{type:'print',source:'value',text:'Hello, CubeLink!'},{type:'delay',ms:200}]}};
 const migrated=parseProject(JSON.stringify(legacy));assert.equal(migrated.mission,'pot');assert.equal(migrated.setup[0].type,'serialBegin');assert.equal(migrated.loop[0].type,'setVariable');assert.equal(migrated.loop[0].value.type,'pot');assert.equal(parseProject(serializeProject(migrated)).loop[1].type,'printValue');
});

test('simulation evaluates variables, conditions, and sensor values',()=>{
 const sim=new Simulation(examples.streetlight,{analog:{A0:300},digital:{},distance:100});for(const block of examples.streetlight.setup)sim.step(block);for(const block of examples.streetlight.loop)sim.step(block);assert.equal(sim.variables.lightValue,300);for(const pin of ['11','12','13'])assert.equal(sim.outputs[pin],1);assert.equal(sim.logs[0],'300');
 sim.inputs.analog.A0=500;sim.execute(examples.streetlight.loop);
 for(const pin of ['11','12','13'])assert.equal(sim.outputs[pin],0);
 const nested={board:'uno',setup:[],loop:[{type:'if',condition:{type:'number',value:1},then:[{type:'delay',ms:25}],else:[]}]};const nestedSim=new Simulation(nested);nestedSim.step(nested.loop[0]);assert.equal(nestedSim.time,25);
});

test('basic idea detection chooses the intended beginner plan',()=>{
 assert.equal(detectPlan('LED를 깜빡이게 하고 싶어요'),'blink');assert.equal(detectPlan('버튼을 누르면 LED가 켜지게'),'buttonLed');assert.equal(detectPlan('어두워지면 켜지는 가로등'),'streetlight');assert.equal(detectPlan('초음파로 가까이 오면 LED 켜기'),'distanceLed');assert.equal(detectPlan('가변저항 값을 보고 싶어요'),'pot');assert.equal(detectPlan('DHT11 온도와 습도 보기'),'dht');assert.equal(detectPlan('박수 소리를 읽고 싶어요'),'sound');assert.equal(detectPlan('사람 움직임 감지'),'pir');assert.equal(detectPlan('기울기 센서 값'),'tilt');assert.equal(detectPlan('조이스틱 X축 읽기'),'joystick');
});

test('AI plans use the verified mission model and selected board',()=>{
 const reply=replyToIdea('버튼으로 LED 켜기',emptyDesign());assert.equal(reply.design.planId,'buttonLed');const project=buildProject(reply.design.planId,'nano');assert.equal(project.board,'nano');assert.equal(project.mission,'buttonLed');assert.deepEqual(errors(project),[]);assert.match(generate(project),/Nano \(Classic\)/);
 for(const planId of ['blink','buttonLed','pot','ldr','streetlight','distance','distanceLed','temperature','dht','sound','pir','tilt','joystick'])assert.deepEqual(errors(buildProject(planId,'uno')),[],planId);
});

test('conversation and design state survive a safe round trip',()=>{
 const original={messages:[{role:'assistant',text:'안내'},{role:'user',text:'가로등'}],design:{stage:'proposed',idea:'가로등',planId:'streetlight'}};assert.deepEqual(parseSession(serializeSession(original)),original);assert.equal(parseSession('{broken').design.planId,null);
});

test('basic assistant prepares a three-LED sequential Blockly project',()=>{
 const result=replyToIdea('LED 3개를 번갈아 켜지게 만들어줘.',emptyDesign(),'nano');
 assert.deepEqual(errors(result.draft.project),[]);
 assert.deepEqual(result.draft.project.setup.map(block=>block.pin),['2','3','4']);
 assert.equal(result.draft.project.board,'nano');
 assert.match(result.text,/D2[\s\S]*D3[\s\S]*D4[\s\S]*delay\(500\)/);
 assert.equal(replyToIdea('LED 9개를 번갈아 켜줘').draft,undefined);
});
