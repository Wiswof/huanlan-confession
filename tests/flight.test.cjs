const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSimulation,WIDTH,HEIGHT,DURATION}=require('../flight.js');
const step=1/120;
function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

test('keyboard movement stays on screen and automatic fire keeps running',()=>{
 const game=createSimulation({random:seeded(9)});game.state.invulnerable=999;game.step(step);assert.ok(game.state.bullets.length>0);
 for(let i=0;i<600;i++)game.step(step,{x:1,y:-1});
 assert.equal(game.state.player.x,WIDTH-20);assert.equal(game.state.player.y,55);
 assert.ok(game.state.bullets.length<60);
 for(let i=0;i<600;i++)game.step(step,{x:-1,y:1});
 assert.equal(game.state.player.x,20);assert.equal(game.state.player.y,HEIGHT-28);
});

test('shots destroy enemies and shield grace time prevents duplicate damage',()=>{
 const game=createSimulation({random:seeded(1)}),s=game.state;
 s.enemies.push({x:240,y:250,baseX:240,r:16,hp:1,heavy:false,speed:0,age:0,shoot:99});
 s.bullets.push({x:240,y:250,r:4,vx:0,vy:0});game.step(step);
 assert.equal(s.kills,1);assert.equal(s.score,100);assert.equal(s.enemies.length,0);
 s.invulnerable=0;s.shots.push(...Array.from({length:3},()=>({x:s.player.x,y:s.player.y,r:5,vx:0,vy:0})));
 game.step(step);assert.equal(s.hp,2);assert.ok(s.invulnerable>0);
});

test('supplies repair shields and boost firepower without exceeding shield maximum',()=>{
 const game=createSimulation(),s=game.state;s.hp=2;
 s.drops.push({x:s.player.x,y:s.player.y,r:13,kind:'repair'});game.step(step);assert.equal(s.hp,3);
 s.drops.push({x:s.player.x,y:s.player.y,r:13,kind:'repair'},{x:s.player.x,y:s.player.y,r:13,kind:'power'});game.step(step);
 assert.equal(s.hp,3);assert.equal(s.power,8);assert.equal(s.drops.length,0);
});

test('defeating the large enemy ends the flight once and preserves the result',()=>{
 const game=createSimulation({random:seeded(4)}),s=game.state;s.time=29;game.step(step);assert.ok(s.boss);
 s.boss.hp=1;s.bullets.push({x:s.boss.x,y:s.boss.y,r:4,vx:0,vy:0});game.step(step);
 assert.equal(s.result.reason,'clear');assert.equal(s.result.bossDefeated,true);assert.ok(s.score>=1500);
 const result=JSON.stringify(s.result),time=s.time;game.step(10,{x:1});assert.equal(JSON.stringify(s.result),result);assert.equal(s.time,time);
});

test('varied flights always finish with finite positions and bounded object counts',()=>{
 for(let seed=1;seed<=24;seed++){
  const game=createSimulation({random:seeded(seed)}),s=game.state;
  for(let i=0;i<Math.ceil((DURATION+1)/step)&&!s.done;i++){
   game.step(step,{target:{x:WIDTH/2+Math.sin(i/180+seed)*190,y:450+Math.sin(i/240)*90}});
   assert.ok(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));assert.ok(s.hp>=0&&s.hp<=3);
   assert.ok(s.effects.length+s.bullets.length+s.shots.length+s.enemies.length<1000);
  }
  assert.ok(s.done);assert.ok(['clear','return','retreat'].includes(s.result.reason));assert.ok(s.time<=DURATION+step);
 }
});
