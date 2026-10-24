import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {observeNativeWalk} from './lib/dah-smoke-walk.mjs';

function player(){
 const events=[],context=vm.createContext({window:{__game:{pos:{x:0,z:13.8},state:{time:0,yaw:0}}},KeyboardEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},dispatchEvent:e=>events.push(e),input:{x:0,z:0}});
 const script=new vm.Script(`(${observeNativeWalk.toString()})(input)`);
 return {context,events,sample(z,time){context.window.__game.pos.z=z;context.window.__game.state.time=time;return script.runInContext(context);}};
}

test('software-rendered slow frames keep making progress beyond the former wall-clock deadline',()=>{
 const p=player();assert.equal(p.sample(13.8,0),false);
 // The observed CI regression needed about 61 game frames. A very slow renderer
 // can take over 120 real seconds to produce these .05-second simulation steps.
 for(let frame=1;frame<60;frame++)assert.equal(p.sample(13.8-frame*.23,frame*.05),false);
 assert.equal(p.sample(.05,3.05),'arrived');
 assert.equal(p.events.at(-1).type,'keyup');assert.equal(p.events.at(-1).code,'KeyW','release in the arrival frame, before a slow browser RPC reply');
});

test('a genuinely blocked player still fails after three simulation seconds without meaningful progress',()=>{
 const p=player();assert.equal(p.sample(2,0),false);assert.equal(p.sample(1.9,.5),false);
 assert.equal(p.sample(1.9,3.4),false,'time counts from last actual progress');
 assert.equal(p.sample(1.9,3.6),'stalled','wall collision cannot become an infinite wait');
 assert.equal(p.events.at(-1).code,'KeyW','release held movement on failure too');
});

test('continued slow progress stays valid across many simulation seconds, while collision jitter cannot reset the stall timer',()=>{
 const p=player();assert.equal(p.sample(40,0),false);
 for(let frame=1;frame<200;frame++)assert.equal(p.sample(40-frame*.2,frame*.05),false);
 assert.equal(p.sample(.05,10.05),'arrived');
 const blocked=player();assert.equal(blocked.sample(2,0),false);assert.equal(blocked.sample(1.99,1),false);assert.equal(blocked.sample(1.98,2),false);assert.equal(blocked.sample(1.97,3.1),'stalled');
});

test('touch-route arrival releases the real joystick pointer rather than a keyboard-only key',()=>{
 const events=[],context=vm.createContext({window:{__game:{pos:{x:0,z:0},state:{time:0,yaw:0}}},KeyboardEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},PointerEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},document:{getElementById:id=>({dispatchEvent:e=>events.push({id,...e})})},dispatchEvent:e=>events.push(e)});
 const result=new vm.Script(`(${observeNativeWalk.toString()})({x:0,z:0,touchPointerId:71})`).runInContext(context);
 assert.equal(result,'arrived');assert.equal(events.length,1);assert.equal(events[0].id,'stick');assert.equal(events[0].type,'pointerup');assert.equal(events[0].pointerId,71);
});
