import test from 'node:test';
import assert from 'node:assert/strict';
import {errors,examples,generate,warnings} from '../engine.js';
import {buildProject,detectPlan,emptyDesign,parseSession,replyToIdea,serializeSession} from '../ai-maker.js';
import {missionOrder} from '../lessons.js';

test('all 12 reference answers remain valid and generate Arduino C++',()=>{
 assert.equal(missionOrder.length,12);
 for(const mission of missionOrder){const project={...structuredClone(examples[mission]),mission};assert.deepEqual(errors(project),[],mission);assert.deepEqual(warnings(project),[],mission);const code=generate(project);assert.match(code,/void setup\(\)/,mission);assert.match(code,/void loop\(\)/,mission);}
});
test('generated code keeps critical Starter behaviors',()=>{
 assert.match(generate(examples.blink),/digitalWrite\(13, HIGH\);[\s\S]*delay\(500\);[\s\S]*digitalWrite\(13, LOW\);/);
 assert.match(generate(examples.buttonLed),/pinMode\(2, INPUT_PULLUP\);[\s\S]*digitalRead\(2\);[\s\S]*value < 1/);
 assert.match(generate(examples.distance),/pulseIn\(echo, HIGH, 30000UL\)/);
 assert.match(generate(examples.distanceLed),/value >= 0 && value < 20/);
});
test('basic idea detection chooses the intended beginner plan',()=>{
 assert.equal(detectPlan('LED를 깜빡이게 하고 싶어요'),'blink');assert.equal(detectPlan('버튼을 누르면 LED가 켜지게'),'buttonLed');assert.equal(detectPlan('어두워지면 켜지는 가로등'),'streetlight');assert.equal(detectPlan('초음파로 가까이 오면 LED 켜기'),'distanceLed');assert.equal(detectPlan('가까이 오면 LED가 켜지게 해 줘'),'distanceLed');assert.equal(detectPlan('가변저항 값을 보고 싶어요'),'pot');
});
test('AI plans use the verified mission model and selected board',()=>{
 const reply=replyToIdea('버튼으로 LED 켜기',emptyDesign());assert.equal(reply.design.planId,'buttonLed');const project=buildProject(reply.design.planId,'nano');assert.equal(project.board,'nano');assert.equal(project.mission,'buttonLed');assert.deepEqual(errors(project),[]);assert.match(generate(project),/Nano \(Classic\)/);
});
test('conversation and design state survive a safe round trip',()=>{
 const original={messages:[{role:'assistant',text:'안내'},{role:'user',text:'가로등'}],design:{stage:'proposed',idea:'가로등',planId:'streetlight'}};assert.deepEqual(parseSession(serializeSession(original)),original);assert.equal(parseSession('{broken').design.planId,null);
});
