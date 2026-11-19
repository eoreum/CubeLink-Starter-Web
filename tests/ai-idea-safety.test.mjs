import test from 'node:test';
import assert from 'node:assert/strict';
import {replyToIdea} from '../ai-maker.js';

test('a novel LED idea does not silently load the blink lesson',()=>{
 const result=replyToIdea('LED로 새로운 신호 장치를 만들고 싶어요');
 assert.equal(result.design.planId,null);
});

test('custom actuator idea is not replaced by an existing lesson',()=>{
 const result=replyToIdea('버튼을 누르면 서보모터가 움직이고 LED가 켜지게 해줘');
 assert.equal(result.design.planId,null);
});

test('unsupported follow-up clears a previously proposed lesson',()=>{
 const first=replyToIdea('LED 깜빡이기');
 assert.equal(first.design.planId,'blink');
 const next=replyToIdea('이제 모터도 연결해줘',first.design);
 assert.equal(next.design.planId,null);
});

test('simple existing lessons remain available explicitly',()=>{
 assert.equal(replyToIdea('LED 깜빡이기').design.planId,'blink');
 assert.equal(replyToIdea('버튼을 누르면 LED 켜기').design.planId,'buttonLed');
});
