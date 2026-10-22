const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createSimulation,WIDTH,HEIGHT,STAGES,LOOT}=require('../flight.js');
const dt=1/120;
function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function advance(game,seconds,input={}){for(let i=0;i<Math.ceil(seconds/dt)&&!game.state.done&&!game.state.transition;i++)game.step(dt,typeof input==='function'?input(game.state,i):input);}
function pickup(game,kind,count=1){for(let i=0;i<count;i++)game.state.drops.push({x:game.state.player.x,y:game.state.player.y,r:14,kind});game.step(dt);}
function summon(game){const s=game.state;s.stageTime=STAGES[s.stageIndex].bossAt;game.step(dt);assert.ok(s.boss);s.boss.y=88;return s.boss;}
function defeat(game){const s=game.state,b=s.boss||summon(game);b.hp=1;s.bullets.push({x:b.x,y:b.y,r:4,vx:0,vy:0,damage:1});game.step(dt);}
function shotAtPlayer(game){const s=game.state;s.invulnerable=0;s.shots.push({x:s.player.x,y:s.player.y,r:5,vx:0,vy:0,age:0});game.step(dt);}

test('keyboard movement stays on screen and automatic fire keeps running',()=>{
 const game=createSimulation({random:seeded(9)}),s=game.state;s.invulnerable=999;game.step(dt);assert.ok(s.bullets.length>0);
 advance(game,5,{x:1,y:-1});assert.equal(s.player.x,WIDTH-20);assert.equal(s.player.y,55);assert.ok(s.bullets.length<75);
 advance(game,5,{x:-1,y:1});assert.equal(s.player.x,20);assert.equal(s.player.y,HEIGHT-28);
});

test('shots destroy enemies and damage grace prevents duplicate shield loss',()=>{
 const game=createSimulation(),s=game.state;
 s.enemies.push({id:1,x:240,y:250,baseX:240,r:16,hp:1,heavy:false,speed:0,age:0,shoot:99});s.bullets.push({x:240,y:250,r:4,vx:0,vy:0});game.step(dt);assert.equal(s.kills,1);assert.ok(s.score>=100);assert.equal(s.enemies.length,0);
 s.invulnerable=0;s.shots.push(...Array.from({length:3},()=>({x:s.player.x,y:s.player.y,r:5,vx:0,vy:0})));game.step(dt);assert.equal(s.hp,2);assert.ok(s.invulnerable>0);
});

test('repair caps health and light shields absorb hits before health',()=>{
 const game=createSimulation(),s=game.state;s.hp=1;pickup(game,'repair',3);assert.equal(s.hp,3);assert.equal(s.barrier,1);
 pickup(game,'shield',4);assert.equal(s.barrier,3);shotAtPlayer(game);assert.equal(s.barrier,2);assert.equal(s.hp,3);
 s.barrier=0;shotAtPlayer(game);assert.equal(s.hp,2);
});

test('every attack pickup stacks lasting bullet damage beyond maximum barrel count',()=>{
 const game=createSimulation(),s=game.state;s.invulnerable=999;s.bossAppeared=true;
 for(let count=1;count<=9;count++){pickup(game,'power');assert.equal(s.power,count);s.bullets=[];advance(game,.18);assert.ok(s.bullets.length);assert.ok(s.bullets.every(b=>b.damage===count+1));}
 advance(game,10);assert.equal(s.power,9);assert.ok(s.bullets.length<80);assert.equal(createSimulation().state.power,0);
});

test('three distinct bosses gate scene changes and only the last defeat ends the campaign',()=>{
 const game=createSimulation({random:seeded(4)}),s=game.state;s.invulnerable=999;s.power=2;s.laser=1;s.missile=1;s.hp=2;
 for(let stage=0;stage<STAGES.length;stage++){
  assert.equal(s.stageIndex,stage);const b=summon(game);assert.equal(b.maxHp,STAGES[stage].hp);
  s.shots.push({x:20,y:20,r:5,vx:0,vy:10});s.beams.push({x:20,width:20,age:0,warn:1,active:1});defeat(game);
  assert.equal(s.bossesDefeated,stage+1);assert.equal(s.boss,null);
  if(stage<STAGES.length-1){
   assert.equal(s.done,false);assert.equal(s.phase,'intermission');assert.equal(s.transition.nextStage,stage+1);assert.equal(s.resonance,stage+2);assert.equal(s.shots.length,0);assert.equal(s.beams.length,0);
   const time=s.time,stageTime=s.stageTime;game.step(30);assert.equal(s.time,time);assert.equal(s.stageTime,stageTime);
   const power=s.power;assert.equal(game.continueStage(),true);assert.equal(s.power,power);assert.equal(s.laser,1);assert.ok(s.missile>=1);assert.equal(s.stageTime,0);assert.equal(s.transition,null);assert.equal(s.bossAppeared,false);assert.equal(game.continueStage(),false);
  }
 }
 assert.equal(s.result.reason,'clear');assert.equal(s.result.bossesDefeated,3);assert.equal(s.result.resonance,4);assert.equal(s.result.bossDefeated,true);
 const result=s.result,time=s.time;game.step(60);assert.equal(s.result,result);assert.equal(s.time,time);
});

test('boss entrance protection prevents being defeated before it enters the arena',()=>{
 const game=createSimulation(),s=game.state;s.stageTime=STAGES[0].bossAt;game.step(dt);const boss=s.boss;assert.ok(boss.y<65);boss.hp=1;s.bullets.push({x:boss.x,y:boss.y,r:4,vx:0,vy:0,damage:1000});game.step(dt);assert.equal(s.boss,boss);assert.equal(boss.hp,1);boss.y=88;defeat(game);assert.ok(s.transition);
});

test('a surviving boss keeps fighting beyond the former time limit',()=>{
 const game=createSimulation(),s=game.state;s.invulnerable=999;const boss=summon(game);boss.hp=1e8;
 advance(game,120,{target:{x:20,y:570}});assert.ok(s.time>=119);assert.equal(s.done,false);assert.equal(s.transition,null);assert.equal(s.boss,boss);
 defeat(game);assert.equal(s.done,false);assert.ok(s.transition);assert.equal(s.bossesDefeated,1);
});

test('laser pierces multiple enemies and repeated laser pickups increase boss damage',()=>{
 const game=createSimulation(),s=game.state;pickup(game,'laser',2);assert.equal(s.laser,2);s.bullets=[];
 s.enemies=[250,330].map((y,i)=>({id:i+1,x:s.player.x,y,baseX:s.player.x,r:16,hp:1,heavy:false,speed:0,age:0,shoot:99}));advance(game,.12);assert.equal(s.kills,2);assert.equal(s.enemies.length,0);
 const boss=summon(game);boss.x=s.player.x;boss.y=88;s.bullets=[];const hp=boss.hp;advance(game,.12,{target:{x:boss.x,y:515}});assert.ok(s.boss.hp<hp);
});

test('homing missiles seek off-axis enemies and repeated pickups stack missile level',()=>{
 const game=createSimulation({random:()=>.5}),s=game.state;pickup(game,'missile',2);assert.equal(s.missile,2);
 s.enemies.push({id:71,x:360,y:300,baseX:360,r:16,hp:15,heavy:false,speed:0,age:0,shoot:99});
 advance(game,1.2);assert.ok(s.kills>=1);assert.ok(s.effects.length>0);
});

test('wingmen fire and magnet supplies draw distant drops toward the player',()=>{
 const game=createSimulation(),s=game.state;pickup(game,'wingman');advance(game,.3);assert.ok(s.bullets.some(b=>b.wing));
 pickup(game,'magnet',2);s.drops.push({x:80,y:420,r:14,kind:'power'});const distance=Math.hypot(80-s.player.x,420-s.player.y);advance(game,.25);assert.ok(Math.hypot(s.drops[0].x-s.player.x,s.drops[0].y-s.player.y)<distance);
});

test('nova clears shots and warning beams and damages the boss',()=>{
 const game=createSimulation(),s=game.state;const boss=summon(game);boss.y=88;const hp=boss.hp;
 s.shots.push({x:20,y:30,r:5,vx:0,vy:30});s.beams.push({x:20,width:20,age:0,warn:1,active:.6});pickup(game,'nova');
 assert.equal(s.shots.length,0);assert.equal(s.beams.length,0);assert.ok(s.boss.hp<hp);assert.ok(s.nova>0);assert.ok(s.invulnerable>=1.4);
});

test('enemy laser warnings do not hurt until the beam activates',()=>{
 const game=createSimulation(),s=game.state;s.invulnerable=0;s.beams.push({x:s.player.x,width:26,age:0,warn:.5,active:.4});
 advance(game,.4);assert.equal(s.hp,3);advance(game,.2);assert.equal(s.hp,2);advance(game,.3);assert.equal(s.hp,2);
});

test('a laser cannot damage the player outside its visible vertical extent',()=>{
 const game=createSimulation(),s=game.state;s.invulnerable=0;s.player.y=55;s.beams.push({x:s.player.x,width:26,age:.6,warn:.5,active:.4});game.step(dt);assert.equal(s.hp,3);
});

test('later bosses add warned lasers and different volley patterns',()=>{
 for(let stage=0;stage<3;stage++){
  const game=createSimulation(),s=game.state;s.stageIndex=stage;s.invulnerable=999;summon(game);s.boss.y=88;s.boss.shoot=0;s.boss.laser=0;game.step(dt);
  assert.ok(s.shots.length>0);assert.equal(s.beams.length,stage===0?0:stage===1?1:2);
  assert.equal(s.phase,'boss');
 }
 assert.ok(STAGES[1].hp>STAGES[0].hp&&STAGES[2].hp>STAGES[1].hp);assert.equal(new Set(STAGES.map(s=>s.id)).size,3);
});

test('every advertised supply appears in the deterministic drop rotation',()=>{
 const game=createSimulation({random:()=>.5}),s=game.state;s.invulnerable=999;
 const kinds=new Set();
 for(let n=0;n<48;n++){
  s.enemies=[{id:100+n,x:240,y:180,baseX:240,r:16,hp:1,heavy:false,speed:0,age:0,shoot:99}];s.bullets=[{x:240,y:180,r:4,vx:0,vy:0,damage:1}];game.step(dt);
  for(const d of s.drops)kinds.add(d.kind);s.drops=[];
 }
 assert.deepEqual([...kinds].sort(),Object.keys(LOOT).sort());
});

test('companion moments advance through combat and boss victories, never through taking damage',()=>{
 const game=createSimulation(),s=game.state;shotAtPlayer(game);assert.equal(s.hp,2);assert.equal(s.resonance,0);
 pickup(game,'power');assert.equal(s.resonance,1);defeat(game);assert.equal(s.resonance,2);game.continueStage();defeat(game);assert.equal(s.resonance,3);game.continueStage();defeat(game);assert.equal(s.resonance,4);
 assert.equal(createSimulation().state.resonance,0);
});

test('long campaigns remain finite and bounded across every scene and equipment combination',()=>{
 for(let seed=1;seed<=6;seed++){
  const game=createSimulation({random:seeded(seed)}),s=game.state;s.invulnerable=999;s.power=3;s.laser=2;s.missile=2;s.wingman=1;s.magnet=2;
  for(let frame=0;frame<180/dt&&!s.done;frame++){
   if(s.transition){game.continueStage();continue;}
   game.step(dt,{target:{x:s.boss?s.boss.x:240+Math.sin(frame/150)*150,y:520}});
   assert.ok(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));assert.ok(s.hp>=0&&s.hp<=3);
   assert.ok(s.effects.length+s.bullets.length+s.shots.length+s.enemies.length+s.missiles.length<1200);
  }
  assert.equal(s.done,true,'campaign seed '+seed);assert.equal(s.result.reason,'clear');assert.equal(s.bossesDefeated,3);
 }
});
