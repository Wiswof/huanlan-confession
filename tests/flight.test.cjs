const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSimulation,WIDTH,HEIGHT}=require('../flight.js');
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
 assert.equal(s.hp,3);assert.equal(s.power,1);assert.equal(s.drops.length,0);
});

test('defeating the large enemy ends the flight once and preserves the result',()=>{
 const game=createSimulation({random:seeded(4)}),s=game.state;s.time=29;game.step(step);assert.ok(s.boss);
 s.boss.hp=1;s.bullets.push({x:s.boss.x,y:s.boss.y,r:4,vx:0,vy:0});game.step(step);
 assert.equal(s.result.reason,'clear');assert.equal(s.result.bossDefeated,true);assert.ok(s.score>=1500);
 const result=JSON.stringify(s.result),time=s.time;game.step(10,{x:1});assert.equal(JSON.stringify(s.result),result);assert.equal(s.time,time);
});

test('varied flights remain bounded and only finish on victory or shield loss',()=>{
 for(let seed=1;seed<=24;seed++){
  const game=createSimulation({random:seeded(seed)}),s=game.state;
  for(let i=0;i<Math.ceil(90/step)&&!s.done;i++){
   game.step(step,{target:{x:WIDTH/2+Math.sin(i/180+seed)*190,y:450+Math.sin(i/240)*90}});
   assert.ok(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));assert.ok(s.hp>=0&&s.hp<=3);
   assert.ok(s.effects.length+s.bullets.length+s.shots.length+s.enemies.length<1000);
  }
  if(s.done)assert.ok(['clear','retreat'].includes(s.result.reason));
  else{assert.ok(s.time>=89);assert.ok(s.boss);}
 }
});


test('a surviving boss keeps the flight running past the former time limit until defeated',()=>{
 const game=createSimulation({random:seeded(17)}),s=game.state;
 s.invulnerable=999;
 for(let i=0;i<Math.ceil(30/step);i++)game.step(step,{target:{x:20,y:570}});
 assert.ok(s.boss);const boss=s.boss;boss.hp=100000;
 for(let i=0;i<Math.ceil(90/step);i++)game.step(step,{target:{x:20,y:570}});
 assert.ok(s.time>=119);assert.equal(s.done,false);assert.equal(s.result,null);assert.equal(s.boss,boss);
 assert.ok(s.effects.length+s.bullets.length+s.shots.length+s.enemies.length<1000);
 boss.hp=1;s.bullets.push({x:boss.x,y:boss.y,r:4,vx:0,vy:0});game.step(step);
 assert.equal(s.done,true);assert.equal(s.result.reason,'clear');assert.equal(s.result.bossDefeated,true);
 const result=s.result;game.step(60);assert.equal(s.result,result);assert.equal(s.boss,null);
});


test('every attack supply stacks damage permanently for this flight, including beyond five barrels',()=>{
 const game=createSimulation({random:seeded(21)}),s=game.state;s.invulnerable=999;
 for(let pickup=1;pickup<=8;pickup++){
  s.drops.push({x:s.player.x,y:s.player.y,r:13,kind:'power'});game.step(step);
  assert.equal(s.power,pickup);
  s.bullets=[];
  for(let i=0;i<20;i++)game.step(step);
  assert.ok(s.bullets.length>0);assert.ok(s.bullets.every(b=>b.damage===1+pickup));
 }
 const level=s.power;
 for(let i=0;i<Math.ceil(10/step);i++)game.step(step);
 assert.equal(s.power,level);
 assert.ok(s.bullets.length<70);
 assert.equal(createSimulation().state.power,0);
});

test('stacked attack damage applies to small enemies and the boss',()=>{
 const game=createSimulation({random:seeded(22)}),s=game.state;
 s.drops.push(...Array.from({length:3},()=>({x:s.player.x,y:s.player.y,r:13,kind:'power'})));game.step(step);
 assert.equal(s.power,3);
 for(let i=0;i<20;i++)game.step(step);
 const bullet=s.bullets.find(b=>b.damage===4);assert.ok(bullet);s.bullets=[bullet];
 bullet.x=240;bullet.y=250;bullet.vx=0;bullet.vy=0;
 s.enemies=[{x:240,y:250,baseX:240,r:16,hp:4,heavy:false,speed:0,age:0,shoot:99}];game.step(step);
 assert.equal(s.kills,1);assert.equal(s.enemies.length,0);
 s.time=29;game.step(step);assert.ok(s.boss);s.enemies=[];s.bullets=[];
 for(let i=0;i<20;i++)game.step(step);
 const bossBullet=s.bullets.find(b=>b.damage===4);assert.ok(bossBullet);s.bullets=[bossBullet];
 bossBullet.x=s.boss.x;bossBullet.y=s.boss.y;bossBullet.vx=0;bossBullet.vy=0;
 const hp=s.boss.hp;game.step(step);assert.equal(s.boss.hp,hp-4);
});
